
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

interface HeaderProps {
    user: any
    profile: any
    subscription: any
    onMenuToggle: () => void
}

export function Header({ user, profile, subscription, onMenuToggle }: HeaderProps) {
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
                return <Badge variant="secondary">Free</Badge>
        }
    }

    return (
        <header className="h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
                    <Menu className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Welcome back, {profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'User'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Manage your taxes efficiently
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {getPlanBadge()}

                <ModeToggle />

                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2 px-2">
                            <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400">
                                    {getInitials(profile?.full_name || user?.user_metadata?.full_name)}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                            <div>
                                <p className="font-medium">{profile?.full_name || user?.user_metadata?.full_name}</p>
                                <p className="text-xs text-slate-500">{user?.email}</p>
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
