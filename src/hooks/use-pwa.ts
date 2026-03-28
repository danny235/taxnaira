'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[]
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed'
        platform: string
    }>
    prompt(): Promise<void>
}

export function usePWA() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isStandalone, setIsStandalone] = useState(false)
    const [isIOS, setIsIOS] = useState(false)

    useEffect(() => {
        // Detect if already installed (standalone mode)
        const checkStandalone = () => {
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                                    (window.navigator as any).standalone || 
                                    document.referrer.includes('android-app://')
            setIsStandalone(isStandaloneMode)
        }

        // Detect iOS
        const checkIOS = () => {
            const userAgent = window.navigator.userAgent.toLowerCase()
            setIsIOS(/iphone|ipad|ipod/.test(userAgent))
        }

        checkStandalone()
        checkIOS()

        // Capture the native install prompt (Chrome/Android/Edge)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setInstallPrompt(e as BeforeInstallPromptEvent)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        }
    }, [])

    const handleInstall = async () => {
        if (!installPrompt) return
        await installPrompt.prompt()
        const { outcome } = await installPrompt.userChoice
        if (outcome === 'accepted') {
            setInstallPrompt(null)
        }
    }

    return {
        isStandalone,
        isIOS,
        canInstall: !!installPrompt,
        install: handleInstall
    }
}
