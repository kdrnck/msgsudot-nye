
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ArrowLeft, Loader2, Plus, Trash2, Tag } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export default function AdminTasksPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [tasks, setTasks] = useState<any[]>([])

    const [newContent, setNewContent] = useState("")
    const [categories, setCategories] = useState<string[]>([])
    const [newCategory, setNewCategory] = useState<string>("")
    const [adding, setAdding] = useState(false)
    const [filterCategory, setFilterCategory] = useState<string>("all")

    useEffect(() => {
        if (!sessionStorage.getItem('admin_token')) {
            router.push('/admin')
            return
        }
        fetchCategories()
        fetchTasks()
    }, [router])

    const fetchCategories = async () => {
        const { data } = await supabase
            .from('charades_categories')
            .select('name')
            .order('name', { ascending: true })
        if (data) {
            setCategories(data.map(c => c.name))
            if (data.length > 0 && !newCategory) {
                setNewCategory(data[0].name)
            }
        }
    }

    const fetchTasks = async () => {
        const { data } = await supabase
            .from('charades_tasks')
            .select('*')
            .order('created_at', { ascending: false })
        if (data) setTasks(data)
        setLoading(false)
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newContent.trim()) return
        setAdding(true)

        // Support bulk add by newlines?
        const lines = newContent.split('\n').map(l => l.trim()).filter(l => l.length > 0)

        const inserts = lines.map(content => ({ content, category: newCategory }))

        const { data, error } = await supabase
            .from('charades_tasks')
            .insert(inserts)
            .select()

        if (error) {
            alert("Error: " + error.message)
        } else if (data) {
            setTasks([...data, ...tasks])
            setNewContent("")
            // Keep category selected for convenience
        }
        setAdding(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete task?")) return
        await supabase.from('charades_tasks').delete().eq('id', id)
        setTasks(prev => prev.filter(t => t.id !== id))
    }

    return (
        <div className="min-h-screen bg-background flex flex-col p-4">
            <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold">Manage Charades Tasks</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 content-start">
                {/* Create Form */}
                <Card>
                    <CardHeader><CardTitle>Add Tasks</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={newCategory} onValueChange={(val) => val && setNewCategory(val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat: string) => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Task Content (One per line)</Label>
                                <Textarea
                                    value={newContent}
                                    onChange={e => setNewContent(e.target.value)}
                                    placeholder="e.g. Titanic&#10;Inception&#10;Matrix"
                                    rows={5}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={adding}>
                                {adding ? <Loader2 className="animate-spin" /> : <><Plus className="w-4 h-4 mr-2" /> Add Tasks</>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* List */}
                <Card className="md:row-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Existing Tasks ({tasks.length})</CardTitle>
                            <Select value={filterCategory} onValueChange={(val) => val && setFilterCategory(val)}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tümü</SelectItem>
                                    {categories.map((cat: string) => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : tasks
                            .filter(task => filterCategory === "all" || task.category === filterCategory)
                            .map(task => (
                            <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg bg-card gap-2">
                                <div className="flex-1 min-w-0">
                                    <span className="font-medium break-words block">{task.content}</span>
                                    <Badge variant="outline" className="mt-1 text-xs">
                                        <Tag className="w-3 h-3 mr-1" />
                                        {task.category || 'Genel'}
                                    </Badge>
                                </div>
                                <Button variant="destructive" size="icon" className="flex-shrink-0" onClick={() => handleDelete(task.id)}>
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
