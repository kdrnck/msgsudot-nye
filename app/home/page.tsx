
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, UserSession } from "@/lib/auth"
import { Footer } from "@/components/layout/Footer"
import { useLanguage } from "@/components/LanguageContext"
import { useTheme } from "@/components/ClientProviders"
import { supabase } from "@/lib/supabase"
import {
    User,
    LogOut,
    Folder,
    Sparkles,
    Globe,
    Sun,
    Moon,
    Users,
    ChevronDown,
    Heart,
    Film,
    BarChart3,
    Trophy,
    Settings
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"


export default function HomePage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [user, setUser] = useState<UserSession | null>(null)
    const [logoClicks, setLogoClicks] = useState(0)
    const [konami, setKonami] = useState<string[]>([])
    const [eventEnded, setEventEnded] = useState(false)

    useEffect(() => {
        const session = auth.getSession()
        if (!session) {
            router.push("/")
            return
        }
        setUser(session)
        checkEventStatus()
    }, [router])

    const checkEventStatus = async () => {
        const { data } = await supabase
            .from('event_settings')
            .select('event_ended')
            .single()

        if (data) {
            setEventEnded(data.event_ended || false)
        }
    }

    // Konami Code
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const newK = [...konami, e.key]
            if (newK.length > 10) newK.shift()
            setKonami(newK)

            const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
            if (newK.slice(-10).join('') === code.join('')) {
                alert("KONAMI KODU AKTİF! 🎮 Sonsuz Can... Şaka Yapıyoruz.")
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [konami])

    const handleLogout = () => {
        auth.logout()
        router.push("/")
    }

    const handleLogoClick = () => {
        const newCount = logoClicks + 1
        setLogoClicks(newCount)
        if (newCount === 10) {
            alert("🔥 DOT EFSANE MODU AÇILDI!")
            document.documentElement.style.filter = "hue-rotate(90deg)"
        }
    }

    if (!user) return null

    const menuItems = [
        {
            title: t('kissMarryKill'),
            subtitle: t('whoWho'),
            icon: Heart,
            href: "/opoldurevlen",
            gradient: "from-pink-500 to-rose-600",
            delay: "0ms"
        },
        {
            title: t('silentCinema'),
            subtitle: t('beNarrator'),
            icon: Film,
            href: "/sessizsinema",
            gradient: "from-purple-500 to-violet-600",
            delay: "50ms"
        },
        {
            title: t('myCards'),
            subtitle: t('shared'),
            icon: Folder,
            href: "/opoldurevlen-documents",
            gradient: "from-blue-500 to-cyan-600",
            delay: "100ms"
        },
        {
            title: t('silentLeaderboard'),
            subtitle: t('whoAhead'),
            icon: BarChart3,
            href: "/sessizleaderboard",
            gradient: "from-orange-500 to-amber-600",
            delay: "150ms"
        },
        {
            title: t('achievements'),
            subtitle: t('yourBadges'),
            icon: Trophy,
            href: "/achievements",
            gradient: "from-yellow-500 to-orange-500",
            delay: "200ms"
        }
    ]

    const secondaryItems = [
        {
            title: t('settings'),
            icon: Settings,
            href: "/ayarlar",
        }
    ]

    return (
        <div className="min-h-screen flex flex-col p-4 relative overflow-hidden">
            {/* Artistic Background */}
            <div className="art-orbs">
                <div className="art-orb art-orb-1"></div>
                <div className="art-orb art-orb-2"></div>
            </div>

            {/* Header */}
            <header className="flex justify-between items-center mb-8 relative z-10 animate-in fade-in slide-in-from-top-4 duration-500">
                <div onClick={handleLogoClick} className="cursor-pointer select-none group">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform">
                            <img src="/dot-logo.png" alt="" className="w-8 h-8 object-contain" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-shimmer">DOT</h1>
                            <p className="text-xs text-muted-foreground">Merhaba, {user.nickname}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Language Toggle */}
                    <LanguageToggle />
                    {/* Theme Toggle */}
                    <ThemeToggle />
                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="p-3 rounded-xl bg-card/50 border border-border/50 text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Welcome Banner */}
            <div className="relative z-10 mb-6 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/10 animate-in fade-in slide-in-from-left-4 duration-500 delay-100">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    <div>
                        <p className="font-medium text-sm">2025'e Hoş Geldin!</p>
                        <p className="text-xs text-muted-foreground">MSGSU Dijital Oyun Topluluğu'nun etkinliğine katıldın.</p>
                    </div>
                </div>
            </div>

            {/* Event Ended - Matches Button */}
            {eventEnded && (
                <div className="relative z-10 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card
                        className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-2 border-green-500/30 cursor-pointer hover:scale-[1.02] transition-transform shadow-lg"
                        onClick={() => router.push('/eslesmeler')}
                    >
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Users className="w-7 h-7 text-green-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-green-500 mb-1">Eşleşmelerin Hazır!</h3>
                                <p className="text-sm text-muted-foreground">Aynı seçimleri yapan kişilerle tanış</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Main Menu Grid */}
            <main className="flex-1 relative z-10">
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {menuItems.map((item, idx) => (
                        <Card
                            key={item.title}
                            className="card-artistic bg-card/60 backdrop-blur-sm cursor-pointer overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500"
                            style={{ animationDelay: item.delay }}
                            onClick={() => router.push(item.href)}
                        >
                            <CardContent className="p-4 flex flex-col items-start gap-2 relative">
                                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    <item.icon className="w-6 h-6 text-white" />
                                </div>
                                <div className="relative">
                                    <h3 className="font-bold text-sm">{item.title}</h3>
                                    <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {secondaryItems.map((item, idx) => (
                        <button
                            key={item.title}
                            onClick={() => router.push(item.href)}
                            className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-card/40 border border-border/30 text-muted-foreground hover:text-foreground hover:bg-card/60 transition-all"
                        >
                            <item.icon className="w-4 h-4" />
                            <span className="text-sm">{item.title}</span>
                        </button>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    )
}

// Language Toggle Component
function LanguageToggle() {
    const { language, setLanguage } = useLanguage()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="p-3 rounded-xl bg-card/50 border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all flex items-center gap-2">
                <Globe className="w-5 h-5" />
                <ChevronDown className="w-3 h-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem 
                    onClick={() => setLanguage('tr')}
                    className={language === 'tr' ? 'bg-primary/10' : ''}
                >
                    <span className="flex items-center gap-2">
                        🇹🇷 Türkçe
                    </span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                    onClick={() => setLanguage('en')}
                    className={language === 'en' ? 'bg-primary/10' : ''}
                >
                    <span className="flex items-center gap-2">
                        🇬🇧 English
                    </span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// Theme Toggle Component  
function ThemeToggle() {
    const { isDark, toggle } = useTheme()

    return (
        <button
            onClick={toggle}
            className="p-3 rounded-xl bg-card/50 border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
    )
}
