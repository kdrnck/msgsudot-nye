"use client"

import { ReactNode, useEffect, useState } from 'react'
import { LanguageProvider } from '@/components/LanguageContext'

export function ClientProviders({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)

        // Load theme from localStorage
        const savedTheme = localStorage.getItem('theme')
        if (savedTheme === 'light') {
            document.documentElement.classList.remove('dark')
        } else {
            // Default to dark
            document.documentElement.classList.add('dark')
        }
    }, [])

    if (!mounted) {
        return <>{children}</>
    }

    return (
        <LanguageProvider>
            {children}
        </LanguageProvider>
    )
}

// Theme toggle utility
export function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark')
    if (isDark) {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
    } else {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
    }
    return !isDark
}

export function useTheme() {
    const [isDark, setIsDark] = useState(true)

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'))
    }, [])

    const toggle = () => {
        const newIsDark = toggleTheme()
        setIsDark(newIsDark)
    }

    return { isDark, toggle }
}
