"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Loader2, Heart, Skull, Gem, Home, Share2, ExternalLink } from "lucide-react"
import { useLanguage } from "@/components/LanguageContext"
import { useTheme } from "@/components/ClientProviders"

interface Character {
    id: string
    name: string
    category: string
    image_path: string
}

interface KMKResult {
    id: string
    player_id: string
    kiss_char_id: string
    kiss_char_id_2: string
    marry_char_id: string
    marry_char_id_2: string
    kill_char_id: string
    kill_char_id_2: string
    categories_selected: string[]
    created_at: string
    player: {
        nickname: string
    }
    kiss_character: Character
    kiss_character_2: Character
    marry_character: Character
    marry_character_2: Character
    kill_character: Character
    kill_character_2: Character
}

export default function KMKResultPage() {
    const router = useRouter()
    const params = useParams()
    const { t, language } = useLanguage()
    const { isDark } = useTheme()
    const [result, setResult] = useState<KMKResult | null>(null)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (params.id) {
            fetchResult(params.id as string)
        }
    }, [params.id])

    const fetchResult = async (id: string) => {
        setLoading(true)
        const { data, error } = await supabase
            .from('kmk_results')
            .select(`
                *,
                player:players(nickname),
                kiss_character:kmk_characters!kiss_char_id(id, name, category, image_path),
                kiss_character_2:kmk_characters!kiss_char_id_2(id, name, category, image_path),
                marry_character:kmk_characters!marry_char_id(id, name, category, image_path),
                marry_character_2:kmk_characters!marry_char_id_2(id, name, category, image_path),
                kill_character:kmk_characters!kill_char_id(id, name, category, image_path),
                kill_character_2:kmk_characters!kill_char_id_2(id, name, category, image_path)
            `)
            .eq('id', id)
            .single()

        if (error || !data) {
            console.error('Error fetching result:', error)
            setLoading(false)
            return
        }

        setResult(data as any)
        setLoading(false)
    }

    const handleShare = async () => {
        const url = window.location.href
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${result?.player.nickname} - Öp Öldür Evlen`,
                    text: `${result?.player.nickname} oyunu tamamladı!`,
                    url: url,
                })
            } catch (err) {
                copyToClipboard(url)
            }
        } else {
            copyToClipboard(url)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!result) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-bold mb-4">{language === 'tr' ? 'Sonuç Bulunamadı' : 'Result Not Found'}</h1>
                <Button onClick={() => router.push('/home')}>
                    <Home className="w-4 h-4 mr-2" /> {t('home')}
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 flex flex-col items-center p-4 py-8">
            {/* Header */}
            <div className="w-full max-w-4xl flex justify-between items-center mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.push('/home')}>
                    <Home className="w-5 h-5" />
                </Button>
                <Button variant="outline" onClick={handleShare}>
                    {copied ? (
                        <>{language === 'tr' ? 'Kopyalandı!' : 'Copied!'}</>
                    ) : (
                        <><Share2 className="w-4 h-4 mr-2" /> {language === 'tr' ? 'Sonucunu paylaş' : 'Share'}</>
                    )}
                </Button>
            </div>

            {/* Main Card */}
            <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-pink-500 via-purple-600 to-blue-600 p-8 text-white text-center">
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-2">
                        {t('kissMarryKill')}
                    </h1>
                    <p className="text-xl md:text-2xl font-light opacity-90">MSGSU DOT - 2026</p>
                </div>

                {/* Player Info */}
                <div className="p-6 bg-gradient-to-b from-purple-100 to-white dark:from-purple-900/20 dark:to-gray-800 text-center border-b">
                    <div className="inline-block bg-white dark:bg-gray-700 px-6 py-3 rounded-full shadow-lg">
                        <p className="text-sm text-muted-foreground mb-1">{language === 'tr' ? 'Oyuncu' : 'Player'}</p>
                        <p className="text-3xl font-bold text-primary">@{result.player.nickname}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                        {new Date(result.created_at).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                </div>

                {/* Choices Grid */}
                <div className="p-8 md:p-12 space-y-6">
                    {/* Kiss Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
                            <h2 className="text-2xl md:text-3xl font-black text-pink-600 dark:text-pink-400 uppercase">
                                {t('kiss')}
                            </h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-pink-50 dark:bg-pink-950/20 border-2 border-pink-200 dark:border-pink-800">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-pink-500 overflow-hidden shadow-xl">
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${result.kiss_character.image_path}`}
                                        alt={result.kiss_character.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                                        {result.kiss_character.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">{result.kiss_character.category}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-pink-50 dark:bg-pink-950/20 border-2 border-pink-200 dark:border-pink-800">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-pink-500 overflow-hidden shadow-xl">
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${result.kiss_character_2.image_path}`}
                                        alt={result.kiss_character_2.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                                        {result.kiss_character_2.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">{result.kiss_character_2.category}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Marry Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Gem className="w-8 h-8 text-purple-600 fill-purple-600" />
                            <h2 className="text-2xl md:text-3xl font-black text-purple-600 dark:text-purple-400 uppercase">
                                {t('marry')}
                            </h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-800">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-purple-600 overflow-hidden shadow-xl">
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${result.marry_character.image_path}`}
                                        alt={result.marry_character.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                                        {result.marry_character.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">{result.marry_character.category}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-800">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-purple-600 overflow-hidden shadow-xl">
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${result.marry_character_2.image_path}`}
                                        alt={result.marry_character_2.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                                        {result.marry_character_2.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">{result.marry_character_2.category}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Kill Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Skull className="w-8 h-8 text-slate-800 dark:text-slate-400 fill-slate-800 dark:fill-slate-400" />
                            <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-400 uppercase">
                                {t('kill')}
                            </h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/20 border-2 border-slate-300 dark:border-slate-700">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-slate-800 dark:border-slate-600 overflow-hidden shadow-xl">
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${result.kill_character.image_path}`}
                                        alt={result.kill_character.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                                        {result.kill_character.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">{result.kill_character.category}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/20 border-2 border-slate-300 dark:border-slate-700">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-slate-800 dark:border-slate-600 overflow-hidden shadow-xl">
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${result.kill_character_2.image_path}`}
                                        alt={result.kill_character_2.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                                        {result.kill_character_2.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">{result.kill_character_2.category}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Categories */}
                <div className="px-8 pb-8">
                    <p className="text-sm text-muted-foreground text-center mb-3">
                        {language === 'tr' ? 'Seçilen Kategoriler' : 'Selected Categories'}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {result.categories_selected.map((cat, idx) => (
                            <span
                                key={idx}
                                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-semibold shadow-md"
                            >
                                {cat}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950/30 dark:to-pink-950/30 p-6 text-center border-t">
                    <p className="text-sm text-muted-foreground mb-3">
                        {language === 'tr' ? 'Kendi sonuçlarını oluşturmak ister misin?' : 'Want to create your own results?'}
                    </p>
                    <Button onClick={() => router.push('/opoldurevlen')} className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {language === 'tr' ? 'Tekrar Oyna' : 'Play Again'}
                    </Button>
                </div>
            </div>

            <Footer />
        </div>
    )
}
