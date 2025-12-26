
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
    player_id: string

    kiss_char: { name: string } | null
    kiss_char_2: { name: string } | null
    marry_char: { name: string } | null
    marry_char_2: { name: string } | null
    kill_char: { name: string } | null
    kill_char_2: { name: string } | null
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
        kiss_char:kmk_characters!kiss_char_id(name),
        kiss_char_2:kmk_characters!kiss_char_id_2(name),
        marry_char:kmk_characters!marry_char_id(name),
        marry_char_2:kmk_characters!marry_char_id_2(name),
        kill_char:kmk_characters!kill_char_id(name),
        kill_char_2:kmk_characters!kill_char_id_2(name)
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
                                <TableHead className="text-pink-500">Kiss 1</TableHead>
                                <TableHead className="text-pink-500">Kiss 2</TableHead>
                                <TableHead className="text-purple-500">Marry 1</TableHead>
                                <TableHead className="text-purple-500">Marry 2</TableHead>
                                <TableHead className="text-slate-500">Kill 1</TableHead>
                                <TableHead className="text-slate-500">Kill 2</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {results.map((row: any) => (
                                <TableRow key={row.id}>
                                    <TableCell className="font-medium">{row.player?.nickname || 'Unknown'}</TableCell>
                                    <TableCell className="text-sm">{row.kiss_char?.name}</TableCell>
                                    <TableCell className="text-sm">{row.kiss_char_2?.name}</TableCell>
                                    <TableCell className="text-sm">{row.marry_char?.name}</TableCell>
                                    <TableCell className="text-sm">{row.marry_char_2?.name}</TableCell>
                                    <TableCell className="text-sm">{row.kill_char?.name}</TableCell>
                                    <TableCell className="text-sm">{row.kill_char_2?.name}</TableCell>
                                </TableRow>
                            ))}
                            {results.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
