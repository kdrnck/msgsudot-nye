// Live Broadcast State Management
// Real-time hooks and types for /live and /live-edit pages

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from './supabase'

// ==================== TYPES ====================

export interface LiveState {
    id: string
    environment: string
    broadcast_game_type: 'kms' | null
    broadcast_game_id: string | null
    announcement: string
    show_leaderboard: boolean
    show_qr: boolean
    updated_at: string
    updated_by: string | null
}

export interface KmsSlot {
    characterId: string
    name: string
    imageUrl: string
    action: 'kiss' | 'marry' | 'kill'
}

export interface KmsSlots {
    slot1: KmsSlot | null
    slot2: KmsSlot | null
    slot3: KmsSlot | null
    slot4: KmsSlot | null
    slot5: KmsSlot | null
    slot6: KmsSlot | null
}

export interface CurrentCard {
    characterId: string
    name: string
    imageUrl: string
    category?: string
}

export interface KmsGame {
    id: string
    owner_id: string
    owner_nickname: string
    status: 'active' | 'completed' | 'abandoned'
    current_card: CurrentCard | null
    slots: KmsSlots
    created_at: string
    updated_at: string
}

export interface LeaderboardEntry {
    id: string
    player_id: string
    nickname: string
    score: number
    games_played: number
    updated_at: string
}

// ==================== HOOKS ====================

/**
 * Hook to subscribe to live_state changes
 * Used by both /live (read-only) and /live-edit (read-write)
 */
