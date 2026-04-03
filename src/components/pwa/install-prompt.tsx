'use client'

import React, { useEffect, useState } from 'react'
import { Share, X, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function InstallPrompt() {
    const [installPrompt, setInstallPrompt] = useState<any>(null)
    const [isVisible, setIsVisible] = useState(false)
    const [isIOS, setIsIOS] = useState(false)

    useEffect(() => {
        const userAgent = window.navigator.userAgent.toLowerCase()
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
        setIsIOS(isIosDevice)

        // Already installed as standalone — don't show anything
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone
        if (isStandalone) return

        // Android / Desktop: wait for the native browser event
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault()
            setInstallPrompt(e)
            setTimeout(() => setIsVisible(true), 3000)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        // iOS: show manual guide if not already dismissed
        if (isIosDevice) {
            const hasDismissed = localStorage.getItem('pwa_prompt_dismissed')
            if (!hasDismissed) {
                setTimeout(() => setIsVisible(true), 3000)
            }
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        }
    }, [])

    const handleInstall = async () => {
        if (!installPrompt) return
        installPrompt.prompt()
        const { outcome } = await installPrompt.userChoice
        if (outcome === 'accepted') {
            setInstallPrompt(null)
            setIsVisible(false)
        }
    }

    const handleDismiss = () => {
        setIsVisible(false)
        localStorage.setItem('pwa_prompt_dismissed', 'true')
    }

    if (!isVisible) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-20 lg:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
            >
                <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4 shadow-2xl shadow-emerald-500/10 flex flex-col gap-3 relative overflow-hidden">
                    {/* Top accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-2xl" />

                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                <img src="/logo.png" alt="AzaWise" className="w-7 h-7 object-contain" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Install AzaWise</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {isIOS
                                        ? 'Add to your home screen for the best experience.'
                                        : 'Get faster access and offline features.'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {isIOS ? (
                        <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-1 flex-wrap">
                            Tap <Share className="inline w-3.5 h-3.5 text-blue-500" /> then tap
                            <span className="font-bold text-slate-800 dark:text-slate-200">"Add to Home Screen"</span>
                        </div>
                    ) : (
                        <button
                            onClick={handleInstall}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm"
                        >
                            <Download className="w-4 h-4" />
                            Install Now
                        </button>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
