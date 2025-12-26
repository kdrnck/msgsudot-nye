-- =====================================================
-- KMK 6 CHARACTERS MIGRATION
-- =====================================================
-- This migration updates the kmk_results table to support
-- 6 characters (2 kiss, 2 marry, 2 kill) instead of 3
-- =====================================================

-- Add new columns for the second character in each category
ALTER TABLE public.kmk_results 
ADD COLUMN IF NOT EXISTS kiss_char_id_2 UUID REFERENCES public.kmk_characters(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS marry_char_id_2 UUID REFERENCES public.kmk_characters(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS kill_char_id_2 UUID REFERENCES public.kmk_characters(id) ON DELETE SET NULL;

-- Create indexes for the new columns to improve query performance
CREATE INDEX IF NOT EXISTS idx_kmk_results_kiss_char_id_2 ON public.kmk_results(kiss_char_id_2);
CREATE INDEX IF NOT EXISTS idx_kmk_results_marry_char_id_2 ON public.kmk_results(marry_char_id_2);
CREATE INDEX IF NOT EXISTS idx_kmk_results_kill_char_id_2 ON public.kmk_results(kill_char_id_2);

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE 'KMK 6 characters migration completed successfully!';
    RAISE NOTICE 'The kmk_results table now supports 6 characters (2 kiss, 2 marry, 2 kill).';
END $$;
