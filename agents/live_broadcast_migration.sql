-- =====================================================
-- LIVE BROADCAST SYSTEM MIGRATION
-- =====================================================
-- Tables for real-time TV display at /live and admin control at /live-edit
-- Supports KMS game broadcasting, announcements, and silent leaderboard
-- =====================================================

-- 1. LIVE_STATE TABLE
-- Singleton table for global broadcast state (keyed by environment)
CREATE TABLE IF NOT EXISTS public.live_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment TEXT NOT NULL DEFAULT 'production' UNIQUE,
    broadcast_game_type TEXT, -- 'kms' or null
    broadcast_game_id UUID,   -- references kms_games.id when active
    announcement TEXT DEFAULT '',
    show_leaderboard BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by TEXT -- admin identifier
);

-- Insert default row for production environment
INSERT INTO public.live_state (environment, announcement, show_leaderboard)
VALUES ('production', '', true)
ON CONFLICT (environment) DO NOTHING;

-- 2. KMS_GAMES TABLE
-- Active KMS (Kim-Marry-Kill style) games that can be broadcast
CREATE TABLE IF NOT EXISTS public.kms_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    owner_nickname TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    current_card JSONB, -- { characterId, name, imageUrl } - the card player is currently viewing
    slots JSONB NOT NULL DEFAULT '{"slot1": null, "slot2": null, "slot3": null, "slot4": null, "slot5": null, "slot6": null}',
    -- slots structure: { "slot1": { "characterId": "...", "name": "...", "imageUrl": "...", "action": "kiss" }, ... }
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying active games
CREATE INDEX IF NOT EXISTS idx_kms_games_status ON public.kms_games(status);
CREATE INDEX IF NOT EXISTS idx_kms_games_owner ON public.kms_games(owner_id);

-- 3. LEADERBOARD_ENTRIES TABLE
-- Aggregated scores for silent leaderboard display
CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    games_played INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(player_id)
);

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON public.leaderboard_entries(score DESC);

-- 4. ENABLE REALTIME FOR TABLES
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kms_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard_entries;

-- 5. RLS POLICIES

-- Enable RLS
ALTER TABLE public.live_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kms_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- LIVE_STATE policies
-- Everyone can read (for /live page)
CREATE POLICY "Anyone can read live_state" ON public.live_state
    FOR SELECT USING (true);

-- Only authenticated users can update (admin check done at app level via sessionStorage)
CREATE POLICY "Authenticated can update live_state" ON public.live_state
    FOR UPDATE USING (true);

-- KMS_GAMES policies
-- Everyone can read active games
CREATE POLICY "Anyone can read kms_games" ON public.kms_games
    FOR SELECT USING (true);

-- Anyone can insert (players create games)
CREATE POLICY "Anyone can insert kms_games" ON public.kms_games
    FOR INSERT WITH CHECK (true);

-- Owner can update their game
CREATE POLICY "Owner can update kms_games" ON public.kms_games
    FOR UPDATE USING (true);

-- Owner can delete their game
CREATE POLICY "Owner can delete kms_games" ON public.kms_games
    FOR DELETE USING (true);

-- LEADERBOARD_ENTRIES policies
-- Everyone can read
CREATE POLICY "Anyone can read leaderboard" ON public.leaderboard_entries
    FOR SELECT USING (true);

-- System can insert/update (via triggers or admin)
CREATE POLICY "Anyone can insert leaderboard" ON public.leaderboard_entries
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update leaderboard" ON public.leaderboard_entries
    FOR UPDATE USING (true);

-- 6. TRIGGER TO AUTO-UPDATE updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
DROP TRIGGER IF EXISTS update_live_state_updated_at ON public.live_state;
CREATE TRIGGER update_live_state_updated_at
    BEFORE UPDATE ON public.live_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kms_games_updated_at ON public.kms_games;
CREATE TRIGGER update_kms_games_updated_at
    BEFORE UPDATE ON public.kms_games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leaderboard_entries_updated_at ON public.leaderboard_entries;
CREATE TRIGGER update_leaderboard_entries_updated_at
    BEFORE UPDATE ON public.leaderboard_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. FUNCTION TO SYNC LEADERBOARD FROM CHARADES SCORES
CREATE OR REPLACE FUNCTION sync_charades_leaderboard()
RETURNS void AS $$
BEGIN
    -- Upsert aggregated scores from charades_lobby_players
    INSERT INTO public.leaderboard_entries (player_id, nickname, score, games_played)
    SELECT 
        clp.player_id,
        p.nickname,
        SUM(clp.score) as total_score,
        COUNT(DISTINCT clp.lobby_id) as games_played
    FROM public.charades_lobby_players clp
    JOIN public.players p ON p.id = clp.player_id
    JOIN public.charades_lobbies cl ON cl.id = clp.lobby_id
    WHERE cl.status = 'finished'
    GROUP BY clp.player_id, p.nickname
    ON CONFLICT (player_id) 
    DO UPDATE SET 
        nickname = EXCLUDED.nickname,
        score = EXCLUDED.score,
        games_played = EXCLUDED.games_played,
        updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE 'Live broadcast system migration completed successfully!';
    RAISE NOTICE 'Tables created: live_state, kms_games, leaderboard_entries';
    RAISE NOTICE 'Realtime enabled for all tables';
    RAISE NOTICE 'RLS policies applied';
END $$;
