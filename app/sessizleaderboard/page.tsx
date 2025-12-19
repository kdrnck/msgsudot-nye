
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Home, Loader2, Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface LeaderboardEntry {
    player_id: string
    nickname: string
    total_score: number
    games_played: number
}

export default function LeaderboardPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([])

    useEffect(() => {
        fetchLeaderboard()
    }, [])

    const fetchLeaderboard = async () => {
        // Aggregate scores. Supabase doesn't support aggregate views easily via JS client without Views in DB.
        // Ideally we create a view `public.player_scores` in schema, but user requested `supabase_schema.sql` at start.
        // I can fetch all `charades_lobby_players` and aggregate in JS for MVP (assuming <1000 players).

        const { data, error } = await supabase
            .from('charades_lobby_players')
            .select('score, player:players(id, nickname)')

        if (data) {
            const map: Record<string, LeaderboardEntry> = {}

            data.forEach((row: any) => {
                if (!row.player) return
                if (!map[row.player.id]) {
                    map[row.player.id] = {
                        player_id: row.player.id,
                        nickname: row.player.nickname,
                        total_score: 0,
                        games_played: 0
                    }
                }
                map[row.player.id].total_score += row.score
                map[row.player.id].games_played += 1
            })

            const sorted = Object.values(map).sort((a, b) => b.total_score - a.total_score)
            setLeaders(sorted.slice(0, 50))
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-background flex flex-col p-4 text-center">
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.push("/home")}>
                    <Home className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold">Leaderboard</h1>
                <div className="w-9" />
            </div>

            <div className="mb-6 flex justify-center">
                <div className="bg-primary/10 p-4 rounded-full">
                    <Trophy className="w-12 h-12 text-primary animate-pulse" />
                </div>
            </div>

            <Card className="flex-1 shadow-xl border-primary/10">
                <CardHeader>
                    <CardTitle>Top Players</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="animate-spin" />
                        </div>
                    ) : (
                        <div className="divide-y">
                            {leaders.map((p, index) => (
                                <div key={p.player_id} className={cn("flex items-center gap-4 p-4",
                                    index === 0 && "bg-yellow-500/10",
                                    index === 1 && "bg-slate-300/10",
                                    index === 2 && "bg-orange-400/10"
                                )}>
                                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0",
                                        index === 0 ? "bg-yellow-500 text-white" :
                                            index === 1 ? "bg-slate-400 text-white" :
                                                index === 2 ? "bg-orange-400 text-white" : "bg-muted text-muted-foreground"
                                    )}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-bold">{p.nickname}</div>
                                        <div className="text-xs text-muted-foreground">{p.games_played} games</div>
                                    </div>
                                    <Badge className="text-lg">
                                        {p.total_score} pts
                                    </Badge>
                                </div>
                            ))}
                            {leaders.length === 0 && (
                                <p className="py-8 text-muted-foreground">No scores yet.</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Footer />
        </div>
    )
}
