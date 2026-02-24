import { useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  startOfYear,
  endOfYear,
} from "date-fns";

export const CATEGORY_LABELS: Record<string, string> = {
  salary: "Salary",
  business_revenue: "Business Revenue",
  freelance_income: "Freelance Income",
  foreign_income: "Foreign Income",
  capital_gains: "Capital Gains",
  crypto_sale: "Crypto Sales",
  other_income: "Other Income",
  rent: "Rent",
  utilities: "Utilities",
  food: "Food & Dining",
  transportation: "Transportation",
  business_expenses: "Business Expenses",
  subscriptions: "Subscriptions",
  professional_fees: "Professional Fees",
  maintenance: "Maintenance",
  health: "Health",
  donations: "Donations",
  tax_payments: "Tax Payments",
  bank_charges: "Bank Charges",
  pension_contributions: "Pension Contributions",
  nhf_contributions: "NHF Contributions",
  insurance: "Insurance",
  transfers: "Transfers",
  crypto_purchase: "Crypto Purchase",
  personal_expense: "Personal Expense",
  miscellaneous: "Miscellaneous",
};

export const getCategoryLabel = (cat: string) => CATEGORY_LABELS[cat] || cat;

function getEffectiveAmount(tx: any) {
  const base = tx.naira_value || tx.amount || 0;
  if (tx.business_flag === "mixed" && !tx.is_income) {
    return base * ((tx.deductible_percentage ?? 100) / 100);
  }
  return base;
}

function shouldIncludeInPL(tx: any) {
  // Include all transactions UNLESS explicitly flagged as 'personal'
  // Unset business_flag → included by default (most users won't flag manually)
  return tx.business_flag !== "personal";
}

export function usePLData(
  transactions: any[],
  period: string,
  selectedDate: Date,
) {
  return useMemo(() => {
    let filtered = transactions.filter(shouldIncludeInPL);

    // Period filter
    if (period === "monthly" && selectedDate) {
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      filtered = filtered.filter((tx) => {
        if (!tx.date) return false;
        const d = new Date(tx.date);
        return d >= start && d <= end;
      });
    } else if (period === "quarterly" && selectedDate) {
      const month = selectedDate.getMonth();
      const qStart = new Date(
        selectedDate.getFullYear(),
        Math.floor(month / 3) * 3,
        1,
      );
      const qEnd = new Date(
        selectedDate.getFullYear(),
        Math.floor(month / 3) * 3 + 3,
        0,
      );
      filtered = filtered.filter((tx) => {
        if (!tx.date) return false;
        const d = new Date(tx.date);
        return d >= qStart && d <= qEnd;
      });
    }

    // Income
    const incomeByCategory: Record<string, number> = {};
    filtered
      .filter((tx) => tx.is_income)
      .forEach((tx) => {
        const cat = tx.category || "other_income";
        incomeByCategory[cat] =
          (incomeByCategory[cat] || 0) + getEffectiveAmount(tx);
      });
    const totalBusinessIncome = Object.values(incomeByCategory).reduce(
      (s, v) => s + v,
      0,
    );

    // Expenses
    const expenseByCategory: Record<string, number> = {};
    filtered
      .filter((tx) => !tx.is_income)
      .forEach((tx) => {
        const cat = tx.category || "miscellaneous";
        expenseByCategory[cat] =
          (expenseByCategory[cat] || 0) + getEffectiveAmount(tx);
      });
    const totalBusinessExpenses = Object.values(expenseByCategory).reduce(
      (s, v) => s + v,
      0,
    );

    const netProfit = totalBusinessIncome - totalBusinessExpenses;
    const isLoss = netProfit < 0;

    // Tax calculation (Nigerian progressive brackets - 2024 onwards)
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
    const months = eachMonthOfInterval({
      start: startOfYear(new Date(year, 0)),
      end: endOfYear(new Date(year, 0)),
    });
    const monthlyChart = months.map((m) => {
      const label = format(m, "MMM");
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const txMonth = transactions.filter((tx) => {
        if (!tx.date || !shouldIncludeInPL(tx)) return false;
        const d = new Date(tx.date);
        return d >= mStart && d <= mEnd;
      });
      const inc = txMonth
        .filter((t) => t.is_income)
        .reduce((s, t) => s + getEffectiveAmount(t), 0);
      const exp = txMonth
        .filter((t) => !t.is_income)
        .reduce((s, t) => s + getEffectiveAmount(t), 0);
      return { month: label, income: inc, expenses: exp, profit: inc - exp };
    });

    return {
      incomeByCategory,
      totalBusinessIncome,
      expenseByCategory,
      totalBusinessExpenses,
      netProfit,
      isLoss,
      estimatedTax,
      netProfitAfterTax,
      monthlyChart,
      hasData: filtered.length > 0,
    };
  }, [transactions, period, selectedDate]);
}
