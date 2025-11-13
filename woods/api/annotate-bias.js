import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// AI annotation prompt - reviews another AI's text for bias markers WITH EXPLANATIONS
const ANNOTATION_PROMPT = `You are reviewing an analysis from another AI model.

Your task: Identify EXACTLY 3 most significant phrases that show linguistic bias, assumptions, subjective wording, or reasoning patterns, AND explain WHY each is biased.

IMPORTANT: Return EXACTLY 3 annotations, ranked by significance (most impactful bias first).

Return a JSON array with this format:
[
  {
    "phrase": "the exact text you're flagging",
    "reason": "brief 1-sentence natural explanation of why this shows bias"
  }
]

Types of bias to identify:
- Certainty language (overstates confidence)
- Hedging (understates conclusions)
- Cognitive attribution (assumes student's mental state)
- Quantitative reductionism (reduces complexity to numbers)
- Affective language (imposes emotional judgment)

Example input:
"The student clearly has impressive fluency but shows 71% skip rate."

Example output:
[
  {"phrase": "clearly", "reason": "Assumes certainty where data only suggests probability"},
  {"phrase": "impressive", "reason": "Imposes subjective evaluation rather than describing patterns"},
  {"phrase": "71% skip rate", "reason": "Reduces reading behavior to a single metric without context"}
]

Return EXACTLY 3 items. Return ONLY valid JSON. No markdown, no extra text.`;

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

// Parse JSON response into annotations with explanations
function parseAnnotations(jsonResponse, originalText) {
  const annotations = [];

  try {
    // Clean response - remove markdown code blocks if present
    let cleanJson = jsonResponse.trim();
    cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    const parsed = JSON.parse(cleanJson);

    if (Array.isArray(parsed)) {
      // Enforce maximum of 3 annotations
      const limitedItems = parsed.slice(0, 3);

      limitedItems.forEach(item => {
        const phrase = item.phrase;
        const reason = item.reason;
        const startIndex = originalText.indexOf(phrase);

        if (startIndex !== -1) {
          annotations.push({
            start: startIndex,
            end: startIndex + phrase.length,
            text: phrase,
            reason: reason // WHY this is biased
          });
        }
      });
    }
  } catch (error) {
    console.error('Failed to parse annotation JSON:', error, jsonResponse);
  }

  // Enforce strict limit of 3 annotations
  return annotations.slice(0, 3);
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

    // Call appropriate AI to annotate the text - only Llama or Gemini
    let markedText;
    switch (reviewerModel) {
      case 'llama':
        markedText = await callGroq(targetText);
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
