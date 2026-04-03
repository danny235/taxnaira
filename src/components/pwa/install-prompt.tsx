'use client'

import React, { useEffect, useState } from 'react'
import { Share, X, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function InstallPrompt() {
    const [installPrompt, setInstallPrompt] = useState<any>(null)
    const [isVisible, setIsVisible] = useState(false)
    const [isIOS, setIsIOS] = useState(false)

    useEffect(() => {
        const ua = window.navigator.userAgent
        const isIosDevice = /iphone|ipad|ipod/i.test(ua)
        setIsIOS(isIosDevice)

        // Already installed — never show
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true

        if (isStandalone) return

        // Already dismissed this session
        const hasDismissed = localStorage.getItem('pwa_prompt_dismissed')
        if (hasDismissed) return

        // Android/Desktop Chrome: wait for the native browser event
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault()
            setInstallPrompt(e)
            setTimeout(() => setIsVisible(true), 4000)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        // iOS: always show with manual guide (event never fires on iOS)
        if (isIosDevice) {
            setTimeout(() => setIsVisible(true), 4000)
        }

        // Android fallback: if beforeinstallprompt hasn't fired after 8s,
        // show the manual instruction banner anyway.
        // This covers cases where criteria are met but the event was missed.
        const fallbackTimer = setTimeout(() => {
            if (!isIosDevice) {
                setIsVisible(true)
            }
        }, 8000)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            clearTimeout(fallbackTimer)
        }
    }, [])

    const handleInstall = async () => {
        if (installPrompt) {
            installPrompt.prompt()
            const { outcome } = await installPrompt.userChoice
            if (outcome === 'accepted') {
                setInstallPrompt(null)
                setIsVisible(false)
            }
        } else {
            // Fallback: dismiss and let user find it in Chrome menu
            setIsVisible(false)
            localStorage.setItem('pwa_prompt_dismissed', 'true')
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
                className="fixed bottom-24 lg:bottom-6 left-3 right-3 md:left-auto md:right-6 md:w-[360px] z-[60]"
            >
                <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4 shadow-2xl shadow-black/20 flex flex-col gap-3 relative overflow-hidden">
                    {/* Top accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-500 to-teal-500 rounded-t-2xl" />

                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                <img src="/logo.png" alt="AzaWise" className="w-7 h-7 object-contain rounded-lg" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Install AzaWise</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                    {isIOS
                                        ? 'Add to your home screen for the best experience.'
                                        : 'Get faster access & offline features on your device.'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {isIOS ? (
                        <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-1 flex-wrap leading-relaxed">
                            Tap <Share className="inline w-3.5 h-3.5 text-blue-500 shrink-0" /> then
                            <span className="font-bold text-slate-800 dark:text-slate-200">"Add to Home Screen"</span>
                        </div>
                    ) : installPrompt ? (
                        <button
                            onClick={handleInstall}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm"
                        >
                            <Download className="w-4 h-4" />
                            Install Now
                        </button>
                    ) : (
                        <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 leading-relaxed">
                            In Chrome, tap the <span className="font-bold text-slate-800 dark:text-slate-200">⋮ menu</span> → <span className="font-bold text-slate-800 dark:text-slate-200">Add to Home Screen</span> to install.
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
