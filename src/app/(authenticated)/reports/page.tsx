'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/auth-provider'
import {
    generateIncomeSummaryPDF,
    generateTaxComputationPDF,
    generateExpenseAuditPDF
} from '@/lib/pdf-reports'
import { toast } from 'sonner'

export default function ReportsPage() {
    const { user } = useAuth()
    const currentYear = new Date().getFullYear()
    const [generating, setGenerating] = useState<string | null>(null)

    const { data: profile } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            const res = await fetch('/api/user/profile')
            if (!res.ok) return null
            return res.json()
        },
        enabled: !!user?.id,
    })

    const { data: transactions = [] } = useQuery({
        queryKey: ['transactions', user?.id],
        queryFn: async () => {
            const res = await fetch(`/api/user/transactions?year=${currentYear}&limit=1000`)
            if (!res.ok) return []
            return res.json()
        },
        enabled: !!user?.id,
    })

    const { data: calculation } = useQuery({
        queryKey: ['taxCalculation', user?.id],
        queryFn: async () => {
            const res = await fetch(`/api/user/tax-calculation?year=${currentYear}`)
            if (!res.ok) return null
            return res.json()
        },
        enabled: !!user?.id,
    })

    const handleGenerate = async (type: 'income' | 'tax' | 'expense') => {
        if (!user) {
            toast.error("Please login to generate reports")
            return
        }

        setGenerating(type)
        try {
            const commonData = {
                title: '',
                userName: profile?.full_name || user.email || 'User',
                taxYear: currentYear,
                transactions,
            }

            if (type === 'income') {
                generateIncomeSummaryPDF({ ...commonData, title: 'Income Summary' })
            } else if (type === 'tax') {
                if (!calculation) {
                    toast.error("Please calculate your tax first in the Tax Calculator section")
                    setGenerating(null)
                    return
                }
                generateTaxComputationPDF({ ...commonData, calculation })
            } else if (type === 'expense') {
                generateExpenseAuditPDF({ ...commonData, title: 'Expense Audit' })
            }
            toast.success("Report generated successfully")
        } catch (error) {
            console.error("Report generation failed", error)
            toast.error("Failed to generate report")
        } finally {
            setGenerating(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tax Reports</h1>
                    <p className="text-slate-500 dark:text-slate-400">Generate and download your official tax documents.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Income Summary */}
                <Card className="relative overflow-hidden group border-slate-200 dark:border-slate-800">
                    <CardHeader>
                        <FileText className="w-8 h-8 text-emerald-500 mb-2" />
                        <CardTitle>Income Summary</CardTitle>
                        <CardDescription>Detailed breakdown of your income by source and month.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleGenerate('income')}
                            disabled={generating !== null}
                        >
                            {generating === 'income' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4 mr-2" />
                            )}
                            Generate PDF
                        </Button>
                    </CardContent>
                </Card>

                {/* Tax Computation */}
                <Card className="relative overflow-hidden group border-slate-200 dark:border-slate-800">
                    <CardHeader>
                        <FileText className="w-8 h-8 text-blue-500 mb-2" />
                        <CardTitle>Tax Computation</CardTitle>
                        <CardDescription>Official tax liability computation based on current laws.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleGenerate('tax')}
                            disabled={generating !== null}
                        >
                            {generating === 'tax' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4 mr-2" />
                            )}
                            Generate PDF
                        </Button>
                    </CardContent>
                </Card>

                {/* Expense Audit */}
                <Card className="relative overflow-hidden group border-slate-200 dark:border-slate-800">
                    <CardHeader>
                        <FileText className="w-8 h-8 text-purple-500 mb-2" />
                        <CardTitle>Expense Audit</CardTitle>
                        <CardDescription>Validated expenses summary for tax deduction claims.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleGenerate('expense')}
                            disabled={generating !== null}
                        >
                            {generating === 'expense' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4 mr-2" />
                            )}
                            Generate PDF
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
