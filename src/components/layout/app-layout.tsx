
'use client'

import React, { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/components/auth-provider'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import OnboardingForm from '@/components/profile/onboarding-form'
import { useQueryClient } from '@tanstack/react-query'

export function AppLayout({ children }: { children: React.ReactNode }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const { user, isLoading: loadingAuth } = useAuth()

    const { data: profile, isLoading: loadingProfile } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null
            const res = await fetch('/api/user/profile')
            if (!res.ok) {
                console.error('Profile fetch error')
                return null
            }
            return res.json()
        },
        enabled: !!user?.id,
        retry: false
    })

    const { data: subscription } = useQuery({
        queryKey: ['subscription', user?.id],
        queryFn: async () => {
            if (!user?.id) return { plan: 'free' }
            const res = await fetch('/api/user/subscription')
            if (!res.ok) return { plan: 'free' }
            return res.json()
        },
        enabled: !!user?.id,
    })

    const queryClient = useQueryClient()

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

    if (user && profile && !profile.profile_complete) {
        return (
            <OnboardingForm
                userId={user.id}
                onComplete={() => {
                    queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
                }}
            />
        )
    }

    return (
        <div className="min-h-screen">
            {/* Sidebar (Desktop) */}
            <div className="hidden lg:block fixed left-0 top-0 h-full z-40 print:hidden">
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                    subscription={subscription}
                    isAdmin={profile?.role === 'admin'}
                />
            </div>

            {/* Mobile Sidebar */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetContent side="left" className="p-0 border-none w-64">
                    <Sidebar
                        collapsed={false}
                        onToggle={() => setMobileMenuOpen(false)}
                        subscription={subscription}
                        isAdmin={profile?.role === 'admin'}
                    />
                </SheetContent>
            </Sheet>

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
                        onMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
                        className={sidebarCollapsed ? 'lg:left-16' : 'lg:left-64'}
                    />
                </div>

                <main className="p-2 sm:p-4 lg:p-6 pt-20 sm:pt-20 lg:pt-20">{children}</main>
            </div>
        </div>
    )
}
