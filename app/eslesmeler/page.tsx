"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, UserSession } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { StickyNav } from "@/components/StickyNav"
import { Footer } from "@/components/layout/Footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, Users, Zap, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Match {
    match_type: string
    matched_player: {
        nickname: string
    } | null
    shared_character: {
        name: string
    } | null
}

export default function MatchesPage() {
    const router = useRouter()
    const [user, setUser] = useState<UserSession | null>(null)
    const [matches, setMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState(true)
    const [eventEnded, setEventEnded] = useState(false)

    useEffect(() => {
        const session = auth.getSession()
        if (!session) {
            router.push("/")
            return
        }
        setUser(session)
        loadMatches(session.id)
    }, [router])

    const loadMatches = async (playerId: string) => {
        // Check if event has ended
        const { data: eventData } = await supabase
            .from('event_settings')
            .select('event_ended')
            .single()

        if (!eventData?.event_ended) {
            setEventEnded(false)
            setLoading(false)
            return
        }

        setEventEnded(true)

        // Load player matches with related data
        const { data, error } = await supabase
            .from('player_matches')
            .select(`
                match_type,
                matched_player:matched_player_id(nickname),
                shared_character:shared_character_id(name)
            `)
            .eq('player_id', playerId)

        if (error) {
            console.error('Error loading matches:', error)
        } else {
            setMatches(data as any || [])
        }

        setLoading(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!eventEnded) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <StickyNav showBack showHome backLabel="Geri Dön" />
                <div className="flex-1 flex flex-col items-center justify-center p-4 pt-20">
                    <div className="text-center max-w-md">
                        <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h1 className="text-2xl font-bold mb-2">Etkinlik Henüz Bitmedi</h1>
                        <p className="text-muted-foreground">
                            Eşleşmeler etkinlik bittiğinde görüntülenecek!
                        </p>
                    </div>
                </div>
                <Footer />
            </div>
        )
    }

    const getMatchIcon = (type: string) => {
        if (type.startsWith('kmk')) return Heart
        return Zap
    }

    const getMatchTypeLabel = (type: string) => {
        switch (type) {
            case 'kmk_kiss': return 'Öpüştüğün Karakter'
            case 'kmk_marry': return 'Evlendiğin Karakter'
            case 'kmk_kill': return 'Öldürdüğün Karakter'
            case 'charades_faster': return 'Sessiz Sinema - Daha Hızlı'
            case 'charades_slower': return 'Sessiz Sinema - Daha Yavaş'
            default: return type
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <StickyNav showBack showHome backLabel="Geri Dön" />

            <div className="flex-1 p-4 pt-20 pb-8">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-primary mb-2">Eşleşmelerin</h1>
                        <p className="text-muted-foreground">Aynı seçimleri yapan kişilerle tanış!</p>
                    </div>

                    {matches.length === 0 ? (
                        <Card className="text-center p-8">
                            <CardContent className="pt-6">
                                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                <p className="text-lg text-muted-foreground">
                                    Henüz bir eşleşmen yok.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {matches.map((match, idx) => {
                                const Icon = getMatchIcon(match.match_type)
                                const isKMK = match.match_type.startsWith('kmk')

                                return (
                                    <Card key={idx} className="overflow-hidden border-2 hover:border-primary/50 transition-colors">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Icon className="w-5 h-5 text-primary" />
                                                </div>
                                                <CardTitle className="text-lg">
                                                    {getMatchTypeLabel(match.match_type)}
                                                </CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            {isKMK && match.shared_character && (
                                                <p className="text-sm text-muted-foreground mb-2">
                                                    Karakter: <span className="font-semibold text-foreground">{match.shared_character.name}</span>
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="text-base px-3 py-1">
                                                    {match.matched_player?.nickname || "Kimse bulunamadı"}
                                                </Badge>
                                                {match.matched_player && (
                                                    <span className="text-sm text-muted-foreground">ile eşleştin!</span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            <Footer />
        </div>
    )
}
