
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function PlayersListPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [players, setPlayers] = useState<any[]>([])

    useEffect(() => {
        // Check Admin Auth
        if (!sessionStorage.getItem('admin_token')) {
            router.push('/admin')
            return
        }
        fetchPlayers()
    }, [router])

    const fetchPlayers = async () => {
        const { data } = await supabase
            .from('players')
            .select('*')
            .order('created_at', { ascending: false })

        if (data) setPlayers(data)
        setLoading(false)
    }

    const deletePlayer = async (id: string) => {
        if (!confirm("Are you sure? This will delete all their data!")) return

        setLoading(true)
        const { error } = await supabase.from('players').delete().eq('id', id)
        if (error) {
            alert("Error deleting: " + error.message)
        } else {
            setPlayers(prev => prev.filter(p => p.id !== id))
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-background flex flex-col p-4">
            <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold">Players List</h1>
            </div>

            <div className="flex-1 overflow-auto rounded-lg border shadow-sm">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="animate-spin" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nickname</TableHead>
                                <TableHead>PIN</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {players.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-bold">{p.nickname}</TableCell>
                                    <TableCell className="font-mono">{p.pin}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {new Date(p.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="destructive" size="sm" onClick={() => deletePlayer(p.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Footer />
        </div>
    )
}
