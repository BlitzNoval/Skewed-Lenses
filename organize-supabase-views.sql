-- ORGANIZE SUPABASE DATA WITH VIEWS
-- Run this AFTER clearing data to create organized views

-- 1. Complete User Journey View
CREATE OR REPLACE VIEW user_journey_complete AS
SELECT 
  s.session_id,
  s.created_at as session_start,
  s.metadata->>'browser' as browser,
  s.metadata->>'language' as language,
  COUNT(DISTINCT b.id) as total_benchmarks,
  COUNT(DISTINCT c.conversation_id) as total_conversations,
  COUNT(DISTINCT a.id) as total_annotations,
  COUNT(DISTINCT v.id) as total_votes
FROM sessions s
LEFT JOIN benchmarks b ON s.session_id = b.session_id
LEFT JOIN conversations c ON s.session_id = c.session_id
LEFT JOIN annotations a ON s.session_id = a.session_id
LEFT JOIN votes v ON s.session_id = v.session_id
GROUP BY s.session_id, s.created_at, s.metadata;

-- 2. Benchmark Results Summary
CREATE OR REPLACE VIEW benchmark_summary AS
SELECT 
  session_id,
  benchmark_type,
  CASE 
    WHEN benchmark_type = 'oral_fluency' THEN fluency_score
    WHEN benchmark_type = 'typing_pace' THEN words_per_minute
  END as primary_score,
  metadata->>'test_name' as test_name,
  metadata->>'export_label' as export_label,
  created_at
FROM benchmarks
ORDER BY created_at DESC;

-- 3. AI Conversation Analysis
CREATE OR REPLACE VIEW ai_conversation_analysis AS
SELECT 
  c.conversation_id,
  c.session_id,
  c.model,
  c.turn_number,
  c.metadata->>'ai_model_name' as ai_name,
  c.metadata->>'message_length' as message_length,
  c.metadata->>'annotation_count' as bias_flags,
  c.created_at,
  COUNT(a.id) as total_annotations
FROM conversations c
LEFT JOIN annotations a ON c.conversation_id = a.conversation_id AND c.turn_number = a.turn_number
GROUP BY c.id, c.conversation_id, c.session_id, c.model, c.turn_number, c.metadata, c.created_at
ORDER BY c.created_at DESC, c.turn_number;

-- 4. Bias Annotation Report
CREATE OR REPLACE VIEW bias_annotation_report AS
SELECT 
  a.annotation_id,
  a.session_id,
  a.conversation_id,
  a.flagged_text,
  a.explanation,
  a.bias_type,
  a.flagged_by_model,
  a.original_model,
  a.metadata->>'flagged_by_ai' as flagged_by_ai_name,
  COUNT(v.id) as total_votes,
  SUM(CASE WHEN v.vote_value = 'valid' THEN 1 ELSE 0 END) as valid_votes,
  SUM(CASE WHEN v.vote_value = 'invalid' THEN 1 ELSE 0 END) as invalid_votes,
  ROUND(
    (SUM(CASE WHEN v.vote_value = 'valid' THEN 1 ELSE 0 END)::NUMERIC / 
     NULLIF(COUNT(v.id), 0)::NUMERIC) * 100, 
    1
  ) as valid_percentage,
  a.created_at
FROM annotations a
LEFT JOIN votes v ON a.annotation_id = v.annotation_id
GROUP BY a.id, a.annotation_id, a.session_id, a.conversation_id, a.flagged_text, 
         a.explanation, a.bias_type, a.flagged_by_model, a.original_model, a.metadata, a.created_at
ORDER BY a.created_at DESC;

-- 5. Export-Ready Data View
CREATE OR REPLACE VIEW export_ready_data AS
SELECT 
  'session' as data_type,
  s.session_id::TEXT as primary_id,
  s.created_at,
  s.metadata->>'export_label' as export_label,
  jsonb_build_object(
    'session_id', s.session_id,
    'browser', s.metadata->>'browser',
    'language', s.metadata->>'language',
    'timezone', s.metadata->>'timezone'
  ) as data
FROM sessions s

UNION ALL

SELECT 
  'benchmark' as data_type,
  b.id::TEXT as primary_id,
  b.created_at,
  b.metadata->>'export_label' as export_label,
  jsonb_build_object(
    'session_id', b.session_id,
    'test_name', b.metadata->>'test_name',
    'score', COALESCE(b.fluency_score, b.words_per_minute)
  ) as data
FROM benchmarks b

UNION ALL

SELECT 
  'conversation' as data_type,
  c.id::TEXT as primary_id,
  c.created_at,
  c.metadata->>'export_label' as export_label,
  jsonb_build_object(
    'session_id', c.session_id,
    'model', c.model,
    'ai_name', c.metadata->>'ai_model_name',
    'turn', c.turn_number
  ) as data
FROM conversations c

UNION ALL

SELECT 
  'annotation' as data_type,
  a.annotation_id as primary_id,
  a.created_at,
  a.metadata->>'export_label' as export_label,
  jsonb_build_object(
    'session_id', a.session_id,
    'bias_type', a.bias_type,
    'flagged_by', a.metadata->>'flagged_by_ai'
  ) as data
FROM annotations a

UNION ALL

SELECT 
  'vote' as data_type,
  v.id::TEXT as primary_id,
  v.created_at,
  'USER_VOTE' as export_label,
  jsonb_build_object(
    'session_id', v.session_id,
    'annotation_id', v.annotation_id,
    'vote_value', v.vote_value
  ) as data
FROM votes v

ORDER BY created_at DESC;

-- 6. Daily Statistics Dashboard
CREATE OR REPLACE VIEW daily_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_sessions,
  COUNT(DISTINCT metadata->>'browser') as unique_browsers,
  COUNT(DISTINCT metadata->>'language') as unique_languages
FROM sessions
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Success message
SELECT 'Views created successfully! Use these for organized data access.' as status;
