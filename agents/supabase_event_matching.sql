-- =====================================================
-- EVENT MATCHING SYSTEM
-- =====================================================
-- This migration creates tables and functions for the
-- Connect Players / Event Matching feature
-- =====================================================

-- 1. Event Settings Table (Global event state)
CREATE TABLE IF NOT EXISTS public.event_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_active BOOLEAN DEFAULT TRUE,
    event_ended BOOLEAN DEFAULT FALSE,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row
INSERT INTO public.event_settings (id, event_active, event_ended) 
VALUES (uuid_generate_v4(), TRUE, FALSE) 
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;

-- Policies for event_settings
DROP POLICY IF EXISTS "Public read event_settings" ON public.event_settings;
CREATE POLICY "Public read event_settings" ON public.event_settings 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public update event_settings" ON public.event_settings;
CREATE POLICY "Public update event_settings" ON public.event_settings 
FOR UPDATE USING (true);

-- 2. Player Matches Table (Cached matches)
CREATE TABLE IF NOT EXISTS public.player_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    match_type TEXT NOT NULL, 
    -- 'kmk_kiss', 'kmk_marry', 'kmk_kill', 'charades_faster', 'charades_slower'
    matched_player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    shared_character_id UUID REFERENCES public.kmk_characters(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, match_type)
);

-- Enable RLS
ALTER TABLE public.player_matches ENABLE ROW LEVEL SECURITY;

-- Policies for player_matches
DROP POLICY IF EXISTS "Public read player_matches" ON public.player_matches;
CREATE POLICY "Public read player_matches" ON public.player_matches 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert player_matches" ON public.player_matches;
CREATE POLICY "Public insert player_matches" ON public.player_matches 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update player_matches" ON public.player_matches;
CREATE POLICY "Public update player_matches" ON public.player_matches 
FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete player_matches" ON public.player_matches;
CREATE POLICY "Public delete player_matches" ON public.player_matches 
FOR DELETE USING (true);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_matches_player_id ON public.player_matches(player_id);
CREATE INDEX IF NOT EXISTS idx_player_matches_matched_player_id ON public.player_matches(matched_player_id);
CREATE INDEX IF NOT EXISTS idx_player_matches_match_type ON public.player_matches(match_type);

-- 4. Function to generate matches for all players
CREATE OR REPLACE FUNCTION generate_all_matches()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    player_record RECORD;
BEGIN
    -- Clear existing matches
    DELETE FROM public.player_matches;
    
    -- Loop through all players
    FOR player_record IN SELECT id FROM public.players LOOP
        PERFORM generate_matches_for_player(player_record.id);
    END LOOP;
END;
$$;

