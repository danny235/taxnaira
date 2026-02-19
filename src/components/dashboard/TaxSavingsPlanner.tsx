
import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { PiggyBank, Info, Bell, BellOff, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

// Nigerian progressive tax brackets — same as existing tax engine
const EXEMPTION = 800000
const BRACKETS = [
  { max: 300000, rate: 0.07 },
  { max: 300000, rate: 0.11 },
  { max: 500000, rate: 0.15 },
  { max: 500000, rate: 0.19 },
  { max: 1600000, rate: 0.21 },
  { max: Infinity, rate: 0.24 },
]

function computeTax(taxableIncome: number) {
  let tax = 0
  let remaining = Math.max(0, taxableIncome - EXEMPTION)
  for (const b of BRACKETS) {
    if (remaining <= 0) break
    const slice = b.max === Infinity ? remaining : Math.min(remaining, b.max)
    tax += slice * b.rate
    remaining -= slice
  }
  return Math.max(0, tax)
}

const fmt = (n: number) => `₦${Math.max(0, n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer flex-shrink-0" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function Row({
  label,
  value,
  valueClass = 'text-slate-800 dark:text-slate-200',
  tip,
  bold,
}: {
  label: string
  value: string | number
  valueClass?: string
  tip?: string
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-1.5">
        <span
          className={`text-sm ${bold ? 'font-semibold text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'
            }`}
        >
          {label}
        </span>
        {tip && <InfoTip text={tip} />}
      </div>
      <span className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  )
}

interface TaxSavingsPlannerProps {
  transactions?: any[]
  calculation?: any
  employmentType?: string
}

export default function TaxSavingsPlanner({
  transactions = [],
  calculation,
  employmentType,
}: TaxSavingsPlannerProps) {
  const [taxPaid, setTaxPaid] = useState('')
  const [useProjected, setUseProjected] = useState(false)
  const [reminderEnabled, setReminderEnabled] = useState(false)

  const now = new Date()
  const currentMonth = now.getMonth() + 1 // 1–12
  const remainingMonths = 12 - currentMonth + 1
  const monthsElapsed = Math.max(1, currentMonth - 1)

  const estimates = useMemo(() => {
    const taxPaidNum = Math.max(0, Number(taxPaid) || 0)

    // Total income so far from transactions
    const totalIncome = transactions
      .filter((t) => t.is_income)
      .reduce((s, t) => s + (t.naira_value || t.amount || 0), 0)

    const pension = transactions
      .filter((t) => t.category === 'pension_contributions')
      .reduce((s, t) => s + (t.naira_value || t.amount || 0), 0)
    const nhf = transactions
      .filter((t) => t.category === 'nhf_contributions')
      .reduce((s, t) => s + (t.naira_value || t.amount || 0), 0)

    // For self-employed/business owners: deduct allowable business expenses from income
    const businessExpenses =
      employmentType === 'self_employed' || employmentType === 'business_owner'
        ? transactions
          .filter(
            (t) =>
              !t.is_income &&
              (t.business_flag === 'business' || t.business_flag === 'mixed') &&
              t.deductible_flag
          )
          .reduce((s, t) => {
            const base = t.naira_value || t.amount || 0
            const pct = t.business_flag === 'mixed' ? (t.deductible_percentage ?? 100) / 100 : 1
            return s + base * pct
          }, 0)
        : 0

    const taxableBase = Math.max(0, totalIncome - businessExpenses - pension - nhf)

    // Use saved calculation if available, else compute from transactions
    let annualTax = calculation?.final_tax_liability ?? computeTax(taxableBase)

    if (useProjected) {
      // Project annual income from monthly average so far
      const avgMonthly = totalIncome / monthsElapsed
      const projectedAnnual = avgMonthly * 12
      const projectedBase = Math.max(0, projectedAnnual - businessExpenses - pension - nhf)
      annualTax = computeTax(projectedBase)
    }

    const remainingTax = Math.max(0, annualTax - taxPaidNum)
    const monthlyReserve = remainingMonths > 0 ? remainingTax / remainingMonths : 0
    const projectedBalance = annualTax - taxPaidNum - monthlyReserve * remainingMonths // should be ~0

    return { annualTax, remainingTax, monthlyReserve, projectedBalance, totalIncome }
  }, [transactions, calculation, taxPaid, useProjected, monthsElapsed, remainingMonths, employmentType])

  const noTaxDue = estimates.remainingTax === 0

  const handleReminderToggle = (val: boolean) => {
    setReminderEnabled(val)
    if (val) {
      toast.info(`Reminder set: "Set aside ${fmt(estimates.monthlyReserve)} for tax this month."`, { duration: 5000 })
    }
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-emerald-500" />
          Tax Savings Planner
        </CardTitle>
        <p className="text-xs text-slate-400 mt-0.5">
          How much to set aside monthly to cover your {now.getFullYear()} tax bill.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input: Tax paid to date */}
        <div>
          <Label htmlFor="taxPaid" className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
            Tax Already Paid to Date (₦) — optional
          </Label>
          <Input
            id="taxPaid"
            type="number"
            min={0}
            placeholder="e.g. 150000"
            value={taxPaid}
            onChange={(e) => setTaxPaid(e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        {/* Toggle: Projected income */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Recalculate using projected income</p>
              <p className="text-xs text-slate-400">Extrapolates your monthly average to full year</p>
            </div>
          </div>
          <Switch checked={useProjected} onCheckedChange={setUseProjected} />
        </div>

        <Separator />

        {/* Results */}
        {noTaxDue ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              You have no outstanding estimated tax liability.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            <Row
              label="Estimated Annual Tax"
              value={fmt(estimates.annualTax)}
              tip="Calculated using Nigerian progressive income tax brackets with ₦800,000 consolidated relief allowance."
            />
            <Row label="Tax Paid to Date" value={fmt(Number(taxPaid) || 0)} valueClass="text-emerald-600" />
            <Row
              label="Remaining Estimated Tax"
              value={fmt(estimates.remainingTax)}
              tip="Estimated Annual Tax minus Tax Paid to Date."
              valueClass="text-amber-600"
            />
            <Row
              label={`Months Remaining (${now.toLocaleString('default', { month: 'short' })}–Dec)`}
              value={remainingMonths}
              valueClass="text-slate-600 dark:text-slate-400"
            />
            <Separator className="my-2" />
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Monthly Tax Reserve</span>
                <InfoTip text="Remaining tax divided by months left in the year. Set this aside each month to avoid a year-end shortfall." />
              </div>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                {fmt(estimates.monthlyReserve)}
              </span>
            </div>
          </div>
        )}

        {/* Monthly Reminder */}
        {!noTaxDue && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              {reminderEnabled ? (
                <Bell className="w-4 h-4 text-emerald-500" />
              ) : (
                <BellOff className="w-4 h-4 text-slate-400" />
              )}
              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Monthly Reminder</p>
                <p className="text-xs text-slate-400">Informational only — no payment initiated</p>
              </div>
            </div>
            <Switch checked={reminderEnabled} onCheckedChange={handleReminderToggle} />
          </div>
        )}

        {/* Alert if high tax */}
        {estimates.annualTax > 0 && estimates.monthlyReserve > 200000 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Your monthly reserve is significant. Consider spreading payments evenly or consulting a tax advisor.
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-slate-400 dark:text-slate-500 pt-1 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3">
          This is an estimate based on recorded income and deductible expenses. Actual tax payable depends on official
          filing and tax authority assessment.
        </p>
      </CardContent>
    </Card>
  )
}