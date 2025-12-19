
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ArrowLeft, Loader2, Plus, Trash2, HelpCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminAchievementsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [achievements, setAchievements] = useState<any[]>([])

    const [titleTR, setTitleTR] = useState("")
    const [titleEN, setTitleEN] = useState("")
    const [descTR, setDescTR] = useState("")
    const [descEN, setDescEN] = useState("")
    const [icon, setIcon] = useState("🏆")
    const [type, setType] = useState("manual")
    const [payload, setPayload] = useState("{}")

    const [adding, setAdding] = useState(false)

    useEffect(() => {
        if (!sessionStorage.getItem('admin_token')) {
            router.push('/admin')
            return
        }
        fetchAchievements()
    }, [router])

    const fetchAchievements = async () => {
        const { data } = await supabase
            .from('achievements')
            .select('*')
            .order('created_at', { ascending: false })
        if (data) setAchievements(data)
        setLoading(false)
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!titleTR || !titleEN) return
        setAdding(true)

        let parsedPayload = {}
        try {
            parsedPayload = JSON.parse(payload)
        } catch (e) {
            alert("Invalid JSON payload")
            setAdding(false)
            return
        }

        const { data, error } = await supabase
            .from('achievements')
            .insert({
                title_tr: titleTR,
                title_en: titleEN,
                description_tr: descTR,
                description_en: descEN,
                icon,
                condition_type: type,
                condition_payload: parsedPayload
            })
            .select()
            .single()

        if (error) {
            alert("Error: " + error.message)
        } else if (data) {
            setAchievements([data, ...achievements])
            setTitleTR("")
            setTitleEN("")
            setDescTR("")
            setDescEN("")
        }
        setAdding(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete achievement? User progress will be lost!")) return
        await supabase.from('achievements').delete().eq('id', id)
        setAchievements(prev => prev.filter(a => a.id !== id))
    }

    return (
        <div className="min-h-screen bg-background flex flex-col p-4">
            <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-xl font-bold">Manage Achievements</h1>
                </div>
                <Button variant="outline" onClick={() => router.push('/admin/achievements/create')}>
                    <Plus className="w-4 h-4 mr-2" /> Create with UI
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 content-start">
                {/* Create Form */}
                <Card>
                    <CardHeader><CardTitle>Create Achievement</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Title (TR)</Label>
                                    <Input value={titleTR} onChange={e => setTitleTR(e.target.value)} placeholder="İlk Öpücük" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Title (EN)</Label>
                                    <Input value={titleEN} onChange={e => setTitleEN(e.target.value)} placeholder="First Kiss" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Desc (TR)</Label>
                                    <Input value={descTR} onChange={e => setDescTR(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Desc (EN)</Label>
                                    <Input value={descEN} onChange={e => setDescEN(e.target.value)} />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Icon (Emoji)</Label>
                                    <Input value={icon} onChange={e => setIcon(e.target.value)} className="text-center" />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>Type</Label>
                                    <Select value={type} onValueChange={(val) => val && setType(val)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="manual">Manual Trigger Only</SelectItem>
                                            <SelectItem value="kmk_match">KMK Match (Auto)</SelectItem>
                                            <SelectItem value="charades_score">Charades Score (Auto)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    Payload (JSON)
                                    <span className="text-xs text-muted-foreground font-normal">For auto triggers</span>
                                </Label>
                                <Input value={payload} onChange={e => setPayload(e.target.value)} className="font-mono text-xs" />
                                <p className="text-[10px] text-muted-foreground">
                                    e.g. {`{"char_id": "...", "slot": "kiss"}`} or {`{"min_score": 10}`}
                                </p>
                            </div>

                            <Button type="submit" className="w-full" disabled={adding}>
                                {adding ? <Loader2 className="animate-spin" /> : <><Plus className="w-4 h-4 mr-2" /> Create</>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* List */}
                <Card className="md:row-span-2">
                    <CardHeader><CardTitle>Existing ({achievements.length})</CardTitle></CardHeader>
                    <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : achievements.map(ach => (
                            <div key={ach.id} className="flex items-start gap-4 p-3 border rounded-lg bg-card text-left">
                                <div className="text-2xl pt-1">{ach.icon}</div>
                                <div className="flex-1">
                                    <div className="font-bold">{ach.title_tr} / {ach.title_en}</div>
                                    <div className="text-xs text-muted-foreground">{ach.description_tr}</div>
                                    <div className="text-[10px] font-mono mt-1 opacity-70 bg-muted inline-block px-1 rounded">
                                        {ach.condition_type}
                                    </div>
                                </div>
                                <Button variant="destructive" size="icon" className="flex-shrink-0" onClick={() => handleDelete(ach.id)}>
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
