import React from 'react';
import { AuthCard } from '@/components/auth/auth-card';
import { VerifyForm } from '@/components/auth/verify-form';
import Link from 'next/link';

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
            <VerifyForm />
        </AuthCard>
    );
}
