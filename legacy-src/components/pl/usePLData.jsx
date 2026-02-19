import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';

const INCOME_CATEGORIES = ['salary', 'business_revenue', 'freelance_income', 'foreign_income', 'capital_gains', 'crypto_sale', 'other_income'];
const EXPENSE_CATEGORIES = ['rent', 'utilities', 'food', 'transportation', 'business_expenses', 'pension_contributions', 'nhf_contributions', 'insurance', 'transfers', 'crypto_purchase', 'miscellaneous'];

const CATEGORY_LABELS = {
  salary: 'Salary', business_revenue: 'Business Revenue', freelance_income: 'Freelance Income',
  foreign_income: 'Foreign Income', capital_gains: 'Capital Gains', crypto_sale: 'Crypto Sales',
  other_income: 'Other Income', rent: 'Rent', utilities: 'Utilities', food: 'Food & Dining',
  transportation: 'Transportation', business_expenses: 'Business Expenses',
  pension_contributions: 'Pension Contributions', nhf_contributions: 'NHF Contributions',
  insurance: 'Insurance', transfers: 'Transfers', crypto_purchase: 'Crypto Purchase', miscellaneous: 'Miscellaneous'
};

export const getCategoryLabel = (cat) => CATEGORY_LABELS[cat] || cat;

function getEffectiveAmount(tx) {
  const base = tx.naira_value || tx.amount || 0;
  if (tx.business_flag === 'mixed' && !tx.is_income) {
    return base * ((tx.deductible_percentage ?? 100) / 100);
  }
  return base;
}

function isBusinessTransaction(tx) {
  return tx.business_flag === 'business' || tx.business_flag === 'mixed';
}

export function usePLData(transactions, period, selectedDate) {
  return useMemo(() => {
    let filtered = transactions.filter(isBusinessTransaction);

    // Period filter
    if (period === 'monthly' && selectedDate) {
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      filtered = filtered.filter(tx => {
        if (!tx.date) return false;
        const d = new Date(tx.date);
        return d >= start && d <= end;
      });
    } else if (period === 'quarterly' && selectedDate) {
      const month = selectedDate.getMonth();
      const qStart = new Date(selectedDate.getFullYear(), Math.floor(month / 3) * 3, 1);
      const qEnd = new Date(selectedDate.getFullYear(), Math.floor(month / 3) * 3 + 3, 0);
      filtered = filtered.filter(tx => {
        if (!tx.date) return false;
        const d = new Date(tx.date);
        return d >= qStart && d <= qEnd;
      });
    }
    // annual = no extra filter

    // Income
    const incomeByCategory = {};
    filtered.filter(tx => tx.is_income).forEach(tx => {
      const cat = tx.category || 'other_income';
      incomeByCategory[cat] = (incomeByCategory[cat] || 0) + getEffectiveAmount(tx);
    });
    const totalBusinessIncome = Object.values(incomeByCategory).reduce((s, v) => s + v, 0);

    // Expenses
    const expenseByCategory = {};
    filtered.filter(tx => !tx.is_income).forEach(tx => {
      const cat = tx.category || 'miscellaneous';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + getEffectiveAmount(tx);
    });
    const totalBusinessExpenses = Object.values(expenseByCategory).reduce((s, v) => s + v, 0);

    const netProfit = totalBusinessIncome - totalBusinessExpenses;
    const isLoss = netProfit < 0;

    // Tax calculation (Nigerian progressive brackets)
    const EXEMPTION = 800000;
    const BRACKETS = [
      { max: 300000, rate: 0.07 },
      { max: 300000, rate: 0.11 },
      { max: 500000, rate: 0.15 },
      { max: 500000, rate: 0.19 },
      { max: 1600000, rate: 0.21 },
      { max: Infinity, rate: 0.24 },
    ];
    let taxableIncome = Math.max(0, netProfit - EXEMPTION);
    let estimatedTax = 0;
    let remaining = taxableIncome;
    for (const b of BRACKETS) {
      if (remaining <= 0) break;
      const slice = Math.min(remaining, b.max === Infinity ? remaining : b.max);
      estimatedTax += slice * b.rate;
      remaining -= slice;
    }
    estimatedTax = Math.max(0, estimatedTax);
    const netProfitAfterTax = netProfit - estimatedTax;

    // Monthly chart data (for current year)
    const year = selectedDate?.getFullYear() || new Date().getFullYear();
    const months = eachMonthOfInterval({ start: startOfYear(new Date(year, 0)), end: endOfYear(new Date(year, 0)) });
    const monthlyChart = months.map(m => {
      const label = format(m, 'MMM');
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const txMonth = transactions.filter(tx => {
        if (!tx.date || !isBusinessTransaction(tx)) return false;
        const d = new Date(tx.date);
        return d >= start && d <= end;
      });
      const inc = txMonth.filter(t => t.is_income).reduce((s, t) => s + getEffectiveAmount(t), 0);
      const exp = txMonth.filter(t => !t.is_income).reduce((s, t) => s + getEffectiveAmount(t), 0);
      return { month: label, income: inc, expenses: exp, profit: inc - exp };
    });

    return {
      incomeByCategory, totalBusinessIncome,
      expenseByCategory, totalBusinessExpenses,
      netProfit, isLoss,
      estimatedTax, netProfitAfterTax,
      monthlyChart,
      hasData: filtered.length > 0
    };
  }, [transactions, period, selectedDate]);
}