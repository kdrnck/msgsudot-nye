
"use client"

import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Users, Trophy, Megaphone, Gamepad2, MonitorOff, Heart, Skull, Crown, User } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    useLiveState,
    useKmsGame,
    useLeaderboard,
    useDebounce,
    getCharacterImageUrl,
    type KmsSlots,
    type CurrentCard
} from "@/lib/live-state"

// Slot action icons and colors
const SLOT_CONFIG = {
    kiss: { icon: Heart, color: "text-pink-500", bg: "bg-pink-500/20", border: "border-pink-500/50", label: "KISS" },
    marry: { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-500/20", border: "border-yellow-500/50", label: "MARRY" },
    kill: { icon: Skull, color: "text-red-500", bg: "bg-red-500/20", border: "border-red-500/50", label: "KILL" }
}

// Skeleton loader component
function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-white/10 rounded", className)} />
}

// KMS Game Display Component
function KmsGameDisplay({ game }: { game: { current_card: CurrentCard | null, slots: KmsSlots, owner_nickname: string } }) {
    const slots = game.slots
    const currentCard = game.current_card

    return (
        <div className="h-full flex flex-col gap-2">
            {/* Header: Player Info & Next Character Card */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-3 flex items-center justify-between shrink-0">
                {/* Player Info */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                        <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Oynayan</p>
                        <p className="text-lg font-bold text-white leading-none">{game.owner_nickname}</p>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-px h-16 bg-white/10 mx-4" />

                {/* Next Character Card - Larger display */}
                <div className="flex-1 flex items-center justify-end gap-4">
                    <div className="text-right">
                        <p className="text-xs text-purple-400 uppercase tracking-widest font-semibold">Sıradaki Karakter</p>
                        {currentCard ? (
                            <div className="flex flex-col items-end leading-tight mt-1">
                                <p className="text-xl font-bold text-white">{currentCard.name}</p>
                                {currentCard.category && <p className="text-sm text-gray-400">{currentCard.category}</p>}
                            </div>
                        ) : (
                            <p className="text-base text-gray-500 italic mt-1">Kart seçiliyor...</p>
                        )}
                    </div>
                    {currentCard ? (
                        <img 
                            src={getCharacterImageUrl(currentCard.imageUrl)} 
                            alt={currentCard.name}
                            className="w-20 h-20 rounded-xl object-cover border-2 border-purple-500/50 shadow-lg shadow-purple-500/20"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-xl bg-white/5 border-2 border-white/10 border-dashed flex items-center justify-center">
                            <span className="text-2xl text-gray-600">?</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Slots Grid - Fills remaining space */}
            <div className="flex-1 min-h-0 bg-white/5 rounded-xl border border-white/10 p-2">
                <div className="h-full grid grid-cols-3 gap-2">
                    {/* Column 1: KISS */}
                    <div className="flex flex-col gap-2 h-full min-h-0">
                        <div className={cn("text-center py-1 rounded shrink-0", SLOT_CONFIG.kiss.bg)}>
                            <span className={cn("font-bold text-xs block leading-none", SLOT_CONFIG.kiss.color)}>💋 KISS</span>
                        </div>
                        <div className="flex-1 flex flex-col gap-2 min-h-0">
                            {[slots.slot1, slots.slot2].map((slot, idx) => (
                                <SlotCard key={`kiss-${idx}`} slot={slot} action="kiss" />
                            ))}
                        </div>
                    </div>

                    {/* Column 2: MARRY */}
                    <div className="flex flex-col gap-2 h-full min-h-0">
                        <div className={cn("text-center py-1 rounded shrink-0", SLOT_CONFIG.marry.bg)}>
                            <span className={cn("font-bold text-xs block leading-none", SLOT_CONFIG.marry.color)}>💍 MARRY</span>
                        </div>
                        <div className="flex-1 flex flex-col gap-2 min-h-0">
                            {[slots.slot3, slots.slot4].map((slot, idx) => (
                                <SlotCard key={`marry-${idx}`} slot={slot} action="marry" />
                            ))}
                        </div>
                    </div>

                    {/* Column 3: KILL */}
                    <div className="flex flex-col gap-2 h-full min-h-0">
                        <div className={cn("text-center py-1 rounded shrink-0", SLOT_CONFIG.kill.bg)}>
                            <span className={cn("font-bold text-xs block leading-none", SLOT_CONFIG.kill.color)}>💀 KILL</span>
                        </div>
                        <div className="flex-1 flex flex-col gap-2 min-h-0">
                            {[slots.slot5, slots.slot6].map((slot, idx) => (
                                <SlotCard key={`kill-${idx}`} slot={slot} action="kill" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Individual slot card
function SlotCard({ slot, action }: { slot: KmsSlots[keyof KmsSlots], action: 'kiss' | 'marry' | 'kill' }) {
    const config = SLOT_CONFIG[action]
    
    // Calculate color for empty state
    const emptyBorder = action === 'kiss' ? 'border-pink-500/20' : action === 'marry' ? 'border-yellow-500/20' : 'border-red-500/20'
    const emptyIconColor = action === 'kiss' ? 'text-pink-500/20' : action === 'marry' ? 'text-yellow-500/20' : 'text-red-500/20'

    if (!slot) {
        return (
            <div className={cn(
                "flex-1 min-h-0 rounded-lg border-2 border-dashed flex flex-col items-center justify-center bg-white/5 transition-colors",
                emptyBorder
            )}>
                <div className={cn("text-2xl font-bold opacity-50", emptyIconColor)}>?</div>
            </div>
        )
    }

    return (
        <div className={cn(
            "flex-1 min-h-0 rounded-lg border-2 overflow-hidden relative group",
            config.border, config.bg
        )}>
            {/* Image fills the container */}
            <img 
                src={getCharacterImageUrl(slot.imageUrl)} 
                alt={slot.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-6 pb-1 px-1">
                <p className="text-[10px] font-bold text-white truncate text-center leading-tight drop-shadow-md">{slot.name}</p>
            </div>
        </div>
    )
}

// Large Next Character Display for right sidebar (when leaderboard is hidden)
function LargeNextCharacterDisplay({ game }: { game: { current_card: CurrentCard | null, owner_nickname: string } }) {
    const currentCard = game.current_card
    
    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Gamepad2 className="w-5 h-5 text-purple-500" />
                <h2 className="text-base font-bold uppercase tracking-widest">Sıradaki Karakter</h2>
            </div>
            
            {/* Large Character Display */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                {currentCard ? (
                    <div className="w-full flex flex-col items-center gap-4">
                        {/* Large Image */}
                        <div className="relative w-full aspect-[3/4] max-h-[70%] rounded-2xl overflow-hidden border-4 border-purple-500/50 shadow-2xl shadow-purple-500/30">
                            <img 
                                src={getCharacterImageUrl(currentCard.imageUrl)} 
                                alt={currentCard.name}
                                className="w-full h-full object-cover"
                            />
                            {/* Gradient overlay */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12 pb-4 px-4">
                                <p className="text-2xl font-bold text-white text-center drop-shadow-lg">{currentCard.name}</p>
                                {currentCard.category && (
                                    <p className="text-sm text-purple-300 text-center mt-1">{currentCard.category}</p>
                                )}
                            </div>
                        </div>
                        
                        {/* Player info */}
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20">
                            <User className="w-4 h-4 text-primary" />
                            <span className="text-sm font-semibold">{game.owner_nickname}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center p-8">
                        <div className="w-32 h-32 rounded-2xl bg-white/5 border-2 border-white/10 border-dashed flex items-center justify-center mb-4">
                            <span className="text-4xl text-gray-600">?</span>
                        </div>
                        <p className="text-gray-500 text-lg">Karakter bekleniyor...</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// Empty state for CANLI OYUN
function EmptyGameState() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <MonitorOff className="w-24 h-24 text-gray-600 mb-6" />
            <h3 className="text-3xl font-bold text-gray-400 mb-3">Canlı Oyun Yok</h3>
            <p className="text-gray-500 text-lg max-w-md">
                Şu anda yayında bir oyun yok. "Oyunu başlat" butonuna bas ve görevliye haber ver.
            </p>
        </div>
    )
}

// Leaderboard Component
function SilentLeaderboard({ entries, loading }: { entries: { nickname: string, score: number }[], loading: boolean }) {
    if (loading) {
        return (
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
        )
    }

    if (entries.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Henüz skor yok</p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {entries.map((entry, index) => (
                <div 
                    key={entry.nickname} 
                    className={cn(
                        "flex items-center gap-3 p-3 rounded-xl transition-all",
                        index === 0 ? "bg-yellow-500/20 border border-yellow-500/30" :
                        index === 1 ? "bg-gray-400/20 border border-gray-400/30" :
                        index === 2 ? "bg-amber-700/20 border border-amber-700/30" :
                        "bg-white/5 border border-white/10"
                    )}
                >
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                        index === 0 ? "bg-yellow-500 text-black" :
                        index === 1 ? "bg-gray-400 text-black" :
                        index === 2 ? "bg-amber-700 text-white" :
                        "bg-white/20 text-white"
                    )}>
                        {index + 1}
                    </div>
                    <span className="flex-1 font-semibold text-lg truncate">{entry.nickname}</span>
                    <span className="text-2xl font-bold">{entry.score}</span>
                </div>
            ))}
        </div>
    )
}

export default function LiveTVPage() {
    const [stats, setStats] = useState({ players: 0, activeLobbies: 0 })

    // Real-time hooks
    const { liveState, loading: liveStateLoading } = useLiveState()
    const { game: broadcastGame, loading: gameLoading } = useKmsGame(liveState?.broadcast_game_id || null)
    const { entries: leaderboardEntries, loading: leaderboardLoading } = useLeaderboard(8)

    // Debounce game updates to prevent jitter (60-120ms)
    const debouncedGame = useDebounce(broadcastGame, 80)

    // Fetch basic stats with polling (less critical data)
    useEffect(() => {
        const fetchStats = async () => {
            const { count: playerCount } = await supabase.from('players').select('*', { count: 'exact', head: true })
            const { count: lobbyCount } = await supabase.from('charades_lobbies').select('*', { count: 'exact', head: true }).eq('status', 'playing')
            setStats({ players: playerCount || 0, activeLobbies: lobbyCount || 0 })
        }
        fetchStats()
        const interval = setInterval(fetchStats, 15000)
        return () => clearInterval(interval)
    }, [])

    const isLoading = liveStateLoading

    return (
        <div className="h-screen bg-black text-white overflow-hidden font-sans relative">
            {/* TV-optimized layout - everything fits in viewport */}
            <div className="h-full flex flex-col p-4">
                
                {/* Header - Compact */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                            <img src="/dot-logo.png" className="w-10 h-10 object-contain" alt="Logo" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight uppercase">MSGSU DOT</h1>
                            <p className="text-sm text-purple-400 font-bold tracking-widest">2026 yılına merhaba!</p>
                        </div>
                    </div>
                    
                    {/* Live indicator & Stats */}
                    <div className="flex items-center gap-6">
                        {/* Smaller player count card */}
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg border border-white/20">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="text-lg font-bold">{stats.players}</span>
                            <span className="text-xs text-gray-400 uppercase">Oyuncu</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-lg font-mono font-bold text-green-400">
                            <span className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
                            LIVE
                        </div>
                    </div>
                </div>

                {/* Announcement Bar */}
                {liveState?.announcement && (
                    <div className="mb-3 p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30 flex items-center gap-3">
                        <Megaphone className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                        <p className="text-base font-semibold text-yellow-100">{liveState.announcement}</p>
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
                    
                    {/* CANLI OYUN Section - Takes 8 columns */}
                    <div className="col-span-8 bg-white/5 rounded-2xl border border-white/10 p-4 flex flex-col min-h-0">
                        <div className="flex items-center gap-2 mb-3">
                            <Gamepad2 className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-bold uppercase tracking-widest">Canlı Oyun</h2>
                            {liveState?.broadcast_game_id && (
                                <div className="ml-auto flex items-center gap-2 px-2 py-1 bg-red-500/20 rounded-full border border-red-500/30">
                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                    <span className="text-xs font-semibold text-red-400">YAYINDA</span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-h-0 overflow-auto">
                            {isLoading || gameLoading ? (
                                <div className="h-full flex flex-col gap-3">
                                    <Skeleton className="h-24 w-full" />
                                    <div className="flex-1 grid grid-cols-3 gap-3">
                                        {[...Array(6)].map((_, i) => (
                                            <Skeleton key={i} className="aspect-[3/4]" />
                                        ))}
                                    </div>
                                </div>
                            ) : debouncedGame ? (
                                <KmsGameDisplay game={debouncedGame} />
                            ) : (
                                <EmptyGameState />
                            )}
                        </div>
                    </div>

                    {/* Right Sidebar - 4 columns */}
                    <div className="col-span-4 flex flex-col gap-3 min-h-0">
                        {/* Main content area */}
                        <div className="flex-1 bg-white/5 rounded-2xl border border-white/10 p-4 flex flex-col min-h-0">
                            {liveState?.show_leaderboard !== false ? (
                                /* Show Leaderboard */
                                <>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Trophy className="w-5 h-5 text-yellow-500" />
                                        <h2 className="text-base font-bold uppercase tracking-widest">Skor Tablosu</h2>
                                    </div>

                                    <div className="flex-1 overflow-auto min-h-0">
                                        <SilentLeaderboard 
                                            entries={leaderboardEntries.slice(0, 5).map(e => ({ nickname: e.nickname, score: e.score }))} 
                                            loading={leaderboardLoading} 
                                        />
                                    </div>

                                    <p className="text-center text-[10px] text-gray-600 mt-2">Sessiz Sinema Skorları</p>
                                </>
                            ) : debouncedGame ? (
                                /* Show Large Next Character when leaderboard is OFF and KMS game is active */
                                <LargeNextCharacterDisplay game={debouncedGame} />
                            ) : (
                                /* Empty state when no game and leaderboard is OFF */
                                <div className="h-full flex flex-col items-center justify-center text-center">
                                    <MonitorOff className="w-16 h-16 text-gray-600 mb-4" />
                                    <p className="text-gray-500">Oyun başlatıldığında<br/>karakter burada görünecek</p>
                                </div>
                            )}
                        </div>
                        
                        {/* QR Code - below the main content */}
                        {liveState?.show_qr !== false && (
                            <div className="bg-white p-3 rounded-xl flex items-center gap-4 shrink-0">
                                <img 
                                    src="/girisqr.jpeg" 
                                    alt="QR Code" 
                                    className="w-28 h-28 rounded-lg"
                                />
                                <div className="flex-1">
                                    <p className="text-black font-bold text-xl">Sen de oyna!</p>
                                    <p className="text-gray-600 text-sm">QR kodu tarat ve katıl</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    )
}
