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
            {!dismissed && (status === 'prompt' || status === 'loading') && (
                <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    className="fixed top-20 left-4 right-4 md:left-auto md:right-6 md:w-96 z-60"
                >
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-emerald-500/20 dark:border-emerald-500/10 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-500/20">
                                    <Bell className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Turn on Notifications</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Stay updated on your deposits, taxes, and portfolio performance in real-time.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDismissed(true)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <Button 
                                variant="ghost" 
                                className="flex-1 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold py-3 rounded-2xl transition-colors text-sm border border-slate-100 dark:border-slate-800" 
                                onClick={() => setDismissed(true)}
                            >
                                Not Now
                            </Button>
                            <Button 
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] text-sm"
                                onClick={handleEnable}
                                disabled={status === 'loading'}
                            >
                                {status === 'loading' ? 'Enabling...' : 'Enable'}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
