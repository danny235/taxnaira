'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from '@/components/auth-provider'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, BarChart3, Zap, Brain, Sparkles, MessageSquare, Download, ChevronDown, TrendingUp, Calendar, CreditCard, ArrowUpRight, Filter } from 'lucide-react'
import { motion, AnimatePresence, Variants } from 'framer-motion'



import TransactionAssistant from '@/components/transactions/transaction-assistant'
import { cn } from '@/lib/utils'

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#f43f5e', '#84cc16'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

    // Filtered transactions based on year and type
    const filteredTransactions = useMemo(() => {
        return transactions.filter((t: any) => {
            const tYear = new Date(t.date).getFullYear()
            const matchesYear = tYear === selectedYear
            const tCat = (t.main_category || '').toLowerCase()
            const matchesCategory = tCat === reportType.toLowerCase()
            return matchesYear && matchesCategory && !t.is_income
        })
    }, [transactions, reportType, selectedYear])

    // Prepare Pie Chart data (Categories)
    const categoryData = useMemo(() => {
        const grouped = filteredTransactions.reduce((acc: Record<string, number>, t: any) => {
            const cat = t.sub_category || 'Other'
            const label = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ')
            acc[label] = (acc[label] || 0) + Math.abs(t.amount || 0)
            return acc
        }, {})

        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value: value as number }))
            .sort((a, b) => b.value - a.value)
    }, [filteredTransactions])

    // Prepare Bar Chart data (Monthly Trends)
    const monthlyData = useMemo(() => {
        const months = Array(12).fill(0).map((_, i) => ({
            name: MONTHS[i],
            amount: 0
        }))

        filteredTransactions.forEach((t: any) => {
            const date = new Date(t.date)
            const monthIdx = date.getMonth()
            months[monthIdx].amount += Math.abs(t.amount || 0)
        })

        return months
    }, [filteredTransactions])

    // Advanced Metrics
    const metrics = useMemo(() => {
        const total = filteredTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
        const avg = total / 12
        
        let peakMonth = { name: 'None', amount: 0 }
        monthlyData.forEach(m => {
            if (m.amount > peakMonth.amount) {
                peakMonth = { name: m.name, amount: m.amount }
            }
        })

        return { total, avg, peakMonth }
    }, [filteredTransactions, monthlyData])


    // Proactive AI Message Logic
    const initialPrompt = useMemo(() => {
        if (!aiEnabled || categoryData.length === 0) return null;
        const topCat = categoryData[0];
        return `I've analyzed your ${reportType} reports for ${selectedYear}. Your biggest expense category is ${topCat.name} at ₦${topCat.value.toLocaleString()}. Would you like a detailed monthly breakdown?`;
    }, [categoryData, reportType, aiEnabled, selectedYear]);


    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        )
    }

    const cardVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: (i: number) => ({
            opacity: 1, 
            y: 0,
            transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" }
        })
    };

    return (
        <div className="flex flex-col min-h-[calc(100vh-100px)] lg:h-[calc(100vh-80px)] space-y-6">
            {/* Glossy Header with Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 shadow-sm mx-1">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Financial Intelligence</h1>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">Performance Analysis • {selectedYear}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Mode Toggle */}
                    <Tabs value={reportType} onValueChange={(v: any) => setReportType(v)} className="bg-slate-200/50 dark:bg-slate-950/50 p-1 rounded-2xl border border-white/10">
                        <TabsList className="h-9 p-0 bg-transparent border-0">
                            <TabsTrigger value="Business" className="rounded-xl px-4 text-xs font-bold data-[state=checked]:bg-white dark:data-[state=checked]:bg-slate-800 data-[state=checked]:shadow-sm">Business</TabsTrigger>
                            <TabsTrigger value="Personal" className="rounded-xl px-4 text-xs font-bold data-[state=checked]:bg-white dark:data-[state=checked]:bg-slate-800 data-[state=checked]:shadow-sm">Personal</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Year Select */}
                    <div className="flex items-center gap-2 bg-slate-200/50 dark:bg-slate-950/50 p-1 rounded-2xl border border-white/10">
                        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                            <SelectTrigger className="w-[90px] h-9 border-0 bg-transparent focus:ring-0 text-xs font-bold rounded-xl">
                                <Calendar className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-white/10 shadow-2xl">
                                {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                                    <SelectItem key={y} value={y.toString()} className="text-xs font-bold rounded-xl">{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden lg:block" />

                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowChat(!showChat)}
                        className={cn(
                            "rounded-2xl h-10 px-4 transition-all duration-500 font-bold text-xs gap-2",
                            showChat 
                                ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20" 
                                : "bg-slate-200/50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 hover:bg-slate-300/50"
                        )}
                    >
                        <MessageSquare className="w-4 h-4" />
                        {showChat ? 'Hide Insights' : 'AI Analysis'}
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-10 custom-scrollbar">
                {/* Metric Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    {[
                        { 
                            label: 'Annual Consumption', 
                            value: `₦${metrics.total.toLocaleString()}`, 
                            icon: CreditCard, 
                            color: 'emerald',
                            desc: `${reportType} total for ${selectedYear}`,
                            trend: '+2.4%'
                        },
                        { 
                            label: 'Avg Monthly Burn', 
                            value: `₦${Math.round(metrics.avg).toLocaleString()}`, 
                            icon: TrendingUp, 
                            color: 'blue',
                            desc: 'Monthly average threshold',
                            trend: '-1.1%'
                        },
                        { 
                            label: 'Peak Spending Month', 
                            value: metrics.peakMonth.name, 
                            icon: Calendar, 
                            color: 'purple',
                            desc: `₦${metrics.peakMonth.amount.toLocaleString()} in volume`,
                            trend: 'Surge'
                        }
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            custom={i}
                            initial="hidden"
                            animate="visible"
                            variants={cardVariants}
                            className="group relative"
                        >
                            <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-emerald-600/5 rounded-[2rem] -m-1 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Card className="bg-white dark:bg-slate-900 border-0 shadow-sm rounded-[2rem] overflow-hidden relative z-10">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-500",
                                            item.color === 'emerald' ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" :
                                            item.color === 'blue' ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400" :
                                            "bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400"
                                        )}>
                                            <item.icon className="w-6 h-6" />
                                        </div>
                                        <Badge className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 border-0 px-2 rounded-lg">
                                            {item.trend}
                                        </Badge>
                                    </div>
                                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">{item.label}</h3>
                                    <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{item.value}</div>
                                    <p className="text-[10px] font-semibold text-slate-500 mt-2 flex items-center gap-1.5 grayscale opacity-70">
                                        <Zap className="w-3 h-3 fill-current" /> {item.desc}
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Monthly Trends */}
                    <motion.div custom={4} initial="hidden" animate="visible" variants={cardVariants}>
                        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm rounded-[2.5rem] overflow-hidden h-full">
                            <CardHeader className="px-8 pt-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-black tracking-tight">Spending Velocity</CardTitle>
                                        <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Monthly Trend Analysis</CardDescription>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                                        <Filter className="w-4 h-4 text-slate-400" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="h-[350px] px-4 pb-8">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                                                <stop offset="100%" stopColor="#059669" stopOpacity={0.4}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                                            dy={10}
                                        />
                                        <YAxis hide />
                                        <Tooltip 
                                            cursor={{ fill: '#f8fafc', radius: 12 }}
                                            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '12px 16px' }}
                                            formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Total Spend']}
                                            labelStyle={{ fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}
                                        />
                                        <Bar 
                                            dataKey="amount" 
                                            fill="url(#barGradient)" 
                                            radius={[12, 12, 12, 12]} 
                                            barSize={32}
                                            animationDuration={1500}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Category Breakdown */}
                    <motion.div custom={5} initial="hidden" animate="visible" variants={cardVariants}>
                        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm rounded-[2.5rem] overflow-hidden h-full">
                            <CardHeader className="px-8 pt-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-black tracking-tight">Category Mix</CardTitle>
                                        <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Resource Distribution</CardDescription>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                                        <ArrowUpRight className="w-4 h-4 text-slate-400" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="h-[350px] p-0 flex flex-col md:flex-row items-center">
                                <div className="flex-1 h-full w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categoryData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={100}
                                                paddingAngle={8}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {categoryData.map((entry, index) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={COLORS[index % COLORS.length]} 
                                                        style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.05))' }}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Amount']}
                                                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex-1 w-full p-8 pt-0 md:pt-8 overflow-y-auto max-h-full space-y-3 custom-scrollbar">
                                    {categoryData.slice(0, 6).map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 group hover:bg-slate-100 dark:hover:bg-slate-900 transition-all duration-300">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-800" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{item.name}</span>
                                            </div>
                                            <div className="text-xs font-bold text-slate-500">
                                                {((item.value / metrics.total) * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>

            {/* Bottom Section: Chat Assistant (Split Screen) */}
            <AnimatePresence>
                {showChat && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: typeof window !== 'undefined' && window.innerWidth < 1024 ? "70%" : "45%", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
                        className="flex flex-col border-t border-slate-200/50 dark:border-slate-800 bg-white/60 dark:bg-slate-950/80 backdrop-blur-2xl rounded-t-4xl lg:rounded-t-[3rem] overflow-hidden shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.1)] z-50 fixed lg:static bottom-0 left-0 right-0"
                    >
                        <div className="px-8 py-4 border-b border-slate-200/30 dark:border-slate-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute inset-0" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 relative" />
                                </div>
                                <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                                    Intelligence Core
                                </h2>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowChat(false)} className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200">
                                <ChevronDown className="w-5 h-5 text-slate-400" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <TransactionAssistant 
                                transactions={transactions}
                                onUpdate={() => queryClient.invalidateQueries({ queryKey: ['transactions'] })}
                                creditBalance={profile?.credit_balance ?? 0}
                                onCreditUpdate={(_balance: number) => queryClient.invalidateQueries({ queryKey: ['profile'] })}
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
