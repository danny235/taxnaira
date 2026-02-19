
'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, Menu, User, Settings, Crown } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { ModeToggle } from '@/components/mode-toggle'
import { cn } from '@/lib/utils'

interface HeaderProps {
    user: any
    profile: any
    subscription: any
    onMenuToggle: () => void
    className?: string
}

export function Header({ user, profile, subscription, onMenuToggle, className }: HeaderProps) {
    const { signOut } = useAuth()

    const getInitials = (name: string) => {
        if (!name) return 'U'
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    }

    const getPlanBadge = () => {
        switch (subscription?.plan) {
            case 'premium':
                return <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">Premium</Badge>
            case 'pro':
                return <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">Pro</Badge>
            default:
                return <Badge variant="secondary" className="hidden sm:inline-flex">Free</Badge>
        }
    }

    return (
        <header className={cn(
            "h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-6 fixed top-0 right-0 z-20 transition-all duration-300 left-0",
            className
        )}>
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={onMenuToggle}>
                    <Menu className="w-4 h-4" />
                </Button>
                <div className="min-w-0 flex-1">
                    <h1 className="text-sm sm:text-base md:text-lg font-semibold text-slate-900 dark:text-white truncate">
                        Hello, {profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'User'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 hidden lg:block">
                        Manage your taxes efficiently
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {getPlanBadge()}

                <ModeToggle />

                <Button variant="ghost" size="icon" className="relative h-8 w-8">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2 px-1 h-8">
                            <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
                                <AvatarFallback className="text-[10px] sm:text-xs bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400">
                                    {getInitials(profile?.full_name || user?.user_metadata?.full_name)}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                            <div className="flex flex-col gap-1 overflow-hidden">
                                <p className="font-medium truncate">{profile?.full_name || user?.user_metadata?.full_name}</p>
                                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Link href="/settings">
                            <DropdownMenuItem>
                                <User className="w-4 h-4 mr-2" />
                                Profile
                            </DropdownMenuItem>
                        </Link>
                        <Link href="/settings">
                            <DropdownMenuItem>
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                            </DropdownMenuItem>
                        </Link>
                        <Link href="/subscription">
                            <DropdownMenuItem>
                                <Crown className="w-4 h-4 mr-2" />
                                Subscription
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => signOut()} className="text-red-600">
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
