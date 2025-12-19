
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Save, Loader2 } from "lucide-react"

export default function CreateAchievementPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Form state
    const [titleTr, setTitleTr] = useState("")
    const [titleEn, setTitleEn] = useState("")
    const [descTr, setDescTr] = useState("")
    const [descEn, setDescEn] = useState("")
    const [icon, setIcon] = useState("🏆")
    const [conditionType, setConditionType] = useState("manual")

    // Condition-specific fields
    const [targetCharacterId, setTargetCharacterId] = useState("")
    const [targetScore, setTargetScore] = useState("")
    const [characters, setCharacters] = useState<any[]>([])

    useEffect(() => {
        fetchCharacters()
    }, [])

    const fetchCharacters = async () => {
        const { data } = await supabase.from('kmk_characters').select('id, name')
        if (data) setCharacters(data)
    }

    const buildPayload = () => {
        switch (conditionType) {
            case 'kmk_kiss':
            case 'kmk_marry':
            case 'kmk_kill':
                return { character_id: targetCharacterId }
            case 'charades_score':
                return { min_score: parseInt(targetScore) || 0 }
            case 'manual':
            default:
                return {}
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const payload = buildPayload()

        const { error } = await supabase.from('achievements').insert({
            title_tr: titleTr,
            title_en: titleEn,
            description_tr: descTr,
            description_en: descEn,
            icon,
            condition_type: conditionType,
            condition_payload: payload
        })

        if (error) {
            alert("Error creating achievement: " + error.message)
        } else {
            router.push('/admin/achievements')
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-background p-4">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/admin/achievements')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-2xl font-bold">Create Achievement</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>New Achievement</CardTitle>
                        <CardDescription>Fill in the details below to create a new achievement</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Titles */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title-tr">Title (Turkish)</Label>
                                    <Input
                                        id="title-tr"
                                        value={titleTr}
                                        onChange={(e) => setTitleTr(e.target.value)}
                                        placeholder="Örnek Başarım"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="title-en">Title (English)</Label>
                                    <Input
                                        id="title-en"
                                        value={titleEn}
                                        onChange={(e) => setTitleEn(e.target.value)}
                                        placeholder="Example Achievement"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Descriptions */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="desc-tr">Description (Turkish)</Label>
                                    <Input
                                        id="desc-tr"
                                        value={descTr}
                                        onChange={(e) => setDescTr(e.target.value)}
                                        placeholder="Açıklama..."
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="desc-en">Description (English)</Label>
                                    <Input
                                        id="desc-en"
                                        value={descEn}
                                        onChange={(e) => setDescEn(e.target.value)}
                                        placeholder="Description..."
                                        required
                                    />
                                </div>
                            </div>

                            {/* Icon */}
                            <div className="space-y-2">
                                <Label htmlFor="icon">Icon (Emoji)</Label>
                                <Input
                                    id="icon"
                                    value={icon}
                                    onChange={(e) => setIcon(e.target.value)}
                                    placeholder="🏆"
                                    maxLength={2}
                                    className="text-2xl"
                                />
                            </div>

                            {/* Condition Type */}
                            <div className="space-y-2">
                                <Label htmlFor="condition">Trigger Condition</Label>
                                <Select value={conditionType} onValueChange={(v) => v && setConditionType(v)}>
                                    <option value="manual">Manual (Admin awards)</option>
                                    <option value="kmk_kiss">KMK: Kissed specific character</option>
                                    <option value="kmk_marry">KMK: Married specific character</option>
                                    <option value="kmk_kill">KMK: Killed specific character</option>
                                    <option value="charades_score">Charades: Reached score</option>
                                </Select>
                            </div>

                            {/* Conditional Fields */}
                            {(conditionType === 'kmk_kiss' || conditionType === 'kmk_marry' || conditionType === 'kmk_kill') && (
                                <div className="space-y-2">
                                    <Label htmlFor="character">Target Character</Label>
                                    <Select value={targetCharacterId} onValueChange={(v) => v && setTargetCharacterId(v)}>
                                        <option value="">-- Select Character --</option>
                                        {characters.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </Select>
                                </div>
                            )}

                            {conditionType === 'charades_score' && (
                                <div className="space-y-2">
                                    <Label htmlFor="score">Minimum Score</Label>
                                    <Input
                                        id="score"
                                        type="number"
                                        value={targetScore}
                                        onChange={(e) => setTargetScore(e.target.value)}
                                        placeholder="5"
                                        min="1"
                                    />
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                                Create Achievement
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
