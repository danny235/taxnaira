'use client'

import React, { useEffect, useState } from 'react'
import { Bell, BellOff, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { subscribeToPush, getPushStatus } from '@/lib/push-notifications'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export function PushManager() {
    const [status, setStatus] = useState<'prompt' | 'subscribed' | 'denied' | 'unsupported' | 'loading'>('loading')
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        checkStatus()
    }, [])

    const checkStatus = async () => {
        const s = await getPushStatus()
        setStatus(s as any)
    }

    const handleEnable = async () => {
        try {
            setStatus('loading')
            await subscribeToPush()
            setStatus('subscribed')
            toast.success('Push notifications enabled!')
        } catch (error: any) {
            toast.error(error.message || 'Failed to enable notifications')
            checkStatus()
        }
    }

    if (status === 'subscribed' || status === 'denied' || status === 'unsupported' || dismissed) {
        return null
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed bottom-24 right-6 left-6 md:left-auto md:w-80 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 overflow-hidden"
            >
                <div className="absolute top-2 right-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setDismissed(true)}>
                        <X className="w-3 h-3" />
                    </Button>
                </div>

                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                        <Bell className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Stay Updated</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Enable push notifications to never miss important tax updates and support replies.
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 mt-4">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 text-xs" 
                        onClick={() => setDismissed(true)}
                    >
                        Maybe later
                    </Button>
                    <Button 
                        size="sm" 
                        className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleEnable}
                        disabled={status === 'loading'}
                    >
                        {status === 'loading' ? 'Enabling...' : 'Enable Now'}
                    </Button>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
