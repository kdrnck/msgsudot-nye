-- =====================================================
-- HIRING APPLICATIONS TABLE FIX
-- =====================================================
-- The original schema file had encoding corruption.
-- Run this SQL in Supabase SQL Editor to create the table.
-- =====================================================

-- Hiring Applications Table
CREATE TABLE IF NOT EXISTS public.hiring_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    full_name TEXT NOT NULL,
    contact_info TEXT NOT NULL,
    role_type TEXT NOT NULL, -- 'graphic_design', 'data_analyst', 'referral', 'general'
    reviewed BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE public.hiring_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public insert to applications" ON public.hiring_applications;
DROP POLICY IF EXISTS "Allow public read applications" ON public.hiring_applications;
DROP POLICY IF EXISTS "Allow public update applications" ON public.hiring_applications;
DROP POLICY IF EXISTS "Allow public delete applications" ON public.hiring_applications;

-- Allow public insert (anyone can apply)
CREATE POLICY "Allow public insert to applications" 
ON public.hiring_applications FOR INSERT 
WITH CHECK (true);

-- Allow public read (for admin panel)
CREATE POLICY "Allow public read applications" 
ON public.hiring_applications FOR SELECT 
USING (true);

-- Allow update for marking as reviewed
CREATE POLICY "Allow public update applications" 
ON public.hiring_applications FOR UPDATE 
USING (true);

-- Allow delete
CREATE POLICY "Allow public delete applications" 
ON public.hiring_applications FOR DELETE 
USING (true);
