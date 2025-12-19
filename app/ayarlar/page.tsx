
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, UserSession } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, Save } from "lucide-react"

export default function SettingsPage() {
    const router = useRouter()
    // const { toast } = useToast() // Need to install toast or check if exists. I'll stick to simple alerts or install toaster. 
    // I will check if toaster exists first, actually I can just use simple state for success/error text for minimal deps.

    const [user, setUser] = useState<UserSession | null>(null)
    const [nickname, setNickname] = useState("")
    const [pin, setPin] = useState("")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        const session = auth.getSession()
        if (!session) {
            router.push("/")
            return
        }
        setUser(session)
        setNickname(session.nickname)
        setPin(session.pin)
    }, [router])

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setLoading(true)
        setMessage(null)

        // Check availability if nickname changed
        if (nickname.trim() !== user.nickname) {
            const { data: existing } = await supabase
                .from('players')
                .select('id')
                .eq('nickname', nickname.trim())
                .single()

            if (existing) {
                setMessage({ type: 'error', text: "Nickname already taken!" })
                setLoading(false)
                return
            }
        }

        const { error } = await supabase
            .from('players')
            .update({ nickname: nickname.trim(), pin: pin.trim() })
            .eq('id', user.id)

        if (error) {
            setMessage({ type: 'error', text: "Failed to update: " + error.message })
        } else {
            // Update session
            const updatedSession = { ...user, nickname: nickname.trim(), pin: pin.trim() }
            auth.setSession(updatedSession)
            setUser(updatedSession)
            setMessage({ type: 'success', text: "Profile updated successfully!" })
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-background flex flex-col p-4">
            <div className="mb-6 flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => router.push("/home")}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold">Settings</h1>
            </div>

            <div className="flex-1 max-w-md mx-auto w-full space-y-6">
                <form onSubmit={handleUpdate} className="space-y-4 bg-muted/30 p-6 rounded-xl border">
                    <div className="space-y-2">
                        <Label htmlFor="nickname">Nickname</Label>
                        <Input
                            id="nickname"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="pin">PIN</Label>
                        <Input
                            id="pin"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.slice(0, 4))}
                            maxLength={4}
                            type="tel"
                            className="tracking-widest"
                        />
                    </div>

                    {message && (
                        <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                            {message.text}
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </form>
            </div>

            <Footer />
        </div>
    )
}
