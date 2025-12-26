"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
    ArrowLeft, 
    Loader2, 
    Monitor, 
    MonitorOff, 
    Megaphone, 
    Trophy, 
    Gamepad2, 
    User,
    RefreshCw,
    Check,
    Radio,
    Trash
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    useLiveState,
    useActiveKmsGames,
    useLeaderboard,
    setBroadcastGame,
    updateAnnouncement,
    toggleLeaderboard,
    syncLeaderboard,
    deleteKmsGame,
    type KmsGame,
    type LiveState
} from "@/lib/live-state"

export default function LiveEditPage() {
    const router = useRouter()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [announcementInput, setAnnouncementInput] = useState("")
    const [announcementSaving, setAnnouncementSaving] = useState(false)
    const [announcementSaved, setAnnouncementSaved] = useState(false)
    const [syncingLeaderboard, setSyncingLeaderboard] = useState(false)
    const [broadcastingGameId, setBroadcastingGameId] = useState<string | null>(null)

    const { liveState, loading: liveStateLoading } = useLiveState()
    const { games, loading: gamesLoading, refetch: refetchGames } = useActiveKmsGames()
    const { entries: leaderboardEntries, loading: leaderboardLoading, refetch: refetchLeaderboard } = useLeaderboard(5)

    // Check admin auth
    useEffect(() => {
        const token = sessionStorage.getItem('admin_token')
        if (token !== 'true') {
            router.push('/admin')
            return
        }
        setIsAuthenticated(true)
    }, [router])

    // Sync announcement input with live state
    useEffect(() => {
        if (liveState?.announcement !== undefined && announcementInput === "") {
            setAnnouncementInput(liveState.announcement)
        }
    }, [liveState?.announcement])

    // Debounced announcement save
    const saveAnnouncement = useCallback(async () => {
        if (!liveState) return
        if (announcementInput === liveState.announcement) return
        
        setAnnouncementSaving(true)
        try {
            await updateAnnouncement(announcementInput)
            setAnnouncementSaved(true)
            setTimeout(() => setAnnouncementSaved(false), 2000)
        } catch (err) {
            console.error('Failed to save announcement:', err)
        }
        setAnnouncementSaving(false)
    }, [announcementInput, liveState])

    const handleBroadcastGame = async (game: KmsGame) => {
        setBroadcastingGameId(game.id)
        try {
            await setBroadcastGame(game.id, 'kms')
            console.log(`Broadcasting game ${game.id} by ${game.owner_nickname}`)
        } catch (err) {
            console.error('Failed to broadcast game:', err)
        }
        setBroadcastingGameId(null)
    }

    const handleStopBroadcast = async () => {
        setBroadcastingGameId('stopping')
        try {
            await setBroadcastGame(null, null)
            console.log('Stopped broadcast')
        } catch (err) {
            console.error('Failed to stop broadcast:', err)
        }
        setBroadcastingGameId(null)
    }

    const handleToggleLeaderboard = async (show: boolean) => {
        try {
            await toggleLeaderboard(show)
        } catch (err) {
            console.error('Failed to toggle leaderboard:', err)
        }
    }

    const handleSyncLeaderboard = async () => {
        setSyncingLeaderboard(true)
        try {
            await syncLeaderboard()
            await refetchLeaderboard()
        } catch (err) {
            console.error('Failed to sync leaderboard:', err)
        }
        setSyncingLeaderboard(false)
    }

    if (!isAuthenticated) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="animate-spin w-8 h-8" />
            </div>
        )
    }

    const isLoading = liveStateLoading || gamesLoading

    return (
        <div className="min-h-screen bg-background flex flex-col p-4">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Monitor className="w-5 h-5" />
                        Canlı Yayın Kontrolü
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        /live sayfasını buradan kontrol edin
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.open('/live', '_blank')}>
                    <Monitor className="w-4 h-4 mr-2" />
                    TV Görünümü
                </Button>
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin w-8 h-8" />
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Broadcast Status Card */}
                    <Card className="md:col-span-2">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-3 h-3 rounded-full",
                                        liveState?.broadcast_game_id ? "bg-red-500 animate-pulse" : "bg-gray-400"
                                    )} />
                                    <CardTitle className="text-lg">Yayın Durumu</CardTitle>
                                </div>
                                {liveState?.broadcast_game_id && (
                                    <Button 
                                        variant="destructive" 
                                        size="sm"
                                        onClick={handleStopBroadcast}
                                        disabled={broadcastingGameId === 'stopping'}
                                    >
                                        {broadcastingGameId === 'stopping' ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <MonitorOff className="w-4 h-4 mr-2" />
                                        )}
                                        Yayını Durdur
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {liveState?.broadcast_game_id ? (
                                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                                    <Radio className="w-6 h-6 text-red-500 animate-pulse" />
                                    <div>
                                        <p className="font-semibold text-red-500">CANLI YAYINDA</p>
                                        <p className="text-sm text-muted-foreground">
                                            {games.find(g => g.id === liveState.broadcast_game_id)?.owner_nickname || 'Bilinmeyen'} oyunu yayında
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-4 bg-muted/50 border border-border rounded-xl">
                                    <MonitorOff className="w-6 h-6 text-muted-foreground" />
                                    <div>
                                        <p className="font-semibold text-muted-foreground">Yayın Yok</p>
                                        <p className="text-sm text-muted-foreground">
                                            Aşağıdan bir oyun seçerek yayına alın
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Active Games Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Gamepad2 className="w-5 h-5 text-primary" />
                                    <CardTitle className="text-lg">Aktif KMS Oyunları</CardTitle>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => refetchGames()}>
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                            </div>
                            <CardDescription>
                                Yayına almak için "Ekrana Yansıt" butonuna tıklayın
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                            {games.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>Aktif oyun yok</p>
                                    <p className="text-sm">Oyuncular KMS oyunu başlattığında burada görünecek</p>
                                </div>
                            ) : (
                                games.map((game) => {
                                    const isBroadcasting = liveState?.broadcast_game_id === game.id
                                    const isLoading = broadcastingGameId === game.id

                                    return (
                                        <div 
                                            key={game.id} 
                                            className={cn(
                                                "flex items-center gap-3 p-4 rounded-xl border transition-all",
                                                isBroadcasting 
                                                    ? "bg-red-500/10 border-red-500/30" 
                                                    : "bg-card hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                                <User className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold truncate">
                                                    {game.owner_nickname}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    KMS Oyunu • {new Date(game.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            {isBroadcasting ? (
                                                <Badge variant="destructive" className="gap-1">
                                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                                    YAYINDA
                                                </Badge>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        onClick={() => handleBroadcastGame(game)}
                                                        disabled={isLoading}
                                                    >
                                                        {isLoading ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Monitor className="w-4 h-4 mr-1" />
                                                                Ekrana Yansıt
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button 
                                                        variant="secondary"
                                                        size="icon"
                                                        onClick={async () => {
                                                            if (confirm("Bu oyunu silmek istediğinize emin misiniz?")) {
                                                                try {
                                                                    await deleteKmsGame(game.id)
                                                                    await refetchGames()
                                                                } catch (err) {
                                                                    console.error('Failed to delete game:', err)
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <Trash className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </CardContent>
                    </Card>

                    {/* Announcement Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Megaphone className="w-5 h-5 text-yellow-500" />
                                <CardTitle className="text-lg">Duyuru</CardTitle>
                            </div>
                            <CardDescription>
                                TV ekranında görünecek mesaj
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="announcement">Duyuru Metni</Label>
                                <Input
                                    id="announcement"
                                    placeholder="Hoş geldiniz! 🎉"
                                    value={announcementInput}
                                    onChange={(e) => setAnnouncementInput(e.target.value)}
                                    onBlur={saveAnnouncement}
                                    onKeyDown={(e) => e.key === 'Enter' && saveAnnouncement()}
                                />
                            </div>
                            <Button 
                                className="w-full" 
                                onClick={saveAnnouncement}
                                disabled={announcementSaving || announcementInput === liveState?.announcement}
                            >
                                {announcementSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : announcementSaved ? (
                                    <Check className="w-4 h-4 mr-2" />
                                ) : null}
                                {announcementSaved ? 'Kaydedildi!' : 'Duyuruyu Güncelle'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Leaderboard Control Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                    <CardTitle className="text-lg">Skor Tablosu</CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="show-leaderboard" className="text-sm text-muted-foreground">
                                        Göster
                                    </Label>
                                    <Switch
                                        id="show-leaderboard"
                                        checked={liveState?.show_leaderboard ?? true}
                                        onCheckedChange={handleToggleLeaderboard}
                                    />
                                </div>
                            </div>
                            <CardDescription>
                                Sessiz Sinema skorları
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button 
                                variant="outline" 
                                className="w-full"
                                onClick={handleSyncLeaderboard}
                                disabled={syncingLeaderboard}
                            >
                                {syncingLeaderboard ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                )}
                                Skorları Senkronize Et
                            </Button>

                            {leaderboardLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            ) : leaderboardEntries.length === 0 ? (
                                <p className="text-center text-muted-foreground text-sm py-4">
                                    Henüz skor yok
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {leaderboardEntries.map((entry, index) => (
                                        <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                            <div className={cn(
                                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                                index === 0 ? "bg-yellow-500 text-white" :
                                                index === 1 ? "bg-gray-400 text-white" :
                                                index === 2 ? "bg-amber-700 text-white" :
                                                "bg-muted text-muted-foreground"
                                            )}>
                                                {index + 1}
                                            </div>
                                            <span className="flex-1 font-medium truncate">{entry.nickname}</span>
                                            <span className="text-sm font-bold">{entry.score}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            <Footer />
        </div>
    )
}
