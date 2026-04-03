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
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-64 lg:bottom-6 right-4 lg:right-6 z-70 flex flex-col items-end gap-4"
                >
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-emerald-500/20 dark:border-emerald-500/10 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden w-full md:w-96">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-500/20">
                                    <Download className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Install App</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                        {isIOS
                                            ? 'Get AzaWise on your home screen for the best experience.'
                                            : 'Install our app for faster access and better performance.'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleDismiss}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {isIOS ? (
                            <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-800">
                                Tap <Share className="h-4 w-4 text-blue-500" /> then <span className="font-bold">"Add to Home Screen"</span>
                            </div>
                        ) : (
                            <button
                                onClick={handleInstall}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 text-sm flex items-center justify-center gap-2"
                            >
                                Install Now
                            </button>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
