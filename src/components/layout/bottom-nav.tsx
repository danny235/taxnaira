'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
    LayoutDashboard, 
    ArrowRightLeft, 
    PlusCircle, 
    BarChart3, 
    Settings,
    FileText,
    Camera
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const navItems = [
    { label: 'Home', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Activity', icon: ArrowRightLeft, href: '/transactions' },
    { label: 'Snap', icon: Camera, href: '/snap', primary: true },
    { label: 'Reports', icon: BarChart3, href: '/reports' },
    { label: 'More', icon: Settings, href: '/settings' }
]

export function BottomNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden print:hidden">
            {/* Glassmorphism Background */}
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800" />
            
            <div className="relative flex items-center justify-around h-16 px-2 safe-area-bottom">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    
                    if (item.primary) {
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative -top-5 flex flex-col items-center"
                            >
                                <motion.div
                                    whileTap={{ scale: 0.9 }}
                                    className={cn(
                                        "w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40 border-4 border-white dark:border-slate-900 group transition-all",
                                        isActive ? "bg-emerald-600 scale-110" : "hover:bg-emerald-600"
                                    )}
                                >
                                    <item.icon className="w-7 h-7 text-white" />
                                </motion.div>
                                <span className="text-[10px] mt-1 font-medium text-emerald-600 dark:text-emerald-400">
                                    {item.label}
                                </span>
                            </Link>
                        )
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex flex-col items-center justify-center flex-1 h-full group"
                        >
                            <div className="relative">
                                <item.icon 
                                    className={cn(
                                        "w-6 h-6 transition-colors duration-200",
                                        isActive 
                                            ? "text-emerald-600 dark:text-emerald-400" 
                                            : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                                    )} 
                                />
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                            </div>
                            <span className={cn(
                                "text-[10px] mt-1 font-medium transition-colors duration-200",
                                isActive 
                                    ? "text-emerald-600 dark:text-emerald-400" 
                                    : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
