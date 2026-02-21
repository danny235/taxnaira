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

const CREDIT_PACKS = [
    { id: 'pack_250', name: 'Elite Pack', credits: 250, price: 4000, color: 'from-emerald-500 to-teal-500' },
    { id: 'pack_500', name: 'Growth Pack', credits: 500, price: 7500, color: 'from-blue-500 to-cyan-500', popular: true },
    { id: 'pack_950', name: 'Enterprise Pack', credits: 950, price: 15000, color: 'from-purple-500 to-pink-500' },
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

    const buyCreditsMutation = useMutation({
        mutationFn: async (packId: string) => {
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

    if (profileLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Credits & Top-ups</h1>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                    Top up with credits to power your AI extraction and financial analysis.
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
                            Use credits for AI-powered PDF extraction, categorization, and advanced financial insights.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto">
                        {CREDIT_PACKS.map((pack) => (
                            <Card key={pack.id} className="relative overflow-hidden group hover:shadow-lg transition-all border-0 shadow-sm min-w-[200px]">
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
