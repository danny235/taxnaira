'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { verifyOtp } from '@/app/(auth)/actions';
import { toast } from 'sonner';
import { useSearchParams, useRouter } from 'next/navigation';
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
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verify Email'}
            </Button>
        </form>
    );
}
