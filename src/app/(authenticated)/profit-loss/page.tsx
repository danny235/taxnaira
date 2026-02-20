"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, FileText, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { usePLData } from '@/hooks/use-pl-data';
import PLStatement from '@/components/pl/pl-statement';
import PLChart from '@/components/pl/pl-chart';
import PLTransactionEditor from '@/components/pl/pl-transaction-editor';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const QUARTERS = ['Q1 (Jan–Mar)', 'Q2 (Apr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Oct–Dec)'];
const YEARS = [2024, 2025, 2026];

export default function ProfitLossPage() {
    const { user, isLoading: authLoading } = useAuth();
    const queryClient = useQueryClient();

    const [period, setPeriod] = useState('annual');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3));
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const { data: transactions = [], isLoading } = useQuery({
        queryKey: ['transactions_pl', user?.id, selectedYear],
        queryFn: async () => {
            const res = await fetch(`/api/user/transactions?year=${selectedYear}&limit=5000`);
            if (!res.ok) throw new Error('Failed to fetch transactions');
            return res.json();
        },
        enabled: !!user?.id,
        staleTime: 30000
    });

    const selectedDate = period === 'monthly'
        ? new Date(selectedYear, selectedMonth, 1)
        : period === 'quarterly'
            ? new Date(selectedYear, selectedQuarter * 3, 1)
            : new Date(selectedYear, 0, 1);

    const plData = usePLData(transactions, period, selectedDate);

    const handleUpdate = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['transactions_pl', user?.id, selectedYear] });
    }, [queryClient, user?.id, selectedYear]);

    const periodLabel = period === 'monthly'
        ? `${MONTHS[selectedMonth]} ${selectedYear}`
        : period === 'quarterly'
            ? `${QUARTERS[selectedQuarter]} ${selectedYear}`
            : `Full Year ${selectedYear}`;

    const exportCSV = () => {
        if (!plData.hasData) {
            toast.error("No data to export");
            return;
        }
        const rows = [
            ['Category', 'Type', 'Amount (₦)'],
            ...Object.entries(plData.incomeByCategory).map(([k, v]) => [k, 'Income', v]),
            ['TOTAL BUSINESS INCOME', '', plData.totalBusinessIncome],
            ...Object.entries(plData.expenseByCategory).map(([k, v]) => [k, 'Expense', v]),
            ['TOTAL BUSINESS EXPENSES', '', plData.totalBusinessExpenses],
            ['NET PROFIT BEFORE TAX', '', plData.netProfit],
            ['ESTIMATED TAX', '', plData.estimatedTax],
            ['NET PROFIT AFTER TAX', '', plData.netProfitAfterTax],
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PL_${periodLabel.replace(/ /g, '_')}.csv`;
        a.click();
        toast.success('CSV exported');
    };

    if (isLoading || authLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profit & Loss</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Track your business performance and net income.</p>
                </div>
                <div className="flex gap-2 print:hidden">
                    <Button variant="outline" size="sm" onClick={exportCSV}>
                        <Download className="w-4 h-4 mr-1.5" />
                        Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                        <FileText className="w-4 h-4 mr-1.5" />
                        Print PDF
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 print:hidden">
                <Tabs value={period} onValueChange={setPeriod}>
                    <TabsList>
                        <TabsTrigger value="monthly">Monthly</TabsTrigger>
                        <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
                        <TabsTrigger value="annual">Annual</TabsTrigger>
                    </TabsList>
                </Tabs>

                {period === 'monthly' && (
                    <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
                        <SelectTrigger className="w-36 h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}

                {period === 'quarterly' && (
                    <Select value={String(selectedQuarter)} onValueChange={v => setSelectedQuarter(Number(v))}>
                        <SelectTrigger className="w-44 h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {QUARTERS.map((q, i) => <SelectItem key={i} value={String(i)}>{q}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}

                <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-24 h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* Summary Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm p-4">
                    <div className="flex items-center justify-between pb-2">
                        <p className="text-xs text-slate-500">Business Income</p>
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-xl font-bold text-emerald-600">₦{plData.totalBusinessIncome.toLocaleString()}</p>
                </Card>
                <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm p-4">
                    <div className="flex items-center justify-between pb-2">
                        <p className="text-xs text-slate-500">Business Expenses</p>
                        <ArrowDownRight className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-xl font-bold text-red-500">₦{plData.totalBusinessExpenses.toLocaleString()}</p>
                </Card>
                <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm p-4">
                    <div className="flex items-center justify-between pb-2">
                        <p className="text-xs text-slate-500">Net Profit (Pre-tax)</p>
                        <TrendingUp className={plData.isLoss ? "w-4 h-4 text-red-500" : "w-4 h-4 text-emerald-500"} />
                    </div>
                    <p className={`text-xl font-bold ${plData.isLoss ? 'text-red-600' : 'text-emerald-700'}`}>
                        {plData.isLoss ? '-' : ''}₦{Math.abs(plData.netProfit).toLocaleString()}
                    </p>
                </Card>
                <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm p-4">
                    <div className="flex items-center justify-between pb-2">
                        <p className="text-xs text-slate-500">Estimated Tax</p>
                    </div>
                    <p className="text-xl font-bold text-amber-600">₦{plData.estimatedTax.toLocaleString()}</p>
                </Card>
            </div>

            {/* Chart + Statement */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PLStatement data={plData} periodLabel={periodLabel} />
                <PLChart data={plData.monthlyChart} />
            </div>

            {/* Transaction Reclassification Editor */}
            <PLTransactionEditor transactions={transactions} onUpdate={handleUpdate} />
        </div>
    );
}