-- 5. Function to generate matches for a single player
CREATE OR REPLACE FUNCTION generate_matches_for_player(p_player_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    kmk_result RECORD;
    match_player_id UUID;
    char_id UUID;
BEGIN
    -- Get player's KMK results
    SELECT * INTO kmk_result FROM public.kmk_results 
    WHERE player_id = p_player_id 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF kmk_result IS NOT NULL THEN
        -- Match for Kiss slot 1
        IF kmk_result.kiss_char_id IS NOT NULL THEN
            SELECT player_id INTO match_player_id
            FROM public.kmk_results
            WHERE player_id != p_player_id
            AND (kiss_char_id = kmk_result.kiss_char_id OR kiss_char_id_2 = kmk_result.kiss_char_id)
            ORDER BY RANDOM()
            LIMIT 1;
            
            IF match_player_id IS NOT NULL THEN
                INSERT INTO public.player_matches (player_id, match_type, matched_player_id, shared_character_id)
                VALUES (p_player_id, 'kmk_kiss', match_player_id, kmk_result.kiss_char_id)
                ON CONFLICT (player_id, match_type) DO UPDATE 
                SET matched_player_id = EXCLUDED.matched_player_id,
                    shared_character_id = EXCLUDED.shared_character_id;
            END IF;
        END IF;
        
        -- Match for Kiss slot 2 (if no match found for slot 1)
        IF match_player_id IS NULL AND kmk_result.kiss_char_id_2 IS NOT NULL THEN
            SELECT player_id INTO match_player_id
            FROM public.kmk_results
            WHERE player_id != p_player_id
            AND (kiss_char_id = kmk_result.kiss_char_id_2 OR kiss_char_id_2 = kmk_result.kiss_char_id_2)
            ORDER BY RANDOM()
            LIMIT 1;
            
            IF match_player_id IS NOT NULL THEN
                INSERT INTO public.player_matches (player_id, match_type, matched_player_id, shared_character_id)
                VALUES (p_player_id, 'kmk_kiss', match_player_id, kmk_result.kiss_char_id_2)
                ON CONFLICT (player_id, match_type) DO UPDATE 
                SET matched_player_id = EXCLUDED.matched_player_id,
                    shared_character_id = EXCLUDED.shared_character_id;
            END IF;
        END IF;
        
        -- Reset for next match type
        match_player_id := NULL;
        
        -- Match for Marry slot 1
        IF kmk_result.marry_char_id IS NOT NULL THEN
            SELECT player_id INTO match_player_id
            FROM public.kmk_results
            WHERE player_id != p_player_id
            AND (marry_char_id = kmk_result.marry_char_id OR marry_char_id_2 = kmk_result.marry_char_id)
            ORDER BY RANDOM()
            LIMIT 1;
            
            IF match_player_id IS NOT NULL THEN
                INSERT INTO public.player_matches (player_id, match_type, matched_player_id, shared_character_id)
                VALUES (p_player_id, 'kmk_marry', match_player_id, kmk_result.marry_char_id)
                ON CONFLICT (player_id, match_type) DO UPDATE 
                SET matched_player_id = EXCLUDED.matched_player_id,
                    shared_character_id = EXCLUDED.shared_character_id;
            END IF;
        END IF;
        
        -- Match for Marry slot 2 (if no match found for slot 1)
        IF match_player_id IS NULL AND kmk_result.marry_char_id_2 IS NOT NULL THEN
            SELECT player_id INTO match_player_id
            FROM public.kmk_results
            WHERE player_id != p_player_id
            AND (marry_char_id = kmk_result.marry_char_id_2 OR marry_char_id_2 = kmk_result.marry_char_id_2)
            ORDER BY RANDOM()
            LIMIT 1;
            
            IF match_player_id IS NOT NULL THEN
                INSERT INTO public.player_matches (player_id, match_type, matched_player_id, shared_character_id)
                VALUES (p_player_id, 'kmk_marry', match_player_id, kmk_result.marry_char_id_2)
                ON CONFLICT (player_id, match_type) DO UPDATE 
                SET matched_player_id = EXCLUDED.matched_player_id,
                    shared_character_id = EXCLUDED.shared_character_id;
            END IF;
        END IF;
        
        -- Reset for next match type
        match_player_id := NULL;
        
        -- Match for Kill slot 1
        IF kmk_result.kill_char_id IS NOT NULL THEN
            SELECT player_id INTO match_player_id
            FROM public.kmk_results
            WHERE player_id != p_player_id
            AND (kill_char_id = kmk_result.kill_char_id OR kill_char_id_2 = kmk_result.kill_char_id)
            ORDER BY RANDOM()
            LIMIT 1;
            
            IF match_player_id IS NOT NULL THEN
                INSERT INTO public.player_matches (player_id, match_type, matched_player_id, shared_character_id)
                VALUES (p_player_id, 'kmk_kill', match_player_id, kmk_result.kill_char_id)
                ON CONFLICT (player_id, match_type) DO UPDATE 
                SET matched_player_id = EXCLUDED.matched_player_id,
                    shared_character_id = EXCLUDED.shared_character_id;
            END IF;
        END IF;
        
        -- Match for Kill slot 2 (if no match found for slot 1)
        IF match_player_id IS NULL AND kmk_result.kill_char_id_2 IS NOT NULL THEN
            SELECT player_id INTO match_player_id
            FROM public.kmk_results
            WHERE player_id != p_player_id
            AND (kill_char_id = kmk_result.kill_char_id_2 OR kill_char_id_2 = kmk_result.kill_char_id_2)
            ORDER BY RANDOM()
            LIMIT 1;
            
            IF match_player_id IS NOT NULL THEN
                INSERT INTO public.player_matches (player_id, match_type, matched_player_id, shared_character_id)
                VALUES (p_player_id, 'kmk_kill', match_player_id, kmk_result.kill_char_id_2)
                ON CONFLICT (player_id, match_type) DO UPDATE 
                SET matched_player_id = EXCLUDED.matched_player_id,
                    shared_character_id = EXCLUDED.shared_character_id;
            END IF;
        END IF;
    END IF;
    
    -- Charades speed matching (find similar performance)
    -- Get player's average performance from charades
    DECLARE
        player_avg_score NUMERIC;
        match_player RECORD;
    BEGIN
        SELECT AVG(score) INTO player_avg_score
        FROM public.charades_lobby_players clp
        JOIN public.charades_lobbies cl ON clp.lobby_id = cl.id
        WHERE clp.player_id = p_player_id
        AND cl.status = 'finished';
        
        IF player_avg_score IS NOT NULL AND player_avg_score > 0 THEN
            -- Find player with similar score (±20% range)
            SELECT clp.player_id INTO match_player
            FROM public.charades_lobby_players clp
            JOIN public.charades_lobbies cl ON clp.lobby_id = cl.id
            WHERE clp.player_id != p_player_id
            AND cl.status = 'finished'
            GROUP BY clp.player_id
            HAVING AVG(clp.score) BETWEEN (player_avg_score * 0.8) AND (player_avg_score * 1.2)
            ORDER BY ABS(AVG(clp.score) - player_avg_score)
            LIMIT 1;
            
            IF match_player.player_id IS NOT NULL THEN
                -- Determine if match is faster or slower
                DECLARE
                    match_avg_score NUMERIC;
                BEGIN
                    SELECT AVG(score) INTO match_avg_score
                    FROM public.charades_lobby_players
                    WHERE player_id = match_player.player_id;
                    
                    IF match_avg_score > player_avg_score THEN
                        INSERT INTO public.player_matches (player_id, match_type, matched_player_id)
                        VALUES (p_player_id, 'charades_faster', match_player.player_id)
                        ON CONFLICT (player_id, match_type) DO UPDATE 
                        SET matched_player_id = EXCLUDED.matched_player_id;
                    ELSE
                        INSERT INTO public.player_matches (player_id, match_type, matched_player_id)
                        VALUES (p_player_id, 'charades_slower', match_player.player_id)
                        ON CONFLICT (player_id, match_type) DO UPDATE 
                        SET matched_player_id = EXCLUDED.matched_player_id;
                    END IF;
                END;
            END IF;
        END IF;
    END;
END;
$$;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE 'Event matching system created successfully!';
    RAISE NOTICE 'Run SELECT generate_all_matches(); to generate matches when event ends.';
END $$;
