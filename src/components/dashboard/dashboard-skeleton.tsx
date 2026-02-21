
import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Disclaimer placeholder */}
            <Skeleton className="h-12 w-full" />

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-6 bg-white dark:bg-slate-800 rounded-xl border-0 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-32" />
                                <Skeleton className="h-3 w-40" />
                            </div>
                            <Skeleton className="h-11 w-11 rounded-xl" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Tax Summary & Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm space-y-4">
                        <Skeleton className="h-6 w-32" />
                        <div className="space-y-3">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-2">
                    <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                        <div className="flex justify-between mb-4">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-6 w-24" />
                        </div>
                        <Skeleton className="h-64 w-full" />
                    </div>
                </div>
            </div>

            {/* Breakdown & Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                    <Skeleton className="h-6 w-48 mb-6" />
                    <div className="flex justify-center">
                        <Skeleton className="h-64 w-64 rounded-full" />
                    </div>
                </div>
                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                    <div className="flex justify-between mb-4">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-6 w-20" />
                    </div>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </div>
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
