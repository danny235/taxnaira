import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingUp, Receipt, Calculator, ArrowUpRight, Loader2 } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import IncomeChart from '@/components/dashboard/IncomeChart';
import TaxBreakdownChart from '@/components/dashboard/TaxBreakdownChart';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import TaxSummaryCard from '@/components/dashboard/TaxSummaryCard';
import TaxSavingsPlanner from '@/components/dashboard/TaxSavingsPlanner';
import Disclaimer from '@/components/common/Disclaimer';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

export default function Dashboard() {
  const currentYear = new Date().getFullYear();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
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
    queryFn: () => base44.entities.Transaction.filter({ user_id: user?.id, tax_year: currentYear }, '-date', 100),
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

  const { data: settings } = useQuery({
    queryKey: ['taxSettings'],
    queryFn: async () => {
      const s = await base44.entities.TaxSettings.filter({ tax_year: currentYear, is_active: true });
      return s[0] || { exemption_threshold: 800000 };
    }
  });

  const totalIncome = transactions.filter(t => t.is_income).reduce((sum, t) => sum + (t.naira_value || t.amount || 0), 0);
  const totalExpenses = transactions.filter(t => !t.is_income).reduce((sum, t) => sum + (t.naira_value || t.amount || 0), 0);
  const foreignIncome = transactions.filter(t => t.category === 'foreign_income').reduce((sum, t) => sum + (t.naira_value || t.amount || 0), 0);
  const capitalGains = transactions.filter(t => t.category === 'capital_gains' || t.category === 'crypto_sale').reduce((sum, t) => sum + (t.naira_value || t.amount || 0), 0);

  // Monthly income data
  const monthlyData = React.useMemo(() => {
    const months = {};
    transactions.filter(t => t.is_income).forEach(t => {
      if (t.date) {
        const month = format(new Date(t.date), 'MMM');
        months[month] = (months[month] || 0) + (t.naira_value || t.amount || 0);
      }
    });
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthOrder.map(m => ({ month: m, income: months[m] || 0 }));
  }, [transactions]);

  // Income breakdown
  const incomeBreakdown = React.useMemo(() => {
    const cats = {};
    transactions.filter(t => t.is_income).forEach(t => {
      const cat = t.category || 'other_income';
      cats[cat] = (cats[cat] || 0) + (t.naira_value || t.amount || 0);
    });
    const labels = {
      salary: 'Salary', business_revenue: 'Business', freelance_income: 'Freelance',
      foreign_income: 'Foreign', capital_gains: 'Capital Gains', crypto_sale: 'Crypto', other_income: 'Other'
    };
    return Object.entries(cats).map(([key, value]) => ({ name: labels[key] || key, value }));
  }, [transactions]);

  if (loadingTx) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Disclaimer />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to={createPageUrl('Upload')}>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Upload Statement
          </Button>
        </Link>
        <Link to={createPageUrl('TaxCalculator')}>
          <Button variant="outline">
            <Calculator className="w-4 h-4 mr-2" />
            Calculate Tax
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Income"
          value={`₦${totalIncome.toLocaleString()}`}
          subtitle={`${currentYear} tax year`}
          icon={Wallet}
        />
        <StatCard
          title="Total Expenses"
          value={`₦${totalExpenses.toLocaleString()}`}
          subtitle={`${transactions.filter(t => !t.is_income).length} transactions`}
          icon={Receipt}
        />
        <StatCard
          title="Foreign Income"
          value={`₦${foreignIncome.toLocaleString()}`}
          subtitle="Converted to Naira"
          icon={TrendingUp}
        />
        <StatCard
          title="Capital Gains"
          value={`₦${capitalGains.toLocaleString()}`}
          subtitle="Including crypto"
          icon={TrendingUp}
        />
      </div>

      {/* Tax Summary & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <TaxSummaryCard calculation={calculation} settings={settings} />
        </div>
        <div className="lg:col-span-2">
          <IncomeChart data={monthlyData} />
        </div>
      </div>

      {/* Breakdown & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaxBreakdownChart data={incomeBreakdown} />
        <RecentTransactions transactions={transactions} />
      </div>

      {/* Tax Savings Planner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaxSavingsPlanner transactions={transactions} calculation={calculation} employmentType={profile?.employment_type} />
      </div>
    </div>
  );
}