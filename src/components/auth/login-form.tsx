'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { login } from '@/app/(auth)/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormValues) => {
        setIsLoading(true);
        const formData = new FormData();
        formData.append('email', data.email);
        formData.append('password', data.password);

        try {
            const result = await login(formData);

            if (result?.error) {
                if (typeof result.error === 'string') {
                    toast.error(result.error);
                } else {
                    toast.error("Please check the form for errors");
                    console.error(result.error);
                }
            } else if (result?.success && result.redirectUrl) {
                toast.success("Welcome back!");
                router.push(result.redirectUrl);
            }
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    autoComplete="email"
                    {...register('email')}
                    disabled={isLoading}
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <a href="/forgot-password" className="text-xs text-emerald-600 hover:underline">Forgot password?</a>
                </div>
                <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    {...register('password')}
                    disabled={isLoading}
                />
                {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Log In'}
            </Button>
        </form>
    );
}
