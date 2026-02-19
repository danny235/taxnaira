import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from 'lucide-react';
import TaxCalculator from '@/components/tax/TaxCalculator';
import TaxSummaryCard from '@/components/dashboard/TaxSummaryCard';
import Disclaimer from '@/components/common/Disclaimer';
import SubscriptionGate from '@/components/common/SubscriptionGate';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";

export default function TaxCalculatorPage() {
  const currentYear = new Date().getFullYear();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_id: user?.id, status: 'active' });
      return subs[0] || { plan: 'free' };
    },
    enabled: !!user?.id
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.TaxProfile.filter({ user_id: user?.id });
      return profiles[0] || null;
    },
    enabled: !!user?.id
  });

  const { data: transactions = [], isLoading: loadingTx } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: () => base44.entities.Transaction.filter({ user_id: user?.id, tax_year: currentYear }, '-date', 1000),
    enabled: !!user?.id
  });

  const { data: taxBrackets = [] } = useQuery({
    queryKey: ['taxBrackets', currentYear],
    queryFn: () => base44.entities.TaxBracket.filter({ tax_year: currentYear, is_active: true }),
  });

  const { data: settings } = useQuery({
    queryKey: ['taxSettings', currentYear],
    queryFn: async () => {
      const s = await base44.entities.TaxSettings.filter({ tax_year: currentYear, is_active: true });
      return s[0] || { exemption_threshold: 800000, pension_deduction_rate: 8, nhf_deduction_rate: 2.5 };
    }
  });

  const { data: calculation, refetch: refetchCalc } = useQuery({
    queryKey: ['taxCalculation', user?.id],
    queryFn: async () => {
      const calcs = await base44.entities.TaxCalculation.filter({ user_id: user?.id, tax_year: currentYear });
      return calcs[0] || null;
    },
    enabled: !!user?.id
  });

  const handleCalculate = () => {
    refetchCalc();
    queryClient.invalidateQueries(['taxCalculation']);
  };

  if (loadingTx) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!profile?.profile_complete) {
    return (
      <div className="space-y-6">
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
              <Link to={createPageUrl('Settings')}>
                <Button className="mt-3" variant="outline">Complete Profile</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tax Calculator</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Calculate your {currentYear} estimated tax liability based on Nigerian tax laws</p>
      </div>

      <Disclaimer />

      <SubscriptionGate requiredPlan="pro" currentPlan={subscription?.plan} feature="Tax Calculator">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Tax Info */}
            <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
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
                    <p className="font-semibold capitalize">{profile?.employment_type?.replace('_', ' ')}</p>
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
              <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
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