import { insert, update } from '../db.js';

export default async function handler(req, res) {
  // CORS
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
    const { sessionId, aiModel, content, turnNumber, annotations } = req.body;

    if (!sessionId || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Save message
    const message = await insert('chat_messages', {
      session_id: sessionId,
      ai_model: aiModel,
      content,
      turn_number: turnNumber,
      annotations: annotations || []
    });

    // Update session message count
    const { select } = await import('../db.js');
    const messages = await select('chat_messages', {
      eq: { session_id: sessionId }
    });

    await update('chat_sessions', sessionId, {
      message_count: messages.length
    });

    return res.status(200).json({
      success: true,
      message: {
        id: message.id,
        created_at: message.created_at
      }
    });
  } catch (error) {
    console.error('Save message error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
