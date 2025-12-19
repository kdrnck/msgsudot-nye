
import { supabase } from './supabase'

export interface UserSession {
    id: string
    nickname: string
    pin: string
}

const STORAGE_KEY = 'msgsu_dot_session'

export const auth = {
    // Save session to local storage
    setSession: (session: UserSession) => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
            }
        } catch (e) {
            console.error('Error saving session', e)
        }
    },

    // Get session from local storage
    getSession: (): UserSession | null => {
        try {
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem(STORAGE_KEY)
                return stored ? JSON.parse(stored) : null
            }
            return null
        } catch (e) {
            return null
        }
    },

    // Clear session
    logout: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY)
        }
    },

    // Verify credentials against DB
    login: async (nickname: string, pin: string) => {
        const { data, error } = await supabase
            .from('players')
            .select('*')
            .eq('nickname', nickname)
            .single()

        if (error) {
            // If user not found, return null (to trigger registration flow or error)
            if (error.code === 'PGRST116') return { error: 'not_found' }
            return { error: error.message }
        }

        if (data.pin !== pin) {
            return { error: 'invalid_pin' }
        }

        return { user: data }
    },

    // Create new user
    register: async (nickname: string, pin: string) => {
        const { data, error } = await supabase
            .from('players')
            .insert([{ nickname, pin }])
            .select()
            .single()

        if (error) {
            if (error.code === '23505') return { error: 'nickname_taken' } // Unique violation
            return { error: error.message }
        }

        return { user: data }
    }
}
