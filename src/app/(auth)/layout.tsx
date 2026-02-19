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
                    <Link href="/" className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <span className="text-white font-bold text-xl">₦</span>
                        </div>
                        <span className="font-bold text-2xl text-slate-900 dark:text-white">TaxNaira</span>
                    </Link>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Simplify your tax management today
                    </p>
                </div>
                {children}
            </div>
        </div>
    );
}
