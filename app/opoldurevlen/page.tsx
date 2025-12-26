
"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { auth, UserSession } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { CharacterCard } from "@/components/kmk/CharacterCard"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Heart, Skull, Gem, ArrowRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/LanguageContext"
import { createKmsGame, updateKmsGame, completeKmsGame } from "@/lib/live-state"

interface Character {
    id: string
    name: string
    category: string
    image_path: string
}

type GameStage = 'category-select' | 'drawing' | 'playing'
type SlotType = 'kiss1' | 'kiss2' | 'marry1' | 'marry2' | 'kill1' | 'kill2'

export default function KMKGamePage() {
    const router = useRouter()
    const [user, setUser] = useState<UserSession | null>(null)
    const { t, language } = useLanguage()

    // State
    const [stage, setStage] = useState<GameStage>('category-select')
    const [categories, setCategories] = useState<string[]>([])
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [allCharacters, setAllCharacters] = useState<Character[]>([])
    const [revealedCharacters, setRevealedCharacters] = useState<Character[]>([])
    const [currentCharacterIndex, setCurrentCharacterIndex] = useState(0)
    const [isRevealing, setIsRevealing] = useState(false)

    const [slots, setSlots] = useState<{
        kiss1: Character | null,
        kiss2: Character | null,
        marry1: Character | null,
        marry2: Character | null,
        kill1: Character | null,
        kill2: Character | null
    }>({ kiss1: null, kiss2: null, marry1: null, marry2: null, kill1: null, kill2: null })

    const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
    const [kmsGameId, setKmsGameId] = useState<string | null>(null) // Track live game ID

    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)

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

        if (error || !data || data.length < 6) {
            // Handle not enough characters
            alert(t('notEnoughCharacters'))
            setLoading(false)
            return
        }

        // Randomly pick 6
        const shuffled = [...data].sort(() => 0.5 - Math.random())
        setAllCharacters(shuffled.slice(0, 6))
        setRevealedCharacters([])
        setCurrentCharacterIndex(0)

        // Reset slots
        setSlots({ kiss1: null, kiss2: null, marry1: null, marry2: null, kill1: null, kill2: null })
        setSelectedCharId(null)

        // Create live game entry for broadcast
        if (user) {
            try {
                const liveGame = await createKmsGame(user.id, user.nickname)
                setKmsGameId(liveGame.id)
                console.log('[KMS] Created live game:', liveGame.id)
            } catch (err) {
                console.error('[KMS] Failed to create live game:', err)
                // Continue anyway - game still playable locally
            }
        }

        setStage('playing')
        setLoading(false)
        
        // Start revealing first character after 1 second
        setTimeout(() => revealNextCharacter(shuffled.slice(0, 6), []), 1000)
    }

    const revealNextCharacter = (chars: Character[], revealed: Character[]) => {
        if (revealed.length >= 6) return
        
        setIsRevealing(true)
        setTimeout(() => {
            const nextChar = chars[revealed.length]
            setRevealedCharacters([...revealed, nextChar])
            setCurrentCharacterIndex(revealed.length)
            setIsRevealing(false)
        }, 1000)
    }

    const toggleCategory = (cat: string) => {
        if (selectedCategories.includes(cat)) {
            setSelectedCategories(prev => prev.filter(c => c !== cat))
        } else {
            setSelectedCategories(prev => [...prev, cat])
        }
    }

    const handleCharacterClick = (char: Character) => {
        // If character is already placed, select it to move
        const placedSlot = (Object.keys(slots) as (keyof typeof slots)[]).find(key => slots[key]?.id === char.id)
        if (placedSlot) {
            // Select this character to move it
            if (selectedCharId === char.id) {
                setSelectedCharId(null) // deselect
            } else {
                setSelectedCharId(char.id)
            }
            return
        }

        // Select this character to be placed
        if (selectedCharId === char.id) {
            setSelectedCharId(null) // deselect
        } else {
            setSelectedCharId(char.id)
        }
    }

    const handleSlotClick = async (slotType: SlotType) => {
        if (!selectedCharId) {
            // If nothing selected, select what's in the slot to move it
            if (slots[slotType]) {
                setSelectedCharId(slots[slotType]!.id)
            }
            return
        }

        // Place selected character
        const char = revealedCharacters.find(c => c.id === selectedCharId)
        if (!char) return

        // Place character in slot
        const newSlots = { ...slots, [slotType]: char }
        setSlots(newSlots)
        setSelectedCharId(null)

        // Update live game with new slot placement
        if (kmsGameId && user) {
            try {
                // Map slots to live format
                const liveSlots = {
                    slot1: newSlots.kiss1 ? { characterId: newSlots.kiss1.id, name: newSlots.kiss1.name, imageUrl: newSlots.kiss1.image_path, action: 'kiss' as const } : null,
                    slot2: newSlots.kiss2 ? { characterId: newSlots.kiss2.id, name: newSlots.kiss2.name, imageUrl: newSlots.kiss2.image_path, action: 'kiss' as const } : null,
                    slot3: newSlots.marry1 ? { characterId: newSlots.marry1.id, name: newSlots.marry1.name, imageUrl: newSlots.marry1.image_path, action: 'marry' as const } : null,
                    slot4: newSlots.marry2 ? { characterId: newSlots.marry2.id, name: newSlots.marry2.name, imageUrl: newSlots.marry2.image_path, action: 'marry' as const } : null,
                    slot5: newSlots.kill1 ? { characterId: newSlots.kill1.id, name: newSlots.kill1.name, imageUrl: newSlots.kill1.image_path, action: 'kill' as const } : null,
                    slot6: newSlots.kill2 ? { characterId: newSlots.kill2.id, name: newSlots.kill2.name, imageUrl: newSlots.kill2.image_path, action: 'kill' as const } : null,
                }
                
                // Also set current card to the character being placed
                const currentCard = {
                    characterId: char.id,
                    name: char.name,
                    imageUrl: char.image_path,
                    category: char.category
                }
                
                await updateKmsGame(kmsGameId, { slots: liveSlots, current_card: currentCard })
                console.log('[KMS] Updated live game slots')
            } catch (err) {
                console.error('[KMS] Failed to update live game:', err)
            }
        }

        // Reveal next character if not all revealed
        if (revealedCharacters.length < 6) {
            setTimeout(() => revealNextCharacter(allCharacters, revealedCharacters), 500)
        }
    }

    const isComplete = slots.kiss1 && slots.kiss2 && slots.marry1 && slots.marry2 && slots.kill1 && slots.kill2

    const saveResult = async () => {
        if (!user || !isComplete) {
            console.warn('[KMK] saveResult blocked', {
                hasUser: Boolean(user),
                isComplete,
            })
            return
        }
        console.log('[KMK] saveResult start', {
            user: { id: user.id, nickname: user.nickname },
            selectedCategories,
            slots: {
                kiss1: slots.kiss1?.id,
                kiss2: slots.kiss2?.id,
                marry1: slots.marry1?.id,
                marry2: slots.marry2?.id,
                kill1: slots.kill1?.id,
                kill2: slots.kill2?.id,
            },
        })
        setGenerating(true)

        try {
            console.log('[KMK] saveResult → inserting kmk_results row')
            const { data, error: dbError } = await supabase
                .from('kmk_results')
                .insert({
                    player_id: user.id,
                    kiss_char_id: slots.kiss1!.id,
                    kiss_char_id_2: slots.kiss2!.id,
                    marry_char_id: slots.marry1!.id,
                    marry_char_id_2: slots.marry2!.id,
                    kill_char_id: slots.kill1!.id,
                    kill_char_id_2: slots.kill2!.id,
                    categories_selected: selectedCategories
                })
                .select('id')
                .single()

            if (dbError) throw dbError
            console.log('[KMK] saveResult → insert successful', { id: data.id })

            // Mark live game as completed
            if (kmsGameId) {
                try {
                    await completeKmsGame(kmsGameId)
                    console.log('[KMS] Completed live game')
                } catch (err) {
                    console.error('[KMS] Failed to complete live game:', err)
                }
            }

            router.push(`/opoldurevlen/${data.id}`)

        } catch (e) {
            console.error('[KMK] saveResult failed', e)
            alert(t('kmkGenerateError'))
        } finally {
            setGenerating(false)
            console.log('[KMK] saveResult end')
        }
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
                        {revealedCharacters.map(char => {
                            const isPlaced = Object.values(slots).some(s => s?.id === char.id)
                            if (isPlaced) return null
                            return (
                                <CharacterCard
                                    key={char.id}
                                    character={char}
                                    selected={selectedCharId === char.id}
                                    disabled={false}
                                    onClick={() => handleCharacterClick(char)}
                                />
                            )
                        })}
                        {/* Show loading placeholder for unrevealed characters */}
                        {revealedCharacters.length < 6 && (
                            <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-muted flex items-center justify-center bg-muted/20">
                                {isRevealing ? (
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                ) : (
                                    <div className="text-center text-xs text-muted-foreground px-2">
                                        {language === 'tr' ? 'Karakteri yerleştir...' : 'Selecting character...'}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-center text-sm text-muted-foreground animate-pulse">
                        {selectedCharId ? (language === 'tr' ? 'Slota yerleştirmek için tıkla' : 'Tap slot to place') : (language === 'tr' ? 'Önce karaktere tıkla' : 'Tap character first')}
                    </div>

                    {/* Slots - 2 rows of 3 */}
                    <div className="grid grid-cols-3 gap-3 mt-auto mb-2">
                        {/* Kiss Slot 1 */}
                        <div onClick={() => handleSlotClick('kiss1')} className="flex flex-col items-center gap-2 cursor-pointer group">
                            <div className={cn("w-full aspect-[3/4] rounded-xl border-2 border-dashed flex items-center justify-center relative overflow-hidden transition-colors",
                                slots.kiss1 ? "border-pink-500" : "border-pink-300 hover:bg-pink-50"
                            )}>
                                {slots.kiss1 ? (
                                    <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${slots.kiss1.image_path}`} className="w-full h-full object-cover" />
                                ) : (
                                    <Heart className="text-pink-400 w-8 h-8 opacity-50" />
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-pink-500 text-white text-[10px] font-bold text-center py-1 uppercase">
                                    {t('kiss')} 1
                                </div>
                            </div>
                        </div>

                        {/* Marry Slot 1 */}
                        <div onClick={() => handleSlotClick('marry1')} className="flex flex-col items-center gap-2 cursor-pointer group">
                            <div className={cn("w-full aspect-[3/4] rounded-xl border-2 border-dashed flex items-center justify-center relative overflow-hidden transition-colors",
                                slots.marry1 ? "border-purple-500" : "border-purple-300 hover:bg-purple-50"
                            )}>
                                {slots.marry1 ? (
                                    <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${slots.marry1.image_path}`} className="w-full h-full object-cover" />
                                ) : (
                                    <Gem className="text-purple-400 w-8 h-8 opacity-50" />
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-purple-500 text-white text-[10px] font-bold text-center py-1 uppercase">
                                    {t('marry')} 1
                                </div>
                            </div>
                        </div>

                        {/* Kill Slot 1 */}
                        <div onClick={() => handleSlotClick('kill1')} className="flex flex-col items-center gap-2 cursor-pointer group">
                            <div className={cn("w-full aspect-[3/4] rounded-xl border-2 border-dashed flex items-center justify-center relative overflow-hidden transition-colors",
                                slots.kill1 ? "border-slate-800" : "border-slate-400 hover:bg-slate-100"
                            )}>
                                {slots.kill1 ? (
                                    <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${slots.kill1.image_path}`} className="w-full h-full object-cover" />
                                ) : (
                                    <Skull className="text-slate-600 w-8 h-8 opacity-50" />
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-slate-800 text-white text-[10px] font-bold text-center py-1 uppercase">
                                    {t('kill')} 1
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {/* Kiss Slot 2 */}
                        <div onClick={() => handleSlotClick('kiss2')} className="flex flex-col items-center gap-2 cursor-pointer group">
                            <div className={cn("w-full aspect-[3/4] rounded-xl border-2 border-dashed flex items-center justify-center relative overflow-hidden transition-colors",
                                slots.kiss2 ? "border-pink-500" : "border-pink-300 hover:bg-pink-50"
                            )}>
                                {slots.kiss2 ? (
                                    <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${slots.kiss2.image_path}`} className="w-full h-full object-cover" />
                                ) : (
                                    <Heart className="text-pink-400 w-8 h-8 opacity-50" />
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-pink-500 text-white text-[10px] font-bold text-center py-1 uppercase">
                                    {t('kiss')} 2
                                </div>
                            </div>
                        </div>

                        {/* Marry Slot 2 */}
                        <div onClick={() => handleSlotClick('marry2')} className="flex flex-col items-center gap-2 cursor-pointer group">
                            <div className={cn("w-full aspect-[3/4] rounded-xl border-2 border-dashed flex items-center justify-center relative overflow-hidden transition-colors",
                                slots.marry2 ? "border-purple-500" : "border-purple-300 hover:bg-purple-50"
                            )}>
                                {slots.marry2 ? (
                                    <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${slots.marry2.image_path}`} className="w-full h-full object-cover" />
                                ) : (
                                    <Gem className="text-purple-400 w-8 h-8 opacity-50" />
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-purple-500 text-white text-[10px] font-bold text-center py-1 uppercase">
                                    {t('marry')} 2
                                </div>
                            </div>
                        </div>

                        {/* Kill Slot 2 */}
                        <div onClick={() => handleSlotClick('kill2')} className="flex flex-col items-center gap-2 cursor-pointer group">
                            <div className={cn("w-full aspect-[3/4] rounded-xl border-2 border-dashed flex items-center justify-center relative overflow-hidden transition-colors",
                                slots.kill2 ? "border-slate-800" : "border-slate-400 hover:bg-slate-100"
                            )}>
                                {slots.kill2 ? (
                                    <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${slots.kill2.image_path}`} className="w-full h-full object-cover" />
                                ) : (
                                    <Skull className="text-slate-600 w-8 h-8 opacity-50" />
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-slate-800 text-white text-[10px] font-bold text-center py-1 uppercase">
                                    {t('kill')} 2
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button
                        size="lg"
                        className="w-full"
                        disabled={!isComplete || generating}
                        onClick={saveResult}
                    >
                        {generating ? <Loader2 className="animate-spin" /> : t('completeGame')}
                    </Button>
                </div>
            )}


            <Footer />
        </div>
    )
}
