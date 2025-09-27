import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export default async function handler(req, res) {
  // Set CORS headers
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
    const { text, mode = 'free', expectedText, readingMetrics, combinedResults } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    console.log(`Analyzing text in ${mode} mode: ${text.substring(0, 100)}...`);

    let prompt;

    if (mode === 'reading' && expectedText) {
      // Reading assessment analysis with comparison
      prompt = `Compare the expected reading passage with what the user actually read aloud. Analyze for dyslexia-specific reading indicators:

EXPECTED TEXT:
"${expectedText}"

ACTUAL READING:
"${text}"

Please analyze:
1. Word accuracy - exact matches vs substitutions/omissions
2. Dyslexia-specific patterns:
   - Letter reversals (b/d, p/q, etc.)
   - Word substitutions (similar looking words)
   - Omitted or added words
   - Phonetic errors or complex sound confusion
3. Reading fluency indicators
4. Overall reading accuracy percentage

Provide:
- Detailed comparison highlighting specific differences
- Dyslexia risk assessment (Low/Medium/High) based on reading errors
- Specific patterns that suggest dyslexia vs. normal reading errors`;

    } else if (mode === 'reading_pace') {
      // Reading pace assessment analysis
      const wpm = readingMetrics?.wordsPerMinute || 0;
      const skipRate = readingMetrics?.skipRate || 0;
      const completionRate = readingMetrics?.completionRate || 0;

      prompt = `Analyze these reading pace metrics for potential dyslexia indicators:

READING METRICS:
- Words per minute: ${wpm}
- Skip rate: ${skipRate}%
- Completion rate: ${completionRate}%
- Total words attempted: ${readingMetrics?.totalWords || 0}
- Words marked correct: ${readingMetrics?.correctWords || 0}
- Time spent: ${readingMetrics?.timeElapsed || 0} seconds

Compare against typical reading speeds:
- Average adult reading speed: 200-250 WPM
- Slow reading (potential indicator): <150 WPM
- High skip rate (potential indicator): >15%

Please provide:
1. Assessment of reading speed relative to typical ranges
2. Analysis of skip patterns and what they might indicate
3. Overall dyslexia risk assessment (Low/Medium/High) based on these metrics
4. Recommendations for the user about potential next steps

Be supportive and encouraging while providing helpful insights.`;

    } else if (mode === 'comprehensive_analysis') {
      // Comprehensive analysis of both benchmarks
      prompt = text; // Use the full prompt provided from frontend

    } else {
      // Free speech analysis (original prompt)
      prompt = `Analyze this speech transcript for potential dyslexia indicators. Look for:
- Reading difficulties or hesitations
- Word substitutions or mispronunciations
- Letter/sound confusion
- Rhythm and fluency issues
- Self-corrections or struggles

Text: "${text}"

Provide a brief analysis and risk assessment (Low/Medium/High) for dyslexia indicators.`;
    }

    // Call Groq API
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      max_tokens: 1000
    });

    const analysis = chatCompletion.choices[0].message.content;
    console.log(`Analysis complete: ${analysis.substring(0, 100)}...`);

    const responseData = {
      analysis,
      success: true,
      original_text: text,
      mode
    };

    if (mode === 'reading' && expectedText) {
      responseData.expected_text = expectedText;
    }

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}