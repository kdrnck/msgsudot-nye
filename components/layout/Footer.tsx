
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Instagram, Twitter, Heart, Sparkles } from "lucide-react"

export function Footer({ showHiring = true }: { showHiring?: boolean }) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)

    return (
        <footer className="w-full py-8 text-center text-sm mt-auto border-t border-border/30 bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col gap-5 items-center justify-center max-w-md mx-auto px-4">

                {/* Branding Row - Static, no animations */}
                <div className="flex flex-col items-center gap-3">
                    <img
                        src="/dot-logo.png"
                        alt="DOT Logo"
                        className="w-12 h-12 object-contain brightness-110 contrast-125"
                    />
                    <div className="flex items-center gap-3">
                        <span className="font-bold tracking-widest text-foreground text-sm">MSGSU - DOT</span>
                        <a href="https://www.instagram.com/msgsu_dot/" target="_blank" rel="noopener noreferrer" className="p-1.5 text-foreground/70 hover:text-pink-500 transition-colors bg-muted/50 rounded-full">
                            <Instagram className="w-4 h-4" />
                        </a>
                    </div>
                </div>

                {/* Developer Credit - Static */}
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger render={
                        <button className="text-xs text-foreground/60 hover:text-foreground transition-colors flex items-center gap-1.5">
                            made by <span className="underline underline-offset-2 font-medium">kdrnck</span> with <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                        </button>
                    } />
                    <DialogContent className="sm:max-w-xs bg-background/95 backdrop-blur-sm border-border shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-center text-foreground font-bold text-lg">
                                Connect with @kdrnck
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col gap-3 py-4">
                            <Button variant="outline" className="w-full justify-start gap-4 hover:bg-pink-500/10 hover:text-pink-500 border-border hover:border-pink-500/40 transition-all" render={
                                <a href="https://instagram.com/kdrnck" target="_blank" rel="noopener noreferrer">
                                    <Instagram className="w-5 h-5" />
                                    Instagram
                                </a>
                            } />
                            <Button variant="outline" className="w-full justify-start gap-4 hover:bg-blue-400/10 hover:text-blue-400 border-border hover:border-blue-400/40 transition-all" render={
                                <a href="https://x.com/kdrnck" target="_blank" rel="noopener noreferrer">
                                    <Twitter className="w-5 h-5" />
                                    X (Twitter)
                                </a>
                            } />
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Hiring CTA - Static, better contrast */}
                {showHiring && (
                    <Button
                        variant="outline"
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 shadow-md gap-2 px-6 py-5 text-sm font-semibold"
                        onClick={() => router.push('/hiring')}
                    >
                        <Sparkles className="w-4 h-4" />
                        Sonraki Etkinliğin Yaratıcısı Sen Ol!
                    </Button>
                )}

            </div>
        </footer>
    )
}
