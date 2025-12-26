
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, UserSession } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, Home, ExternalLink, Heart, Gem, Skull } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface Character {
    id: string
    name: string
    category: string
    image_path: string
}

interface KMKResult {
    id: string
    created_at: string
    kiss_character: Character
    marry_character: Character
    kill_character: Character
    categories_selected: string[]
}

export default function DocumentsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [results, setResults] = useState<KMKResult[]>([])

    useEffect(() => {
        const session = auth.getSession()
        if (!session) {
            router.push("/")
            return
        }
        fetchCards(session.id)
    }, [router])

    const fetchCards = async (userId: string) => {
        const { data, error } = await supabase
            .from('kmk_results')
            .select(`
                id,
                created_at,
                categories_selected,
                kiss_character:kmk_characters!kiss_char_id(id, name, category, image_path),
                marry_character:kmk_characters!marry_char_id(id, name, category, image_path),
                kill_character:kmk_characters!kill_char_id(id, name, category, image_path)
            `)
            .eq('player_id', userId)
            .order('created_at', { ascending: false })

        if (data) {
            setResults(data as any)
        }
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Bu sonucu silmek istediğinize emin misiniz?")) return

        await supabase.from('kmk_results').delete().eq('id', id)
        setResults(prev => prev.filter(c => c.id !== id))
    }

    return (
        <div className="min-h-screen bg-background flex flex-col p-4">
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.push("/home")}>
                    <Home className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold">Öp Öldür Evlen Sonuçlarım</h1>
                <div className="w-9" />
            </div>

            {loading ? (
                <div className="flex-1 flex justify-center items-center">
                    <Loader2 className="animate-spin" />
                </div>
            ) : (
                <div className="flex-1 space-y-4 content-start">
                    {results.length === 0 && (
                        <div className="text-center text-muted-foreground py-10">
                            Henüz oyun sonucun yok. Hadi oyna!
                        </div>
                    )}
                    {results.map(result => (
                        <Card key={result.id} className="overflow-hidden border shadow-md hover:shadow-xl transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(result.created_at).toLocaleDateString('tr-TR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                    <Button size="sm" variant="ghost" onClick={() => handleDelete(result.id)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </div>

                                {/* Character Grid */}
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    {/* Kiss */}
                                    <div className="text-center">
                                        <div className="w-full aspect-square rounded-full border-2 border-pink-500 overflow-hidden mb-2">
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${result.kiss_character.image_path}`}
                                                alt={result.kiss_character.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <Heart className="w-4 h-4 mx-auto text-pink-500 fill-pink-500 mb-1" />
                                        <p className="text-xs font-semibold truncate">{result.kiss_character.name}</p>
                                    </div>

                                    {/* Marry */}
                                    <div className="text-center">
                                        <div className="w-full aspect-square rounded-full border-2 border-purple-600 overflow-hidden mb-2">
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${result.marry_character.image_path}`}
                                                alt={result.marry_character.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <Gem className="w-4 h-4 mx-auto text-purple-600 fill-purple-600 mb-1" />
                                        <p className="text-xs font-semibold truncate">{result.marry_character.name}</p>
                                    </div>

                                    {/* Kill */}
                                    <div className="text-center">
                                        <div className="w-full aspect-square rounded-full border-2 border-slate-800 overflow-hidden mb-2">
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${result.kill_character.image_path}`}
                                                alt={result.kill_character.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <Skull className="w-4 h-4 mx-auto text-slate-800 fill-slate-800 mb-1" />
                                        <p className="text-xs font-semibold truncate">{result.kill_character.name}</p>
                                    </div>
                                </div>

                                {/* Categories */}
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {result.categories_selected.map((cat, idx) => (
                                        <span key={idx} className="text-[10px] px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                                            {cat}
                                        </span>
                                    ))}
                                </div>

                                {/* View Button */}
                                <Button
                                    size="sm"
                                    className="w-full"
                                    onClick={() => router.push(`/opoldurevlen/${result.id}`)}
                                >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Sonucu Görüntüle
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Footer />
        </div>
    )
}
