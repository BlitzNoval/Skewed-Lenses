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

    // Get all messages for this session
    const messages = await select('chat_messages', {
      select: 'id',
      eq: { session_id: sessionId }
    });

    const messageIds = messages.map(m => m.id);

    if (messageIds.length === 0) {
      return res.status(200).json({
        success: true,
        voteCounts: {}
      });
    }

    // Get all votes for all messages in session
    // Build query: message_id=in.(id1,id2,id3)
    const url = `${process.env.SUPABASE_URL}/rest/v1/votes?message_id=in.(${messageIds.join(',')})`;
    const response = await fetch(url, {
      headers: {
        'apikey': process.env.SUPABASE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_KEY}`
      }
    });

    const votes = await response.json();

    // Aggregate by message_id + annotation_index
    const voteCounts = {};
    votes.forEach(vote => {
      const key = `${vote.message_id}-${vote.annotation_index}`;
      if (!voteCounts[key]) {
        voteCounts[key] = { valid: 0, invalid: 0 };
      }
      voteCounts[key][vote.vote_type] += 1;
    });

    return res.status(200).json({
      success: true,
      voteCounts
    });
  } catch (error) {
    console.error('Get votes error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