export function useLiveState() {
    const [liveState, setLiveState] = useState<LiveState | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Initial fetch
        const fetchLiveState = async () => {
            const { data, error } = await supabase
                .from('live_state')
                .select('*')
                .eq('environment', 'production')
                .single()

            if (error) {
                console.error('Error fetching live_state:', error)
                setError(error.message)
            } else {
                setLiveState(data as LiveState)
            }
            setLoading(false)
        }

        fetchLiveState()

        // Subscribe to realtime changes
        const channel = supabase
            .channel('live_state_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'live_state',
                    filter: 'environment=eq.production'
                },
                (payload) => {
                    console.log('live_state change:', payload)
                    if (payload.new) {
                        setLiveState(payload.new as LiveState)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    return { liveState, loading, error }
}

/**
 * Hook to subscribe to a specific KMS game's updates
 * Used by /live when a game is being broadcast
 */
export function useKmsGame(gameId: string | null) {
    const [game, setGame] = useState<KmsGame | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

    useEffect(() => {
        if (!gameId) {
            setGame(null)
            setLoading(false)
            return
        }

        // Initial fetch
        const fetchGame = async () => {
            const { data, error } = await supabase
                .from('kms_games')
                .select('*')
                .eq('id', gameId)
                .single()

            if (error) {
                console.error('Error fetching kms_game:', error)
                setError(error.message)
                setGame(null)
            } else {
                setGame(data as KmsGame)
            }
            setLoading(false)
        }

        fetchGame()

        // Subscribe to realtime changes for this game
        const channel = supabase
            .channel(`kms_game_${gameId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'kms_games',
                    filter: `id=eq.${gameId}`
                },
                (payload) => {
                    console.log('kms_game change:', payload)
                    if (payload.eventType === 'DELETE') {
                        setGame(null)
                    } else if (payload.new) {
                        setGame(payload.new as KmsGame)
                    }
                }
            )
            .subscribe()

        channelRef.current = channel

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
            }
        }
    }, [gameId])

    return { game, loading, error }
}

/**
 * Hook to get list of active KMS games
 * Used by /live-edit to show available games for broadcast
 */
export function useActiveKmsGames() {
    const [games, setGames] = useState<KmsGame[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchGames = useCallback(async () => {
        const { data, error } = await supabase
            .from('kms_games')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching active kms_games:', error)
            setError(error.message)
        } else {
            setGames(data as KmsGame[])
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchGames()

        // Subscribe to all kms_games changes
        const channel = supabase
            .channel('kms_games_list')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'kms_games'
                },
                () => {
                    // Refetch on any change
                    fetchGames()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchGames])

    return { games, loading, error, refetch: fetchGames }
}

/**
 * Hook to get leaderboard entries
 * Used by /live for silent leaderboard display
 */
export function useLeaderboard(limit: number = 10) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchLeaderboard = useCallback(async () => {
        const { data, error } = await supabase
            .from('leaderboard_entries')
            .select('*')
            .order('score', { ascending: false })
            .limit(limit)

        if (error) {
            console.error('Error fetching leaderboard:', error)
            setError(error.message)
        } else {
            setEntries(data as LeaderboardEntry[])
        }
        setLoading(false)
    }, [limit])

    useEffect(() => {
        fetchLeaderboard()

        // Subscribe to leaderboard changes
        const channel = supabase
            .channel('leaderboard_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'leaderboard_entries'
                },
                () => {
                    fetchLeaderboard()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchLeaderboard])

    return { entries, loading, error, refetch: fetchLeaderboard }
}

// ==================== ACTIONS ====================

/**
 * Update live_state (admin only)
 */
export async function updateLiveState(updates: Partial<LiveState>) {
    const { data, error } = await supabase
        .from('live_state')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('environment', 'production')
        .select()
        .single()

    if (error) {
        console.error('Error updating live_state:', error)
        throw error
    }

    return data as LiveState
}

/**
 * Set the broadcast game
 */
export async function setBroadcastGame(gameId: string | null, gameType: 'kms' | null = 'kms') {
    return updateLiveState({
        broadcast_game_id: gameId,
        broadcast_game_type: gameId ? gameType : null
    })
}

/**
 * Update announcement
 */
export async function updateAnnouncement(announcement: string) {
    return updateLiveState({ announcement })
}

/**
 * Toggle leaderboard visibility
 */
export async function toggleLeaderboard(show: boolean) {
    return updateLiveState({ show_leaderboard: show })
}

/**
 * Toggle QR code visibility
 */
export async function toggleQrCode(show: boolean) {
    return updateLiveState({ show_qr: show })
}

/**
 * Create a new KMS game
 */
export async function createKmsGame(ownerId: string, ownerNickname: string): Promise<KmsGame> {
    const { data, error } = await supabase
        .from('kms_games')
        .insert({
            owner_id: ownerId,
            owner_nickname: ownerNickname,
            status: 'active',
            slots: {
                slot1: null,
                slot2: null,
                slot3: null,
                slot4: null,
                slot5: null,
                slot6: null
            }
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating kms_game:', error)
        throw error
    }

    return data as KmsGame
}

/**
 * Update KMS game state (current card, slots)
 */
export async function updateKmsGame(gameId: string, updates: Partial<Pick<KmsGame, 'current_card' | 'slots' | 'status'>>) {
    const { data, error } = await supabase
        .from('kms_games')
        .update(updates)
        .eq('id', gameId)
        .select()
        .single()

    if (error) {
        console.error('Error updating kms_game:', error)
        throw error
    }

    return data as KmsGame
}

/**
 * End/complete a KMS game
 */
export async function completeKmsGame(gameId: string) {
    return updateKmsGame(gameId, { status: 'completed' })
}

/**
 * Delete a KMS game (admin cleanup)
 */
export async function deleteKmsGame(gameId: string) {
    const { error } = await supabase
        .from('kms_games')
        .delete()
        .eq('id', gameId)

    if (error) {
        console.error('Error deleting kms_game:', error)
        throw error
    }
}

/**
 * Sync leaderboard from charades scores
 */
export async function syncLeaderboard() {
    const { error } = await supabase.rpc('sync_charades_leaderboard')
    if (error) {
        console.error('Error syncing leaderboard:', error)
        throw error
    }
}

// ==================== UTILITIES ====================

/**
 * Debounce helper for burst updates
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])

    return debouncedValue
}

/**
 * Get Supabase storage URL for character image
 */
export function getCharacterImageUrl(imagePath: string): string {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${imagePath}`
}
