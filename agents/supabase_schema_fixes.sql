-- Fix RLS policies to allow insert/update/delete operations
-- Run this in Supabase SQL Editor

-- Charades Tasks - Add insert/update/delete policies
DO $$
BEGIN
    CREATE POLICY "Public insert tasks" ON public.charades_tasks FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Public update tasks" ON public.charades_tasks FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Public delete tasks" ON public.charades_tasks FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- KMK Characters - Add update/delete policies
DO $$
BEGIN
    CREATE POLICY "Public update characters" ON public.kmk_characters FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Public delete characters" ON public.kmk_characters FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Achievements - Add insert/update/delete policies
DO $$
BEGIN
    CREATE POLICY "Public insert achievements" ON public.achievements FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Public update achievements" ON public.achievements FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Public delete achievements" ON public.achievements FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
