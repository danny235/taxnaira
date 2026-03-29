'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { resetPassword } from '@/app/(auth)/actions';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';

const resetPasswordSchema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';
    const code = searchParams.get('code') || '';

    const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordValues>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const onSubmit = async (data: ResetPasswordValues) => {
        setIsLoading(true);
        const formData = new FormData();
        formData.append('email', email);
        formData.append('code', code);
        formData.append('password', data.password);

        try {
            const result = await resetPassword(formData);

            if (result?.error) {
                toast.error(typeof result.error === 'string' ? result.error : "Reset failed");
            } else if (result?.success && result.redirectUrl) {
                toast.success("Password reset successfully! You can now log in.");
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col items-center justify-center space-y-4 mb-8">
                <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="h-10 w-10" />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-bold">Secure Your Account</h3>
                    <p className="text-sm text-slate-500">Create a new password that is easy to remember but hard to guess.</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Min. 8 characters"
                            className="pl-10 pr-10 h-12 bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800"
                            {...register('password')}
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            id="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder="Re-enter password"
                            className="pl-10 h-12 bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800"
                            {...register('confirmPassword')}
                            disabled={isLoading}
                        />
                    </div>
                    {errors.confirmPassword && <p className="text-xs text-red-500 font-medium">{errors.confirmPassword.message}</p>}
                </div>
            </div>

            <Button 
                type="submit" 
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]" 
                disabled={isLoading}
            >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Update Password"}
            </Button>
        </form>
    );
}
