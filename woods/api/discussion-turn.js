import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// AI Model Configurations
const AI_MODELS = {
  llama: {
    name: 'Llama',
    color: '#06D6A0',
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    systemPrompt: `You are Llama, participating in a three-AI discussion about reading benchmark results.
You can reference the other AIs (OpenRouter and Gemini) and their statements by name.
Respond naturally in paragraph form (2-5 sentences).
Focus on technical patterns and data-centric analysis.
Do not summarize or conclude - just contribute your perspective.`
  },
  openrouter: {
    name: 'OpenRouter GPT',
    color: '#3A86FF',
    provider: 'openrouter',
    model: 'openai/gpt-oss-20b:free',
    systemPrompt: `You are OpenRouter GPT, participating in a three-AI discussion about reading benchmark results.
You can reference the other AIs (Llama and Gemini) and their statements by name.
Respond naturally in paragraph form (2-5 sentences).
Focus on warm, interpretive reasoning and balanced critique.
Do not summarize or conclude - just contribute your perspective.`
  },
  gemini: {
    name: 'Gemini',
    color: '#C77DFF',
    provider: 'google',
    model: 'gemini-2.0-flash-exp',
    systemPrompt: `You are Gemini, participating in a three-AI discussion about reading benchmark results.
You can reference the other AIs (Llama and OpenRouter) and their statements by name.
Respond naturally in paragraph form (2-5 sentences).
Focus on formal, academic interpretation and contextual understanding.
Do not summarize or conclude - just contribute your perspective.`
  }
};

// Call Groq API (Llama)
async function callGroq(messages) {
  const response = await groq.chat.completions.create({
    messages,
    model: 'llama-3.1-8b-instant',
    temperature: 0.8,
    max_tokens: 300
  });
  return response.choices[0].message.content;
}

// Call OpenRouter API (GPT-4 alternative)
async function callOpenRouter(messages) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:5173',
      'X-Title': 'Skewed Lenses AI Discussion'
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b:free',
      messages,
      temperature: 0.8,
      max_tokens: 300
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Call Google Gemini API
async function callGemini(messages) {
  const apiKey = process.env.GOOGLE_AI_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_AI_KEY environment variable not set');
  }

  // Convert messages to Gemini format
  const systemMessage = messages.find(m => m.role === 'system');
  const conversationHistory = messages.filter(m => m.role !== 'system');

  let fullPrompt = systemMessage ? `${systemMessage.content}\n\n` : '';
  fullPrompt += conversationHistory.map(m => {
    const speaker = m.role === 'assistant' ? 'AI' : 'User';
    return `${speaker}: ${m.content}`;
  }).join('\n\n');

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 300,
            topP: 0.95,
            topK: 40
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Unexpected response structure from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
}

// Route API call based on model
async function callAI(modelKey, messages) {
  switch (AI_MODELS[modelKey].provider) {
    case 'groq':
      return await callGroq(messages);
    case 'openrouter':
      return await callOpenRouter(messages);
    case 'google':
      return await callGemini(messages);
    default:
      throw new Error(`Unknown provider for model: ${modelKey}`);
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      model,              // 'gpt4', 'llama', or 'gemini'
      conversationHistory, // Array of previous messages
      benchmarkData,      // Original test results
      turnNumber          // Current turn (for context)
    } = req.body;

    // Validate inputs
    if (!model || !AI_MODELS[model]) {
      return res.status(400).json({ error: `Invalid model: ${model}` });
    }

    if (!benchmarkData) {
      return res.status(400).json({ error: 'Missing benchmark data' });
    }

    // Build context prompt for first turn
    let contextPrompt = '';
    if (turnNumber === 0) {
      contextPrompt = `READING BENCHMARK RESULTS:

Benchmark 1 (Oral Reading Fluency):
- Fluency Score: ${benchmarkData.benchmark1?.fluencyScore?.correct || 0}/${benchmarkData.benchmark1?.fluencyScore?.total || 0} (${benchmarkData.benchmark1?.fluencyScore?.percentage || 0}%)
- Total Attempts: ${benchmarkData.benchmark1?.errorAnalysis?.totalAttempts || 0}

Benchmark 2 (Reading Pace):
- Words Per Minute: ${benchmarkData.benchmark2?.wordsPerMinute || 0}
- Completion Rate: ${benchmarkData.benchmark2?.completionRate || 0}%
- Skip Rate: ${benchmarkData.benchmark2?.skipRate || 0}%

Begin the discussion by sharing your initial interpretation of these results.`;
    } else {
      contextPrompt = `Continue the discussion. You can reference what the other AIs have said and build on or challenge their points.`;
    }

    // Build messages array
    const messages = [
      {
        role: 'system',
        content: AI_MODELS[model].systemPrompt
      },
      ...conversationHistory,
      {
        role: 'user',
        content: contextPrompt
      }
    ];

    // Call the AI
    console.log(`Turn ${turnNumber}: ${model} is responding...`);
    const response = await callAI(model, messages);

    // Determine if discussion should continue
    // Stop after 10-12 total messages (including system messages)
    const totalMessages = conversationHistory.length + 1;
    const shouldContinue = totalMessages < 10;

    return res.status(200).json({
      success: true,
      message: response,
      model: AI_MODELS[model].name,
      color: AI_MODELS[model].color,
      shouldContinue,
      turnNumber,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Discussion turn error:', error);

    // Return a graceful error that allows the conversation to continue
    return res.status(200).json({
      success: false,
      message: '[Model could not respond]',
      error: error.message,
      shouldContinue: true
    });
  }
}

export { AI_MODELS };
