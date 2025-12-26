
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ArrowLeft, Loader2, Plus, Trash2, Tag, CheckSquare, Square, PieChart } from "lucide-react"
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
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
    const [deleting, setDeleting] = useState(false)
    const [focusedIndex, setFocusedIndex] = useState<number>(-1)

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

    const handleBulkDelete = async () => {
        if (selectedTasks.size === 0) return
        if (!confirm(`${selectedTasks.size} karakter silinecek. Emin misiniz?`)) return
        
        setDeleting(true)
        const idsToDelete = Array.from(selectedTasks)
        
        const { error } = await supabase
            .from('charades_tasks')
            .delete()
            .in('id', idsToDelete)
        
        if (error) {
            alert("Error: " + error.message)
        } else {
            setTasks(prev => prev.filter(t => !selectedTasks.has(t.id)))
            setSelectedTasks(new Set())
        }
        setDeleting(false)
    }

    const toggleTaskSelection = (id: string) => {
        setSelectedTasks(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }

    const toggleSelectAll = () => {
        const filteredTasks = tasks.filter(task => filterCategory === "all" || task.category === filterCategory)
        if (selectedTasks.size === filteredTasks.length && filteredTasks.length > 0) {
            setSelectedTasks(new Set())
        } else {
            setSelectedTasks(new Set(filteredTasks.map(t => t.id)))
        }
    }

    const filteredTasks = tasks.filter(task => filterCategory === "all" || task.category === filterCategory)
    const allFilteredSelected = filteredTasks.length > 0 && selectedTasks.size === filteredTasks.length

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            const nextIndex = Math.min(index + 1, filteredTasks.length - 1)
            setFocusedIndex(nextIndex)
            toggleTaskSelection(filteredTasks[nextIndex].id)
            setTimeout(() => {
                document.getElementById(`task-item-${nextIndex}`)?.focus()
            }, 0)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            const prevIndex = Math.max(index - 1, 0)
            setFocusedIndex(prevIndex)
            toggleTaskSelection(filteredTasks[prevIndex].id)
            setTimeout(() => {
                document.getElementById(`task-item-${prevIndex}`)?.focus()
            }, 0)
        } else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            toggleTaskSelection(filteredTasks[index].id)
        }
    }

    const categoryStats = categories.map(cat => ({
        name: cat,
        count: tasks.filter(t => t.category === cat).length
    })).filter(stat => stat.count > 0)

    const totalTasks = tasks.length
    const maxCount = Math.max(...categoryStats.map(s => s.count), 1)

    return (
        <div className="min-h-screen bg-background flex flex-col p-4">
            <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold">Manage Charades Tasks</h1>
            </div>

            {/* Statistics */}
            {categoryStats.length > 0 && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="w-5 h-5" />
                            Kategori İstatistikleri
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Bar Chart */}
                            <div className="space-y-3">
                                {categoryStats.map(stat => {
                                    const percentage = (stat.count / totalTasks) * 100
                                    const barWidth = (stat.count / maxCount) * 100
                                    return (
                                        <div key={stat.name} className="space-y-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium">{stat.name}</span>
                                                <span className="text-muted-foreground">{stat.count} ({percentage.toFixed(1)}%)</span>
                                            </div>
                                            <div className="h-6 bg-secondary rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-primary transition-all duration-300"
                                                    style={{ width: `${barWidth}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Pie Chart */}
                            <div className="flex items-center justify-center">
                                <div className="relative w-64 h-64">
                                    <svg viewBox="0 0 100 100" className="transform -rotate-90">
                                        {(() => {
                                            let currentAngle = 0
                                            const colors = [
                                                'hsl(var(--chart-1))',
                                                'hsl(var(--chart-2))',
                                                'hsl(var(--chart-3))',
                                                'hsl(var(--chart-4))',
                                                'hsl(var(--chart-5))'
                                            ]
                                            return categoryStats.map((stat, index) => {
                                                const percentage = (stat.count / totalTasks) * 100
                                                const angle = (percentage / 100) * 360
                                                const startAngle = currentAngle
                                                currentAngle += angle

                                                const startRad = (startAngle * Math.PI) / 180
                                                const endRad = (currentAngle * Math.PI) / 180
                                                const x1 = 50 + 40 * Math.cos(startRad)
                                                const y1 = 50 + 40 * Math.sin(startRad)
                                                const x2 = 50 + 40 * Math.cos(endRad)
                                                const y2 = 50 + 40 * Math.sin(endRad)
                                                const largeArc = angle > 180 ? 1 : 0

                                                const color = colors[index % colors.length]

                                                return (
                                                    <path
                                                        key={stat.name}
                                                        d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                                        fill={color}
                                                        stroke="hsl(var(--background))"
                                                        strokeWidth="0.5"
                                                    />
                                                )
                                            })
                                        })()}
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="text-3xl font-bold">{totalTasks}</div>
                                            <div className="text-xs text-muted-foreground">Toplam</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

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
                        <div className="flex items-center justify-between mb-3">
                            <CardTitle>Existing Tasks ({filteredTasks.length})</CardTitle>
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
                        {filteredTasks.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={toggleSelectAll}
                                    className="flex-shrink-0"
                                >
                                    {allFilteredSelected ? <CheckSquare className="w-4 h-4 mr-2" /> : <Square className="w-4 h-4 mr-2" />}
                                    {allFilteredSelected ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                                </Button>
                                {selectedTasks.size > 0 && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleBulkDelete}
                                        disabled={deleting}
                                    >
                                        {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                        Seçilenleri Sil ({selectedTasks.size})
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : filteredTasks.map((task, index) => {
                            const isSelected = selectedTasks.has(task.id)
                            return (
                                <div 
                                    key={task.id} 
                                    id={`task-item-${index}`}
                                    tabIndex={0}
                                    className={`flex items-center justify-between p-3 border rounded-lg bg-card gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    onClick={() => {
                                        toggleTaskSelection(task.id)
                                        setFocusedIndex(index)
                                    }}
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            toggleTaskSelection(task.id)
                                        }}
                                        className="flex-shrink-0 p-1 hover:bg-accent rounded"
                                        tabIndex={-1}
                                    >
                                        {isSelected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium break-words block">{task.content}</span>
                                        <Badge variant="outline" className="mt-1 text-xs">
                                            <Tag className="w-3 h-3 mr-1" />
                                            {task.category || 'Genel'}
                                        </Badge>
                                    </div>
                                    <Button 
                                        variant="destructive" 
                                        size="icon" 
                                        className="flex-shrink-0" 
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDelete(task.id)
                                        }}
                                        tabIndex={-1}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            </div>

            <Footer />
        </div>
    )
}
