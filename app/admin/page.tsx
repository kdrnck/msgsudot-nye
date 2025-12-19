
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Users, Film, Trophy, Lock, Power } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function AdminPage() {
    const router = useRouter()
    const [password, setPassword] = useState("")
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [loading, setLoading] = useState(false)
    const [eventEnded, setEventEnded] = useState(false)
    const [endingEvent, setEndingEvent] = useState(false)

    useEffect(() => {
        // Check if previously logged in via session storage
        const token = sessionStorage.getItem('admin_token')
        if (token === 'true') {
            setIsAuthenticated(true)
            loadEventStatus()
        }
    }, [router])

    const loadEventStatus = async () => {
        const { data } = await supabase
            .from('event_settings')
            .select('event_ended')
            .single()

        if (data) {
            setEventEnded(data.event_ended || false)
        }
    }

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        // In a real app, verify against server API route to check env.
        // Here we can simulate it or pass it via public env? NO.
        // We should use an API route to verify password if we want to be secure.
        // Or just simple client side check against env IF available? 
        // Usually env VARs are not exposed unless NEXT_PUBLIC.
        // User sets ADMIN_PASSWORD=... in env. 
        // We should create a Server Action or API Route to verify.
        // For simplicity of this "demo" app without heavy backend, I'll create a simple server action or just check purely client side if I exposed it (BAD practice).
        // I will implement a Server Action `verifyAdmin` later or just API route.
        // Let's assume user is okay with client-side check if I exposed it as NEXT_PUBLIC_ADMIN_PASSWORD? 
        // "Admin Auth (Password in .env)" -> "Admin gate uses ADMIN_PASSWORD".
        // I'll assume I should create an API route `/api/admin/login` to keep it secure.
        // For now, I will use a simple hardcoded check 'secret' as fallback or try to fetch from API.
        // I'll implement the API route method.

        // Quick Hack for immediate progress:
        // If password matches a hardcoded default OR we fetch from an API route.
        // I will implement a quick API route `/app/api/admin-auth/route.ts` next.

        fetch('/api/admin-auth', {
            method: 'POST',
            body: JSON.stringify({ password }),
        }).then(async res => {
            if (res.ok) {
                setIsAuthenticated(true)
                sessionStorage.setItem('admin_token', 'true')
            } else {
                alert("Invalid Password")
            }
        })
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5" /> Admin Access
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <Input
                                type="password"
                                placeholder="Enter Admin Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <Button type="submit" className="w-full">Unlock</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const handleEndEvent = async () => {
        if (endingEvent) return
        setEndingEvent(true)

        try {
            if (eventEnded) {
                // Restart event - clear matches and set event_ended to false
                await supabase.from('player_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
                const { data: settingsData } = await supabase.from('event_settings').select('id').single()
                if (settingsData) {
                    await supabase.from('event_settings').update({
                        event_ended: false,
                        ended_at: null
                    }).eq('id', settingsData.id)
                }

                alert('Etkinlik yeniden başlatıldı! Eşleşmeler temizlendi.')
                setEventEnded(false)
            } else {
                // End event - generate matches and set event_ended to true
                const { data: settingsData } = await supabase.from('event_settings').select('id').single()

                if (settingsData) {
                    await supabase.from('event_settings').update({
                        event_ended: true,
                        ended_at: new Date().toISOString()
                    }).eq('id', settingsData.id)
                }

                // Call the database function to generate matches
                await supabase.rpc('generate_all_matches')

                alert('Etkinlik bitirildi! Eşleşmeler oluşturuldu. Kullanıcılar artık eşleşmelerini görebilir.')
                setEventEnded(true)
            }
        } catch (error: any) {
            console.error('Event toggle error:', error)
            alert('Hata: ' + error.message)
        } finally {
            setEndingEvent(false)
        }
    }

    const menu = [
        { title: "Players", icon: Users, href: "/oyuncular", color: "text-blue-500" },
        { title: "KMK Characters", icon: Users, href: "/admin/kmk", color: "text-pink-500" },
        { title: "Charades Tasks", icon: Film, href: "/admin/tasks", color: "text-purple-500" },
        { title: "Achievements", icon: Trophy, href: "/admin/achievements", color: "text-yellow-500" },
        { title: "Canlı İstatistikler", icon: Users, href: "/live", color: "text-red-500" },
    ]

    return (
        <div className="min-h-screen bg-background flex flex-col p-4">
            <h1 className="text-2xl font-bold mb-6 text-primary">Admin Dashboard</h1>

            <div className="grid grid-cols-2 gap-4">
                {menu.map(item => (
                    <Card key={item.title} className="hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => router.push(item.href)}>
                        <CardContent className="flex flex-col items-center justify-center p-6 gap-2">
                            <item.icon className={`w-8 h-8 ${item.color}`} />
                            <span className="font-semibold text-center">{item.title}</span>
                        </CardContent>
                    </Card>
                ))}

                <Card
                    className={`col-span-2 cursor-pointer transition-colors ${eventEnded ? "hover:bg-green-500/10 border-green-500/50" : "hover:bg-destructive/10 border-destructive/50"
                        }`}
                    onClick={handleEndEvent}
                >
                    <CardContent className="flex flex-row items-center justify-center p-6 gap-4">
                        <Power className={`w-8 h-8 ${eventEnded ? "text-green-500" : "text-destructive"}`} />
                        <div className="flex flex-col">
                            <span className={`font-bold ${eventEnded ? "text-green-500" : "text-destructive"}`}>
                                {endingEvent ? "İşleniyor..." : eventEnded ? "Etkinliği Yeniden Başlat" : "Oyuncuları Eşleştir & Etkinliği Bitir"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {eventEnded ? "Eşleşmeleri sıfırla ve etkinliği aktif et" : "Eşleşmeleri oluştur ve kullanıcılara göster"}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-8">
                <Button variant="outline" className="w-full" onClick={() => {
                    sessionStorage.removeItem('admin_token')
                    setIsAuthenticated(false)
                    router.push('/')
                }}>
                    Logout
                </Button>
            </div>

            <Footer />
        </div>
    )
}
