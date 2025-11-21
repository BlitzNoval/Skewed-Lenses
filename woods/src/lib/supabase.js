/**
 * Supabase Client Configuration
 *
 * This handles all database connections to the cloud Supabase instance.
 * All data is stored online and accessible across all users globally.
 */

import { createClient } from '@supabase/supabase-js';

// Get credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  console.error('Make sure .env file contains:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_ANON_KEY');
}

// Create Supabase client (single instance for entire app)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // No user authentication needed
    autoRefreshToken: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'skewed-lenses',
    },
  },
});

/**
 * Database Helper Functions
 */

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Create or retrieve anonymous session
 */
export async function createSession(sessionId, metadata = {}) {
  try {
    // First check if session already exists
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (existingSession) {
      // Session exists, just return it
      return { data: existingSession, error: null };
    }

    // Session doesn't exist, create it
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        session_id: sessionId,
        user_agent: navigator.userAgent,
        metadata,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating session:', error);
    return { data: null, error };
  }
}

/**
 * Update session metadata
 */
export async function updateSession(sessionId, metadata) {
  try {
    // First check if session exists
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (!existingSession) {
      // Session doesn't exist, create it instead
      return await createSession(sessionId, metadata);
    }

    // Session exists, update it
    const { data, error } = await supabase
      .from('sessions')
      .update({
        metadata: { ...existingSession.metadata, ...metadata },
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating session:', error);
    return { data: null, error };
  }
}

// ============================================
// BENCHMARKS
// ============================================

/**
 * Save benchmark results (oral fluency or typing pace)
 */
export async function saveBenchmark(sessionId, benchmarkData) {
  try {
    const { data, error } = await supabase
      .from('benchmarks')
      .insert({
        session_id: sessionId,
        ...benchmarkData,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error saving benchmark:', error);
    return { data: null, error };
  }
}

/**
 * Get all benchmarks for a session
 */
export async function getBenchmarks(sessionId) {
  try {
    const { data, error } = await supabase
      .from('benchmarks')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching benchmarks:', error);
    return { data: null, error };
  }
}

// ============================================
// CONVERSATIONS
// ============================================

/**
 * Save AI conversation message
 */
export async function saveConversationMessage(sessionId, messageData) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        session_id: sessionId,
        ...messageData,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error saving conversation message:', error);
    return { data: null, error };
  }
}

/**
 * Save multiple conversation messages at once
 */
export async function saveConversationBatch(sessionId, conversationId, messages) {
  try {
    const messagesToInsert = messages.map((msg) => ({
      session_id: sessionId,
      conversation_id: conversationId,
      ...msg,
    }));

    const { data, error } = await supabase
      .from('conversations')
      .insert(messagesToInsert)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error saving conversation batch:', error);
    return { data: null, error };
  }
}

/**
 * Get all conversations for a session
 */
export async function getConversations(sessionId) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .order('turn_number', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return { data: null, error };
  }
}

// ============================================
// ANNOTATIONS (Bias Flags)
// ============================================

/**
 * Save bias annotation
 */
export async function saveAnnotation(sessionId, conversationId, annotationData) {
  try {
    const { data, error } = await supabase
      .from('annotations')
      .insert({
        session_id: sessionId,
        conversation_id: conversationId,
        ...annotationData,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error saving annotation:', error);
    return { data: null, error };
  }
}

/**
 * Save multiple annotations at once
 */
export async function saveAnnotationBatch(sessionId, conversationId, annotations) {
  try {
    const annotationsToInsert = annotations.map((ann) => ({
      session_id: sessionId,
      conversation_id: conversationId,
      ...ann,
    }));

    const { data, error } = await supabase
      .from('annotations')
      .insert(annotationsToInsert)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error saving annotation batch:', error);
    return { data: null, error };
  }
}

/**
 * Get all annotations for a conversation
 */
export async function getAnnotations(conversationId) {
  try {
    const { data, error } = await supabase
      .from('annotations')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching annotations:', error);
    return { data: null, error };
  }
}

// ============================================
// VOTES
// ============================================

/**
 * Submit or update vote on bias annotation
 */
export async function submitVote(sessionId, annotationId, voteValue) {
  try {
    // Upsert: insert if doesn't exist, update if it does
    const { data, error } = await supabase
      .from('votes')
      .upsert(
        {
          session_id: sessionId,
          annotation_id: annotationId,
          vote_value: voteValue,
        },
        {
          onConflict: 'session_id,annotation_id',
        }
      )
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error submitting vote:', error);
    return { data: null, error };
  }
}

/**
 * Get vote statistics for an annotation
 */
export async function getVoteStats(annotationId) {
  try {
    const { data, error } = await supabase
      .from('vote_statistics')
      .select('*')
      .eq('annotation_id', annotationId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" errors
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching vote stats:', error);
    return { data: null, error };
  }
}

/**
 * Get all votes for a session
 */
export async function getSessionVotes(sessionId) {
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('session_id', sessionId);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching session votes:', error);
    return { data: null, error };
  }
}

// ============================================
// RESEARCH/EXPORT FUNCTIONS
// ============================================

/**
 * Get all data for research export
 */
export async function getAllDataForExport(limit = 1000, offset = 0) {
  try {
    const [sessions, benchmarks, conversations, annotations, votes] = await Promise.all([
      supabase.from('sessions').select('*').range(offset, offset + limit - 1),
      supabase.from('benchmarks').select('*').range(offset, offset + limit - 1),
      supabase.from('conversations').select('*').range(offset, offset + limit - 1),
      supabase.from('annotations').select('*').range(offset, offset + limit - 1),
      supabase.from('votes').select('*').range(offset, offset + limit - 1),
    ]);

    return {
      sessions: sessions.data || [],
      benchmarks: benchmarks.data || [],
      conversations: conversations.data || [],
      annotations: annotations.data || [],
      votes: votes.data || [],
    };
  } catch (error) {
    console.error('Error fetching export data:', error);
    return null;
  }
}

/**
 * Get aggregate statistics
 */
export async function getAggregateStats() {
  try {
    const { data: sessionCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true });

    const { data: conversationCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });

    const { data: voteCount } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true });

    const { data: annotationCount } = await supabase
      .from('annotations')
      .select('*', { count: 'exact', head: true });

    return {
      totalSessions: sessionCount?.count || 0,
      totalConversations: conversationCount?.count || 0,
      totalVotes: voteCount?.count || 0,
      totalAnnotations: annotationCount?.count || 0,
    };
  } catch (error) {
    // Only log errors
    return null;
  }
}

/**
 * Get complete user journey with all relationships
 * session → benchmarks → conversations → annotations → votes
 */
export async function getUserJourney(sessionId) {
  try {
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    const { data: benchmarks } = await supabase
      .from('benchmarks')
      .select('*')
      .eq('session_id', sessionId);

    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .order('turn_number', { ascending: true });

    const { data: annotations } = await supabase
      .from('annotations')
      .select('*')
      .eq('session_id', sessionId);

    const { data: votes } = await supabase
      .from('votes')
      .select('*')
      .eq('session_id', sessionId);

    return {
      session,
      benchmarks,
      conversations,
      annotations,
      votes,
      // Create mappings for easy lookup
      votesByAnnotation: votes?.reduce((acc, vote) => {
        acc[vote.annotation_id] = vote;
        return acc;
      }, {}) || {},
      annotationsByConversation: annotations?.reduce((acc, ann) => {
        if (!acc[ann.conversation_id]) acc[ann.conversation_id] = [];
        acc[ann.conversation_id].push(ann);
        return acc;
      }, {}) || {}
    };
  } catch (error) {
    return null;
  }
}

export default supabase;
