'use client'

import React, { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Briefcase, User, Repeat, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CategorySummaryProps {
    transactions: any[]
}

const mainCategoryIcons: Record<string, any> = {
    Business: Briefcase,
    Personal: User,
    Mixed: Repeat
}

const mainCategoryColors: Record<string, string> = {
    Business: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-blue-100',
    Personal: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 shadow-emerald-100',
    Mixed: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 shadow-purple-100'
}

export default function CategorySummary({ transactions }: CategorySummaryProps) {
    const summary = useMemo(() => {
        const groups: Record<string, { total: number, subs: Record<string, number> }> = {
            Business: { total: 0, subs: {} },
            Personal: { total: 0, subs: {} },
            Mixed: { total: 0, subs: {} }
        }

        transactions.forEach(tx => {
            const main = tx.main_category || 'Mixed'
            const sub = tx.sub_category || 'other'
            const amount = Number(tx.naira_value || tx.amount || 0)

            if (!groups[main]) {
                groups[main] = { total: 0, subs: {} }
            }

            groups[main].total += amount
            groups[main].subs[sub] = (groups[main].subs[sub] || 0) + amount
        })

        return groups
    }, [transactions])

    const totalAll = Object.values(summary).reduce((sum, g) => sum + g.total, 0)

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(summary).map(([name, data]) => {
                const Icon = mainCategoryIcons[name] || Repeat
                const percentage = totalAll > 0 ? (data.total / totalAll) * 100 : 0

                return (
                    <Card key={name} className="border-0 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-110", mainCategoryColors[name])}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5">
                                    {percentage.toFixed(0)}% of total
                                </Badge>
                            </div>
                            <CardTitle className="text-sm font-medium text-slate-500 mt-4 uppercase tracking-wider">{name}</CardTitle>
                            <div className="text-2xl font-bold mt-1">₦{data.total.toLocaleString()}</div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <Progress value={percentage} className="h-1.5" />
                            
                            <div className="space-y-3 mt-6">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sub-categories</p>
                                {Object.entries(data.subs).length > 0 ? (
                                    Object.entries(data.subs)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([sub, amount]) => (
                                            <div key={sub} className="flex items-center justify-between group/item">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-slate-300 group-hover/item:bg-emerald-400 transition-colors" />
                                                    <span className="text-xs text-slate-600 dark:text-slate-400 capitalize">{sub}</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-900 dark:text-white group-hover/item:text-emerald-500 transition-colors">
                                                    ₦{amount.toLocaleString()}
                                                </span>
                                            </div>
                                        ))
                                ) : (
                                    <p className="text-xs text-slate-400 italic">No sub-categories</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
