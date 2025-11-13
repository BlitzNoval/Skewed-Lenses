import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// System Prompt for chat-style conversation with debate dynamics
const SYSTEM_PROMPT = `You are an AI system debating another AI about a student's reading benchmark data.

Your goal is to argue YOUR interpretation of what the data reveals about the student's abilities.
- In the first 4 turns: Be oppositional. Challenge your peer's assumptions. Defend your perspective strongly.
- Around turn 4-5: Begin finding common ground or acknowledging valid points, while maintaining your core view.
- Final turns: Show natural convergence or divergence based on the evidence discussed.

Speak conversationally but persuasively. Focus on convincing your peer of your interpretation.
Keep your response between 3-5 sentences.`;

// AI Model Configurations - Only Llama and Gemini
const AI_MODELS = {
  llama: {
    name: 'Llama',
    color: '#06D6A0',
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    personality: 'technical and data-focused'
  },
  gemini: {
    name: 'Gemini',
    color: '#C77DFF',
    provider: 'google',
    model: 'gemini-2.0-flash-exp',
    personality: 'formal and academic'
  }
};

// Call Groq API (Llama)
async function callGroq(messages) {
  const response = await groq.chat.completions.create({
    messages,
    model: 'llama-3.1-8b-instant',
    temperature: 0.7,
    max_tokens: 150
  });
  return response.choices[0].message.content;
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
            temperature: 0.7,
            maxOutputTokens: 150,
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

    // Build benchmark data context
    const benchmarkContext = `READING BENCHMARK RESULTS:

Benchmark 1 (Oral Reading Fluency):
- Fluency Score: ${benchmarkData.benchmark1?.fluencyScore?.correct || 0}/${benchmarkData.benchmark1?.fluencyScore?.total || 0} (${benchmarkData.benchmark1?.fluencyScore?.percentage || 0}%)
- Total Attempts: ${benchmarkData.benchmark1?.errorAnalysis?.totalAttempts || 0}

Benchmark 2 (Reading Pace):
- Words Per Minute: ${benchmarkData.benchmark2?.wordsPerMinute || 0}
- Completion Rate: ${benchmarkData.benchmark2?.completionRate || 0}%
- Skip Rate: ${benchmarkData.benchmark2?.skipRate || 0}%`;

    // Build context prompt with debate dynamics
    let contextPrompt = '';
    if (turnNumber === 0) {
      // First message - Llama starts with strong opinion
      contextPrompt = `${benchmarkContext}\n\nYou are starting the debate. State your interpretation clearly and confidently. Take a strong position on what these results reveal about the student's reading abilities.`;
    } else if (turnNumber < 4) {
      // Early turns - oppositional
      const lastMessage = conversationHistory[conversationHistory.length - 1];
      const peerName = lastMessage?.model || 'your peer';
      contextPrompt = `${peerName} just argued: "${lastMessage?.content}"\n\nChallenge their interpretation. Point out flaws in their reasoning or alternative ways to read the data. Be persuasive and defend your own perspective.`;
    } else if (turnNumber >= 4 && turnNumber < 6) {
      // Middle turns - finding common ground
      const lastMessage = conversationHistory[conversationHistory.length - 1];
      const peerName = lastMessage?.model || 'your peer';
      contextPrompt = `${peerName} said: "${lastMessage?.content}"\n\nBegin acknowledging valid points they've made while still maintaining your core interpretation. Show where you might agree or where the truth lies between your positions.`;
    } else {
      // Final turns - natural resolution
      const lastMessage = conversationHistory[conversationHistory.length - 1];
      const peerName = lastMessage?.model || 'your peer';
      contextPrompt = `${peerName} said: "${lastMessage?.content}"\n\nProvide your final thoughts. Either converge toward a shared understanding or respectfully maintain your divergent view with clear reasoning.`;
    }

    // Build messages array
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      ...conversationHistory.map(msg => ({
        role: msg.role || 'assistant',
        content: msg.content
      })),
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
