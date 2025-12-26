"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ArrowLeft, Loader2, Plus, Trash2, Tag, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Category {
    id: string
    name: string
    created_at: string
}

interface Task {
    id: string
    content: string
    category: string
}

export default function AdminCategoriesPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [categories, setCategories] = useState<Category[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

    const [newCategoryName, setNewCategoryName] = useState("")
    const [adding, setAdding] = useState(false)

    useEffect(() => {
        if (!sessionStorage.getItem('admin_token')) {
            router.push('/admin')
            return
        }
        fetchData()
    }, [router])

    const fetchData = async () => {
        setLoading(true)
        
        // Fetch categories
        const { data: categoriesData } = await supabase
            .from('charades_categories')
            .select('*')
            .order('name', { ascending: true })
        
        // Fetch tasks
        const { data: tasksData } = await supabase
            .from('charades_tasks')
            .select('id, content, category')
            .order('created_at', { ascending: false })
        
        if (categoriesData) {
            setCategories(categoriesData)
            // Expand all categories by default
            setExpandedCategories(new Set(categoriesData.map(c => c.name)))
        }
        if (tasksData) setTasks(tasksData)
        
        setLoading(false)
    }

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCategoryName.trim()) return
        setAdding(true)

        const { data, error } = await supabase
            .from('charades_categories')
            .insert({ name: newCategoryName.trim() })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                alert("Bu kategori zaten mevcut!")
            } else {
                alert("Hata: " + error.message)
            }
        } else if (data) {
            setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
            setExpandedCategories(prev => new Set([...prev, data.name]))
            setNewCategoryName("")
        }
        setAdding(false)
    }

    const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
        const tasksInCategory = tasks.filter(t => t.category === categoryName)
        
        if (tasksInCategory.length > 0) {
            if (!confirm(`Bu kategoride ${tasksInCategory.length} görev var. Kategoriyi silmek bu görevlerin kategorisini de silecek. Devam edilsin mi?`)) {
                return
            }
        } else {
            if (!confirm(`"${categoryName}" kategorisini silmek istediğinizden emin misiniz?`)) {
                return
            }
        }

        // Delete category
        const { error } = await supabase
            .from('charades_categories')
            .delete()
            .eq('id', categoryId)

        if (error) {
            alert("Silme hatası: " + error.message)
        } else {
            setCategories(prev => prev.filter(c => c.id !== categoryId))
            // Refresh tasks to show updated state
            fetchData()
        }
    }

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm("Bu görevi silmek istediğinizden emin misiniz?")) return

        const { error } = await supabase
            .from('charades_tasks')
            .delete()
            .eq('id', taskId)

        if (error) {
            alert("Silme hatası: " + error.message)
        } else {
            setTasks(prev => prev.filter(t => t.id !== taskId))
        }
    }

    const toggleCategory = (categoryName: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev)
            if (next.has(categoryName)) {
                next.delete(categoryName)
            } else {
                next.add(categoryName)
            }
            return next
        })
    }

    // Group tasks by category
    const tasksByCategory = categories.reduce((acc, category) => {
        acc[category.name] = tasks.filter(t => t.category === category.name)
        return acc
    }, {} as Record<string, Task[]>)

    return (
        <div className="min-h-screen bg-background flex flex-col p-4">
            <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold">Sessiz Sinema Kategorileri</h1>
                    <p className="text-sm text-muted-foreground">Kategori oluştur ve görevleri yönet</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 content-start">
                {/* Create Category Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Tag className="w-5 h-5" />
                            Yeni Kategori Ekle
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateCategory} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Kategori Adı</Label>
                                <Input 
                                    value={newCategoryName} 
                                    onChange={e => setNewCategoryName(e.target.value)} 
                                    placeholder="ör. Anime, Spor, Müzik" 
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={adding || !newCategoryName.trim()}>
                                {adding ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                Kategori Oluştur
                            </Button>
                        </form>

                        <div className="mt-6 pt-6 border-t">
                            <p className="text-sm text-muted-foreground mb-3">Mevcut Kategoriler ({categories.length})</p>
                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <Badge key={cat.id} variant="outline" className="text-sm">
                                        {cat.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Categories & Tasks List */}
                <Card className="md:row-span-2">
                    <CardHeader>
                        <CardTitle>Kategoriler ve Görevler</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-[70vh] overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="animate-spin w-6 h-6" />
                            </div>
                        ) : categories.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                Henüz kategori yok. Yukarıdan kategori oluşturun.
                            </p>
                        ) : (
                            categories.map(category => {
                                const categoryTasks = tasksByCategory[category.name] || []
                                const isExpanded = expandedCategories.has(category.name)
                                
                                return (
                                    <div key={category.id} className="border rounded-lg overflow-hidden">
                                        <div className="flex items-center justify-between p-3 bg-muted/50">
                                            <button
                                                onClick={() => toggleCategory(category.name)}
                                                className="flex-1 flex items-center gap-2 text-left"
                                            >
                                                <div className="flex items-center gap-2 flex-1">
                                                    <Tag className="w-4 h-4 text-primary" />
                                                    <span className="font-semibold">{category.name}</span>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {categoryTasks.length} görev
                                                    </Badge>
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronUp className="w-4 h-4" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4" />
                                                )}
                                            </button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon"
                                                className="text-destructive hover:text-destructive ml-2"
                                                onClick={() => handleDeleteCategory(category.id, category.name)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        
                                        {isExpanded && (
                                            <div className="p-3 space-y-2 bg-background">
                                                {categoryTasks.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground text-center py-4">
                                                        Bu kategoride görev yok. <br />
                                                        <Button 
                                                            variant="link" 
                                                            className="p-0 h-auto"
                                                            onClick={() => router.push('/admin/tasks')}
                                                        >
                                                            Görev eklemek için tıklayın
                                                        </Button>
                                                    </p>
                                                ) : (
                                                    categoryTasks.map(task => (
                                                        <div key={task.id} className="flex items-center justify-between p-2 border rounded-lg bg-card">
                                                            <span className="text-sm flex-1">{task.content}</span>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon"
                                                                className="text-destructive hover:text-destructive flex-shrink-0 ml-2"
                                                                onClick={() => handleDeleteTask(task.id)}
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    ))
                                                )}
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
