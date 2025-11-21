-- CLEAR ALL DATA FROM SUPABASE
-- Run this in Supabase SQL Editor to delete all test data

-- Delete in reverse order (child tables first to avoid foreign key issues)
DELETE FROM votes;
DELETE FROM annotations;
DELETE FROM conversations;
DELETE FROM benchmarks;
DELETE FROM sessions;

-- Verify all data is cleared
SELECT 
  'Sessions' as table_name, COUNT(*) as remaining_rows FROM sessions
UNION ALL
SELECT 'Benchmarks', COUNT(*) FROM benchmarks
UNION ALL
SELECT 'Conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'Annotations', COUNT(*) FROM annotations
UNION ALL
SELECT 'Votes', COUNT(*) FROM votes;

-- All should show 0 rows
