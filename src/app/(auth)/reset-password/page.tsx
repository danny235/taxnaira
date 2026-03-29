'use client';

import React, { Suspense } from 'react';
import { AuthCard } from '@/components/auth/auth-card';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <AuthCard
                title="Create New Password"
                description="Your code has been verified. Please choose a new secure password for your account."
            >
                <Suspense fallback={
                    <div className="flex flex-col items-center justify-center p-12 space-y-4">
                        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
                        <p className="text-sm text-slate-500">Preparing secure environment...</p>
                    </div>
                }>
                    <ResetPasswordForm />
                </Suspense>
            </AuthCard>
        </motion.div>
    );
}
