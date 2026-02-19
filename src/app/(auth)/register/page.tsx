import React from 'react';
import { AuthCard } from '@/components/auth/auth-card';
import { RegisterForm } from '@/components/auth/register-form';
import Link from 'next/link';

export default function RegisterPage() {
    return (
        <AuthCard
            title="Create an Account"
            description="Enter your information to create an account"
            footer={
                <p>
                    Already have an account?{' '}
                    <Link href="/login" className="text-emerald-600 hover:underline">
                        Sign in
                    </Link>
                </p>
            }
        >
            <RegisterForm />
        </AuthCard>
    );
}
