-- Fix Supabase Row Level Security for IPO Table
-- Run this in Supabase SQL Editor

-- Option 1: Disable RLS (simplest for now)
ALTER TABLE ipos DISABLE ROW LEVEL SECURITY;

-- Option 2: Or keep RLS enabled but allow all operations (more secure)
-- Uncomment these lines if you prefer Option 2:
-- 
-- ALTER TABLE ipos ENABLE ROW LEVEL SECURITY;
-- 
-- -- Drop existing policies if any
-- DROP POLICY IF EXISTS "Allow public read access" ON ipos;
-- DROP POLICY IF EXISTS "Allow public insert access" ON ipos;
-- DROP POLICY IF EXISTS "Allow public update access" ON ipos;
-- 
-- -- Create policies for public access
-- CREATE POLICY "Allow public read access" ON ipos
--   FOR SELECT USING (true);
-- 
-- CREATE POLICY "Allow public insert access" ON ipos
--   FOR INSERT WITH CHECK (true);
-- 
-- CREATE POLICY "Allow public update access" ON ipos
--   FOR UPDATE USING (true);

-- Verify the change
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'ipos';
