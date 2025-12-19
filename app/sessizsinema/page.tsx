"use client"

import { Suspense } from "react"
import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { auth, UserSession } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, User, Mic, Play, CheckCircle, RotateCw, SkipForward, Home, Plus, ArrowRight, Users, Globe, Clock, LogOut, History, X, Trophy, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/LanguageContext"
import { useTheme } from "@/components/ClientProviders"
import {
    GameState,
    Lobby,
    Player,
    LobbyPlayer,
    CharadesTask,
    createInitialGameState,
    getNextTurnInfo,
    buildTaskQueue,
    gameTranslations,
} from "@/lib/charades-types"

const REVEAL_DURATION_MS = 4000
const WATCHDOG_INTERVAL_MS = 8000
const POLL_INTERVAL_MS = 3000
const LOBBY_POLL_INTERVAL_MS = 2000

function gt(key: keyof typeof gameTranslations.tr, lang: 'tr' | 'en'): string {
    return gameTranslations[lang][key] || gameTranslations.tr[key]
}

export default function CharadesGamePageWrapper() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin" /></div>}>
            <CharadesGamePage />
        </Suspense>
    )
}

function CharadesGamePage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const code = searchParams.get('code')
    const { t, language, setLanguage } = useLanguage()
    const { isDark, toggle } = useTheme()
    const lang = language as 'tr' | 'en'

    const [user, setUser] = useState<UserSession | null>(null)
    const [loading, setLoading] = useState(true)
    const [lobby, setLobby] = useState<Lobby | null>(null)
    const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([])
    const [playersMap, setPlayersMap] = useState<Record<string, Player>>({})
    const [timeLeft, setTimeLeft] = useState<number>(0)
    const [showConfirmDialog, setShowConfirmDialog] = useState<'disband' | 'leave' | null>(null)
    const [actionLoading, setActionLoading] = useState(false)

    const audioRef = useRef<HTMLAudioElement | null>(null)
    const audioPlayedRef = useRef(false)
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
    const lobbyWatchdogTriggeredRef = useRef(false)
    const transitioningRef = useRef(false)

    const [toastState, setToastState] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null)
    const toastTimeoutRef = useRef<number | null>(null)

    const showToast = useCallback((message: string, variant: 'success' | 'error' | 'info' = 'success', durationMs: number = 3000) => {
        setToastState({ message, variant })
        if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current)
        toastTimeoutRef.current = window.setTimeout(() => {
            setToastState(null)
            toastTimeoutRef.current = null
        }, durationMs)
    }, [])

    const ToastOverlay = useCallback(() => {
        if (!toastState) return null
        const bgClass = {
            success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
            error: 'bg-red-500/15 border-red-500/30 text-red-300',
            info: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
        }[toastState.variant]
        return (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className={cn('px-5 py-3 rounded-xl shadow-lg border backdrop-blur-md max-w-[90vw]', bgClass)}>
                    <div className="font-semibold text-sm text-center">{toastState.message}</div>
                </div>
            </div>
        )
    }, [toastState])

    const ConfirmDialog = useCallback(() => {
        if (!showConfirmDialog) return null
        const isDisband = showConfirmDialog === 'disband'
        const title = isDisband ? gt('disbandLobby', lang) : gt('leaveGame', lang)
        const message = isDisband ? gt('confirmDisband', lang) : gt('confirmLeave', lang)
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-card border rounded-2xl p-6 max-w-sm w-[90vw] shadow-2xl animate-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-bold mb-2">{title}</h3>
                    <p className="text-muted-foreground text-sm mb-6">{message}</p>
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setShowConfirmDialog(null)} disabled={actionLoading}>
                            {lang === 'tr' ? 'İptal' : 'Cancel'}
                        </Button>
                        <Button variant="destructive" className="flex-1" onClick={() => isDisband ? handleDisbandLobby() : handleLeaveLobby()} disabled={actionLoading}>
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (lang === 'tr' ? 'Evet' : 'Yes')}
                        </Button>
                    </div>
                </div>
            </div>
        )
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showConfirmDialog, actionLoading, lang])

    const fetchPlayers = useCallback(async (lobbyId: string) => {
        const { data, error } = await supabase
            .from('charades_lobby_players')
            .select('id, lobby_id, player_id, score, player:players(id, nickname)')
            .eq('lobby_id', lobbyId)
        if (error) { console.error('Error fetching players:', error); return }
        if (data) {
            setLobbyPlayers(data.map(d => ({ id: d.id, lobby_id: d.lobby_id, player_id: d.player_id, score: d.score, is_active: true })))
            const pMap: Record<string, Player> = {}
            data.forEach((d: any) => { if (d.player) pMap[d.player.id] = d.player })
            setPlayersMap(pMap)
        }
    }, [])

    useEffect(() => {
        const session = auth.getSession()
        if (!session) { router.push('/'); return }
        setUser(session)
        if (code) { initGame(code, session) } else { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code])

    const initGame = async (lobbyCode: string, session: UserSession) => {
        const { data: initLobby, error } = await supabase.from('charades_lobbies').select('*').eq('code', lobbyCode).single()
        if (error || !initLobby) {
            showToast(lang === 'tr' ? 'Lobi bulunamadı' : 'Lobby not found', 'error')
            setTimeout(() => router.push('/sessizsinema'), 1000)
            return
        }
        setLobby(initLobby as Lobby)
        await fetchPlayers(initLobby.id)

        const channel = supabase.channel(`lobby_${initLobby.id}`, { config: { broadcast: { self: true }, presence: { key: session.id } } })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'charades_lobbies', filter: `id=eq.${initLobby.id}` }, (payload) => { 
                console.log('Lobby UPDATE received:', payload.new)
                setLobby(payload.new as Lobby) 
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'charades_lobby_players', filter: `lobby_id=eq.${initLobby.id}` }, () => { fetchPlayers(initLobby.id) })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'charades_lobbies', filter: `id=eq.${initLobby.id}` }, () => {
                if (!lobbyWatchdogTriggeredRef.current) {
                    lobbyWatchdogTriggeredRef.current = true
                    showToast(gt('lobbyDisbanded', lang), 'error', 3000)
                    setTimeout(() => router.push('/home'), 1000)
                }
            })

        try {
            const subscribed = await new Promise<boolean>((resolve) => {
                const timeout = setTimeout(() => resolve(false), 5000)
                channel.subscribe((status) => {
                    if (status === 'SUBSCRIBED') { clearTimeout(timeout); resolve(true) }
                    else if (status === 'CHANNEL_ERROR') { clearTimeout(timeout); resolve(false) }
                })
            })
            if (!subscribed) showToast(gt('connectionLost', lang), 'error')
        } catch (err) { console.error('Subscription error:', err); showToast(gt('connectionLost', lang), 'error') }

        channelRef.current = channel
        setLoading(false)
        if (typeof Audio !== "undefined") audioRef.current = new Audio('/audio/beep.mp3')
    }

    // Watchdog: only checks if lobby was deleted or canceled - not for regular updates
    useEffect(() => {
        if (!code || !user || !lobby?.id) return
        const interval = setInterval(async () => {
            if (lobbyWatchdogTriggeredRef.current) return
            const { data, error } = await supabase.from('charades_lobbies').select('id, status, current_game_state').eq('id', lobby.id).maybeSingle()
            if (error || !data) {
                lobbyWatchdogTriggeredRef.current = true
                showToast(gt('lobbyDisbandedShort', lang), 'error')
                setTimeout(() => router.push('/home'), 800)
                return
            }
            const gameState = data.current_game_state as GameState | null
            if (data.status === 'finished' && gameState?.phase === 'canceled' && user.id !== lobby.host_id) {
                lobbyWatchdogTriggeredRef.current = true
                showToast(gt('lobbyDisbanded', lang), 'error')
                setTimeout(() => router.push('/home'), 800)
            }
        }, WATCHDOG_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [code, user, lobby?.id, lobby?.host_id, router, showToast, lang])

    // Polling fallback for lobby state updates (in case realtime fails)
    useEffect(() => {
        if (!lobby?.id) return
        const interval = setInterval(async () => {
            const { data } = await supabase.from('charades_lobbies').select('*').eq('id', lobby.id).maybeSingle()
            if (data) setLobby(data as Lobby)
        }, LOBBY_POLL_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [lobby?.id])

    useEffect(() => { return () => { if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null } } }, [])

    useEffect(() => {
        if (!lobby || lobby.status !== 'waiting') return
        const interval = setInterval(() => { fetchPlayers(lobby.id) }, POLL_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [lobby?.id, lobby?.status, fetchPlayers])

    useEffect(() => {
        if (!lobby || lobby.status !== 'playing') return
        const state = lobby.current_game_state
        if (!state || state.phase !== 'playing') { audioPlayedRef.current = false; return }
        if (!state.timer.startedAtMs || state.timer.pausedAtMs) return

        const interval = setInterval(() => {
            const now = Date.now()
            const elapsed = Math.floor((now - state.timer.startedAtMs!) / 1000)
            const remaining = Math.max(0, state.timer.durationSec - elapsed)
            setTimeLeft(remaining)
            if (remaining === 5 && !audioPlayedRef.current && audioRef.current) { audioRef.current.play().catch(() => {}); audioPlayedRef.current = true }
            if (remaining === 0 && user?.id === state.turn.narratorId && !transitioningRef.current) { transitioningRef.current = true; handleTimeUp() }
        }, 250)
        return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lobby, user])

    useEffect(() => {
        if (!lobby || lobby.status !== 'playing') return
        const state = lobby.current_game_state
        if (!state || state.phase !== 'reveal' || !state.reveal) return
        const remaining = state.reveal.endsAtMs - Date.now()
        if (remaining <= 0 && user?.id === state.turn.narratorId && !transitioningRef.current) { transitioningRef.current = true; handleAfterReveal(); return }
        const timeout = setTimeout(() => {
            if (user?.id === state.turn.narratorId && !transitioningRef.current) { transitioningRef.current = true; handleAfterReveal() }
        }, remaining)
        return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lobby, user])

    useEffect(() => { transitioningRef.current = false; audioPlayedRef.current = false }, [lobby?.current_game_state?.turn?.globalTurnIndex, lobby?.current_game_state?.phase])

    const handleStartGame = async () => {
        if (!lobby || !user) return
        setActionLoading(true)
        try {
            const { data: tasks } = await supabase.from('charades_tasks').select('id, content')
            const totalTasksNeeded = lobby.tasks_per_player * lobbyPlayers.length
            if (!tasks || tasks.length < totalTasksNeeded) { showToast(gt('notEnoughTasks', lang), 'error'); setActionLoading(false); return }
            const playerOrder = lobbyPlayers.map(p => p.player_id).sort(() => Math.random() - 0.5)
            const taskQueue = buildTaskQueue(playerOrder, tasks as CharadesTask[], lobby.tasks_per_player)
            const gameState = createInitialGameState(playerOrder, taskQueue, lobby.tasks_per_player, lobby.round_time_seconds, user.id)
            const { data: updatedLobby, error } = await supabase.from('charades_lobbies').update({ status: 'playing', current_game_state: gameState }).eq('id', lobby.id).select().single()
            if (error) { console.error('Error starting game:', error); showToast(lang === 'tr' ? 'Oyun başlatılamadı' : 'Failed to start game', 'error'); setActionLoading(false); return }
            // Force local state update for host (realtime will update others)
            if (updatedLobby) setLobby(updatedLobby as Lobby)
        } catch (err) { console.error('Error starting game:', err); showToast(lang === 'tr' ? 'Oyun başlatılamadı' : 'Failed to start game', 'error') }
        setActionLoading(false)
    }

    const handleTimeUp = async () => {
        if (!lobby || !user) return
        const state = lobby.current_game_state
        if (!state) return
        const newState: GameState = { ...state, phase: 'time_up', timer: { ...state.timer, pausedAtMs: Date.now() }, version: state.version + 1, lastActionAt: Date.now(), lastActionBy: user.id }
        await supabase.from('charades_lobbies').update({ current_game_state: newState }).eq('id', lobby.id)
    }

    const handleContinueAfterTimeUp = async () => {
        if (!lobby || !user) return
        const state = lobby.current_game_state
        if (!state || state.phase !== 'time_up') return
        if (user.id !== state.turn.narratorId) return
        if (transitioningRef.current) return
        transitioningRef.current = true
        await advanceToNextTurn(state)
    }

    const handleCorrectGuess = async (guesserId: string) => {
        if (!lobby || !user) return
        const state = lobby.current_game_state
        if (!state || state.phase !== 'playing') return
        if (user.id !== state.turn.narratorId) return
        if (transitioningRef.current) return
        transitioningRef.current = true
        
        // Update score
        const guesserLobbyPlayer = lobbyPlayers.find(p => p.player_id === guesserId)
        if (guesserLobbyPlayer) {
            await supabase.from('charades_lobby_players').update({ score: guesserLobbyPlayer.score + 1 }).eq('id', guesserLobbyPlayer.id)
            fetchPlayers(lobby.id) // Refresh scores
        }
        
        const newState: GameState = {
            ...state, phase: 'reveal',
            reveal: { taskContent: state.turn.taskContent, correctPlayerId: guesserId, correctPlayerName: playersMap[guesserId]?.nickname || '?', endsAtMs: Date.now() + REVEAL_DURATION_MS },
            timer: { ...state.timer, pausedAtMs: Date.now() }, version: state.version + 1, lastActionAt: Date.now(), lastActionBy: user.id
        }
        const { data: updatedLobby } = await supabase.from('charades_lobbies').update({ current_game_state: newState }).eq('id', lobby.id).select().single()
        if (updatedLobby) setLobby(updatedLobby as Lobby)
    }

    const handleAfterReveal = async () => { if (!lobby || !user) return; const state = lobby.current_game_state; if (!state) return; await advanceToNextTurn(state) }

    const handleSkipWord = async () => {
        if (!lobby || !user) return
        const state = lobby.current_game_state
        if (!state || (state.phase !== 'playing' && state.phase !== 'time_up')) return
        if (user.id !== state.turn.narratorId) return
        if (transitioningRef.current) return
        transitioningRef.current = true
        await advanceToNextTurn(state)
    }

    const advanceToNextTurn = async (state: GameState) => {
        if (!lobby || !user) return
        const nextInfo = getNextTurnInfo(state)
        if (nextInfo.isGameOver) {
            const finishedState: GameState = { ...state, phase: 'finished', timer: { ...state.timer, startedAtMs: null, pausedAtMs: null }, reveal: undefined, version: state.version + 1, lastActionAt: Date.now(), lastActionBy: user.id }
            const { data: updatedLobby } = await supabase.from('charades_lobbies').update({ status: 'finished', current_game_state: finishedState }).eq('id', lobby.id).select().single()
            if (updatedLobby) setLobby(updatedLobby as Lobby)
        } else if (nextInfo.nextTurn) {
            const newState: GameState = { ...state, phase: 'playing', turn: nextInfo.nextTurn, timer: { startedAtMs: Date.now(), durationSec: state.roundDurationSec, pausedAtMs: null }, reveal: undefined, version: state.version + 1, lastActionAt: Date.now(), lastActionBy: user.id }
            const { data: updatedLobby } = await supabase.from('charades_lobbies').update({ current_game_state: newState }).eq('id', lobby.id).select().single()
            if (updatedLobby) setLobby(updatedLobby as Lobby)
        }
    }

    const handleDisbandLobby = async () => {
        if (!lobby || !user || lobby.host_id !== user.id) return
        setActionLoading(true)
        try {
            const canceledState: GameState | null = lobby.current_game_state ? { ...lobby.current_game_state, phase: 'canceled', version: (lobby.current_game_state.version || 0) + 1, lastActionAt: Date.now(), lastActionBy: user.id } : null
            await supabase.from('charades_lobbies').update({ status: 'finished', current_game_state: canceledState }).eq('id', lobby.id)
            await new Promise(r => setTimeout(r, 300))
            await supabase.from('charades_lobby_players').delete().eq('lobby_id', lobby.id)
            await supabase.from('charades_lobbies').delete().eq('id', lobby.id)
            showToast(gt('lobbyDisbandedShort', lang), 'success')
            setTimeout(() => router.push('/sessizsinema'), 500)
        } catch (err) { console.error('Error disbanding:', err); showToast(lang === 'tr' ? 'Hata oluştu' : 'Error occurred', 'error') }
        setActionLoading(false)
        setShowConfirmDialog(null)
    }

    const handleLeaveLobby = async () => {
        if (!lobby || !user) return
        setActionLoading(true)
        try { await supabase.from('charades_lobby_players').delete().eq('lobby_id', lobby.id).eq('player_id', user.id); router.push('/sessizsinema') }
        catch (err) { console.error('Error leaving:', err); showToast(lang === 'tr' ? 'Hata oluştu' : 'Error occurred', 'error') }
        setActionLoading(false)
        setShowConfirmDialog(null)
    }

    if (loading) return <div className="flex justify-center items-center min-h-screen"><ToastOverlay /><Loader2 className="animate-spin w-8 h-8" /></div>
    if (!code && user) return <SessizSinemaLanding user={user} router={router} showToast={showToast} lang={lang} />
    if (!lobby || !user) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin w-8 h-8" /></div>

    const isHost = lobby.host_id === user.id

    if (lobby.status === 'waiting') {
        return (
            <div className="min-h-screen bg-background flex flex-col p-4">
                <ToastOverlay />
                <ConfirmDialog />
                <div className="flex justify-between items-center mb-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/home')}><Home className="w-5 h-5" /></Button>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')} className="p-2 rounded-lg bg-card/50 border border-border/50 text-muted-foreground hover:text-primary transition-all"><Globe className="w-4 h-4" /></button>
                        <button onClick={toggle} className="p-2 rounded-lg bg-card/50 border border-border/50 text-muted-foreground hover:text-primary transition-all">{isDark ? '☀️' : '🌙'}</button>
                    </div>
                </div>
                <div className="text-center mt-4 mb-6">
                    <h1 className="text-xl font-semibold mb-2 text-muted-foreground">{t('lobbyCode')}</h1>
                    <div className="text-5xl font-black tracking-widest text-primary font-mono">{lobby.code}</div>
                </div>
                <Card className="flex-1 mb-4 overflow-hidden flex flex-col">
                    <CardContent className="flex-1 p-0 flex flex-col">
                        <div className="bg-muted/50 p-3 font-semibold text-center border-b">{gt('players', lang)} ({lobbyPlayers.length})</div>
                        <div className="flex-1 overflow-auto p-4 space-y-2">
                            {lobbyPlayers.map((p) => (
                                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
                                    <span className="font-medium flex-1">{playersMap[p.player_id]?.nickname || '...'}</span>
                                    {p.player_id === lobby.host_id && <Badge variant="outline" className="bg-primary/10">HOST</Badge>}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <div className="space-y-3 mb-4">
                    {isHost ? (
                        <>
                            <Button size="lg" className="w-full h-14 text-lg" onClick={handleStartGame} disabled={actionLoading || lobbyPlayers.length < 2}>
                                {actionLoading ? <Loader2 className="animate-spin" /> : <>{gt('startGame', lang)} <Play className="ml-2 w-5 h-5 fill-current" /></>}
                            </Button>
                            <Button variant="outline" className="w-full" onClick={() => setShowConfirmDialog('disband')}><LogOut className="w-4 h-4 mr-2" /> {gt('disbandLobby', lang)}</Button>
                        </>
                    ) : (
                        <Button variant="outline" className="w-full h-14" onClick={() => setShowConfirmDialog('leave')}><LogOut className="w-4 h-4 mr-2" /> {gt('leaveLobby', lang)}</Button>
                    )}
                </div>
                <Footer />
            </div>
        )
    }

    if (lobby.status === 'playing') {
        const state = lobby.current_game_state
        if (!state || !state.turn || !state.taskQueue) {
            return <div className="p-4 text-center">
                <p className="text-muted-foreground mb-4">{lang === 'tr' ? 'Oyun durumu geçersiz' : 'Invalid game state'}</p>
                <Button onClick={() => router.push('/sessizsinema')}><Home className="w-4 h-4 mr-2" /> {lang === 'tr' ? 'Geri Dön' : 'Go Back'}</Button>
            </div>
        }
        const currentTurn = state.turn
        const isNarrator = currentTurn.narratorId === user.id
        const narratorName = playersMap[currentTurn.narratorId]?.nickname || '?'
        const totalTurns = state.taskQueue.length
        const currentTurnNum = currentTurn.globalTurnIndex + 1

        const GameUI = () => (
            <div className="flex-1 flex flex-col p-4">
                <div className="mb-4 bg-card/50 rounded-xl p-3 backdrop-blur-sm border border-border/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">{gt('gameProgress', lang)}</span>
                        <span className="text-xs text-muted-foreground">{gt('turn', lang)} {currentTurnNum}/{totalTurns}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary transition-all duration-500" style={{ width: `${(currentTurnNum / totalTurns) * 100}%` }} /></div>
                </div>
                <div className="flex justify-between items-center mb-6">
                    <Badge variant={isNarrator ? "secondary" : "outline"} className="text-base px-3 py-1">{gt('turn', lang)} {currentTurnNum}/{totalTurns}</Badge>
                    <div className={cn("text-3xl font-mono font-bold", timeLeft <= 10 && timeLeft > 0 && "text-destructive animate-pulse")}>{timeLeft}s</div>
                </div>
                {isNarrator ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
                        <div className="space-y-2">
                            <h2 className="text-lg opacity-80 uppercase tracking-widest">{gt('yourWord', lang)}</h2>
                            <div className="text-4xl sm:text-5xl font-black px-4">{state.turn.taskContent}</div>
                        </div>
                        <div className="w-full bg-white/10 rounded-xl p-4 backdrop-blur-sm max-w-md">
                            <h3 className="mb-4 font-semibold opacity-90">{gt('whoGuessed', lang)}</h3>
                            <div className="grid grid-cols-2 gap-3 max-h-[35vh] overflow-y-auto">
                                {lobbyPlayers.filter(p => p.player_id !== user.id).map(p => (
                                    <button key={p.id} onClick={() => handleCorrectGuess(p.player_id)} className="bg-white/20 hover:bg-white/30 p-3 rounded-xl flex items-center gap-2 transition-all active:scale-95">
                                        <CheckCircle className="w-5 h-5 flex-shrink-0" /><span className="font-bold truncate">{playersMap[p.player_id]?.nickname}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Button variant="secondary" onClick={handleSkipWord} className="mt-2"><SkipForward className="w-4 h-4 mr-2" /> {gt('skipWord', lang)}</Button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-8">
                        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-bounce"><Mic className="w-10 h-10 text-primary" /></div>
                        <div className="space-y-2"><h2 className="text-xl text-muted-foreground">{gt('narrator', lang)}</h2><div className="text-4xl font-bold text-primary">{narratorName}</div></div>
                        <div className="space-y-2"><h2 className="text-lg text-muted-foreground">{gt('remainingTime', lang)}</h2><div className={cn("text-5xl font-mono font-bold", timeLeft <= 10 && timeLeft > 0 && "text-destructive animate-pulse")}>{timeLeft}s</div></div>
                        <div className="p-6 border-2 border-dashed border-primary/30 rounded-xl w-full max-w-xs"><p className="font-medium text-lg animate-pulse">{gt('guessNow', lang)}</p></div>
                    </div>
                )}
                <div className="mt-4">
                    {isHost ? (
                        <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive" onClick={() => setShowConfirmDialog('disband')}><LogOut className="w-4 h-4 mr-2" /> {gt('disbandLobby', lang)}</Button>
                    ) : (
                        <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowConfirmDialog('leave')}><LogOut className="w-4 h-4 mr-2" /> {gt('leaveGame', lang)}</Button>
                    )}
                </div>
                <Footer />
            </div>
        )

        if (state.phase === 'time_up') {
            return (
                <div className="min-h-screen bg-background flex flex-col">
                    <ToastOverlay /><ConfirmDialog />
                    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                        <div className="text-center p-8 animate-in zoom-in-95 duration-300">
                            <Clock className="w-20 h-20 mx-auto mb-4 text-yellow-500 animate-pulse" />
                            <h2 className="text-4xl font-black text-yellow-500 mb-6">{gt('timeUp', lang)}</h2>
                            {isNarrator ? (
                                <Button size="lg" className="h-14 px-8 text-lg" onClick={handleContinueAfterTimeUp}>{gt('continueNext', lang)} <ArrowRight className="ml-2 w-5 h-5" /></Button>
                            ) : (
                                <p className="text-muted-foreground animate-pulse">{gt('waitingForNarrator', lang)}</p>
                            )}
                        </div>
                    </div>
                    <GameUI />
                </div>
            )
        }

        if (state.phase === 'reveal' && state.reveal) {
            return (
                <div className="min-h-screen bg-background flex flex-col">
                    <ToastOverlay /><ConfirmDialog />
                    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                        <div className="text-center p-8 animate-in zoom-in-95 duration-300">
                            <CheckCircle className="w-20 h-20 mx-auto mb-4 text-emerald-500" />
                            <h2 className="text-3xl font-black text-emerald-500 mb-2">{gt('correct', lang)}</h2>
                            <p className="text-xl mb-4"><span className="font-bold text-primary">{state.reveal.correctPlayerName}</span> {gt('guessedCorrectly', lang)}</p>
                            <div className="bg-card/80 rounded-2xl p-6 border-2 border-emerald-500/30">
                                <p className="text-sm text-muted-foreground mb-2">{lang === 'tr' ? 'Kelime' : 'Word'}</p>
                                <p className="text-3xl font-black text-primary">{state.reveal.taskContent}</p>
                            </div>
                        </div>
                    </div>
                    <GameUI />
                </div>
            )
        }

        return (
            <div className={cn("min-h-screen flex flex-col transition-colors duration-500", isNarrator ? "bg-primary text-primary-foreground" : "bg-background")}>
                <ToastOverlay /><ConfirmDialog /><GameUI />
            </div>
        )
    }

    if (lobby.status === 'finished') {
        const state = lobby.current_game_state
        if (state?.phase === 'canceled') return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin w-8 h-8" /></div>
        const sortedPlayers = [...lobbyPlayers].sort((a, b) => b.score - a.score)
        return (
            <div className="min-h-screen bg-background flex flex-col p-4">
                <ToastOverlay />
                <h1 className="text-3xl font-bold text-center mt-8 mb-8 text-primary">{gt('gameOver', lang)}</h1>
                <Card className="flex-1 mb-8 overflow-hidden flex flex-col border-primary/20 shadow-xl">
                    <CardHeader className="text-center bg-primary/5 pb-6"><TrophyIcon className="w-16 h-16 mx-auto text-yellow-500 mb-2" /><CardTitle className="text-2xl">{gt('scoreTable', lang)}</CardTitle></CardHeader>
                    <CardContent className="p-0 overflow-auto">
                        {sortedPlayers.map((p, index) => (
                            <div key={p.id} className={cn("flex items-center gap-4 p-4 border-b last:border-0", index === 0 && "bg-yellow-500/10")}>
                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg", index === 0 ? "bg-yellow-500 text-white" : index === 1 ? "bg-gray-400 text-white" : index === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground")}>{index + 1}</div>
                                <span className="font-bold flex-1 text-lg">{playersMap[p.player_id]?.nickname}</span>
                                <Badge variant="secondary" className="text-lg px-4 py-1">{p.score} {gt('points', lang)}</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <div className="flex gap-4">
                    <Button className="flex-1" variant="outline" onClick={() => router.push('/home')}><Home className="w-4 h-4 mr-2" /> {gt('home', lang)}</Button>
                    {isHost && <Button className="flex-1" onClick={() => router.push('/sessizsinema')}><RotateCw className="w-4 h-4 mr-2" /> {gt('newGame', lang)}</Button>}
                </div>
                <Footer />
            </div>
        )
    }

    return null
}

interface MatchHistoryItem {
    id: string
    code: string
    created_at: string
    playerCount: number
    userScore: number
    userRank: number
    isWinner: boolean
}

function SessizSinemaLanding({ user, router, showToast, lang }: { user: UserSession; router: ReturnType<typeof useRouter>; showToast: (msg: string, variant: 'success' | 'error' | 'info', duration?: number) => void; lang: 'tr' | 'en' }) {
    const [joinCode, setJoinCode] = useState("")
    const [joinLoading, setJoinLoading] = useState(false)
    const [joinError, setJoinError] = useState("")
    const [createLoading, setCreateLoading] = useState(false)
    const [tasksPerPlayer, setTasksPerPlayer] = useState("3")
    const [roundTime, setRoundTime] = useState("60")
    const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>([])
    const [historyLoading, setHistoryLoading] = useState(true)
    const [showHistoryModal, setShowHistoryModal] = useState(false)

    useEffect(() => {
        fetchMatchHistory()
    }, [user.id])

    const fetchMatchHistory = async () => {
        setHistoryLoading(true)
        try {
            // Get all lobbies where user participated and game finished
            const { data: userLobbies } = await supabase
                .from('charades_lobby_players')
                .select('lobby_id, score')
                .eq('player_id', user.id)
            
            if (!userLobbies || userLobbies.length === 0) { setHistoryLoading(false); return }

            const lobbyIds = userLobbies.map(l => l.lobby_id)
            const { data: lobbies } = await supabase
                .from('charades_lobbies')
                .select('id, code, created_at, status')
                .in('id', lobbyIds)
                .eq('status', 'finished')
                .order('created_at', { ascending: false })

            if (!lobbies || lobbies.length === 0) { setHistoryLoading(false); return }

            // Get all players for these lobbies to calculate ranks
            const { data: allPlayers } = await supabase
                .from('charades_lobby_players')
                .select('lobby_id, player_id, score')
                .in('lobby_id', lobbies.map(l => l.id))

            const history: MatchHistoryItem[] = lobbies.map(lobby => {
                const lobbyPlayers = allPlayers?.filter(p => p.lobby_id === lobby.id) || []
                const userPlayer = lobbyPlayers.find(p => p.player_id === user.id)
                const sortedPlayers = [...lobbyPlayers].sort((a, b) => b.score - a.score)
                const userRank = sortedPlayers.findIndex(p => p.player_id === user.id) + 1

                return {
                    id: lobby.id,
                    code: lobby.code,
                    created_at: lobby.created_at,
                    playerCount: lobbyPlayers.length,
                    userScore: userPlayer?.score || 0,
                    userRank,
                    isWinner: userRank === 1 && lobbyPlayers.length > 1
                }
            })

            setMatchHistory(history)
        } catch (err) { console.error('Error fetching match history:', err) }
        setHistoryLoading(false)
    }

    const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString()

    const handleCreateLobby = async () => {
        setCreateLoading(true)
        const code = generateCode()
        try {
            const { data: lobby, error: lobbyError } = await supabase.from('charades_lobbies').insert({ code, host_id: user.id, tasks_per_player: parseInt(tasksPerPlayer), round_time_seconds: roundTime === 'infinite' ? 9999 : parseInt(roundTime) }).select().single()
            if (lobbyError) { showToast(lang === 'tr' ? 'Lobi oluşturulamadı' : 'Could not create lobby', 'error'); setCreateLoading(false); return }
            const { error: playerError } = await supabase.from('charades_lobby_players').insert({ lobby_id: lobby.id, player_id: user.id, score: 0 })
            if (playerError) { showToast(lang === 'tr' ? 'Lobiye katılınamadı' : 'Could not join lobby', 'error'); setCreateLoading(false); return }
            router.push(`/sessizsinema?code=${code}`)
        } catch (err) { console.error('Error creating lobby:', err); showToast(lang === 'tr' ? 'Hata oluştu' : 'Error occurred', 'error'); setCreateLoading(false) }
    }

    const handleJoinLobby = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!joinCode) return
        setJoinLoading(true); setJoinError("")
        try {
            const { data: lobby, error: lobbyError } = await supabase.from('charades_lobbies').select('id, status').eq('code', joinCode.trim()).single()
            if (lobbyError || !lobby) { setJoinError(lang === 'tr' ? 'Lobi bulunamadı.' : 'Lobby not found.'); setJoinLoading(false); return }
            if (lobby.status === 'finished') { setJoinError(lang === 'tr' ? 'Bu lobi sona ermiş.' : 'This lobby has ended.'); setJoinLoading(false); return }
            const { data: existingPlayer } = await supabase.from('charades_lobby_players').select('id').eq('lobby_id', lobby.id).eq('player_id', user.id).single()
            if (!existingPlayer) {
                const { error: joinErr } = await supabase.from('charades_lobby_players').insert({ lobby_id: lobby.id, player_id: user.id, score: 0 })
                if (joinErr) { setJoinError(lang === 'tr' ? 'Katılınamadı' : 'Could not join'); setJoinLoading(false); return }
            }
            router.push(`/sessizsinema?code=${joinCode.trim()}`)
        } catch (err) { console.error('Error joining lobby:', err); setJoinError(lang === 'tr' ? 'Hata oluştu' : 'Error occurred'); setJoinLoading(false) }
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    }

    const MatchHistoryCard = ({ match, compact = false }: { match: MatchHistoryItem; compact?: boolean }) => (
        <div className={cn("flex items-center gap-3 p-3 rounded-xl bg-card border", compact && "p-2")}>
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold", 
                match.isWinner ? "bg-yellow-500 text-white" : match.userRank === 2 ? "bg-gray-400 text-white" : match.userRank === 3 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground",
                compact && "w-8 h-8 text-sm"
            )}>
                {match.isWinner ? <Trophy className="w-4 h-4" /> : `#${match.userRank}`}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">#{match.code}</span>
                    <Badge variant="outline" className="text-xs">{match.playerCount} {lang === 'tr' ? 'oyuncu' : 'players'}</Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {formatDate(match.created_at)}
                </div>
            </div>
            <div className="text-right">
                <div className="font-bold text-lg">{match.userScore}</div>
                <div className="text-xs text-muted-foreground">{lang === 'tr' ? 'puan' : 'pts'}</div>
            </div>
        </div>
    )

    const HistoryModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowHistoryModal(false)}>
            <div className="bg-card border rounded-2xl p-4 max-w-md w-[95vw] max-h-[80vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2"><History className="w-5 h-5" /> {lang === 'tr' ? 'Geçmiş Maçlar' : 'Match History'}</h3>
                    <Button variant="ghost" size="icon" onClick={() => setShowHistoryModal(false)}><X className="w-5 h-5" /></Button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {matchHistory.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">{lang === 'tr' ? 'Henüz maç geçmişi yok' : 'No match history yet'}</p>
                    ) : (
                        matchHistory.map(match => <MatchHistoryCard key={match.id} match={match} />)
                    )}
                </div>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-background flex flex-col p-4">
            {showHistoryModal && <HistoryModal />}
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.push('/home')}><Home className="w-5 h-5" /></Button>
                <div><h1 className="text-2xl font-bold text-shimmer">{lang === 'tr' ? 'Sessiz Sinema' : 'Silent Cinema'}</h1><p className="text-sm text-muted-foreground">{lang === 'tr' ? 'Tahmini Oyun' : 'Charades Game'}</p></div>
            </div>
            <div className="flex-1 flex flex-col gap-6 max-w-4xl mx-auto w-full">
                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-card/60 backdrop-blur-sm">
                        <CardHeader className="text-center pb-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg"><Plus className="w-8 h-8 text-white" /></div>
                            <CardTitle className="text-xl">{lang === 'tr' ? 'Lobi Oluştur' : 'Create Lobby'}</CardTitle>
                            <CardDescription>{lang === 'tr' ? 'Yeni bir oyun başlat' : 'Start a new game'}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>{lang === 'tr' ? 'Oyuncu Başına Görev' : 'Tasks Per Player'}</Label>
                                <Select value={tasksPerPlayer} onValueChange={(v) => v && setTasksPerPlayer(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 {lang === 'tr' ? 'Görev' : 'Task'}</SelectItem>
                                        <SelectItem value="2">2 {lang === 'tr' ? 'Görev' : 'Tasks'}</SelectItem>
                                        <SelectItem value="3">3 {lang === 'tr' ? 'Görev' : 'Tasks'}</SelectItem>
                                        <SelectItem value="5">5 {lang === 'tr' ? 'Görev' : 'Tasks'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{lang === 'tr' ? 'Tur Süresi' : 'Round Time'}</Label>
                                <Select value={roundTime} onValueChange={(v) => v && setRoundTime(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="30">30 {lang === 'tr' ? 'Saniye' : 'Seconds'}</SelectItem>
                                        <SelectItem value="60">1 {lang === 'tr' ? 'Dakika' : 'Minute'}</SelectItem>
                                        <SelectItem value="120">2 {lang === 'tr' ? 'Dakika' : 'Minutes'}</SelectItem>
                                        <SelectItem value="infinite">{lang === 'tr' ? 'Sınırsız' : 'Unlimited'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button className="w-full h-12 text-lg" onClick={handleCreateLobby} disabled={createLoading}>
                                {createLoading ? <Loader2 className="animate-spin" /> : <>{lang === 'tr' ? 'Oluştur & Oyna' : 'Create & Play'} <ArrowRight className="w-4 h-4 ml-2" /></>}
                            </Button>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/60 backdrop-blur-sm">
                        <CardHeader className="text-center pb-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto mb-4 shadow-lg"><Users className="w-8 h-8 text-white" /></div>
                            <CardTitle className="text-xl">{lang === 'tr' ? 'Lobiye Katıl' : 'Join Lobby'}</CardTitle>
                            <CardDescription>{lang === 'tr' ? '6 haneli lobi kodunu gir' : 'Enter 6-digit lobby code'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleJoinLobby} className="space-y-4">
                                <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="123456" className="text-center text-3xl h-16 tracking-[0.5em] font-bold" maxLength={6} type="tel" />
                                {joinError && <p className="text-destructive text-center text-sm">{joinError}</p>}
                                <Button type="submit" className="w-full h-12 text-lg" disabled={joinLoading}>
                                    {joinLoading ? <Loader2 className="animate-spin" /> : <>{lang === 'tr' ? 'Oyuna Katıl' : 'Join Game'} <ArrowRight className="w-4 h-4 ml-2" /></>}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Match History Card */}
                <Card className="bg-card/60 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg"><History className="w-6 h-6 text-white" /></div>
                                <div>
                                    <CardTitle className="text-lg">{lang === 'tr' ? 'Geçmiş Maçlar' : 'Match History'}</CardTitle>
                                    <CardDescription>{lang === 'tr' ? 'Son oyunlarını gör' : 'View your recent games'}</CardDescription>
                                </div>
                            </div>
                            {matchHistory.length > 3 && (
                                <Button variant="outline" size="sm" onClick={() => setShowHistoryModal(true)}>
                                    {lang === 'tr' ? 'Tümünü Gör' : 'View All'}
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {historyLoading ? (
                            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                        ) : matchHistory.length === 0 ? (
                            <p className="text-center text-muted-foreground py-6">{lang === 'tr' ? 'Henüz maç geçmişi yok. İlk oyununu başlat!' : 'No match history yet. Start your first game!'}</p>
                        ) : (
                            <div className="space-y-2">
                                {matchHistory.slice(0, 3).map(match => <MatchHistoryCard key={match.id} match={match} compact />)}
                                {matchHistory.length > 3 && (
                                    <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setShowHistoryModal(true)}>
                                        +{matchHistory.length - 3} {lang === 'tr' ? 'daha fazla maç' : 'more matches'}
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <Footer />
        </div>
    )
}

function TrophyIcon(props: React.SVGProps<SVGSVGElement>) {
    return (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>)
}
