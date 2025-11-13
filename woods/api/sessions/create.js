import { insert } from '../db.js';

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
    const { title, benchmarkData } = req.body;

    // Create new chat session
    const session = await insert('chat_sessions', {
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      benchmark_data: benchmarkData,
      message_count: 0
    });

    return res.status(200).json({
      success: true,
      session: {
        id: session.id,
        title: session.title,
        created_at: session.created_at
      }
    });
  } catch (error) {
    console.error('Create session error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
