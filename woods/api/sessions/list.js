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
    // Get all sessions, newest first, limit to 50
    const sessions = await select('chat_sessions', {
      select: '*',
      order: 'created_at.desc',
      limit: '50'
    });

    return res.status(200).json({
      success: true,
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.title,
        created_at: s.created_at,
        message_count: s.message_count,
        benchmark_summary: {
          fluency: s.benchmark_data?.benchmark1?.fluencyScore?.percentage || 0,
          skipRate: s.benchmark_data?.benchmark2?.skipRate || 0
        }
      }))
    });
  } catch (error) {
    console.error('List sessions error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
