
'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Upload,
    Receipt,
    Calculator,
    FileText,
    FolderOpen,
    Settings,
    Shield,
    Crown,
    HelpCircle,
    LogOut,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'

// Map page names to paths for Next.js
const pageToPath = (page: string) => {
    if (page === 'Dashboard') return '/dashboard'
    if (page === 'ProfitLoss') return '/profit-loss'
    return `/${page.toLowerCase()}`
}

const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'Upload', icon: Upload, page: 'Upload' },
    { name: 'Transactions', icon: Receipt, page: 'Transactions' },
    { name: 'Profit & Loss', icon: TrendingUp, page: 'ProfitLoss' },
    { name: 'Tax Calculator', icon: Calculator, page: 'calculator' },
    { name: 'Reports', icon: FileText, page: 'Reports', pro: true },
    { name: 'Documents', icon: FolderOpen, page: 'Documents' },
]

const bottomNav = [
    { name: 'Settings', icon: Settings, page: 'Settings' },
    { name: 'Subscription', icon: Crown, page: 'Subscription' },
    { name: 'Help', icon: HelpCircle, page: 'Help' },
]

interface SidebarProps {
    collapsed: boolean
    onToggle: () => void
    subscription: any
    isAdmin: boolean
}

export function Sidebar({ collapsed, onToggle, subscription, isAdmin }: SidebarProps) {
    const pathname = usePathname()
    const { signOut } = useAuth()

    // Helper to check active state
    const isPageActive = (page: string) => {
        const path = pageToPath(page)
        return pathname === path || pathname.startsWith(`${path}/`)
    }

    return (
        <aside
            className={cn(
                'bg-background/80 backdrop-blur-md border-r border-border transition-all duration-300 flex flex-col h-full',
                collapsed ? 'w-16' : 'w-64'
            )}
        >
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700">
                {!collapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">₦</span>
                        </div>
                        <span className="font-bold text-lg text-slate-900 dark:text-white">TaxNaira</span>
                    </div>
                )}
                {/* Desktop Toggle */}
                <Button variant="ghost" size="icon" onClick={onToggle} className="hidden lg:flex text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </Button>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navigation.map((item: any) => {
                    const isActive = isPageActive(item.page)
                    const isPro = item.pro && subscription?.plan === 'free'

                    return (
                        <Link
                            key={item.name}
                            href={pageToPath(item.page)}
                            onClick={() => {
                                // On mobile, close sidebar after clicking
                                if (window.innerWidth < 1024) {
                                    onToggle();
                                }
                            }}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                                isActive
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50',
                                collapsed && 'justify-center'
                            )}
                        >
                            <item.icon
                                className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-emerald-600 dark:text-emerald-400')}
                            />
                            {!collapsed && (
                                <>
                                    <span className="font-medium flex-1">{item.name}</span>
                                    {isPro && <Crown className="w-4 h-4 text-amber-500" />}
                                </>
                            )}
                        </Link>
                    )
                })}

                {isAdmin && (
                    <Link
                        href="/admin"
                        onClick={() => {
                            if (window.innerWidth < 1024) {
                                onToggle();
                            }
                        }}
                        className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                            pathname.startsWith('/admin')
                                ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                                : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20',
                            collapsed && 'justify-center'
                        )}
                    >
                        <Shield className="w-5 h-5" />
                        {!collapsed && <span className="font-medium">Admin Panel</span>}
                    </Link>
                )}
            </nav>

            {/* Bottom Navigation */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 space-y-1">
                {bottomNav.map((item) => (
                    <Link
                        key={item.name}
                        href={pageToPath(item.page)}
                        onClick={() => {
                            if (window.innerWidth < 1024) {
                                onToggle();
                            }
                        }}
                        className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all',
                            collapsed && 'justify-center'
                        )}
                    >
                        <item.icon className="w-5 h-5" />
                        {!collapsed && <span className="font-medium">{item.name}</span>}
                    </Link>
                ))}
                <button
                    onClick={() => signOut()}
                    className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all',
                        collapsed && 'justify-center'
                    )}
                >
                    <LogOut className="w-5 h-5" />
                    {!collapsed && <span className="font-medium">Logout</span>}
                </button>
            </div>
        </aside>
    )
}
