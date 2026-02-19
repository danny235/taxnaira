
'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wallet, TrendingUp, Receipt, Calculator, ArrowUpRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format } from 'date-fns'
import { useAuth } from '@/components/auth-provider'


// Components (assume these are ported/available in @/components/dashboard)
// You might need to adjust imports if you haven't fixed the files yet
import StatCard from '@/components/dashboard/StatCard'
import IncomeChart from '@/components/dashboard/IncomeChart'
import TaxBreakdownChart from '@/components/dashboard/TaxBreakdownChart'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import TaxSummaryCard from '@/components/dashboard/tax-summary-card'
import TaxSavingsPlanner from '@/components/dashboard/TaxSavingsPlanner'
import Disclaimer from '@/components/common/disclaimer' // Need to check if this exists

export default function Dashboard() {
    const currentYear = new Date().getFullYear()
    const { user } = useAuth()


    const { data: profile } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null
            const res = await fetch('/api/user/profile')
            if (!res.ok) return null
            return res.json()
        },
        enabled: !!user?.id,
    })

    // Mock data or fetch from Supabase
    const { data: transactions = [], isLoading: loadingTx } = useQuery({
        queryKey: ['transactions', user?.id],
        queryFn: async () => {
            if (!user?.id) return []
            const res = await fetch(`/api/user/transactions?year=${currentYear}&limit=100`)
            if (!res.ok) return []
            return res.json()
        },
        enabled: !!user?.id,
    })

    const { data: calculation } = useQuery({
        queryKey: ['taxCalculation', user?.id],
        queryFn: async () => {
            if (!user?.id) return null
            const res = await fetch(`/api/user/tax-calculation?year=${currentYear}`)
            if (!res.ok) return null
            return res.json()
        },
        enabled: !!user?.id,
    })

    const { data: settings } = useQuery({
        queryKey: ['taxSettings'],
        queryFn: async () => {
            const res = await fetch(`/api/user/tax-settings?year=${currentYear}`)
            if (!res.ok) return { exemption_threshold: 800000 }
            return res.json()
        },
    })

    // Calculations
    const totalIncome = transactions.filter((t: any) => t.is_income).reduce((sum: number, t: any) => sum + (t.naira_value || t.amount || 0), 0)
    const totalExpenses = transactions.filter((t: any) => !t.is_income).reduce((sum: number, t: any) => sum + (t.naira_value || t.amount || 0), 0)
    const foreignIncome = transactions.filter((t: any) => t.category === 'foreign_income').reduce((sum: number, t: any) => sum + (t.naira_value || t.amount || 0), 0)
    const capitalGains = transactions.filter((t: any) => t.category === 'capital_gains' || t.category === 'crypto_sale').reduce((sum: number, t: any) => sum + (t.naira_value || t.amount || 0), 0)

    // Monthly income data
    const monthlyData = React.useMemo(() => {
        const months: Record<string, number> = {}
        transactions.filter((t: any) => t.is_income).forEach((t: any) => {
            if (t.date) {
                const month = format(new Date(t.date), 'MMM')
                months[month] = (months[month] || 0) + (t.naira_value || t.amount || 0)
            }
        })
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return monthOrder.map((m) => ({ month: m, income: months[m] || 0 }))
    }, [transactions])

    // Income breakdown
    const incomeBreakdown = React.useMemo(() => {
        const cats: Record<string, number> = {}
        transactions.filter((t: any) => t.is_income).forEach((t: any) => {
            const cat = t.category || 'other_income'
            cats[cat] = (cats[cat] || 0) + (t.naira_value || t.amount || 0)
        })
        const labels: Record<string, string> = {
            salary: 'Salary',
            business_revenue: 'Business',
            freelance_income: 'Freelance',
            foreign_income: 'Foreign',
            capital_gains: 'Capital Gains',
            crypto_sale: 'Crypto',
            other_income: 'Other',
        }
        return Object.entries(cats).map(([key, value]) => ({ name: labels[key] || key, value }))
    }, [transactions])

    if (loadingTx) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Disclaimer />

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
                <Link href="/upload">
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                        <ArrowUpRight className="w-4 h-4 mr-2" />
                        Upload Statement
                    </Button>
                </Link>
                <Link href="/calculator">
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
                    subtitle={`${transactions.filter((t: any) => !t.is_income).length} transactions`}
                    icon={Receipt}
                />
                <StatCard
                    title="Foreign Income"
                    value={`₦${foreignIncome.toLocaleString()}`}
                    subtitle="Converted to Naira"
                    icon={TrendingUp} // Type error likely on icon prop in JS->TS conversion
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
                <TaxSavingsPlanner
                    transactions={transactions}
                    calculation={calculation}
                    employmentType={profile?.employment_type}
                />
            </div>
        </div>
    )
}
