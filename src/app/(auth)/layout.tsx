import React from 'react';
import Link from 'next/link';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center text-center">
                    <Link href="/" className="flex flex-col items-center gap-4 mb-4 group transition-transform hover:scale-105 active:scale-95">
                        <div className="w-16 h-16 relative">
                            <img src="/logo.png" alt="AzaWise Logo" className="object-contain" />
                        </div>
                        <span className="font-bold text-3xl tracking-tight text-slate-900 dark:text-white">AzaWise</span>
                    </Link>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                        Smart Expense & Tax Management
                    </p>
                </div>
                {children}
            </div>
        </div>
    );
}
