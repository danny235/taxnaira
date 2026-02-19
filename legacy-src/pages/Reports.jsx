import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Loader2, Printer, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import Disclaimer from '@/components/common/Disclaimer';
import SubscriptionGate from '@/components/common/SubscriptionGate';

export default function Reports() {
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef(null);
  const currentYear = new Date().getFullYear();

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

  const { data: calculation } = useQuery({
    queryKey: ['taxCalculation', user?.id],
    queryFn: async () => {
      const calcs = await base44.entities.TaxCalculation.filter({ user_id: user?.id, tax_year: currentYear });
      return calcs[0] || null;
    },
    enabled: !!user?.id
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: () => base44.entities.Transaction.filter({ user_id: user?.id, tax_year: currentYear }),
    enabled: !!user?.id
  });

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount) => `₦${(amount || 0).toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tax Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Generate and download your tax summary reports</p>
        </div>
      </div>

      <Disclaimer />

      <SubscriptionGate requiredPlan="pro" currentPlan={subscription?.plan} feature="PDF Reports">
        {calculation ? (
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex gap-3 print:hidden">
              <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700">
                <Printer className="w-4 h-4 mr-2" />
                Print Report
              </Button>
            </div>

            {/* Report Preview */}
            <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm print:shadow-none" ref={reportRef}>
              <CardContent className="p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <span className="text-white font-bold text-2xl">TP</span>
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">TaxPilot NG</h1>
                  <h2 className="text-xl font-semibold text-emerald-600 mt-2">Annual Tax Summary Report</h2>
                  <p className="text-slate-500">Tax Year: {currentYear}</p>
                  <p className="text-sm text-slate-400">Generated: {format(new Date(), 'PPP')}</p>
                </div>

                <Separator className="my-6" />

                {/* Taxpayer Information */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Taxpayer Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Full Name</p>
                      <p className="font-medium">{profile?.full_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Phone</p>
                      <p className="font-medium">{profile?.phone_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">State of Residence</p>
                      <p className="font-medium">{profile?.state_of_residence || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Employment Type</p>
                      <p className="font-medium capitalize">{profile?.employment_type?.replace('_', ' ') || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-500">Address</p>
                      <p className="font-medium">{profile?.residential_address || '-'}</p>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Income Summary */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Income Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                      <span>Total Income</span>
                      <span className="font-semibold">{formatCurrency(calculation.total_income)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                      <span>Foreign Income</span>
                      <span className="font-semibold">{formatCurrency(calculation.foreign_income)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                      <span>Capital Gains</span>
                      <span className="font-semibold">{formatCurrency(calculation.capital_gains)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Deductions Applied</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <span>Pension Contributions</span>
                      <span className="font-semibold text-emerald-600">- {formatCurrency(calculation.pension_deduction)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <span>NHF Contributions</span>
                      <span className="font-semibold text-emerald-600">- {formatCurrency(calculation.nhf_deduction)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <span>Other Deductions</span>
                      <span className="font-semibold text-emerald-600">- {formatCurrency(calculation.other_deductions)}</span>
                    </div>
                  </div>
                </div>

                {/* Tax Calculation */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Tax Calculation</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                      <span>Taxable Income</span>
                      <span className="font-semibold">{formatCurrency(calculation.taxable_income)}</span>
                    </div>
                    
                    {calculation.tax_breakdown?.length > 0 && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                        <p className="text-sm font-medium mb-3">Tax by Bracket:</p>
                        {calculation.tax_breakdown.map((bracket, i) => (
                          <div key={i} className="flex justify-between text-sm py-1">
                            <span className="text-slate-600">{bracket.bracket} @ {bracket.rate}%</span>
                            <span>{formatCurrency(bracket.tax)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                      <span>Gross Tax</span>
                      <span className="font-semibold">{formatCurrency(calculation.gross_tax)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <span>PAYE Credit</span>
                      <span className="font-semibold text-emerald-600">- {formatCurrency(calculation.paye_credit)}</span>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Final Summary */}
                <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-slate-400 text-sm">Final Tax Liability</p>
                      <p className="text-3xl font-bold">{formatCurrency(calculation.final_tax_liability)}</p>
                    </div>
                    {calculation.final_tax_liability === 0 ? (
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle className="w-6 h-6" />
                        <span>No Tax Due</span>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-slate-400 text-sm">Status</p>
                        <p className="text-amber-400 font-medium">Amount Due</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-semibold">Disclaimer</p>
                      <p className="mt-1">This report is a preparation summary and must be submitted to Nigeria Revenue Service (FIRS) manually. Users are responsible for verifying all financial data before submission. TaxPilot NG does not file taxes on your behalf.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Tax Calculation Found</h3>
              <p className="text-slate-500 mb-4">Please run the tax calculator first to generate a report.</p>
            </CardContent>
          </Card>
        )}
      </SubscriptionGate>
    </div>
  );
}