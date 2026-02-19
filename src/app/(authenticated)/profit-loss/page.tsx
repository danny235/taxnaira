
'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function ProfitLossPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profit & Loss</h1>
                <p className="text-slate-500 dark:text-slate-400">Track your business performance and net income.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">₦0.00</div>
                        <p className="text-xs text-slate-500">Current Tax Year</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₦0.00</div>
                        <p className="text-xs text-slate-500">All income sources</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <ArrowDownRight className="w-4 h-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₦0.00</div>
                        <p className="text-xs text-slate-500">Tax deductible expenses</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="flex items-center justify-center h-64 border-dashed">
                <CardContent className="text-center py-10">
                    <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <CardTitle className="text-slate-400">No data available yet</CardTitle>
                    <CardDescription>Upload your bank statements to see your profit and loss breakdown.</CardDescription>
                </CardContent>
            </Card>
        </div>
    )
}
