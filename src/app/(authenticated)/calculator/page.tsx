"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Link from 'next/link';

import TaxCalculator from '@/components/tax/tax-calculator';
import TaxSummaryCard from '@/components/dashboard/tax-summary-card';
import Disclaimer from '@/components/common/disclaimer';
import SubscriptionGate from '@/components/common/subscription-gate';
import { toast } from 'sonner';

export default function TaxCalculatorPage() {
    const currentYear = new Date().getFullYear();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Data states
    const [subscription, setSubscription] = useState<any>({ plan: 'free' });
    const [profile, setProfile] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [taxBrackets, setTaxBrackets] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>({ exemption_threshold: 800000 });
    const [calculation, setCalculation] = useState<any>(null);

    const supabase = createClient();

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                await Promise.all([
                    fetchSubscription(user.id),
                    fetchProfile(user.id),
                    fetchTransactions(user.id),
                    fetchTaxData(),
                    fetchCalculation(user.id)
                ]);
            }
            setLoading(false);
        };
        init();
    }, []);

    const fetchSubscription = async (uid: string) => {
        const { data } = await supabase.from('subscriptions').select('*').eq('user_id', uid).eq('status', 'active').single();
        if (data) setSubscription(data);
        else setSubscription({ plan: 'free' });
    };

    const fetchProfile = async (uid: string) => {
        const { data } = await supabase.from('users').select('*').eq('id', uid).single();
        if (data) setProfile(data);
    };

    const fetchTransactions = async (uid: string) => {
        const { data } = await supabase.from('transactions').select('*').eq('user_id', uid).eq('tax_year', currentYear).limit(1000);
        if (data) setTransactions(data);
    };

    const fetchTaxData = async () => {
        // Fetch brackets and settings
        const { data: brackets } = await supabase.from('tax_brackets').select('*').eq('tax_year', currentYear).eq('is_active', true);
        if (brackets) setTaxBrackets(brackets);

        const { data: sets } = await supabase.from('tax_settings').select('*').eq('tax_year', currentYear).eq('is_active', true).single();
        if (sets) setSettings(sets);
    };

    const fetchCalculation = async (uid: string) => {
        const { data } = await supabase.from('tax_calculations').select('*').eq('user_id', uid).eq('tax_year', currentYear).single();
        if (data) setCalculation(data);
    };

    const handleCalculate = (result: any) => {
        setCalculation(result);
        // invalidate queries if using react-query, here just local state update is enough
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    // Check if profile is complete (mock check: if profile exists)
    // If specific fields are needed, check those. 
    // Legacy checked `profile?.profile_complete`.
    if (profile && !profile.profile_complete) {
        return (
            <div className="space-y-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tax Calculator</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Calculate your estimated tax liability</p>
                </div>
                <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                    <CardContent className="p-6 flex items-center gap-4">
                        <AlertCircle className="w-8 h-8 text-amber-600" />
                        <div>
                            <p className="font-semibold text-amber-800 dark:text-amber-200">Complete Your Profile</p>
                            <p className="text-sm text-amber-700 dark:text-amber-300">Please complete your tax profile to use the calculator.</p>
                            <Link href="/settings">
                                <Button className="mt-3" variant="outline">Complete Profile</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tax Calculator</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Calculate your {currentYear} estimated tax liability based on Nigerian tax laws</p>
            </div>

            <Disclaimer />

            <SubscriptionGate requiredPlan="pro" currentPlan={subscription?.plan} feature="Tax Calculator">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        {/* Tax Info */}
                        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm text-foreground">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Your Tax Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-slate-500">Total Transactions</p>
                                        <p className="font-semibold">{transactions.length}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Employment Type</p>
                                        <p className="font-semibold capitalize">{profile?.employment_type?.replace('_', ' ') || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Exemption Threshold</p>
                                        <p className="font-semibold">₦{(settings?.exemption_threshold || 800000).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Tax Year</p>
                                        <p className="font-semibold">{currentYear}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tax Brackets */}
                        {taxBrackets.length > 0 && (
                            <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm text-foreground">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">Tax Brackets</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {taxBrackets.sort((a, b) => a.min_amount - b.min_amount).map((bracket, i) => (
                                            <div key={i} className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-700/30 text-sm">
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    ₦{bracket.min_amount.toLocaleString()} - {bracket.max_amount === -1 ? '∞' : `₦${bracket.max_amount.toLocaleString()}`}
                                                </span>
                                                <span className="font-semibold">{bracket.rate}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="space-y-6">
                        <TaxSummaryCard calculation={calculation} settings={settings} />
                        <TaxCalculator
                            userId={user?.id}
                            transactions={transactions}
                            taxBrackets={taxBrackets}
                            settings={settings}
                            employmentType={profile?.employment_type}
                            onCalculate={handleCalculate}
                        />
                    </div>
                </div>
            </SubscriptionGate>
        </div>
    );
}
