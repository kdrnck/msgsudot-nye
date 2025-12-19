
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ArrowLeft, Loader2, Plus, Trash2, Upload } from "lucide-react"

export default function AdminKMKPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [characters, setCharacters] = useState<any[]>([])

    // Add New State
    const [newName, setNewName] = useState("")
    const [newCategory, setNewCategory] = useState("Actors")
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        if (!sessionStorage.getItem('admin_token')) {
            router.push('/admin')
            return
        }
        fetchCharacters()
    }, [router])

    const fetchCharacters = async () => {
        const { data } = await supabase
            .from('kmk_characters')
            .select('*')
            .order('created_at', { ascending: false })
        if (data) setCharacters(data)
        setLoading(false)
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName || !newCategory || !file) return
        setUploading(true)

        // Upload Image
        const filename = `char_${Date.now()}_${file.name.replace(/\s/g, '_')}`
        const { error: uploadError } = await supabase.storage
            .from('characters')
            .upload(filename, file)

        if (uploadError) {
            alert("Upload failed: " + uploadError.message)
            setUploading(false)
            return
        }

        // Insert DB
        const { data, error: dbError } = await supabase
            .from('kmk_characters')
            .insert({
                name: newName,
                category: newCategory,
                image_path: filename
            })
            .select()
            .single()

        if (dbError) {
            alert("DB Insert failed: " + dbError.message)
        } else if (data) {
            setCharacters([data, ...characters])
            setNewName("")
            setFile(null)
            // keep category for convenience
        }
        setUploading(false)
    }

    const handleDelete = async (id: string, path: string) => {
        if (!confirm("Delete character?")) return

        await supabase.from('kmk_characters').delete().eq('id', id)
        // Try delete storage (optional but good practice)
        await supabase.storage.from('characters').remove([path])

        setCharacters(prev => prev.filter(c => c.id !== id))
    }

    return (
        <div className="min-h-screen bg-background flex flex-col p-4">
            <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold">Manage KMK Characters</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 content-start">
                {/* Create Form */}
                <Card>
                    <CardHeader><CardTitle>Add Character</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Brad Pitt" />
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="e.g. Actors" />
                            </div>
                            <div className="space-y-2">
                                <Label>Image</Label>
                                <Input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
                            </div>
                            <Button type="submit" className="w-full" disabled={uploading}>
                                {uploading ? <Loader2 className="animate-spin" /> : <><Plus className="w-4 h-4 mr-2" /> Add Character</>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* List */}
                <Card className="md:row-span-2">
                    <CardHeader><CardTitle>Existing Characters ({characters.length})</CardTitle></CardHeader>
                    <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : characters.map(char => (
                            <div key={char.id} className="flex items-center gap-3 p-2 border rounded-lg">
                                <img
                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${char.image_path}`}
                                    className="w-12 h-12 rounded object-cover"
                                />
                                <div className="flex-1">
                                    <div className="font-bold">{char.name}</div>
                                    <div className="text-xs text-muted-foreground">{char.category}</div>
                                </div>
                                <Button variant="destructive" size="icon" onClick={() => handleDelete(char.id, char.image_path)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <Footer />
        </div>
    )
}
