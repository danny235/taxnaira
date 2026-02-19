
'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Crown, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tax Reports</h1>
                    <p className="text-slate-500 dark:text-slate-400">Generate and download your official tax documents.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full text-xs font-medium border border-amber-200 dark:border-amber-800">
                    <Crown className="w-3 h-3" />
                    Premium Feature
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="relative overflow-hidden group border-amber-200/50 dark:border-amber-900/30">
                    <CardHeader>
                        <FileText className="w-8 h-8 text-emerald-500 mb-2" />
                        <CardTitle>Income Summary</CardTitle>
                        <CardDescription>Detailed breakdown of your income by source and month.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full" disabled>
                            <Download className="w-4 h-4 mr-2" />
                            Generate PDF
                        </Button>
                    </CardContent>
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <span className="text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950 px-2 py-1 rounded border border-amber-300 dark:border-amber-700">Premium Only</span>
                    </div>
                </Card>

                <Card className="relative overflow-hidden group border-amber-200/50 dark:border-amber-900/30">
                    <CardHeader>
                        <FileText className="w-8 h-8 text-blue-500 mb-2" />
                        <CardTitle>Tax Computation</CardTitle>
                        <CardDescription>Official tax liability computation based on current laws.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full" disabled>
                            <Download className="w-4 h-4 mr-2" />
                            Generate PDF
                        </Button>
                    </CardContent>
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <span className="text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950 px-2 py-1 rounded border border-amber-300 dark:border-amber-700">Premium Only</span>
                    </div>
                </Card>

                <Card className="relative overflow-hidden group border-amber-200/50 dark:border-amber-900/30">
                    <CardHeader>
                        <FileText className="w-8 h-8 text-purple-500 mb-2" />
                        <CardTitle>Expense Audit</CardTitle>
                        <CardDescription>Validated expenses summary for tax deduction claims.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full" disabled>
                            <Download className="w-4 h-4 mr-2" />
                            Generate PDF
                        </Button>
                    </CardContent>
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <span className="text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950 px-2 py-1 rounded border border-amber-300 dark:border-amber-700">Premium Only</span>
                    </div>
                </Card>
            </div>

            <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-none">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-6 h-6" />
                        <span className="text-emerald-100 font-bold uppercase tracking-widest text-xs">Recommended</span>
                    </div>
                    <CardTitle className="text-2xl">Upgrade to Premium</CardTitle>
                    <CardDescription className="text-emerald-100 text-lg">
                        Get unlimited access to expert tax reports and 1-on-1 filing support.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/subscription">
                        <Button className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold">
                            View Pricing Plans
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    )
}

import Link from 'next/link'
