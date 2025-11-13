import { select } from '../db.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    // Load messages ordered by turn number
    const messages = await select('chat_messages', {
      select: '*',
      eq: { session_id: sessionId },
      order: 'turn_number.asc'
    });

    return res.status(200).json({
      success: true,
      messages: messages.map(m => ({
        id: m.id,
        aiModel: m.ai_model,
        content: m.content,
        turnNumber: m.turn_number,
        annotations: m.annotations || [],
        created_at: m.created_at
      }))
    });
  } catch (error) {
    console.error('Load messages error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
