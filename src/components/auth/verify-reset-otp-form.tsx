'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound, Sparkles } from 'lucide-react';
import { verifyResetOtp, resendOtp } from '@/app/(auth)/actions';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const verifySchema = z.object({
    code: z.string().length(6, "Code must be 6 digits"),
});

type VerifyValues = z.infer<typeof verifySchema>;

export function VerifyResetOtpForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';

    const { setValue, handleSubmit, watch, formState: { errors } } = useForm<VerifyValues>({
        resolver: zodResolver(verifySchema),
        defaultValues: { code: '' }
    });

    const codeValue = watch('code');

    const onSubmit = async (data: VerifyValues) => {
        setIsLoading(true);
        const formData = new FormData();
        formData.append('email', email);
        formData.append('code', data.code);

        try {
            const result = await verifyResetOtp(formData);

            if (result?.error) {
                toast.error(typeof result.error === 'string' ? result.error : "Verification failed");
            } else if (result?.success && result.redirectUrl) {
                toast.success("Code verified! Set your new password.");
                router.push(result.redirectUrl);
            }
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email) return;
        setIsResending(true);
        try {
            const result = await resendOtp(email);
            if (result?.success) {
                toast.success("New code sent to your email!");
            } else {
                toast.error(result?.error || "Failed to resend code");
            }
        } catch (error) {
            toast.error("Error resending code");
        } finally {
            setIsResending(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 shadow-inner">
                    <KeyRound className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-sm text-slate-500 font-medium">Reset code sent to</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{email}</p>
                </div>
            </div>

            <div className="flex flex-col items-center space-y-4">
                <InputOTP
                    maxLength={6}
                    value={codeValue}
                    onChange={(val) => setValue('code', val)}
                    disabled={isLoading}
                >
                    <InputOTPGroup className="gap-2 sm:gap-3">
                        <InputOTPSlot index={0} className="h-12 w-10 sm:h-14 sm:w-12 text-lg font-bold border-2 rounded-xl focus:border-emerald-500" />
                        <InputOTPSlot index={1} className="h-12 w-10 sm:h-14 sm:w-12 text-lg font-bold border-2 rounded-xl" />
                        <InputOTPSlot index={2} className="h-12 w-10 sm:h-14 sm:w-12 text-lg font-bold border-2 rounded-xl" />
                        <InputOTPSlot index={3} className="h-12 w-10 sm:h-14 sm:w-12 text-lg font-bold border-2 rounded-xl" />
                        <InputOTPSlot index={4} className="h-12 w-10 sm:h-14 sm:w-12 text-lg font-bold border-2 rounded-xl" />
                        <InputOTPSlot index={5} className="h-12 w-10 sm:h-14 sm:w-12 text-lg font-bold border-2 rounded-xl" />
                    </InputOTPGroup>
                </InputOTP>
                {errors.code && <p className="text-xs text-red-500 font-medium">{errors.code.message}</p>}
            </div>

            <div className="space-y-4">
                <Button 
                    type="submit" 
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-500/20 transition-all active:scale-95" 
                    disabled={isLoading || codeValue.length < 6}
                >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                        <>
                            Verify & Continue
                            <Sparkles className="ml-2 h-4 w-4" />
                        </>
                    )}
                </Button>

                <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="w-full text-center text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition-colors"
                >
                    {isResending ? "Sending code..." : "Didn't receive code? Resend"}
                </button>
            </div>
        </form>
    );
}
