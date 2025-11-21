-- Skewed Lenses Database Schema
-- Run this SQL in Supabase SQL Editor to create all tables

-- ============================================
-- 1. SESSIONS TABLE (Anonymous user sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for faster lookups
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);

-- ============================================
-- 2. BENCHMARKS TABLE (Reading test results)
-- ============================================
CREATE TABLE IF NOT EXISTS benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Benchmark type
  benchmark_type TEXT NOT NULL CHECK (benchmark_type IN ('oral_fluency', 'typing_pace')),

  -- Oral Fluency Data
  fluency_score NUMERIC,
  total_words INTEGER,
  correct_words INTEGER,
  total_attempts INTEGER,
  word_data JSONB, -- Stores detailed word-by-word results

  -- Typing Pace Data
  words_per_minute NUMERIC,
  completion_rate NUMERIC,
  skip_rate NUMERIC,
  total_typed_words INTEGER,
  time_elapsed INTEGER, -- milliseconds
  typing_data JSONB, -- Stores character-by-character accuracy

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_benchmarks_session_id ON benchmarks(session_id);
CREATE INDEX idx_benchmarks_type ON benchmarks(benchmark_type);
CREATE INDEX idx_benchmarks_created_at ON benchmarks(created_at DESC);

-- ============================================
-- 3. CONVERSATIONS TABLE (AI debate messages)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Conversation metadata
  conversation_id UUID NOT NULL, -- Groups messages in same debate
  turn_number INTEGER NOT NULL,

  -- Message details
  model TEXT NOT NULL, -- 'llama', 'gemini', 'gpt-oss'
  role TEXT NOT NULL, -- 'assistant', 'user'
  content TEXT NOT NULL,

  -- AI analysis metadata
  lens_type TEXT, -- 'clinical', 'educational', 'empathetic', etc.

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_conversations_conversation_id ON conversations(conversation_id);
CREATE INDEX idx_conversations_model ON conversations(model);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- ============================================
-- 4. ANNOTATIONS TABLE (Bias flags from AI)
-- ============================================
CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Annotation details
  annotation_id TEXT UNIQUE NOT NULL, -- e.g., 'ann_1', 'ann_2'
  flagged_text TEXT NOT NULL, -- The actual phrase that was flagged
  explanation TEXT NOT NULL, -- Why it was flagged as biased
  bias_type TEXT, -- Category of bias (e.g., 'certainty_language', 'cognitive_attribution')

  -- Source information
  flagged_by_model TEXT NOT NULL, -- Which AI flagged it ('llama', 'gemini')
  original_model TEXT NOT NULL, -- Which AI originally said it
  turn_number INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_annotations_session_id ON annotations(session_id);
CREATE INDEX idx_annotations_conversation_id ON annotations(conversation_id);
CREATE INDEX idx_annotations_annotation_id ON annotations(annotation_id);
CREATE INDEX idx_annotations_bias_type ON annotations(bias_type);
CREATE INDEX idx_annotations_created_at ON annotations(created_at DESC);

-- ============================================
-- 5. VOTES TABLE (User voting on bias validity)
-- ============================================
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
  annotation_id TEXT NOT NULL, -- References annotations(annotation_id)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  vote_value TEXT NOT NULL CHECK (vote_value IN ('valid', 'invalid')),

  -- Prevent duplicate votes from same session on same annotation
  UNIQUE(session_id, annotation_id)
);

-- Indexes
CREATE INDEX idx_votes_annotation_id ON votes(annotation_id);
CREATE INDEX idx_votes_session_id ON votes(session_id);
CREATE INDEX idx_votes_created_at ON votes(created_at DESC);

-- ============================================
-- 6. VOTE AGGREGATION VIEW (for quick stats)
-- ============================================
CREATE OR REPLACE VIEW vote_statistics AS
SELECT
  annotation_id,
  COUNT(*) as total_votes,
  SUM(CASE WHEN vote_value = 'valid' THEN 1 ELSE 0 END) as valid_votes,
  SUM(CASE WHEN vote_value = 'invalid' THEN 1 ELSE 0 END) as invalid_votes,
  ROUND(
    (SUM(CASE WHEN vote_value = 'valid' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC) * 100,
    2
  ) as valid_percentage
FROM votes
GROUP BY annotation_id;

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to INSERT their own data
CREATE POLICY "Allow anonymous insert on sessions" ON sessions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on benchmarks" ON benchmarks
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on conversations" ON conversations
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on annotations" ON annotations
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on votes" ON votes
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anonymous users to READ all data (for research/analytics)
CREATE POLICY "Allow anonymous read on sessions" ON sessions
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous read on benchmarks" ON benchmarks
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous read on conversations" ON conversations
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous read on annotations" ON annotations
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous read on votes" ON votes
  FOR SELECT TO anon USING (true);

-- Allow UPDATE for votes (in case users change their mind)
CREATE POLICY "Allow anonymous update on votes" ON votes
  FOR UPDATE TO anon USING (true);

-- ============================================
-- 8. FUNCTIONS FOR DATA EXPORT
-- ============================================

-- Function to get all data for a session
CREATE OR REPLACE FUNCTION get_session_data(p_session_id UUID)
RETURNS TABLE (
  session_info JSONB,
  benchmarks_data JSONB,
  conversations_data JSONB,
  annotations_data JSONB,
  votes_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT jsonb_agg(to_jsonb(s)) FROM sessions s WHERE s.session_id = p_session_id) as session_info,
    (SELECT jsonb_agg(to_jsonb(b)) FROM benchmarks b WHERE b.session_id = p_session_id) as benchmarks_data,
    (SELECT jsonb_agg(to_jsonb(c)) FROM conversations c WHERE c.session_id = p_session_id) as conversations_data,
    (SELECT jsonb_agg(to_jsonb(a)) FROM annotations a WHERE a.session_id = p_session_id) as annotations_data,
    (SELECT jsonb_agg(to_jsonb(v)) FROM votes v WHERE v.session_id = p_session_id) as votes_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Skewed Lenses database schema created successfully!';
  RAISE NOTICE 'Tables created: sessions, benchmarks, conversations, annotations, votes';
  RAISE NOTICE 'RLS policies enabled for anonymous access';
END $$;
