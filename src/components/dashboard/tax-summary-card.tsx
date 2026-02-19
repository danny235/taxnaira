"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface TaxSummaryCardProps {
    calculation: any;
    settings?: any;
}

export default function TaxSummaryCard({ calculation, settings }: TaxSummaryCardProps) {
    const exemptionThreshold = settings?.exemption_threshold || 800000;
    const totalIncome = calculation?.total_income || 0;
    const grossTax = Math.round(calculation?.gross_tax || 0);
    const payeCredit = Math.round(calculation?.paye_credit || 0);
    const finalLiability = Math.round(calculation?.final_tax_liability || 0);
    // Headline = what you still owe after PAYE; bottom grid = gross (before PAYE)
    const amountDue = finalLiability;

    const progressPercent = Math.min(100, (totalIncome / exemptionThreshold) * 100);
    const isExempt = totalIncome <= exemptionThreshold;

    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-0 shadow-xl overflow-hidden text-white">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-slate-400 text-sm font-medium">{new Date().getFullYear()} Tax Summary</p>
                        <p className="text-3xl font-bold text-white mt-1">
                            ₦{amountDue.toLocaleString()}
                        </p>
                        <p className="text-slate-400 text-xs mt-1">Estimated tax due</p>
                    </div>
                    <div className={`p-4 rounded-2xl ${isExempt ? 'bg-emerald-500/20' : amountDue > 0 ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                        {isExempt ? (
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        ) : amountDue > 0 ? (
                            <Clock className="w-8 h-8 text-amber-400" />
                        ) : (
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400">Income vs Exemption Threshold</span>
                            <span className="text-white font-medium">₦{totalIncome.toLocaleString()} / ₦{exemptionThreshold.toLocaleString()}</span>
                        </div>
                        <Progress value={progressPercent} className="h-2 bg-slate-700" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                        <div>
                            <p className="text-slate-400 text-xs">PAYE Paid</p>
                            <p className="text-white font-semibold">₦{payeCredit.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs">Gross Tax</p>
                            <p className="text-white font-semibold">₦{grossTax.toLocaleString()}</p>
                        </div>
                    </div>

                    {isExempt && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg mt-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400 text-sm">You&apos;re below the tax exemption threshold!</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
