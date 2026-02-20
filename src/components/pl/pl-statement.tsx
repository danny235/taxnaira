import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import PLSummaryRow from './pl-summary-row';
import { getCategoryLabel } from '@/hooks/use-pl-data';

const fmt = (n: number) => `₦${Math.abs(n).toLocaleString()}`;

interface PLStatementProps {
    data: any;
    periodLabel: string;
}

export default function PLStatement({ data, periodLabel }: PLStatementProps) {
    const {
        incomeByCategory, totalBusinessIncome,
        expenseByCategory, totalBusinessExpenses,
        netProfit, isLoss,
        estimatedTax, netProfitAfterTax,
        hasData
    } = data;

    if (!hasData) {
        return (
            <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <AlertTriangle className="w-10 h-10 text-amber-400" />
                    <p className="text-slate-600 dark:text-slate-400 font-medium">No business activity recorded for this period.</p>
                    <p className="text-slate-400 dark:text-slate-500 text-sm">Mark transactions as "Business" in the Transactions page to populate this report.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    Profit & Loss Statement
                </CardTitle>
                <Badge variant="outline" className="text-slate-500 text-xs font-normal">{periodLabel}</Badge>
            </CardHeader>
            <CardContent className="space-y-1">

                {/* INCOME */}
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-2 pb-1">Business Income</p>
                {Object.entries(incomeByCategory).map(([cat, val]: [string, any]) => (
                    <PLSummaryRow key={cat} label={getCategoryLabel(cat)} value={val} variant="income" indent />
                ))}
                <Separator className="my-2" />
                <PLSummaryRow
                    label="Total Business Income"
                    value={totalBusinessIncome}
                    variant="total"
                    tooltip="Sum of all income transactions marked as Business"
                />

                {/* EXPENSES */}
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-4 pb-1">Business Expenses</p>
                {Object.entries(expenseByCategory).map(([cat, val]: [string, any]) => (
                    <PLSummaryRow key={cat} label={getCategoryLabel(cat)} value={val} variant="expense" indent />
                ))}
                <Separator className="my-2" />
                <PLSummaryRow
                    label="Total Deductible Expenses"
                    value={totalBusinessExpenses}
                    variant="total"
                    tooltip="Only business-related deductible expenses are included. Mixed expenses use the deductible percentage."
                />

                {/* NET */}
                <div className="pt-4 space-y-1">
                    <Separator />
                    <PLSummaryRow
                        label={isLoss ? 'Net Business Loss' : 'Net Profit Before Tax'}
                        value={netProfit}
                        variant="profit"
                        tooltip="Total Business Income minus Total Business Expenses"
                    />
                    {isLoss && (
                        <div className="flex items-center gap-2 p-3 mt-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                            <p className="text-sm text-red-600 dark:text-red-400">
                                Net Business Loss: <span className="font-bold">{fmt(netProfit)}</span>. Your expenses exceed income for this period.
                            </p>
                        </div>
                    )}

                    {!isLoss && (
                        <>
                            <PLSummaryRow
                                label="Estimated Tax"
                                value={estimatedTax}
                                variant="tax"
                                tooltip="Computed using Nigerian progressive income tax brackets with ₦800,000 consolidated relief allowance applied."
                            />
                            <Separator />
                            <PLSummaryRow
                                label="Net Profit After Tax"
                                value={netProfitAfterTax}
                                variant="profit"
                                tooltip="Net Profit Before Tax minus Estimated Tax liability"
                            />
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
