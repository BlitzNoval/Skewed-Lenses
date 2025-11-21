-- Fix RLS policies to allow UPDATE on sessions table

-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Allow anonymous update on sessions" ON sessions;

-- Create proper UPDATE policy for sessions
CREATE POLICY "Allow anonymous update on sessions" ON sessions
  FOR UPDATE TO anon 
  USING (true)
  WITH CHECK (true);
