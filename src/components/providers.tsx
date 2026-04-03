
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes'
import { useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/components/auth-provider'

export function Providers({ children, ...props }: ThemeProviderProps) {
    const [queryClient] = useState(() => new QueryClient())

    return (
        <NextThemesProvider {...props}>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    {children}
                    <Toaster />
                </AuthProvider>
            </QueryClientProvider>
        </NextThemesProvider>
    )
}
