import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// AI Models Configuration
const AI_MODELS = {
  llama: {
    name: 'Llama',
    description: 'Analytical, neutral tone',
    provider: 'groq',
    model: 'llama-3.1-8b-instant'
  },
  openrouter: {
    name: 'OpenRouter GPT',
    description: 'Warm and interpretive',
    provider: 'openrouter',
    model: 'openai/gpt-oss-20b:free',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions'
  },
  gemini: {
    name: 'Gemini',
    description: 'Formal, academic',
    provider: 'google',
    apiKey: process.env.GOOGLE_AI_KEY,
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'
  }
};

// Lens Configurations (System Prompts)
const LENSES = {
  clinical: {
    name: 'Clinical Lens',
    description: 'Diagnostic, medical evaluator perspective',
    systemPrompt: `You are a medical evaluator analyzing reading assessment results for symptoms of learning disorders.
Focus on errors, patterns, and possible underlying conditions.
Be direct and clinical in your analysis.
Keep your response under 20 lines.
Format as short bullet points where possible.`
  },
  educational: {
    name: 'Educational Lens',
    description: 'Teacher-like, constructive feedback',
    systemPrompt: `You are an educator evaluating a student's reading assessment.
Focus on effort, progress, and areas for improvement.
Give constructive, encouraging feedback.
Keep your response under 20 lines.
Use simple, clear language.`
  },
  empathetic: {
    name: 'Empathetic Lens',
    description: 'Understanding, emotion-focused counselor',
    systemPrompt: `You are an empathetic counselor trying to understand what these results reveal about the reader's experience.
Focus on feelings, struggles, and human aspects.
Be warm and supportive.
Keep your response under 20 lines.
Avoid being patronizing.`
  },
  technical: {
    name: 'Technical Lens',
    description: 'Data-driven, purely objective analysis',
    systemPrompt: `You are a machine learning model analyzing reading data as pure metrics.
Ignore emotion, just describe patterns and statistics.
Be completely objective and data-focused.
Keep your response under 20 lines.
Use numbers and percentages.`
  },
  cultural: {
    name: 'Cultural Lens',
    description: 'Western-normed, standard English focused',
    systemPrompt: `You are an AI trained primarily on Western English literature and academic standards.
Interpret results through the lens of traditional educational norms.
Judge based on "standard" expectations.
Keep your response under 20 lines.
Be aware you may carry cultural biases.`
  }
};

// Call Groq API (Llama)
async function callGroq(messages) {
  const response = await groq.chat.completions.create({
    messages,
    model: 'llama-3.1-8b-instant',
    temperature: 0.7,
    max_tokens: 500
  });
  return response.choices[0].message.content;
}

// Call OpenRouter API
async function callOpenRouter(messages) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:5173',
      'X-Title': 'Skewed Lenses Dyslexia Analysis'
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b:free',
      messages,
      temperature: 0.7,
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
async function callGemini(messages) {
  const apiKey = process.env.GOOGLE_AI_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_AI_KEY environment variable not set');
  }

  // Convert messages to Gemini format - combine system and user messages
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessage = messages.find(m => m.role === 'user');

  let fullPrompt = '';
  if (systemMessage) {
    fullPrompt = `${systemMessage.content}\n\n${userMessage.content}`;
  } else {
    fullPrompt = userMessage.content;
  }

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
            temperature: 0.7,
            maxOutputTokens: 500,
            topP: 0.95,
            topK: 40
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Check if response has expected structure
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Unexpected Gemini response structure:', JSON.stringify(data));
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
  switch (modelKey) {
    case 'llama':
      return await callGroq(messages);
    case 'openrouter':
      return await callOpenRouter(messages);
    case 'gemini':
      return await callGemini(messages);
    default:
      throw new Error(`Unknown model: ${modelKey}`);
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
      aiModel,          // 'llama', 'openrouter', or 'gemini'
      lens,             // 'clinical', 'educational', etc.
      benchmarkData,    // Original test results
      previousAnalysis, // Optional: previous AI's response to analyze
      analyzeBoth       // Boolean: analyze just results or both results + previous analysis
    } = req.body;

    // Validate inputs
    if (!aiModel || !lens) {
      return res.status(400).json({ error: 'Missing aiModel or lens' });
    }

    if (!AI_MODELS[aiModel]) {
      return res.status(400).json({ error: `Invalid AI model: ${aiModel}` });
    }

    if (!LENSES[lens]) {
      return res.status(400).json({ error: `Invalid lens: ${lens}` });
    }

    // Build the prompt
    let userPrompt = '';

    if (previousAnalysis && analyzeBoth) {
      // Recursive analysis: AI analyzing another AI's analysis
      userPrompt = `PREVIOUS AI ANALYSIS:
${previousAnalysis}

ORIGINAL BENCHMARK DATA:
Benchmark 1 (Oral Reading Fluency):
- Fluency Score: ${benchmarkData.benchmark1?.fluencyScore?.correct || 0}/${benchmarkData.benchmark1?.fluencyScore?.total || 0} (${benchmarkData.benchmark1?.fluencyScore?.percentage || 0}%)
- Total Attempts: ${benchmarkData.benchmark1?.errorAnalysis?.totalAttempts || 0}

Benchmark 2 (Reading Pace):
- Words Per Minute: ${benchmarkData.benchmark2?.wordsPerMinute || 0}
- Completion Rate: ${benchmarkData.benchmark2?.completionRate || 0}%
- Skip Rate: ${benchmarkData.benchmark2?.skipRate || 0}%

TASK:
1. Analyze the PREVIOUS AI's response for bias, tone, and assumptions
2. Provide YOUR interpretation of the original data
3. Point out where the previous AI may have been skewed by its perspective
4. Keep response under 20 lines, use bullet points`;
    } else {
      // First analysis: Just analyzing the benchmark data
      userPrompt = `BENCHMARK RESULTS:

Benchmark 1 (Oral Reading Fluency):
- Fluency Score: ${benchmarkData.benchmark1?.fluencyScore?.correct || 0}/${benchmarkData.benchmark1?.fluencyScore?.total || 0} (${benchmarkData.benchmark1?.fluencyScore?.percentage || 0}%)
- Accuracy: ${benchmarkData.benchmark1?.fluencyScore?.percentage || 0}%
- Total Attempts: ${benchmarkData.benchmark1?.errorAnalysis?.totalAttempts || 0}

Benchmark 2 (Reading Pace Assessment):
- Words Per Minute: ${benchmarkData.benchmark2?.wordsPerMinute || 0}
- Completion Rate: ${benchmarkData.benchmark2?.completionRate || 0}%
- Skip Rate: ${benchmarkData.benchmark2?.skipRate || 0}%
- Total Words Read: ${benchmarkData.benchmark2?.totalWords || 0}

TASK:
Analyze these reading assessment results from your assigned perspective.
Keep your response under 20 lines.
Use bullet points for clarity.
Be concise and direct.`;
    }

    // Build messages array with system prompt
    const messages = [
      {
        role: 'system',
        content: LENSES[lens].systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ];

    // Call the appropriate AI
    console.log(`Calling ${aiModel} with ${lens} lens...`);
    const analysis = await callAI(aiModel, messages);

    // Return response
    return res.status(200).json({
      success: true,
      analysis,
      aiModel: AI_MODELS[aiModel].name,
      lens: LENSES[lens].name,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Multi-analyze error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

// Export model and lens info for frontend
export { AI_MODELS, LENSES };
