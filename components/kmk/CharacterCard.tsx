
"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Character {
    id: string
    name: string
    category: string
    image_path: string
}

interface CharacterCardProps {
    character: Character
    selected?: boolean
    onClick?: () => void
    className?: string
    disabled?: boolean
}

export function CharacterCard({ character, selected, onClick, className, disabled }: CharacterCardProps) {
    // If we have a public URL helper, use it. For now assuming public bucket.
    // We need the Supabase URL. 
    // Should ideally pass full URL or use a helper.
    // I'll assume image_path is relative to the 'characters' bucket.
    const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/characters/${character.image_path}`

    return (
        <Card
            onClick={!disabled ? onClick : undefined}
            className={cn(
                "relative overflow-hidden cursor-pointer transition-all duration-300 active:scale-95 aspect-[3/4] group border-0 shadow-lg",
                selected ? "ring-4 ring-primary scale-105 z-10" : "hover:scale-102",
                disabled && "opacity-50 grayscale cursor-not-allowed",
                className
            )}
        >
            <img
                src={imageUrl}
                alt={character.name}
                className="w-full h-full object-cover absolute inset-0 transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
                onError={(e) => {
                    e.currentTarget.src = 'https://placehold.co/300x400/purple/white?text=No+Image' // Fallback
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />

            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <span className="text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm mb-1 inline-block">
                    {character.category}
                </span>
                <h3 className="font-bold text-lg leading-tight drop-shadow-md truncate">
                    {character.name}
                </h3>
            </div>
        </Card>
    )
}
