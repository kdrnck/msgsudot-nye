
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, UserSession } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Home, Loader2, Lock, Unlock } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Achievement {
    id: string
    title_tr: string
    title_en: string
    description_tr: string
    description_en: string
    icon: string
}

interface PlayerAchievement {
    achievement_id: string
    earned_at: string
}

export default function AchievementsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [allAchievements, setAllAchievements] = useState<Achievement[]>([])
    const [earnedMap, setEarnedMap] = useState<Record<string, PlayerAchievement>>({})

    useEffect(() => {
        const session = auth.getSession()
        if (!session) {
            router.push('/')
            return
        }
        fetchData(session.id)
    }, [router])

    const fetchData = async (userId: string) => {
        // 1. Fetch Definitions
        const { data: defs } = await supabase.from('achievements').select('*')
        // 2. Fetch Earned
        const { data: earned } = await supabase.from('player_achievements').select('*').eq('player_id', userId)

        if (defs) setAllAchievements(defs)
        if (earned) {
            const map: Record<string, PlayerAchievement> = {}
            earned.forEach((e: any) => map[e.achievement_id] = e)
            setEarnedMap(map)
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-background flex flex-col p-4">
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.push("/home")}>
                    <Home className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold">My Achievements</h1>
                <div className="w-9" />
            </div>

            <div className="flex-1 space-y-4">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="animate-spin" />
                    </div>
                ) : (
                    allAchievements.map(ach => {
                        const isEarned = !!earnedMap[ach.id]
                        return (
                            <Card key={ach.id} className={cn("transition-all duration-300",
                                isEarned ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/50 shadow-md" : "opacity-70 grayscale hover:grayscale-0"
                            )}>
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2",
                                        isEarned ? "bg-white border-yellow-500" : "bg-muted border-dashed"
                                    )}>
                                        {ach.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={cn("font-bold flex items-center gap-2", isEarned && "text-yellow-600 dark:text-yellow-400")}>
                                            {ach.title_en}
                                            {isAdminDebug() && <span className="text-[10px] text-muted-foreground">({ach.title_tr})</span>}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">{ach.description_en}</p>
                                        {isEarned && (
                                            <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                                                <Unlock className="w-3 h-3" /> Unlocked on {new Date(earnedMap[ach.id].earned_at).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                    {!isEarned && <Lock className="w-4 h-4 text-muted-foreground opacity-50" />}
                                </CardContent>
                            </Card>
                        )
                    })
                )}
                {!loading && allAchievements.length === 0 && (
                    <p className="text-center text-muted-foreground py-10">No achievements defined yet. Keep playing!</p>
                )}
            </div>

            <Footer />
        </div>
    )
}

function isAdminDebug() {
    // Simple check if we want to show TR titles too
    return false
}
