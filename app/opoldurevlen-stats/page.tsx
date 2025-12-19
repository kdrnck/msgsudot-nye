
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Home, Loader2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ResultRow {
    id: string
    created_at: string
    player: { nickname: string } | null
    // In Supabase we might need to join, or fetch separate? 
    // RLS might block joining 'players' if not set up correctly.
    // We'll fetch flat and maybe join or just nickname if we store it.
    // Actually schema has player_id relations.
    player_id: string

    kiss_char: { name: string } | null
    marry_char: { name: string } | null
    kill_char: { name: string } | null
}

export default function StatsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [results, setResults] = useState<any[]>([])

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        // We need to fetch with joins.
        const { data, error } = await supabase
            .from('kmk_results')
            .select(`
        id,
        created_at,
        player:players(nickname),
        kiss_char:kmk_characters!kmk_results_kiss_char_id_fkey(name),
        marry_char:kmk_characters!kmk_results_marry_char_id_fkey(name),
        kill_char:kmk_characters!kmk_results_kill_char_id_fkey(name)
      `)
            .order('created_at', { ascending: false })
            .limit(50)

        if (data) {
            setResults(data)
        } else if (error) {
            console.error(error)
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-background flex flex-col p-4">
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.push("/home")}>
                    <Home className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold">Latest Games</h1>
                <div className="w-9" />
            </div>

            <div className="flex-1 overflow-auto rounded-lg border shadow-sm bg-card">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="animate-spin" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Player</TableHead>
                                <TableHead className="text-pink-500">Kiss</TableHead>
                                <TableHead className="text-purple-500">Marry</TableHead>
                                <TableHead className="text-slate-500">Kill</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {results.map((row: any) => (
                                <TableRow key={row.id}>
                                    <TableCell className="font-medium">{row.player?.nickname || 'Unknown'}</TableCell>
                                    <TableCell>{row.kiss_char?.name}</TableCell>
                                    <TableCell>{row.marry_char?.name}</TableCell>
                                    <TableCell>{row.kill_char?.name}</TableCell>
                                </TableRow>
                            ))}
                            {results.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No games played yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Footer />
        </div>
    )
}
