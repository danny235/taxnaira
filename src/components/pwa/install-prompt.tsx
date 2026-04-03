'use client'

import React, { useState, useEffect } from 'react'
import { usePWA } from '@/hooks/use-pwa'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Share, PlusSquare, ArrowUp, Smartphone, Download, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function InstallPrompt() {
    const { isStandalone, isIOS, canInstall, install } = usePWA()
    const [isVisible, setIsVisible] = useState(false)
    const [dismissedUntil, setDismissedUntil] = useState<number | null>(null)
    const [isAndroid, setIsAndroid] = useState(false)

    useEffect(() => {
        setIsAndroid(/Android/i.test(navigator.userAgent))
    }, [])

    useEffect(() => {
        // Load dismissal state
        const stored = localStorage.getItem('pwa-prompt-dismissed-until')
        if (stored) {
            setDismissedUntil(parseInt(stored, 10))
        }
    }, [])

    useEffect(() => {
        // Only show if:
        // 1. Not already installed (standalone)
        // 2. Not recently dismissed
        // 3. User is on a mobile device (roughly detected)
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        const now = Date.now()
        
        if (!isStandalone && isMobile && (!dismissedUntil || now > dismissedUntil)) {
            // Delay slightly for better UX
            const timer = setTimeout(() => setIsVisible(true), 3000)
            return () => clearTimeout(timer)
        }
    }, [isStandalone, dismissedUntil])

    const dismiss = () => {
        setIsVisible(false)
        const until = Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        localStorage.setItem('pwa-prompt-dismissed-until', until.toString())
        setDismissedUntil(until)
    }

    if (!isVisible) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-20 left-4 right-4 z-50 lg:hidden"
            >
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 overflow-hidden relative group">
                    {/* Progress decorator */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-emerald-500 to-teal-500 opacity-20"></div>
                    
                    <button 
                        onClick={dismiss}
                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex gap-4 items-start">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center shrink-0">
                            <img src="/logo.png" alt="AzaWise" className="w-8 h-8 object-contain" />
                        </div>
                        
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Install AzaWise App</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                                Get a faster experience and offline access by adding AzaWise to your home screen.
                            </p>
                        </div>
                    </div>

                    <div className="mt-4">
                        {isIOS ? (
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center flex-wrap gap-1">
                                    Tap <Share className="w-3 h-3 inline text-blue-500" /> then 
                                    <span className="font-bold inline-flex items-center gap-1">
                                        Add to Home Screen <PlusSquare className="w-3 h-3" />
                                    </span>
                                </p>
                            </div>
                        ) : canInstall ? (
                            <Button 
                                onClick={install}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-10 text-xs rounded-xl shadow-lg shadow-emerald-500/20"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Install Now
                            </Button>
                        ) : isAndroid ? (
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center flex-wrap gap-1">
                                    Tap <MoreVertical className="w-3 h-3 inline" /> then 
                                    <span className="font-bold">Install App</span> or 
                                    <span className="font-bold">Add to Home Screen</span>
                                </p>
                            </div>
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center flex-wrap gap-1">
                                    Open Menu <Smartphone className="w-3 h-3 inline" /> then 
                                    <span className="font-bold">Install App</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
