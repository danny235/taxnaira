'use client';

import React from 'react';
import { AuthCard } from '@/components/auth/auth-card';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <AuthCard
                title="Forgot Password?"
                description="Enter your email address and we'll send you a 6-digit code to reset your password."
                footer={
                    <p>
                        Remembered your password?{' '}
                        <Link href="/login" className="text-emerald-600 font-bold hover:underline transition-all">
                            Back to Login
                        </Link>
                    </p>
                }
            >
                <ForgotPasswordForm />
            </AuthCard>
        </motion.div>
    );
}
