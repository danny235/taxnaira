
'use client'

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type AuthContextType = {
    user: User | null
    session: Session | null
    role: string | null
    isLoading: boolean
    supabase: ReturnType<typeof createClient>
    signOut: () => Promise<void>
    navigateToLogin: () => void
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    role: null,
    isLoading: true,
    supabase: {} as any,
    signOut: async () => { },
    navigateToLogin: () => { },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [role, setRole] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        // Safety timeout to prevent infinite loading if auth locks hang
        const timer = setTimeout(() => {
            console.warn('Auth initialization timed out. Clearing loading state.');
            setIsLoading(false);
        }, 3000);

        const fetchRole = async (userId: string) => {
            const { data } = await supabase
                .from('users')
                .select('role')
                .eq('id', userId)
                .single()
            if (data) setRole(data.role)
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            clearTimeout(timer);
            setSession(session)
            setUser(session?.user ?? null)

            try {
                if (session?.user) {
                    await fetchRole(session.user.id)
                } else {
                    setRole(null)
                }
            } catch (error) {
                console.error('Error fetching role:', error)
            } finally {
                setIsLoading(false)
            }

            if (event === 'SIGNED_OUT') {
                setRole(null)
                router.refresh()
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [supabase, router])

    const signOut = async () => {
        await supabase.auth.signOut()
        router.refresh()
    }

    const navigateToLogin = () => {
        router.push('/login')
    }

    return (
        <AuthContext.Provider value={{ user, session, role, isLoading, supabase, signOut, navigateToLogin }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
