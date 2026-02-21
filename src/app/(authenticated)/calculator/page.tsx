"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Link from 'next/link';

import TaxCalculator from '@/components/tax/tax-calculator';
import TaxSummaryCard from '@/components/dashboard/tax-summary-card';
import Disclaimer from '@/components/common/disclaimer';
import SubscriptionGate from '@/components/common/subscription-gate';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';

export default function TaxCalculatorPage() {
    const currentYear = new Date().getFullYear();
    const { user, isLoading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);

    // Data states
    const [subscription, setSubscription] = useState<any>({ plan: 'free' });
    const [profile, setProfile] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [taxBrackets, setTaxBrackets] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>({ exemption_threshold: 800000 });
    const [calculation, setCalculation] = useState<any>(null);

    useEffect(() => {
        const init = async () => {
            if (user) {
                await Promise.all([
                    fetchSubscription(),
                    fetchProfile(),
                    fetchTransactions(),
                    fetchTaxData(),
                    fetchCalculation()
                ]);
            }
            setLoading(false);
        };
        if (!authLoading) init();
    }, [user, authLoading]);

    const fetchSubscription = async () => {
        try {
            const res = await fetch('/api/user/subscription');
            if (res.ok) {
                const data = await res.json();
                setSubscription(data);
            } else {
                setSubscription({ plan: 'free' });
            }
        } catch (error) {
            console.error('Subscription fetch error:', error);
            setSubscription({ plan: 'free' });
        }
    };

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/user/profile');
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
            }
        } catch (error) {
            console.error('Profile fetch error:', error);
        }
    };

    const fetchTransactions = async () => {
        try {
            const res = await fetch(`/api/user/transactions?year=${currentYear}`);
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
            }
        } catch (error) {
            console.error('Transactions fetch error:', error);
        }
    };

    const fetchTaxData = async () => {
        try {
            // Fetch brackets from admin endpoint (which handles public read)
            const bRes = await fetch(`/api/admin/tax-brackets?year=${currentYear}`);
            if (bRes.ok) {
                const brackets = await bRes.json();
                setTaxBrackets(brackets);
            }

            // Fetch settings
            const sRes = await fetch(`/api/user/tax-settings?year=${currentYear}`);
            if (sRes.ok) {
                const sets = await sRes.json();
                setSettings(sets);
            }
        } catch (error) {
            console.error('Tax data fetch error:', error);
        }
    };

    const fetchCalculation = async () => {
        try {
            const res = await fetch(`/api/user/tax-calculation?year=${currentYear}`);
            if (res.ok) {
                const data = await res.json();
                setCalculation(data);
            }
        } catch (error) {
            console.error('Calculation fetch error:', error);
        }
    };

    const handleCalculate = (result: any) => {
        setCalculation(result);
        // invalidate queries if using react-query, here just local state update is enough
    };

    if (loading || authLoading) {
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
        </div>
    );
}
