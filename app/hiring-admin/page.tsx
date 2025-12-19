
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Lock, Trash2, Check, ArrowLeft, Phone, User as UserIcon } from "lucide-react"

interface Application {
    id: string
    created_at: string
    full_name: string
    contact_info: string
    role_type: string
    reviewed: boolean
}

export default function HiringAdminPage() {
    const router = useRouter()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [applications, setApplications] = useState<Application[]>([])

    useEffect(() => {
        const token = sessionStorage.getItem('hiring_admin_token')
        if (token === 'true') {
            setIsAuthenticated(true)
            fetchApplications()
        }
    }, [])

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const res = await fetch('/api/hiring-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        })

        if (res.ok) {
            setIsAuthenticated(true)
            sessionStorage.setItem('hiring_admin_token', 'true')
            fetchApplications()
        } else {
            alert("Invalid password")
        }
        setLoading(false)
    }

    const fetchApplications = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('hiring_applications')
            .select('*')
            .order('created_at', { ascending: false })

        if (data) setApplications(data)
        setLoading(false)
    }

    const markReviewed = async (id: string) => {
        await supabase.from('hiring_applications').update({ reviewed: true }).eq('id', id)
        fetchApplications()
    }

    const deleteApp = async (id: string) => {
        if (!confirm("Delete this application?")) return
        await supabase.from('hiring_applications').delete().eq('id', id)
        fetchApplications()
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'graphic_design': return 'bg-pink-500/20 text-pink-400'
            case 'data_analyst': return 'bg-blue-500/20 text-blue-400'
            case 'referral': return 'bg-green-500/20 text-green-400'
            default: return 'bg-gray-500/20 text-gray-400'
        }
    }

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'graphic_design': return 'Grafik Tasarımcı'
            case 'data_analyst': return 'Veri Analisti'
            case 'referral': return 'İşletme Öneri'
            default: return 'Genel'
        }
    }

    // Auth Gate
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
                    <CardHeader className="text-center">
                        <Lock className="w-12 h-12 mx-auto text-purple-500 mb-2" />
                        <CardTitle className="text-white">Hiring Admin</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAuth} className="space-y-4">
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="bg-zinc-800 border-zinc-700"
                            />
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" /> : "Enter"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-4">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/home')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-2xl font-bold">Hiring Applications</h1>
                    <Badge variant="outline" className="ml-auto">{applications.length} Total</Badge>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin w-8 h-8" />
                    </div>
                ) : applications.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                        No applications yet.
                    </div>
                ) : (
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                                    <TableHead className="text-zinc-400">Status</TableHead>
                                    <TableHead className="text-zinc-400">Name</TableHead>
                                    <TableHead className="text-zinc-400">Contact</TableHead>
                                    <TableHead className="text-zinc-400">Role</TableHead>
                                    <TableHead className="text-zinc-400">Date</TableHead>
                                    <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {applications.map(app => (
                                    <TableRow key={app.id} className="border-zinc-800 hover:bg-zinc-800/30">
                                        <TableCell>
                                            {app.reviewed ? (
                                                <Badge className="bg-green-500/20 text-green-400">Reviewed</Badge>
                                            ) : (
                                                <Badge className="bg-yellow-500/20 text-yellow-400">New</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <UserIcon className="w-4 h-4 text-zinc-500" />
                                            {app.full_name}
                                        </TableCell>
                                        <TableCell className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-zinc-500" />
                                            {app.contact_info}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getRoleBadgeColor(app.role_type)}>
                                                {getRoleLabel(app.role_type)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-zinc-500 text-sm">
                                            {new Date(app.created_at).toLocaleDateString('tr-TR')}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {!app.reviewed && (
                                                <Button size="sm" variant="ghost" onClick={() => markReviewed(app.id)}>
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => deleteApp(app.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    )
}
