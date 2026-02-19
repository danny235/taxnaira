import React, { Suspense } from 'react';
import { AuthCard } from '@/components/auth/auth-card';
import { VerifyForm } from '@/components/auth/verify-form';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function VerifyPage() {
    return (
        <AuthCard
            title="Verify your Email"
            description="We sent a 6-digit code to your email. Enter it below."
            footer={
                <p>
                    Didn't receive a code?{' '}
                    <Link href="/register" className="text-emerald-600 hover:underline">
                        Resend
                    </Link>
                </p>
            }
        >
            <Suspense fallback={
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
            }>
                <VerifyForm />
            </Suspense>
        </AuthCard>
    );
}
