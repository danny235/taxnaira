"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter, Download, Loader2 } from 'lucide-react';
import TransactionTable from '@/components/transactions/transaction-table';
import TransactionAssistant from '@/components/transactions/transaction-assistant';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';

export default function TransactionsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [filter, setFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newTx, setNewTx] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        main_category: 'Business',
        sub_category: '',
        currency: 'NGN'
    });
    const [saving, setSaving] = useState(false);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creditBalance, setCreditBalance] = useState<number | null>(null);

    const currentYear = new Date().getFullYear();

    useEffect(() => {
        if (!authLoading) {
            if (user) {
                fetchTransactions();
                fetchCredits();
            } else {
                setLoading(false);
            }
        }
    }, [user, authLoading]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/user/transactions?year=${currentYear}`);
            const data = await response.json();
            if (response.ok) {
                setTransactions(data);
            } else {
                throw new Error(data.error || 'Failed to fetch transactions');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchCredits = async () => {
        try {
            const response = await fetch('/api/user/profile');
            const data = await response.json();
            if (response.ok) {
                setCreditBalance(data.credit_balance ?? 0);
            }
        } catch {
            // Silently handle credit fetch errors
        }
    };

    const filtered = transactions.filter(tx => {
        if (filter === 'income' && !tx.is_income) return false;
        if (filter === 'expense' && tx.is_income) return false;
        if (categoryFilter !== 'all' && tx.main_category !== categoryFilter) return false;
        return true;
    });

    const totalIncome = transactions.filter(t => t.is_income).reduce((sum, t) => sum + (t.naira_value || t.amount || 0), 0);
    const totalExpenses = transactions.filter(t => !t.is_income).reduce((sum, t) => sum + (t.naira_value || t.amount || 0), 0);

    const handleAddTransaction = async () => {
        if (!newTx.description || !newTx.amount) {
            toast.error('Please fill description and amount');
            return;
        }
        if (!user?.id) {
            toast.error("User not authenticated");
            return;
        }

        setSaving(true);
        try {
            const response = await fetch('/api/user/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactions: [{
                        ...newTx,
                        amount: parseFloat(newTx.amount),
                        naira_value: parseFloat(newTx.amount),
                        category: newTx.sub_category || newTx.main_category,
                        main_category: newTx.main_category,
                        sub_category: newTx.sub_category,
                        business_flag: newTx.main_category.toLowerCase(),
                        tax_year: new Date(newTx.date).getFullYear(),
                        manually_categorized: true,
                        source: 'manual',
                        is_income: false // Default to expense for manual entry UI
                    }]
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to add transaction');
            }

            setSaving(false);
            setShowAddDialog(false);
            setNewTx({
                date: new Date().toISOString().split('T')[0],
                description: '',
                amount: '',
                main_category: 'Business',
                sub_category: '',
                currency: 'NGN'
            });
            fetchTransactions();
            toast.success('Transaction added');
        } catch (error: any) {
            toast.error("Failed to add transaction: " + error.message);
            setSaving(false);
        }
    };

    const exportCSV = () => {
        if (filtered.length === 0) {
            toast.error("No transactions to export");
            return;
        }
        const headers = ['Date', 'Description', 'Amount', 'Currency', 'Category', 'Type'];
        const rows = filtered.map(tx => [
            tx.date,
            `"${tx.description}"`,
            tx.naira_value || tx.amount,
            tx.currency || 'NGN',
            tx.category,
            tx.is_income ? 'Income' : 'Expense'
        ]);

        const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${currentYear}.csv`;
        a.click();
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">View and manage your financial transactions</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={exportCSV}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                        <DialogTrigger asChild>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Transaction
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] dark:bg-slate-900 dark:border-slate-800">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">Add Manual Transaction</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div>
                                    <Label>Date</Label>
                                    <Input
                                        type="date"
                                        value={newTx.date}
                                        onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                                        className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</Label>
                                    <Input
                                        value={newTx.description}
                                        onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                                        placeholder="Enter description"
                                        className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Amount (₦)</Label>
                                    <Input
                                        type="number"
                                        value={newTx.amount}
                                        onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                                        placeholder="0.00"
                                        className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Category</Label>
                                        <Select value={newTx.main_category} onValueChange={(v) => setNewTx({ ...newTx, main_category: v })}>
                                            <SelectTrigger className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                                                <SelectItem value="Business">Business</SelectItem>
                                                <SelectItem value="Personal">Personal</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sub Category</Label>
                                        <Input
                                            value={newTx.sub_category}
                                            onChange={(e) => setNewTx({ ...newTx, sub_category: e.target.value })}
                                            placeholder="e.g. Fuel"
                                            className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                        />
                                    </div>
                                </div>
                                <Button
                                    onClick={handleAddTransaction}
                                    disabled={saving}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Transaction'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm p-4 hover:shadow-md transition-shadow">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Transactions</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{transactions.length}</p>
                </Card>
                <Card className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm p-4 hover:shadow-md transition-shadow">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Income</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">₦{totalIncome.toLocaleString()}</p>
                </Card>
                <Card className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm p-4 hover:shadow-md transition-shadow">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">₦{totalExpenses.toLocaleString()}</p>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <Tabs value={filter} onValueChange={setFilter}>
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="income">Income</TabsTrigger>
                        <TabsTrigger value="expense">Expenses</TabsTrigger>
                    </TabsList>
                </Tabs>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <Filter className="w-4 h-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[300px] dark:bg-slate-900 dark:border-slate-700">
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Personal">Personal</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* AI Transaction Assistant — inline tool panel */}
            <div className="py-2">
                <TransactionAssistant
                    transactions={transactions}
                    onUpdate={fetchTransactions}
                    creditBalance={creditBalance}
                    onCreditUpdate={setCreditBalance}
                    userId={user?.id || ''}
                />
            </div>

            {/* Transactions Table */}
            <div className="relative">
                {loading && transactions.length > 0 && (
                    <div className="absolute top-0 left-0 right-0 z-10">
                        <div className="h-1 w-full bg-emerald-100 dark:bg-emerald-950 overflow-hidden rounded-full">
                            <div className="h-full bg-emerald-500 animate-progress w-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        </div>
                    </div>
                )}
                
                {loading && transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
                        <p className="text-slate-500 font-medium">Fetching your records...</p>
                    </div>
                ) : (
                    <div className={cn("transition-opacity duration-300", loading && transactions.length > 0 ? "opacity-60 pointer-events-none" : "opacity-100")}>
                        <TransactionTable transactions={filtered} onUpdate={fetchTransactions} />
                    </div>
                )}
            </div>
        </div>
    );
}

// Custom animation for the progress bar
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes progress {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      .animate-progress {
        animation: progress 1.5s infinite linear;
      }
    `;
    document.head.appendChild(style);
}
