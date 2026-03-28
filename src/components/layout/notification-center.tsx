'use client'

import React, { useState } from 'react'
import { Bell, Check, Info, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { 
    Popover, 
    PopoverContent, 
    PopoverTrigger 
} from "@/components/ui/popover"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const typeIcons: Record<string, any> = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle
}

const typeColors: Record<string, string> = {
    info: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    success: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    warning: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
    error: 'text-red-500 bg-red-50 dark:bg-red-900/20'
}

export function NotificationCenter() {
    const [open, setOpen] = useState(false)
    const queryClient = useQueryClient()

    const { data: notifications = [], isLoading } = useQuery<any[]>({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await fetch('/api/notifications')
            if (!res.ok) throw new Error('Failed to fetch')
            return res.json()
        },
        refetchInterval: 30000 // Refetch every 30s
    })

    const markAsReadMutation = useMutation({
        mutationFn: async (id: string) => {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
    })

    const unreadCount = notifications.filter(n => !n.read_at).length

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                    <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[10px] items-center justify-center text-white font-bold">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4" align="end">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                            {unreadCount} New
                        </Badge>
                    )}
                </div>

                <div className="max-h-[350px] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                        </div>
                    ) : notifications.length > 0 ? (
                        <div className="space-y-1 p-2">
                            {notifications.map((n) => {
                                const Icon = typeIcons[n.type] || Info
                                return (
                                    <div 
                                        key={n.id} 
                                        className={cn(
                                            "flex gap-3 p-3 rounded-lg transition-colors group",
                                            !n.read_at ? "bg-slate-50 dark:bg-slate-800/50" : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                                        )}
                                        onClick={() => !n.read_at && markAsReadMutation.mutate(n.id)}
                                    >
                                        <div className={cn("p-2 rounded-full h-fit mt-0.5", typeColors[n.type || 'info'])}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn("text-xs font-bold truncate", !n.read_at ? "text-slate-900 dark:text-white" : "text-slate-500")}>
                                                    {n.title}
                                                </p>
                                                <span className="text-[10px] text-slate-400 whitespace-nowrap mt-0.5">
                                                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                                {n.message}
                                            </p>
                                            {!n.read_at && (
                                                <button 
                                                    className="mt-2 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        markAsReadMutation.mutate(n.id)
                                                    }}
                                                >
                                                    <Check className="w-3 h-3" />
                                                    Mark as read
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-xs">No notifications yet</p>
                        </div>
                    )}
                </div>
                
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-center">
                    <button className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                        View All Activity
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
