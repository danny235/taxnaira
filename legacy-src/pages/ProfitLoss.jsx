import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Loader2, Download, FileText } from 'lucide-react';
import { usePLData } from '@/components/pl/usePLData';
import PLStatement from '@/components/pl/PLStatement';
import PLChart from '@/components/pl/PLChart';
import PLTransactionEditor from '@/components/pl/PLTransactionEditor';
import { format } from 'date-fns';
import { toast } from 'sonner';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const QUARTERS = ['Q1 (Jan–Mar)','Q2 (Apr–Jun)','Q3 (Jul–Sep)','Q4 (Oct–Dec)'];
const YEARS = [2024, 2025, 2026];

export default function ProfitLoss() {
  const [period, setPeriod] = useState('annual');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions_pl', user?.id, selectedYear],
    queryFn: () => base44.entities.Transaction.filter({ user_id: user?.id, tax_year: selectedYear }, '-date', 5000),
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

  const exportPDF = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profit & Loss</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Business financial summary based on categorized transactions</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1.5" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileText className="w-4 h-4 mr-1.5" />
            PDF
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

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Business Income', value: plData.totalBusinessIncome, color: 'text-emerald-600' },
          { label: 'Business Expenses', value: plData.totalBusinessExpenses, color: 'text-red-500' },
          { label: 'Net Profit Before Tax', value: plData.netProfit, color: plData.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600' },
          { label: 'Estimated Tax', value: plData.estimatedTax, color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="bg-white dark:bg-slate-800 border-0 shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color} tabular-nums`}>
              {value < 0 ? '-' : ''}₦{Math.abs(value).toLocaleString()}
            </p>
          </Card>
        ))}
      </div>

      {/* Chart + Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PLStatement data={plData} periodLabel={periodLabel} />
        <PLChart data={plData.monthlyChart} />
      </div>

      {/* Transaction Editor */}
      <PLTransactionEditor transactions={transactions} onUpdate={handleUpdate} />
    </div>
  );
}