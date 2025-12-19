
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, UserSession } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, ArrowLeft, Globe } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { useLanguage } from "@/components/LanguageContext"
import { useTheme } from "@/components/ClientProviders"

export default function CreateLobbyPage() {
    const router = useRouter()
    const { t, language, setLanguage } = useLanguage()
    const { isDark, toggle } = useTheme()
    const [loading, setLoading] = useState(false)
    const [tasksPerPlayer, setTasksPerPlayer] = useState("3")
    const [roundTime, setRoundTime] = useState("60")

    useEffect(() => {
        if (!auth.getSession()) router.push('/')
    }, [router])

    const generateCode = () => {
        return Math.floor(100000 + Math.random() * 900000).toString()
    }

    const handleCreate = async () => {
        setLoading(true)
        const session = auth.getSession()
        if (!session) return

        // Create unique code
        let code = generateCode()
        // Ideally check uniqueness in DB loop, but collisions rare for this scale. 
        // We will trust Unique constraint to fail and simple retry mechanism if needed.

        // Create Lobby
        const { data: lobby, error: lobbyError } = await supabase
            .from('charades_lobbies')
            .insert({
                code,
                host_id: session.id,
                tasks_per_player: parseInt(tasksPerPlayer),
                round_time_seconds: roundTime === 'infinite' ? 9999 : parseInt(roundTime)
            })
            .select()
            .single()

        if (lobbyError) {
            alert("Error creating lobby: " + lobbyError.message)
            setLoading(false)
            return
        }

        // Add Host as Player
        const { error: playerError } = await supabase
            .from('charades_lobby_players')
            .insert({
                lobby_id: lobby.id,
                player_id: session.id,
                score: 0
            })

        if (playerError) {
            alert("Error joining lobby: " + playerError.message)
            setLoading(false)
            return
        }

        router.push(`/sessizsinema?code=${code}`)
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            {/* Header with language toggle */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                    onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
                    className="p-2 rounded-lg bg-card/50 border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
                    title={language === 'tr' ? 'Switch to English' : 'Türkçe\'ye geç'}
                >
                    <Globe className="w-4 h-4" />
                </button>
                <button
                    onClick={toggle}
                    className="p-2 rounded-lg bg-card/50 border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
                    title={isDark ? 'Light Mode' : 'Dark Mode'}
                >
                    {isDark ? <span className="text-xs">☀️</span> : <span className="text-xs">🌙</span>}
                </button>
            </div>
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Button variant="ghost" size="icon" className="-ml-3" onClick={() => router.push("/home")}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <CardTitle>Create Lobby</CardTitle>
                    </div>
                    <CardDescription>Configure your Charades game.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Tasks Per Player</Label>
                        <Select value={tasksPerPlayer} onValueChange={(v) => v && setTasksPerPlayer(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1 Task</SelectItem>
                                <SelectItem value="2">2 Tasks</SelectItem>
                                <SelectItem value="3">3 Tasks</SelectItem>
                                <SelectItem value="5">5 Tasks</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Round Time</Label>
                        <Select value={roundTime} onValueChange={(v) => v && setRoundTime(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="30">30 Seconds</SelectItem>
                                <SelectItem value="60">1 Minute</SelectItem>
                                <SelectItem value="120">2 Minutes</SelectItem>
                                <SelectItem value="infinite">Infinite</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button className="w-full h-12 text-lg" onClick={handleCreate} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : "Create & Play"}
                    </Button>
                </CardContent>
            </Card>
            <Footer />
        </div>
    )
}
