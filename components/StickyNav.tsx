"use client"

import { useRouter } from "next/navigation"
import { Home, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface StickyNavProps {
    showHome?: boolean
    showBack?: boolean
    backHref?: string
    backLabel?: string
}

export function StickyNav({
    showHome = true,
    showBack = true,
    backHref = "/home",
    backLabel = "Geri Dön"
}: StickyNavProps) {
    const router = useRouter()

    if (!showHome && !showBack) return null

    return (
        <div className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
            <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
                {showBack ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(backHref)}
                        className="gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {backLabel}
                    </Button>
                ) : <div />}

                {showHome && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/home")}
                        className="gap-2"
                    >
                        <Home className="w-4 h-4" />
                        Anamenü
                    </Button>
                )}
            </div>
        </div>
    )
}
