'use client';

import React, { Suspense } from 'react';
import { AuthCard } from '@/components/auth/auth-card';
import { VerifyResetOtpForm } from '@/components/auth/verify-reset-otp-form';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function VerifyResetPage() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
        >
            <AuthCard
                title="Verify Code"
                description="Please enter the 6-digit verification code sent to your email address to continue."
                footer={
                    <Link href="/forgot-password" className="text-slate-500 hover:text-emerald-600 flex items-center justify-center gap-2 group transition-all font-medium">
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Use a different email
                    </Link>
                }
            >
                <Suspense fallback={
                    <div className="flex flex-col items-center justify-center p-8 space-y-4">
                        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                        <p className="text-sm text-slate-500">Loading verification form...</p>
                    </div>
                }>
                    <VerifyResetOtpForm />
                </Suspense>
            </AuthCard>
        </motion.div>
    );
}
