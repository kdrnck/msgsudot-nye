
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, UserSession } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Download, Trash2, Home } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StoryCard {
    id: string
    story_image_path: string
    created_at: string
}

export default function DocumentsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [cards, setCards] = useState<StoryCard[]>([])

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
            .select('id, story_image_path, created_at')
            .eq('player_id', userId)
            .order('created_at', { ascending: false })

        if (data) {
            setCards(data)
        }
        setLoading(false)
    }

    const handleDelete = async (id: string, path: string) => {
        if (!confirm("Delete this card?")) return

        // Delete from DB (Cascade should handle storage? No, usually separate)
        // Actually Supabase cascade deletes DB rows. Storage needs manual delete or special trigger.
        // For simplicity, we delete DB row and try to delete storage.

        await supabase.from('kmk_results').delete().eq('id', id)
        await supabase.storage.from('stories').remove([path])

        setCards(prev => prev.filter(c => c.id !== id))
    }

    const downloadCard = (path: string) => {
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/stories/${path}`
        const link = document.createElement('a')
        link.href = url
        link.download = path
        link.target = '_blank'
        link.click()
    }

    return (
        <div className="min-h-screen bg-background flex flex-col p-4">
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.push("/home")}>
                    <Home className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold">My Cards</h1>
                <div className="w-9" />
            </div>

            {loading ? (
                <div className="flex-1 flex justify-center items-center">
                    <Loader2 className="animate-spin" />
                </div>
            ) : (
                <div className="flex-1 grid grid-cols-2 gap-4 content-start">
                    {cards.length === 0 && (
                        <div className="col-span-2 text-center text-muted-foreground py-10">
                            No cards yet. Go play!
                        </div>
                    )}
                    {cards.map(card => (
                        <Card key={card.id} className="overflow-hidden border-0 shadow-lg group relative">
                            <img
                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/stories/${card.story_image_path}`}
                                className="w-full aspect-[9/16] object-cover"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                <Button size="sm" variant="secondary" onClick={() => window.open(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/stories/${card.story_image_path}`, '_blank')}>
                                    View
                                </Button>
                                <Button size="sm" onClick={() => downloadCard(card.story_image_path)}>
                                    <Download className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDelete(card.id, card.story_image_path)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Footer />
        </div>
    )
}
