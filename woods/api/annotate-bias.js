import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// AI annotation prompt - reviews another AI's text for bias markers
const ANNOTATION_PROMPT = `You are reviewing an analysis from another AI model.

Your task: Identify phrases that show linguistic bias, assumptions, subjective wording, or reasoning patterns.

DO NOT rewrite or summarize the text.
DO NOT add commentary.
ONLY return the text with <mark> tags around biased phrases.

Types of bias to mark:
- Certainty language ("definitely", "clearly", "obviously")
- Hedging/uncertainty ("might", "perhaps", "seems")
- Cognitive attribution ("the student thinks/believes")
- Quantitative reductionism (over-reliance on numbers)
- Affective/evaluative language ("impressive", "concerning")

Return ONLY the marked-up text with <mark>phrase</mark> around biased segments.

Example input:
"The student clearly has impressive fluency but shows 71% skip rate."

Example output:
"The student <mark>clearly</mark> has <mark>impressive</mark> fluency but shows <mark>71% skip rate</mark>."`;

// Call Groq API (Llama)
async function callGroq(text) {
  const response = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: ANNOTATION_PROMPT },
      { role: 'user', content: text }
    ],
    model: 'llama-3.1-8b-instant',
    temperature: 0.3, // Lower for more consistent annotation
    max_tokens: 500
  });
  return response.choices[0].message.content;
}

// Call OpenRouter API
async function callOpenRouter(text) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:5173',
      'X-Title': 'Skewed Lenses Bias Annotation'
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b:free',
      messages: [
        { role: 'system', content: ANNOTATION_PROMPT },
        { role: 'user', content: text }
      ],
      temperature: 0.3,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Call Google Gemini API
async function callGemini(text) {
  const apiKey = process.env.GOOGLE_AI_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_AI_KEY not set');
  }

  const fullPrompt = `${ANNOTATION_PROMPT}\n\nText to annotate:\n${text}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// Parse marked text into highlight annotations
function parseAnnotations(markedText, originalText) {
  const annotations = [];
  const markRegex = /<mark>(.*?)<\/mark>/g;
  let match;

  while ((match = markRegex.exec(markedText)) !== null) {
    const markedPhrase = match[1];
    const startIndex = originalText.indexOf(markedPhrase);

    if (startIndex !== -1) {
      annotations.push({
        start: startIndex,
        end: startIndex + markedPhrase.length,
        text: markedPhrase
      });
    }
  }

  return annotations;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reviewerModel, targetText } = req.body;

    if (!reviewerModel || !targetText) {
      return res.status(400).json({ error: 'Missing reviewerModel or targetText' });
    }

    // Call appropriate AI to annotate the text
    let markedText;
    switch (reviewerModel) {
      case 'llama':
        markedText = await callGroq(targetText);
        break;
      case 'openrouter':
        markedText = await callOpenRouter(targetText);
        break;
      case 'gemini':
        markedText = await callGemini(targetText);
        break;
      default:
        return res.status(400).json({ error: `Unknown model: ${reviewerModel}` });
    }

    // Parse annotations from marked text
    const annotations = parseAnnotations(markedText, targetText);

    return res.status(200).json({
      success: true,
      reviewerModel,
      annotations,
      markedText // For debugging
    });

  } catch (error) {
    console.error('Annotation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
