'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowRight } from 'lucide-react';
import { forgotPassword } from '@/app/(auth)/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordValues>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordValues) => {
        setIsLoading(true);
        const formData = new FormData();
        formData.append('email', data.email);

        try {
            const result = await forgotPassword(formData);

            if (result?.error) {
                toast.error(typeof result.error === 'string' ? result.error : "Failed to send reset code");
            } else if (result?.success && result.redirectUrl) {
                toast.success("Reset code sent to your email!");
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
            <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        className="pl-10 h-12 bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800"
                        {...register('email')}
                        disabled={isLoading}
                    />
                </div>
                {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
            </div>

            <Button 
                type="submit" 
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]" 
                disabled={isLoading}
            >
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (
                    <>
                        Send Reset Code
                        <ArrowRight className="ml-2 h-4 w-4 text-emerald-100" />
                    </>
                )}
            </Button>
        </form>
    );
}
