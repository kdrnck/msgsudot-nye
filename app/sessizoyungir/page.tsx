
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, ArrowRight, Globe } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { useLanguage } from "@/components/LanguageContext"
import { useTheme } from "@/components/ClientProviders"

export default function JoinLobbyPage() {
    const router = useRouter()
    const { t, language, setLanguage } = useLanguage()
    const { isDark, toggle } = useTheme()
    const [code, setCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!code) return
        setLoading(true)
        setError("")

        const session = auth.getSession()
        if (!session) {
            router.push("/")
            return
        }

        // Checking Lobby
        const { data: lobby, error: lobbyError } = await supabase
            .from('charades_lobbies')
            .select('id, status')
            .eq('code', code.trim())
            .single()

        if (lobbyError || !lobby) {
            setError("Lobby not found.")
            setLoading(false)
            return
        }

        if (lobby.status === 'finished') {
            setError("Lobby finished.")
            setLoading(false)
            return
        }

        // Check if player already in
        const { data: existingPlayer } = await supabase
            .from('charades_lobby_players')
            .select('id')
            .eq('lobby_id', lobby.id)
            .eq('player_id', session.id)
            .single()

        if (!existingPlayer) {
            // Join
            const { error: joinError } = await supabase
                .from('charades_lobby_players')
                .insert({
                    lobby_id: lobby.id,
                    player_id: session.id,
                    score: 0
                })

            if (joinError) {
                setError("Could not join: " + joinError.message)
                setLoading(false)
                return
            }
        }

        router.push(`/sessizsinema?code=${code.trim()}`)
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
                        <CardTitle>Join Game</CardTitle>
                    </div>
                    <CardDescription>Enter the 6-digit lobby code.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleJoin} className="space-y-4">
                        <Input
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="123456"
                            className="text-center text-3xl h-16 tracking-[0.5em] font-bold"
                            maxLength={6}
                            type="tel"
                        />

                        {error && <p className="text-destructive text-center text-sm">{error}</p>}

                        <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : "Join Game"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
            <Footer />
        </div>
    )
}
