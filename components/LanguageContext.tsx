"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Language, translations, t as translate } from '@/lib/translations'

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: keyof typeof translations.tr) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>('tr')

    useEffect(() => {
        // Load from localStorage on mount
        const saved = localStorage.getItem('language') as Language
        if (saved && (saved === 'tr' || saved === 'en')) {
            setLanguageState(saved)
        }
    }, [])

    const setLanguage = (lang: Language) => {
        setLanguageState(lang)
        localStorage.setItem('language', lang)
    }

    const t = (key: keyof typeof translations.tr) => translate(key, language)

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (!context) {
        // Fallback if not wrapped in provider
        return {
            language: 'tr' as Language,
            setLanguage: () => { },
            t: (key: keyof typeof translations.tr) => translate(key, 'tr')
        }
    }
    return context
}

// Simple hook to get translation without context (for static rendering)
export function useTranslation(lang: Language = 'tr') {
    return {
        t: (key: keyof typeof translations.tr) => translate(key, lang),
        language: lang
    }
}
