
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/auth"
import { useLanguage } from "@/components/LanguageContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Footer } from "@/components/layout/Footer"
import { Loader2, Sparkles } from "lucide-react"

export default function LandingPage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [step, setStep] = useState<'nickname' | 'pin'>('nickname')
    const [nickname, setNickname] = useState("")
    const [pin, setPin] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [isNewUser, setIsNewUser] = useState(false)

    useEffect(() => {
        const session = auth.getSession()
        if (session) {
            router.push("/home")
        }
    }, [router])

    const handleNicknameSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!nickname.trim()) return

        setLoading(true)
        setError("")

        const { supabase } = await import('@/lib/supabase')

        const { data, error: fetchError } = await supabase
            .from('players')
            .select('id')
            .eq('nickname', nickname.trim())
            .single()

        setLoading(false)

        if (fetchError && fetchError.code === 'PGRST116') {
            setIsNewUser(true)
            setStep('pin')
        } else if (data) {
            setIsNewUser(false)
            setStep('pin')
        } else {
            console.error(fetchError)
            setError(t('connectionError'))
        }
    }

    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!pin.trim()) return

        setLoading(true)
        setError("")

        if (isNewUser) {
            const { user, error: regError } = await auth.register(nickname.trim(), pin.trim())
            if (regError) {
                if (regError === 'nickname_taken') {
                    setError(t('nameTaken'))
                    setIsNewUser(false)
                } else {
                    setError(t('registrationFailed') + ": " + regError)
                }
                setLoading(false)
                return
            }
            if (user) {
                auth.setSession({ id: user.id, nickname: user.nickname, pin: user.pin })
                router.push("/home")
            }
        } else {
            const { user, error: loginError } = await auth.login(nickname.trim(), pin.trim())
            if (loginError) {
                setError(t('invalidPin'))
                setLoading(false)
                return
            }
            if (user) {
                auth.setSession({ id: user.id, nickname: user.nickname, pin: user.pin })
                router.push("/home")
            }
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Artistic Background Orbs */}
            <div className="art-orbs">
                <div className="art-orb art-orb-1"></div>
                <div className="art-orb art-orb-2"></div>
                <div className="art-orb art-orb-3"></div>
            </div>

            {/* Elegant Header */}
            <div className="mb-10 text-center relative z-10 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="relative inline-block mb-6">
                    <div className="w-36 h-36 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center backdrop-blur-sm border-2 border-primary/30 shadow-2xl">
                        <img
                            src="/dot-logo.png"
                            alt="DOT Logo"
                            className="w-28 h-28 object-contain drop-shadow-lg"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none'
                            }}
                        />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                    </div>
                </div>

                <h1 className="text-4xl font-bold text-shimmer mb-2 tracking-tight">
                    MSGSU DOT
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                    Yılbaşı Etkinliği 2025
                </p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                    Mimar Sinan Güzel Sanatlar Üniversitesi
                </p>
            </div>

            {/* Auth Card */}
            <Card className="w-full max-w-sm card-artistic bg-card/80 backdrop-blur-xl border-primary/10 shadow-2xl relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                <CardHeader className="text-center pb-4">
                    <CardTitle className="text-xl font-semibold text-artistic decorative-line">
                        {step === 'nickname' ? t('welcome') : (isNewUser ? t('createAccount') : t('welcomeBack'))}
                    </CardTitle>
                    <CardDescription className="mt-3">
                        {step === 'nickname'
                            ? t('enterNickname')
                            : (isNewUser ? t('setSecurePin') : `${t('hello')}, ${nickname}`)}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 'nickname' ? (
                        <form onSubmit={handleNicknameSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Input
                                    placeholder={t('nickname')}
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="text-center text-lg h-14 bg-background/50 border-primary/20 focus:border-primary/40 transition-all"
                                    autoFocus
                                />
                            </div>
                            {error && <p className="text-sm text-destructive text-center">{error}</p>}
                            <Button type="submit" className="w-full h-12 text-base btn-glow" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" /> : t('continue')}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handlePinSubmit} className="space-y-5">
                            <div className="space-y-4">
                                <div className="flex justify-center">
                                    <Input
                                        type="tel"
                                        placeholder="• • • •"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value.slice(0, 4))}
                                        className="text-center text-3xl tracking-[0.75em] w-40 h-16 font-bold bg-background/50 border-primary/20"
                                        maxLength={4}
                                        autoFocus
                                    />
                                </div>
                                {isNewUser && (
                                    <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl text-center">
                                        <p className="font-medium text-primary text-sm mb-1">{t('important')}</p>
                                        <p className="text-xs text-muted-foreground">{t('pinLoginNote')}</p>
                                        <p className="text-xs text-muted-foreground/70 mt-2">{t('forgotPin')}</p>
                                    </div>
                                )}
                            </div>
                            {error && <p className="text-sm text-destructive text-center">{error}</p>}
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="flex-1 h-12"
                                    onClick={() => { setStep('nickname'); setError(""); }}
                                >
                                    Geri
                                </Button>
                                <Button type="submit" className="flex-1 h-12 btn-glow" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" /> : (isNewUser ? t('join') : t('login'))}
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>

            <Footer showHiring={false} />
        </div>
    )
}