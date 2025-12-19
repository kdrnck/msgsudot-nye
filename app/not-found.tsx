
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Ghost } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
            <div className="relative">
                <div className="absolute inset-0 bg-purple-500 blur-3xl opacity-20 animate-pulse"></div>
                <Ghost className="w-32 h-32 mb-6 text-purple-400 relative z-10 animate-bounce" />
            </div>

            <h1 className="text-8xl font-black mb-2 tracking-tighter">404</h1>
            <h2 className="text-2xl font-bold mb-6 text-purple-300">Whoops! Killed by the Void.</h2>

            <p className="max-w-md text-muted-foreground mb-8">
                The page you are looking for has been "Killed" in a round of KMK, or maybe it's just playing Charades and being really quiet.
            </p>

            <Link href="/home">
                <Button variant="secondary" size="lg" className="font-bold">
                    <AlertTriangle className="mr-2 w-4 h-4" /> Return to Safety
                </Button>
            </Link>
        </div>
    )
}
