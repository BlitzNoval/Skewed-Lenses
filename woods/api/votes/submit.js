import { upsert } from '../db.js';

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
    const { messageId, annotationIndex, voteType, userSession } = req.body;

    // Validate
    if (!['valid', 'invalid'].includes(voteType)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    if (!messageId || annotationIndex === undefined || !userSession) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Upsert vote (will update if user already voted on this annotation)
    await upsert('votes', {
      message_id: messageId,
      annotation_index: annotationIndex,
      vote_type: voteType,
      user_session: userSession
    });

    // Get updated counts by fetching all votes for this annotation
    const { select } = await import('../db.js');
    const votes = await select('votes', {
      eq: {
        message_id: messageId,
        annotation_index: annotationIndex
      }
    });

    const validVotes = votes.filter(v => v.vote_type === 'valid').length;
    const invalidVotes = votes.filter(v => v.vote_type === 'invalid').length;

    return res.status(200).json({
      success: true,
      counts: {
        valid: validVotes,
        invalid: invalidVotes,
        total: votes.length
      }
    });
  } catch (error) {
    console.error('Submit vote error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
