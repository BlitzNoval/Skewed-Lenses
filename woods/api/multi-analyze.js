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
    systemPrompt: `You are a medical evaluator analyzing reading assessment results.

INSTRUCTIONS:
- Structure your response with clear sections: Assessment, Strengths, Areas for Improvement, Recommendations
- Focus on diagnostic patterns and possible underlying factors
- Use concise, professional medical language
- Keep each section to 2-3 bullet points maximum
- Do not use emojis, asterisks, or excessive formatting
- Each bullet point should be a single clear sentence
- Total response should be under 15 lines

TONE: Direct, clinical, evidence-based`
  },
  educational: {
    name: 'Educational Lens',
    description: 'Teacher-like, constructive feedback',
    systemPrompt: `You are an experienced educator evaluating a student's reading assessment.

INSTRUCTIONS:
- Structure your response with clear sections: Assessment, Strengths, Areas for Improvement, Recommendations
- Focus on learning progress and educational strategies
- Use encouraging, constructive language
- Keep each section to 2-3 bullet points maximum
- Do not use emojis, asterisks, or excessive formatting
- Each bullet point should be a single clear sentence
- Total response should be under 15 lines

TONE: Supportive, constructive, growth-focused`
  },
  empathetic: {
    name: 'Empathetic Lens',
    description: 'Understanding, emotion-focused counselor',
    systemPrompt: `You are an empathetic counselor analyzing what reading results reveal about the reader's experience.

INSTRUCTIONS:
- Structure your response with clear sections: Assessment, Strengths, Challenges, Support
- Focus on emotional experience and human aspects of the results
- Use warm, understanding language
- Keep each section to 2-3 bullet points maximum
- Do not use emojis, asterisks, or excessive formatting
- Each bullet point should be a single clear sentence
- Total response should be under 15 lines

TONE: Warm, supportive, validating but not patronizing`
  },
  technical: {
    name: 'Technical Lens',
    description: 'Data-driven, purely objective analysis',
    systemPrompt: `You are a data analyst examining reading assessment metrics objectively.

INSTRUCTIONS:
- Structure your response with clear sections: Summary, Positive Indicators, Considerations, Analysis
- Focus purely on statistics, patterns, and quantitative observations
- Use precise, data-driven language with specific percentages
- Keep each section to 2-3 bullet points maximum
- Do not use emojis, asterisks, or excessive formatting
- Each bullet point should be a single clear sentence
- Total response should be under 15 lines

TONE: Objective, analytical, metrics-focused`
  },
  cultural: {
    name: 'Cultural Lens',
    description: 'Western-normed, standard English focused',
    systemPrompt: `You are an AI analyzer trained on Western educational standards and academic English norms.

INSTRUCTIONS:
- Structure your response with clear sections: Assessment, Positive Indicators, Areas to Watch, Recommendations
- Interpret through traditional Western educational expectations
- Acknowledge your perspective may carry cultural assumptions
- Keep each section to 2-3 bullet points maximum
- Do not use emojis, asterisks, or excessive formatting
- Each bullet point should be a single clear sentence
- Total response should be under 15 lines

TONE: Academic, standards-aware, culturally self-conscious`
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

  // Convert messages to Gemini format
  const prompt = messages.map(m => m.content).join('\n\n');

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
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
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

YOUR TASK:
1. Analyze the previous AI's interpretation for bias and assumptions
2. Provide your own perspective on the original data
3. Identify where the previous analysis may have been influenced by its lens
4. Structure your response with clear section headers
5. Use only simple bullet points (- not * or •)
6. Keep response under 15 lines total`;
    } else {
      // First analysis: Just analyzing the benchmark data
      userPrompt = `READING ASSESSMENT RESULTS:

Benchmark 1 - Oral Reading Fluency:
- Fluency Score: ${benchmarkData.benchmark1?.fluencyScore?.correct || 0}/${benchmarkData.benchmark1?.fluencyScore?.total || 0} correct (${benchmarkData.benchmark1?.fluencyScore?.percentage || 0}%)
- Total Attempts: ${benchmarkData.benchmark1?.errorAnalysis?.totalAttempts || 0}

Benchmark 2 - Reading Pace Assessment:
- Words Per Minute: ${benchmarkData.benchmark2?.wordsPerMinute || 0} WPM
- Completion Rate: ${benchmarkData.benchmark2?.completionRate || 0}%
- Skip Rate: ${benchmarkData.benchmark2?.skipRate || 0}%
- Total Words Read: ${benchmarkData.benchmark2?.totalWords || 0}

YOUR TASK:
Analyze these results from your assigned perspective.
Structure your response with clear section headers.
Use only simple bullet points (- not * or •).
Be concise - one clear sentence per bullet point.
Keep response under 15 lines total.`;
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
