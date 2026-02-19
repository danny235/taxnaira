import React from 'react';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';

export default function LoginPage() {
    return (
        <AuthCard
            title="Welcome Back"
            description="Enter your email to sign in to your account"
            footer={
                <p>
                    Don't have an account?{' '}
                    <Link href="/register" className="text-emerald-600 hover:underline">
                        Sign up
                    </Link>
                </p>
            }
        >
            <LoginForm />
        </AuthCard>
    );
}
