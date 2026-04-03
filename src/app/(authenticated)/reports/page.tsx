'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/components/auth-provider'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, BarChart3, Zap, Brain, Sparkles, MessageSquare, Download, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'



import TransactionAssistant from '@/components/transactions/transaction-assistant'
import { cn } from '@/lib/utils'

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#f43f5e', '#84cc16'];

export default function ReportsPage() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    const currentYear = new Date().getFullYear()
    const [reportType, setReportType] = useState<'Business' | 'Personal'>('Business')
    const [selectedYear, setSelectedYear] = useState(currentYear)
    const [aiEnabled, setAiEnabled] = useState(true)
    const [showChat, setShowChat] = useState(true)


    const { data: profile } = useQuery({

        queryKey: ['profile', user?.id],
        queryFn: async () => {
            const res = await fetch('/api/user/profile')
            if (!res.ok) return null
            return res.json()
        },
        enabled: !!user?.id,
    })

    const { data: transactions = [], isLoading } = useQuery({

        queryKey: ['transactions', user?.id],
        queryFn: async () => {
            // Fetch all transactions to allow frontend filtering/analysis
            const res = await fetch(`/api/user/transactions?limit=5000`)
            if (!res.ok) return []
            return res.json()
        },
        enabled: !!user?.id,
    })

    // Prepare chart data
    const chartData = useMemo(() => {
        const filtered = transactions.filter((t: any) => {
            const tYear = new Date(t.date).getFullYear()
            const matchesYear = tYear === selectedYear
            const tCat = (t.main_category || '').toLowerCase()
            const matchesCategory = tCat === reportType.toLowerCase()
            return matchesYear && matchesCategory && !t.is_income
        })

        
        const grouped = filtered.reduce((acc: Record<string, number>, t: any) => {
            const cat = t.sub_category || 'Other'
            const label = cat.charAt(0).toUpperCase() + cat.slice(1)
            acc[label] = (acc[label] || 0) + Math.abs(t.amount || 0)
            return acc
        }, {})

        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value: value as number }))
            .sort((a, b) => b.value - a.value)
    }, [transactions, reportType, selectedYear])


    // Proactive AI Message Logic (Simulated for UI demonstration)
    // In a real app, this might trigger a specific assistant prompt
    const initialPrompt = useMemo(() => {
        if (!aiEnabled || chartData.length === 0) return null;
        const topCat = chartData[0];
        return `I've analyzed your ${reportType} reports for ${selectedYear}. Your biggest expense category is ${topCat.name} at ₦${topCat.value.toLocaleString()}. Would you like a detailed breakdown?`;
    }, [chartData, reportType, aiEnabled, selectedYear]);


    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] space-y-4">
            {/* Top Section: Visual Reports */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-emerald-500" />
                            Visual Reports
                        </h1>
                        <p className="text-sm text-slate-500">Deep dive into your spending patterns</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setShowChat(!showChat)}
                            className={cn(
                                "rounded-xl border-slate-200 dark:border-slate-800 transition-all",
                                showChat ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "hover:bg-slate-50"
                            )}
                        >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            {showChat ? 'Hide Chat' : 'Show Chat'}
                        </Button>
                    </div>


                    <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2 px-2 border-r border-slate-200 dark:border-slate-700">
                            <Brain className={cn("w-4 h-4", aiEnabled ? "text-purple-500" : "text-slate-400")} />
                            <Label htmlFor="ai-toggle" className="text-xs font-semibold cursor-pointer">AI Analysis</Label>
                            <Switch 
                                id="ai-toggle" 
                                checked={aiEnabled} 
                                onCheckedChange={setAiEnabled}
                                className="scale-75 data-[state=checked]:bg-purple-500"
                            />
                        </div>
                        <Tabs value={reportType} onValueChange={(v: any) => setReportType(v)} className="w-auto">
                            <TabsList className="h-8 p-1 bg-slate-100 dark:bg-slate-900">
                                <TabsTrigger value="Business" className="text-xs h-6 px-3">Business</TabsTrigger>
                                <TabsTrigger value="Personal" className="text-xs h-6 px-3">Personal</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-700">
                            <Label className="text-xs font-semibold">Year</Label>
                            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                                <SelectTrigger className="w-[100px] h-8 text-xs border-0 bg-slate-100 dark:bg-slate-900 focus:ring-0">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                                        <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card className="lg:col-span-2 bg-white dark:bg-slate-800 border-0 shadow-sm overflow-hidden">
                        <CardHeader className="pb-0 text-center sm:text-left">
                            <CardTitle className="text-lg font-bold">{reportType} Expense Breakdown</CardTitle>
                            <CardDescription>Percentage distribution of sub-categories</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] sm:h-[350px]">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Amount']}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                                    <BarChart3 className="w-12 h-12 opacity-20" />
                                    <p>No {reportType.toLowerCase()} transactions found for {selectedYear}</p>

                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-emerald-600 text-white border-0 shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            <Sparkles className="w-32 h-32" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-xl">Quick Insight</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 relative z-10">
                            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                                <p className="text-sm opacity-90">Total {reportType} Spending</p>
                                <p className="text-3xl font-black mt-1">
                                    ₦{chartData.reduce((a, b) => a + b.value, 0).toLocaleString()}

                                </p>
                            </div>
                            
                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wider opacity-70">Top Category</p>
                                {chartData.length > 0 ? (
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-lg">{chartData[0].name}</span>
                                        <span className="px-2 py-1 rounded bg-white/20 text-xs font-bold">
                                            {((chartData[0].value / chartData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                ) : (
                                    <p className="text-sm italic">Analyze your transactions to see insights</p>
                                )}
                            </div>

                            <Button className="w-full bg-white text-emerald-600 hover:bg-emerald-50 border-0 font-bold group">
                                <Download className="w-4 h-4 mr-2 group-hover:translate-y-0.5 transition-transform" />
                                Save as Image
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Bottom Section: Chat Assistant (Split Screen) */}
            <AnimatePresence>
                {showChat && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "45%", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-t-3xl overflow-hidden shadow-2xl"
                    >
                        <div className="px-6 py-3 border-b border-white dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    Reports Assistant
                                </h2>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowChat(false)} className="h-8 w-8 rounded-full">
                                <ChevronDown className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <TransactionAssistant 
                                transactions={transactions}
                                onUpdate={() => queryClient.invalidateQueries({ queryKey: ['transactions'] })}
                                creditBalance={profile?.credit_balance ?? 0}
                                onCreditUpdate={() => queryClient.invalidateQueries({ queryKey: ['profile'] })}
                                userId={user?.id || ''}
                                embedded={true} 
                                initialMessage={initialPrompt} 
                                context={`Reports - ${reportType}`}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

    )
}
