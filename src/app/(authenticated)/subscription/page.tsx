"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Shield, Loader2, Coins } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
    {
        name: 'Free',
        id: 'free',
        price: '₦0',
        description: 'Basic tax tracking for individuals',
        features: ['Manual transactions', 'Basic tax estimation', 'Single tax year'],
        buttonText: 'Current Plan',
        current: true
    },
    {
        name: 'Pro',
        id: 'pro',
        price: '₦5,000',
        period: '/year',
        description: 'Perfect for small business owners',
        features: ['Automated PDF extraction', 'AI categorization', 'Multiple tax years', 'Priority support'],
        buttonText: 'Upgrade to Pro',
        popular: true
    },
    {
        name: 'Premium',
        id: 'premium',
        price: '₦15,000',
        period: '/year',
        description: 'Comprehensive tax management',
        features: ['Unlimited AI extraction', 'P&L Statement export', 'Advanced tax planning', 'Dedicated accountant chat'],
        buttonText: 'Get Premium'
    }
];

const CREDIT_PACKS = [
    { id: 'pack_10', name: 'Lite Pack', credits: 10, price: 1000, color: 'from-blue-500 to-cyan-500' },
    { id: 'pack_50', name: 'Business Pack', credits: 50, price: 4000, color: 'from-emerald-500 to-teal-500', popular: true },
    { id: 'pack_100', name: 'Power Pack', credits: 100, price: 7500, color: 'from-purple-500 to-pink-500' },
];

export default function SubscriptionPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [buyingPack, setBuyingPack] = useState<string | null>(null);

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            const res = await fetch('/api/user/profile');
            return res.json();
        }
    });

    const { data: subscription, isLoading: subLoading } = useQuery({
        queryKey: ['subscription', user?.id],
        queryFn: async () => {
            const res = await fetch('/api/user/subscription');
            return res.json();
        }
    });

    const buyCreditsMutation = useMutation({
        mutationFn: async (packId: string) => {
            // For now, we'll simulate a successful purchase
            // In a real implementation, this would involve Paystack initialization
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credit_balance: (profile?.credit_balance || 0) + (CREDIT_PACKS.find(p => p.id === packId)?.credits || 0)
                })
            });
            if (!res.ok) throw new Error('Failed to update credits');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Credits purchased successfully!');
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            setBuyingPack(null);
        },
        onError: (error: any) => {
            toast.error('Purchase failed: ' + error.message);
            setBuyingPack(null);
        }
    });

    if (profileLoading || subLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Subscription & Credits</h1>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                    Choose the plan that fits your needs or top up with credits for high-performance extraction features.
                </p>
            </div>

            {/* Credits Section */}
            <section className="bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl p-8 border border-emerald-100 dark:border-emerald-900/20">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-2 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider text-sm">
                            <Coins className="w-4 h-4" />
                            Your Balance
                        </div>
                        <div className="text-5xl font-black text-slate-900 dark:text-white">
                            {profile?.credit_balance || 0} <span className="text-2xl font-normal text-slate-400">Credits</span>
                        </div>
                        <p className="text-slate-500 max-w-sm">
                            Use credits for AI-powered PDF extraction and categorization. 1 Credit = 1 Document.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto">
                        {CREDIT_PACKS.map((pack) => (
                            <Card key={pack.id} className="relative overflow-hidden group hover:shadow-lg transition-all border-0 shadow-sm">
                                {pack.popular && (
                                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                                        BEST VALUE
                                    </div>
                                )}
                                <CardContent className="p-4 pt-6 text-center space-y-3">
                                    <div className="text-2xl font-bold">{pack.credits} Credits</div>
                                    <div className="text-emerald-600 dark:text-emerald-400 font-bold">₦{pack.price.toLocaleString()}</div>
                                    <Button
                                        className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 h-9"
                                        size="sm"
                                        disabled={buyingPack === pack.id}
                                        onClick={() => {
                                            if (confirm(`Buy ${pack.credits} credits for ₦${pack.price}?`)) {
                                                setBuyingPack(pack.id);
                                                buyCreditsMutation.mutate(pack.id);
                                            }
                                        }}
                                    >
                                        {buyingPack === pack.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buy Now'}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Plans Section */}
            <div className="grid lg:grid-cols-3 gap-8 px-4 sm:px-0">
                {PLANS.map((plan) => (
                    <Card key={plan.id} className={cn(
                        "relative flex flex-col transition-all duration-300",
                        plan.popular ? "border-emerald-500 shadow-xl scale-105 z-10" : "hover:shadow-lg",
                        plan.id === subscription?.plan && "border-2 border-emerald-500 ring-4 ring-emerald-500/10"
                    )}>
                        {plan.popular && (
                            <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                                Most Popular
                            </div>
                        )}

                        <CardHeader className="text-center pt-8">
                            <CardTitle className="text-2xl">{plan.name}</CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                            <div className="mt-4 flex items-baseline justify-center gap-1">
                                <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                                {plan.period && <span className="text-slate-500">{plan.period}</span>}
                            </div>
                        </CardHeader>

                        <CardContent className="flex-1 space-y-4">
                            <div className="space-y-2">
                                {plan.features.map((feature) => (
                                    <div key={feature} className="flex items-start gap-3 text-sm">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                                        <span className="text-slate-600 dark:text-slate-400">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>

                        <CardFooter className="pb-8">
                            <Button
                                variant={plan.id === subscription?.plan ? "outline" : (plan.popular ? "default" : "secondary")}
                                className={cn(
                                    "w-full h-12 text-lg font-semibold",
                                    plan.id === subscription?.plan && "border-emerald-500 text-emerald-600 hover:bg-emerald-50",
                                    plan.popular && plan.id !== subscription?.plan && "bg-emerald-600 hover:bg-emerald-700 text-white"
                                )}
                                disabled={plan.id === subscription?.plan}
                            >
                                {plan.id === subscription?.plan ? "Active Plan" : plan.buttonText}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* FAQ or Comparison Teaser */}
            <div className="text-center space-y-2">
                <p className="text-slate-500">
                    Need a custom plan for a large organization? <Link href="/contact" className="text-emerald-600 hover:underline">Contact sales</Link>
                </p>
            </div>
        </div>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
