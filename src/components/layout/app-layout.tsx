
'use client'

import React, { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/components/auth-provider'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AppLayout({ children }: { children: React.ReactNode }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const { user, isLoading: loadingAuth } = useAuth()
    const supabase = createClient()

    const { data: profile, isLoading: loadingProfile } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null
            const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
            return data
        },
        enabled: !!user?.id,
    })

    const { data: subscription } = useQuery({
        queryKey: ['subscription', user?.id],
        queryFn: async () => {
            if (!user?.id) return { plan: 'free' }
            const { data } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .single()
            return data || { plan: 'free' }
        },
        enabled: !!user?.id,
    })

    if (loadingAuth || (user && loadingProfile)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto" />
                    <p className="mt-4 text-slate-500">Loading TaxNaira...</p>
                </div>
            </div>
        )
    }

    // If not authenticated, the middleware should redirect, but we can double check or render simpler layout
    // For now, we assume this layout is only used for authenticated pages

    return (
        <div className="min-h-screen">
            {/* Sidebar */}
            <div className="hidden lg:block print:hidden">
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                    subscription={subscription}
                    isAdmin={false} // TODO: Check role
                />
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <div
                className={cn(
                    'fixed inset-y-0 left-0 z-40 lg:hidden transform transition-transform duration-300',
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <Sidebar
                    collapsed={false}
                    onToggle={() => setMobileMenuOpen(false)}
                    subscription={subscription}
                    isAdmin={false} // TODO: Check role
                />
            </div>

            {/* Main Content */}
            <div
                className={cn(
                    'transition-all duration-300',
                    sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
                )}
            >
                <div className="print:hidden">
                    <Header
                        user={user}
                        profile={profile}
                        subscription={subscription}
                        onMenuToggle={() => setMobileMenuOpen(true)}
                    />
                </div>

                <main className="p-4 lg:p-6">{children}</main>
            </div>
        </div>
    )
}
