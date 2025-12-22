
"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { auth, UserSession } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { CharacterCard } from "@/components/kmk/CharacterCard"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Heart, Skull, Gem, ArrowRight, Download, Eye, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/LanguageContext"
// import * as htmlToImage from 'html-to-image' // Will import dynamically to avoid SSR issues if any, or just import top level.
// Dynamic import for client side libraries is safer for canvas.
import { toPng } from 'html-to-image'

interface Character {
    id: string
    name: string
    category: string
    image_path: string
}

type GameStage = 'category-select' | 'drawing' | 'playing' | 'result'

export default function KMKGamePage() {
    const router = useRouter()
    const [user, setUser] = useState<UserSession | null>(null)
    const { t, language } = useLanguage()

    // State
    const [stage, setStage] = useState<GameStage>('category-select')
    const [categories, setCategories] = useState<string[]>([])
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [characters, setCharacters] = useState<Character[]>([])

    const [slots, setSlots] = useState<{
        kiss: Character | null,
        marry: Character | null,
        kill: Character | null
    }>({ kiss: null, marry: null, kill: null })

    const [selectedCharId, setSelectedCharId] = useState<string | null>(null)

    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [resultImage, setResultImage] = useState<string | null>(null)

    const cardRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const session = auth.getSession()
        if (!session) {
            router.push("/")
            return
        }
        setUser(session)
        fetchCategories()
    }, [router])

    const fetchCategories = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('kmk_characters')
            .select('category')

        if (data) {
            // Unique categories
            const cats = Array.from(new Set(data.map(c => c.category)))
            setCategories(cats)
            // Select all by default if small number, or let user select.
            // Let's select all by default for better UX? Or none?
            // User requested "User first selects which categories".
            // Let's start with none or all? Let's start with none to force interaction or maybe picking just one is annoying. 
            // I'll leave empty.
        }
        setLoading(false)
    }

    const handleStartGame = async () => {
        if (selectedCategories.length === 0) return
        setLoading(true)

        // Fetch characters from selected categories
        const { data, error } = await supabase
            .from('kmk_characters')
            .select('*')
            .in('category', selectedCategories)

        if (error || !data || data.length < 3) {
            // Handle not enough characters
            alert(t('notEnoughCharacters'))
            setLoading(false)
            return
        }

        // Randomly pick 3
        const shuffled = [...data].sort(() => 0.5 - Math.random())
        setCharacters(shuffled.slice(0, 3))

        // Reset slots
        setSlots({ kiss: null, marry: null, kill: null })
        setSelectedCharId(null)

        setStage('playing') // Skip 'drawing' animation for MVP speed, or add small delay
        setLoading(false)
    }

    const toggleCategory = (cat: string) => {
        if (selectedCategories.includes(cat)) {
            setSelectedCategories(prev => prev.filter(c => c !== cat))
        } else {
            setSelectedCategories(prev => [...prev, cat])
        }
    }

    const handleCharacterClick = (char: Character) => {
        // If character is already placed, remove it from slot
        const placedSlot = (Object.keys(slots) as (keyof typeof slots)[]).find(key => slots[key]?.id === char.id)
        if (placedSlot) {
            setSlots(prev => ({ ...prev, [placedSlot]: null }))
            return
        }

        // Select this character to be placed
        if (selectedCharId === char.id) {
            setSelectedCharId(null) // deselect
        } else {
            setSelectedCharId(char.id)
        }
    }

    const handleSlotClick = (slotType: keyof typeof slots) => {
        if (!selectedCharId) {
            // If nothing selected, maybe remove what's in there?
            if (slots[slotType]) {
                setSlots(prev => ({ ...prev, [slotType]: null }))
            }
            return
        }

        // Place selected character
        const char = characters.find(c => c.id === selectedCharId)
        if (char) {
            // If this character is already somewhere else, remove it from there (handled by logic above but ensuring safety)
            const oldSlot = (Object.keys(slots) as (keyof typeof slots)[]).find(key => slots[key]?.id === char.id)

            setSlots(prev => {
                const next = { ...prev }
                if (oldSlot) next[oldSlot] = null
                next[slotType] = char
                return next
            })
            setSelectedCharId(null)
        }
    }

    const isComplete = slots.kiss && slots.marry && slots.kill

    const generateCard = async () => {
        if (!cardRef.current || !user || !isComplete) return
        setGenerating(true)

        try {
            // 1. Generate Image
            // Ensure fonts are loaded? usually ok.
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 }) // pixelRatio 2 for high quality on mobile
            setResultImage(dataUrl)

            // 2. Upload to Supabase Storage
            const blob = await (await fetch(dataUrl)).blob()
            const filename = `${user.nickname}_${Date.now()}.png`
            const { error: uploadError } = await supabase.storage
                .from('stories')
                .upload(filename, blob)

            if (uploadError) throw uploadError

            // 3. Save to DB
            const { error: dbError } = await supabase
                .from('kmk_results')
                .insert({
                    player_id: user.id,
                    kiss_character_id: slots.kiss!.id,
                    marry_character_id: slots.marry!.id,
                    kill_character_id: slots.kill!.id,
                    story_image_path: filename,
                    categories_selected: selectedCategories
                })

            if (dbError) throw dbError

            setStage('result')

        } catch (e) {
            console.error(e)
            alert(t('kmkGenerateError'))
        } finally {
            setGenerating(false)
        }
    }

    const downloadImage = () => {
        if (!resultImage) return
        const link = document.createElement('a')
        link.download = `msgsu-dot-kmk-${Date.now()}.png`
        link.href = resultImage
        link.click()
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center p-4">

            {/* Header */}
            <div className="flex items-center justify-between w-full mb-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/home')}>
                    <Home className="w-5 h-5" />
                </Button>
                <h1 className="text-lg font-bold">{t('kissMarryKill')}</h1>
                <div className="w-9" />
            </div>

            {loading && (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            )}

            {!loading && stage === 'category-select' && (
                <div className="flex-1 w-full max-w-sm flex flex-col gap-4">
                    <div className="text-center mb-4">
                        <h2 className="text-2xl font-bold mb-2">{t('selectCategories')}</h2>
                        <p className="text-muted-foreground text-sm">{t('pickAtLeastOne')}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => toggleCategory(cat)}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-all font-medium text-sm",
                                    selectedCategories.includes(cat)
                                        ? "border-primary bg-primary/10 text-primary shadow-md"
                                        : "border-border bg-card hover:bg-muted"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                        {categories.length === 0 && (
                            <p className="col-span-2 text-center text-muted-foreground py-8">
                                {t('noCategories')}
                            </p>
                        )}
                    </div>

                    <Button
                        size="lg"
                        className="w-full mt-auto"
                        onClick={handleStartGame}
                        disabled={selectedCategories.length === 0}
                    >
                        {t('startGameBtn')} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            )}

            {!loading && stage === 'playing' && (
                <div className="flex-1 w-full max-w-md flex flex-col gap-6">
                    {/* Available Characters */}
                    <div className="grid grid-cols-3 gap-3">
                        {characters.map(char => {
                            const isPlaced = Object.values(slots).some(s => s?.id === char.id)
                            return (
                                <CharacterCard
                                    key={char.id}
                                    character={char}
                                    selected={selectedCharId === char.id}
                                    disabled={isPlaced}
                                    onClick={() => handleCharacterClick(char)}
                                />
                            )
                        })}
                    </div>

                    <div className="flex items-center justify-center text-sm text-muted-foreground animate-pulse">
                        {selectedCharId ? t('tapSlotToPlace') : t('tapCharacterFirst')}
                    </div>

                    {/* Slots */}
                    <div className="grid grid-cols-3 gap-3 mt-auto mb-4">
                        {/* Kiss Slot */}
                        <div onClick={() => handleSlotClick('kiss')} className="flex flex-col items-center gap-2 cursor-pointer group">
                            <div className={cn("w-full aspect-[3/4] rounded-xl border-2 border-dashed flex items-center justify-center relative overflow-hidden transition-colors",
                                slots.kiss ? "border-pink-500" : "border-pink-300 hover:bg-pink-50"
                            )}>
                                {slots.kiss ? (
                                    <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${slots.kiss.image_path}`} className="w-full h-full object-cover" />
                                ) : (
                                    <Heart className="text-pink-400 w-8 h-8 opacity-50" />
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-pink-500 text-white text-[10px] font-bold text-center py-1 uppercase">
                                    {t('kiss')}
                                </div>
                            </div>
                        </div>

                        {/* Marry Slot */}
                        <div onClick={() => handleSlotClick('marry')} className="flex flex-col items-center gap-2 cursor-pointer group">
                            <div className={cn("w-full aspect-[3/4] rounded-xl border-2 border-dashed flex items-center justify-center relative overflow-hidden transition-colors",
                                slots.marry ? "border-purple-500" : "border-purple-300 hover:bg-purple-50"
                            )}>
                                {slots.marry ? (
                                    <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${slots.marry.image_path}`} className="w-full h-full object-cover" />
                                ) : (
                                    <Gem className="text-purple-400 w-8 h-8 opacity-50" />
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-purple-500 text-white text-[10px] font-bold text-center py-1 uppercase">
                                    {t('marry')}
                                </div>
                            </div>
                        </div>

                        {/* Kill Slot */}
                        <div onClick={() => handleSlotClick('kill')} className="flex flex-col items-center gap-2 cursor-pointer group">
                            <div className={cn("w-full aspect-[3/4] rounded-xl border-2 border-dashed flex items-center justify-center relative overflow-hidden transition-colors",
                                slots.kill ? "border-slate-800" : "border-slate-400 hover:bg-slate-100"
                            )}>
                                {slots.kill ? (
                                    <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${slots.kill.image_path}`} className="w-full h-full object-cover" />
                                ) : (
                                    <Skull className="text-slate-600 w-8 h-8 opacity-50" />
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-slate-800 text-white text-[10px] font-bold text-center py-1 uppercase">
                                    {t('kill')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button
                        size="lg"
                        className="w-full"
                        disabled={!isComplete || generating}
                        onClick={generateCard}
                    >
                        {generating ? <Loader2 className="animate-spin" /> : t('completeGame')}
                    </Button>
                </div>
            )}

            {/* Result Stage */}
            {!loading && stage === 'result' && resultImage && (
                <div className="flex-1 w-full max-w-sm flex flex-col items-center gap-6 animate-in slide-in-from-bottom">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600">
                        {t('itIsDone')}
                    </h2>

                    <img src={resultImage} alt="Result Card" className="w-2/3 shadow-2xl rounded-xl" />

                    <div className="flex gap-4 w-full">
                        <Button className="flex-1" variant="outline" onClick={() => window.open(resultImage, '_blank')} >
                            <Eye className="w-4 h-4 mr-2" /> {t('view')}
                        </Button>
                        <Button className="flex-1" onClick={downloadImage}>
                            <Download className="w-4 h-4 mr-2" /> {t('download')}
                        </Button>
                    </div>

                    <div className="flex gap-4 w-full">
                        <Button variant="ghost" className="flex-1" onClick={() => setStage('category-select')}>
                            <RefreshCw className="w-4 h-4 mr-2" /> {t('playAgain')}
                        </Button>
                    </div>
                </div>
            )}

            {/* Hidden Card for Generation */}
            {/* Must be visible in DOM but hidden visually? html-to-image needs it rendered. 
          Use fixed position off-screen. */}
            {isComplete && (
                <div
                    ref={cardRef}
                    className="fixed top-0 left-0 -z-50 pointer-events-none"
                    style={{ width: '1080px', height: '1920px', background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)' }}
                >
                    {/* Story Card Design 1080x1920 */}
                    <div className="w-full h-full relative flex flex-col p-12 items-center bg-white text-black font-sans">
                        {/* Background Design */}
                        <div className="absolute inset-0 opacity-10 bg-[url('/brand/pattern.png')]"></div> {/* Optional */}
                        <div className="absolute top-0 w-full h-4 bg-purple-600"></div>
                        <div className="absolute bottom-0 w-full h-4 bg-purple-600"></div>

                        {/* Header */}
                        <div className="mt-20 text-center z-10">
                            <h1 className="text-6xl font-bold text-purple-700 tracking-tight uppercase">MSGSU DOT</h1>
                            <p className="text-4xl mt-4 font-light text-gray-500">2025 New Year Event</p>
                        </div>

                        {/* Grid */}
                        <div className="flex-1 w-full flex flex-col justify-center gap-16 px-16 z-10">
                            {/* Kiss */}
                            <div className="flex items-center gap-12">
                                <div className="w-64 h-64 rounded-full border-8 border-pink-500 overflow-hidden flex-shrink-0 relative shadow-xl">
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${slots.kiss?.image_path}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-pink-500 text-5xl font-black uppercase mb-2">{t('kiss')}</span>
                                    <span className="text-6xl font-serif text-gray-900 leading-none">{slots.kiss?.name}</span>
                                </div>
                            </div>

                            {/* Marry */}
                            <div className="flex items-center gap-12 flex-row-reverse text-right">
                                <div className="w-64 h-64 rounded-full border-8 border-purple-600 overflow-hidden flex-shrink-0 relative shadow-xl">
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${slots.marry?.image_path}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-purple-600 text-5xl font-black uppercase mb-2">{t('marry')}</span>
                                    <span className="text-6xl font-serif text-gray-900 leading-none">{slots.marry?.name}</span>
                                </div>
                            </div>

                            {/* Kill */}
                            <div className="flex items-center gap-12">
                                <div className="w-64 h-64 rounded-full border-8 border-slate-800 overflow-hidden flex-shrink-0 relative shadow-xl">
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${slots.kill?.image_path}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-red-500 mix-blend-multiply opacity-30"></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-slate-800 text-5xl font-black uppercase mb-2">{t('kill')}</span>
                                    <span className="text-6xl font-serif text-gray-900 leading-none">{slots.kill?.name}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mb-24 text-center z-10">
                            <p className="text-3xl font-bold text-gray-400">@{user?.nickname}</p>
                            <p className="text-2xl text-gray-300 mt-2">{new Date().toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

                            <div className="mt-12 pt-8 border-t-2 border-gray-100 w-full flex justify-center gap-4 text-2xl text-purple-400">
                                <span>MSGSU - DOT</span>
                                <span>|</span>
                                <span>by kdrnck</span>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            <Footer />
        </div>
    )
}
