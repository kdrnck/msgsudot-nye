
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ArrowLeft, Loader2, Plus, Trash2, Upload, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import imageCompression from 'browser-image-compression'

export default function AdminKMKPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [characters, setCharacters] = useState<any[]>([])
    const [categories, setCategories] = useState<string[]>([])
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

    // Add New State
    const [newName, setNewName] = useState("")
    const [newCategory, setNewCategory] = useState("Actors")
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [compressing, setCompressing] = useState(false)

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
        if (data) {
            setCharacters(data)
            const uniqueCategories = Array.from(new Set((data || []).map((c: any) => c.category).filter(Boolean)))
            setCategories(uniqueCategories.sort())
            // Expand all categories by default
            setExpandedCategories(new Set(uniqueCategories))
        }
        setLoading(false)
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName || !newCategory || !file) return
        
        setCompressing(true)
        try {
            // Compress image
            const options = {
                maxWidthOrHeight: 800,
                useWebWorker: true,
                fileType: 'image/webp' as const,
                initialQuality: 0.8
            }
            
            const compressedFile = await imageCompression(file, options)
            setCompressing(false)
            setUploading(true)

            // Upload compressed image
            const filename = `char_${Date.now()}_${file.name.replace(/\s/g, '_').replace(/\.[^.]+$/, '.webp')}`
            const { error: uploadError } = await supabase.storage
                .from('characters')
                .upload(filename, compressedFile)

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
                const updatedCharacters = [data, ...characters]
                setCharacters(updatedCharacters)
                const uniqueCategories = Array.from(new Set(updatedCharacters.map((c: any) => c.category).filter(Boolean)))
                setCategories(uniqueCategories.sort())
                // Expand the category of the newly added character
                setExpandedCategories(prev => new Set([...prev, newCategory]))
                setNewName("")
                setFile(null)
                // keep category for convenience
            }
        } catch (error: any) {
            alert("Compression failed: " + error.message)
        }
        setCompressing(false)
        setUploading(false)
    }

    const handleDelete = async (id: string, path: string) => {
        if (!confirm("Delete character?")) return

        await supabase.from('kmk_characters').delete().eq('id', id)
        // Try delete storage (optional but good practice)
        await supabase.storage.from('characters').remove([path])

        setCharacters(prev => prev.filter(c => c.id !== id))
    }

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev)
            if (next.has(category)) {
                next.delete(category)
            } else {
                next.add(category)
            }
            return next
        })
    }

    // Group characters by category
    const charactersByCategory = categories.reduce((acc, category) => {
        acc[category] = characters
            .filter(c => c.category === category)
            .sort((a, b) => a.name.localeCompare(b.name))
        return acc
    }, {} as Record<string, any[]>)

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
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="e.g. Actors" />
                                </div>
                                {categories.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground">Or pick an existing category:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {categories.map(cat => (
                                                <button
                                                    type="button"
                                                    key={cat}
                                                    onClick={() => setNewCategory(cat)}
                                                    className={cn(
                                                        "px-3 py-1 rounded-full border text-sm transition-colors",
                                                        newCategory === cat
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "bg-muted hover:bg-muted/80 border-border"
                                                    )}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Image</Label>
                                <Input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
                                {file && (
                                    <p className="text-xs text-muted-foreground">
                                        Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                    </p>
                                )}
                            </div>
                            <Button type="submit" className="w-full" disabled={uploading || compressing}>
                                {compressing ? (
                                    <><Loader2 className="animate-spin w-4 h-4 mr-2" /> Compressing...</>
                                ) : uploading ? (
                                    <><Loader2 className="animate-spin w-4 h-4 mr-2" /> Uploading...</>
                                ) : (
                                    <><Plus className="w-4 h-4 mr-2" /> Add Character</>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* List - Organized by Category */}
                <Card className="md:row-span-2">
                    <CardHeader><CardTitle>Existing Characters ({characters.length})</CardTitle></CardHeader>
                    <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {loading ? (
                            <Loader2 className="animate-spin mx-auto" />
                        ) : categories.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No characters yet</p>
                        ) : (
                            categories.map(category => {
                                const categoryCharacters = charactersByCategory[category] || []
                                const isExpanded = expandedCategories.has(category)
                                
                                return (
                                    <div key={category} className="border rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => toggleCategory(category)}
                                            className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{category}</span>
                                                <span className="text-xs text-muted-foreground">({categoryCharacters.length})</span>
                                            </div>
                                            {isExpanded ? (
                                                <ChevronUp className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </button>
                                        
                                        {isExpanded && (
                                            <div className="p-2 space-y-2">
                                                {categoryCharacters.map(char => (
                                                    <div key={char.id} className="flex items-center gap-3 p-2 border rounded-lg bg-background">
                                                        <img
                                                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${char.image_path}`}
                                                            className="w-12 h-12 rounded object-cover"
                                                            alt={char.name}
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
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </CardContent>
                </Card>
            </div>

            <Footer />
        </div>
    )
}
