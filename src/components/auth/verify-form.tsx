'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { verifyOtp, resendOtp } from '@/app/(auth)/actions';
import { toast } from 'sonner';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

const verifySchema = z.object({
    code: z.string().length(6, 'Verification code must be 6 digits'),
    email: z.string().email('Invalid email address'),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

export function VerifyForm() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialEmail = searchParams.get('email') || '';

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<VerifyFormValues>({
        resolver: zodResolver(verifySchema),
        defaultValues: {
            email: initialEmail
        }
    });

    const [isResending, setIsResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const handleResend = async () => {
        if (!initialEmail || cooldown > 0) return;
        setIsResending(true);
        try {
            const result = await resendOtp(initialEmail);
            if (result.success) {
                toast.success("New verification code sent!");
                setCooldown(60); // 60s cooldown
            } else {
                toast.error(result.error || "Failed to resend code");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsResending(false);
        }
    };

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const onSubmit = async (data: VerifyFormValues) => {
        setIsLoading(true);
        const formData = new FormData();
        formData.append('email', data.email);
        formData.append('code', data.code);

        try {
            const result = await verifyOtp(formData);

            if (result?.error) {
                if (typeof result.error === 'string') {
                    toast.error(result.error);
                } else {
                    toast.error("Please check the code and try again");
                    console.error(result.error);
                }
            } else if (result?.success && result.redirectUrl) {
                toast.success("Verification successful!");
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
            {initialEmail ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/50 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider mb-1">Verifying Email</p>
                            <p className="text-slate-900 dark:text-white font-medium break-all">{initialEmail}</p>
                        </div>
                        <Link 
                            href="/register" 
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-4"
                        >
                            Wrong email?
                        </Link>
                    </div>
                    {/* Hidden input to ensure the email is still part of the form state */}
                    <input type="hidden" {...register('email')} />
                </div>
            ) : (
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
            )}

            <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <div className="flex justify-center">
                    <InputOTP
                        maxLength={6}
                        onChange={(value) => setValue('code', value)}
                        disabled={isLoading}
                    >
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>
                </div>
                {errors.code && <p className="text-sm text-red-500 text-center">{errors.code.message}</p>}
                
                <div className="flex justify-center mt-4">
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={isResending || cooldown > 0}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:text-slate-400 transition-colors"
                    >
                        {isResending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : cooldown > 0 ? (
                            `Resend code in ${cooldown}s`
                        ) : (
                            "Didn't get a code? Resend"
                        )}
                    </button>
                </div>
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-[0.98]" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verify & Continue to Dashboard'}
            </Button>
        </form>
    );
}
