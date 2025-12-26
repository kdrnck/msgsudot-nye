-- =====================================================
-- CHARADES SCORE ATOMIC INCREMENT FIX
-- =====================================================
-- This fixes the race condition where different players
-- see different scores due to stale local state.
-- =====================================================

-- Create an RPC function for atomic score increment
CREATE OR REPLACE FUNCTION increment_charades_score(
    p_lobby_player_id UUID
)
RETURNS TABLE (
    id UUID,
    lobby_id UUID,
    player_id UUID,
    score INTEGER,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Atomically increment the score and return the updated row
    RETURN QUERY
    UPDATE charades_lobby_players
    SET score = score + 1
    WHERE charades_lobby_players.id = p_lobby_player_id
    RETURNING 
        charades_lobby_players.id,
        charades_lobby_players.lobby_id,
        charades_lobby_players.player_id,
        charades_lobby_players.score,
        charades_lobby_players.is_active;
END;
$$;

-- Grant execute permission to all users (since charades is public)
GRANT EXECUTE ON FUNCTION increment_charades_score(UUID) TO anon, authenticated;

-- Add a comment explaining the function
COMMENT ON FUNCTION increment_charades_score IS 
'Atomically increments a charades player score by 1. Prevents race conditions where multiple clients read stale state and overwrite each other.';
