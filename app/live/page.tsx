
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Users, Film, Heart, Crown, Activity } from "lucide-react"

export default function LiveStatsPage() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        players: 0,
        gamesPlayed: 0,
        topPlayer: "...",
        mostKissed: "...",
        activeLobbies: 0,
        totalScores: 0
    })

    // Poll for stats every 10 seconds for simplicity in MVP instead of complex real-time aggregation
    // Realtime is great, but aggregating "counts" in RT requires triggers/functions. 
    // Polling is robust for a display screen.

    useEffect(() => {
        fetchStats()
        const interval = setInterval(fetchStats, 10000)
        return () => clearInterval(interval)
    }, [])

    const fetchStats = async () => {
        // 1. Players Count
        const { count: playerCount } = await supabase.from('players').select('*', { count: 'exact', head: true })

        // 2. Active Lobbies
        const { count: lobbyCount } = await supabase.from('charades_lobbies').select('*', { count: 'exact', head: true }).eq('status', 'playing')

        // 3. Most Kissed (Complex query, simulate for MVP or fetch all results and calc?)
        // Fetching ALL results is heavy. Let's fetch KMK Results limited.
        // For MVP, randomly picking a "Most Kissed" or just basic calc on last 100?
        // Let's rely on standard selects.

        // Total Scores check
        // We can just query `charades_lobby_players` sum? Hard in Client.

        // To make this "Look Alive" without heavy backend, we can display some totals.

        setStats(prev => ({
            ...prev,
            players: playerCount || 0,
            activeLobbies: lobbyCount || 0
        }))

        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col p-8 overflow-hidden font-sans">
            <div className="fixed inset-0 opacity-20 pointer-events-none bg-[url('/brand/pattern.png')] animate-pulse-slow"></div>

            {/* Header */}
            <div className="flex items-center justify-between mb-12 z-10">
                <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                        {/* Logo Placeholder */}
                        <img src="/brand/dot-logo.png" className="w-20 h-20 object-contain" />
                    </div>
                    <div>
                        <h1 className="text-6xl font-black tracking-tighter uppercase">MSGSU DOT</h1>
                        <p className="text-2xl text-purple-400 font-bold tracking-widest">NYE EVENT LIVE</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-mono font-bold text-green-400 flex items-center gap-3 justify-end">
                        <span className="w-4 h-4 bg-green-500 rounded-full animate-ping"></span>
                        LIVE
                    </div>
                </div>
            </div>

            {/* Grid Stats */}
            <div className="grid grid-cols-3 gap-8 flex-1 z-10">

                {/* Card 1: Players */}
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 flex flex-col items-center justify-center border border-white/20 shadow-2xl">
                    <Users className="w-16 h-16 text-blue-400 mb-4" />
                    <span className="text-8xl font-black">{stats.players}</span>
                    <span className="text-2xl text-gray-400 uppercase tracking-widest mt-2">Players Joined</span>
                </div>

                {/* Card 2: Active Charades */}
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 flex flex-col items-center justify-center border border-white/20 shadow-2xl">
                    <Activity className="w-16 h-16 text-yellow-400 mb-4" />
                    <span className="text-8xl font-black">{stats.activeLobbies}</span>
                    <span className="text-2xl text-gray-400 uppercase tracking-widest mt-2">Active Games</span>
                </div>

                {/* Card 3: Vibes */}
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 flex flex-col items-center justify-center border border-white/20 shadow-2xl">
                    <Heart className="w-16 h-16 text-pink-500 mb-4 animate-bounce" />
                    <span className="text-6xl font-black text-center">LOVE IS IN THE AIR</span>
                </div>

                {/* Bottom Row - Leaderboard Snippet? */}
                <div className="col-span-3 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-3xl p-8 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Crown className="w-16 h-16 text-yellow-400" />
                        <div className="flex flex-col">
                            <span className="text-4xl font-bold">Top Charades Player</span>
                            <span className="text-yellow-400 text-xl uppercase tracking-widest">Coming Soon...</span>
                        </div>
                    </div>

                    <div className="text-right opacity-50">
                        <p>Scan QR to Join</p>
                        {/* QR Placeholder */}
                    </div>
                </div>

            </div>
        </div>
    )
}
