import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calculator, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function TaxCalculator({ userId, transactions = [], taxBrackets = [], settings, employmentType, onCalculate }) {
  const [payeCredit, setPayeCredit] = useState(0);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(null);

  // Employment-type-aware taxable income label
  const taxableIncomeLabel = {
    salary_earner: 'Gross Salary minus Deductions',
    self_employed: 'Net Profit (Income − Business Expenses)',
    business_owner: 'Net Profit (Income − Business Expenses)',
    remote_worker: 'Total Income (all sources)',
  }[employmentType] || 'Taxable Income';

  const calculateTax = async () => {
    setCalculating(true);
    
    const incomeTransactions = transactions.filter(t => t.is_income);
    const expenseTransactions = transactions.filter(t => !t.is_income);
    
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + (t.naira_value || t.amount || 0), 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + (t.naira_value || t.amount || 0), 0);
    
    const capitalGains = transactions
      .filter(t => t.category === 'capital_gains' || t.category === 'crypto_sale')
      .reduce((sum, t) => sum + (t.naira_value || t.amount || 0), 0);
    
    const foreignIncome = transactions
      .filter(t => t.category === 'foreign_income')
      .reduce((sum, t) => sum + (t.naira_value || t.amount || 0), 0);
    
    const pensionDeduction = transactions
      .filter(t => t.category === 'pension_contributions')
      .reduce((sum, t) => sum + (t.naira_value || t.amount || 0), 0);
    
    const nhfDeduction = transactions
      .filter(t => t.category === 'nhf_contributions')
      .reduce((sum, t) => sum + (t.naira_value || t.amount || 0), 0);

    // Business expenses (for self-employed / business owners) — only deductible ones
    const businessExpenses = expenseTransactions
      .filter(t => (t.business_flag === 'business' || t.business_flag === 'mixed') && t.deductible_flag)
      .reduce((sum, t) => {
        const base = t.naira_value || t.amount || 0;
        const pct = t.business_flag === 'mixed' ? (t.deductible_percentage ?? 100) / 100 : 1;
        return sum + base * pct;
      }, 0);

    const exemptionThreshold = settings?.exemption_threshold || 800000;

    // Employment-type-aware taxable income
    let taxableIncome;
    if (employmentType === 'self_employed' || employmentType === 'business_owner') {
      // Net profit: income minus allowable business expenses, then minus statutory deductions
      const netProfit = Math.max(0, totalIncome - businessExpenses);
      taxableIncome = Math.max(0, netProfit - pensionDeduction - nhfDeduction);
    } else if (employmentType === 'salary_earner') {
      // Gross salary minus pension, NHF, and CRA (exemption applied below)
      taxableIncome = Math.max(0, totalIncome - pensionDeduction - nhfDeduction);
    } else {
      // remote_worker: all income taxable, no expense deductions
      taxableIncome = Math.max(0, totalIncome - pensionDeduction - nhfDeduction);
    }

    let grossTax = 0;
    let taxBreakdown = [];

    if (taxableIncome > exemptionThreshold) {
      const sortedBrackets = [...taxBrackets].sort((a, b) => a.min_amount - b.min_amount);
      let remainingIncome = taxableIncome;

      for (const bracket of sortedBrackets) {
        if (remainingIncome <= 0) break;
        
        const bracketMax = bracket.max_amount === -1 ? Infinity : bracket.max_amount;
        const bracketRange = bracketMax - bracket.min_amount;
        const amountInBracket = Math.min(remainingIncome, bracketRange);
        const taxForBracket = amountInBracket * (bracket.rate / 100);

        if (amountInBracket > 0) {
          taxBreakdown.push({
            bracket: `₦${bracket.min_amount.toLocaleString()} - ${bracket.max_amount === -1 ? '∞' : '₦' + bracket.max_amount.toLocaleString()}`,
            rate: bracket.rate,
            amount: amountInBracket,
            tax: taxForBracket
          });
          grossTax += taxForBracket;
        }

        remainingIncome -= amountInBracket;
      }
    }

    const finalTaxLiability = Math.max(0, grossTax - payeCredit);

    const calculationData = {
      user_id: userId,
      tax_year: new Date().getFullYear(),
      total_income: totalIncome,
      total_expenses: totalExpenses,
      taxable_income: taxableIncome,
      pension_deduction: pensionDeduction,
      nhf_deduction: nhfDeduction,
      other_deductions: 0,
      capital_gains: capitalGains,
      foreign_income: foreignIncome,
      paye_credit: payeCredit,
      gross_tax: grossTax,
      final_tax_liability: finalTaxLiability,
      tax_breakdown: taxBreakdown,
      status: 'draft'
    };

    const existingCalcs = await base44.entities.TaxCalculation.filter({ 
      user_id: userId, 
      tax_year: new Date().getFullYear() 
    });
    
    let savedCalc;
    if (existingCalcs.length > 0) {
      savedCalc = await base44.entities.TaxCalculation.update(existingCalcs[0].id, calculationData);
    } else {
      savedCalc = await base44.entities.TaxCalculation.create(calculationData);
    }

    setResult(calculationData);
    setCalculating(false);
    
    if (onCalculate) onCalculate(calculationData);
  };

  const formatCurrency = (amount) => `₦${(amount || 0).toLocaleString()}`;

  return (
    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-500" />
          Tax Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="paye" className="text-sm font-medium">PAYE Already Paid (₦)</Label>
            <Input
              id="paye"
              type="number"
              value={payeCredit}
              onChange={(e) => setPayeCredit(Number(e.target.value) || 0)}
              placeholder="Enter total PAYE paid this year"
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">Enter the total PAYE deducted from your salary this year</p>
          </div>

          <Button 
            onClick={calculateTax} 
            disabled={calculating}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {calculating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4 mr-2" />
                Calculate Tax
              </>
            )}
          </Button>
        </div>

        {result && (
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Income</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(result.total_income)}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Expenses</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(result.total_expenses)}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Deductions</p>
                <p className="text-lg font-semibold text-emerald-600">{formatCurrency(result.pension_deduction + result.nhf_deduction)}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Taxable Income</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(result.taxable_income)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{taxableIncomeLabel}</p>
              </div>
            </div>

            {result.tax_breakdown?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Tax Breakdown by Bracket</p>
                {result.tax_breakdown.map((bracket, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-700/30 text-sm">
                    <div>
                      <span className="text-slate-600 dark:text-slate-400">{bracket.bracket}</span>
                      <span className="text-xs text-slate-400 ml-2">@ {bracket.rate}%</span>
                    </div>
                    <span className="font-medium">{formatCurrency(bracket.tax)}</span>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Gross Tax</span>
                <span className="font-semibold">{formatCurrency(result.gross_tax)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">PAYE Credit</span>
                <span className="font-semibold text-emerald-600">- {formatCurrency(result.paye_credit)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-slate-900 dark:text-white">Final Tax Liability</span>
                <span className={`text-xl font-bold ${result.final_tax_liability > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {formatCurrency(result.final_tax_liability)}
                </span>
              </div>
            </div>

            {result.final_tax_liability === 0 && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-emerald-700 dark:text-emerald-400 text-sm">No additional tax due!</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}