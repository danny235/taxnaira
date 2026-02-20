"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { Search, Edit2, Check, X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

export const categories = [
    { value: 'salary', label: 'Salary', isIncome: true },
    { value: 'business revenue', label: 'Business Revenue', isIncome: true },
    { value: 'freelance income', label: 'Freelance Income', isIncome: true },
    { value: 'foreign income', label: 'Foreign Income', isIncome: true },
    { value: 'capital gains', label: 'Capital Gains', isIncome: true },
    { value: 'crypto sale', label: 'Crypto Sale', isIncome: true },
    { value: 'other income', label: 'Other Income', isIncome: true },
    { value: 'rent', label: 'Rent', isIncome: false },
    { value: 'utilities', label: 'Utilities', isIncome: false },
    { value: 'food', label: 'Food', isIncome: false },
    { value: 'transportation', label: 'Transportation', isIncome: false },
    { value: 'business expenses', label: 'Business Expenses', isIncome: false },
    { value: 'pension contributions', label: 'Pension', isIncome: false },
    { value: 'nhf contributions', label: 'NHF', isIncome: false },
    { value: 'insurance', label: 'Insurance', isIncome: false },
    { value: 'transfers', label: 'Transfers', isIncome: false },
    { value: 'crypto purchase', label: 'Crypto Purchase', isIncome: false },
    { value: 'miscellaneous', label: 'Miscellaneous', isIncome: false },
];

interface Transaction {
    id: string; // Changed from number/string to string for UUID
    date: string;
    description: string;
    amount: number;
    naira_value?: number;
    currency?: string;
    category?: string;
    is_income: boolean;
    manually_categorized?: boolean;
    ai_confidence?: number;
    user_id: string;
}

interface TransactionTableProps {
    transactions: Transaction[];
    onUpdate?: () => void;
}

export default function TransactionTable({ transactions = [], onUpdate }: TransactionTableProps) {
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editCategory, setEditCategory] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    const filtered = transactions.filter(tx =>
        tx.description?.toLowerCase().includes(search.toLowerCase()) ||
        tx.category?.toLowerCase().includes(search.toLowerCase())
    );

    const handleCategoryChange = async (txId: string, newCategory: string) => {
        const cat = categories.find(c => c.value === newCategory);

        try {
            const response = await fetch(`/api/user/transactions/${txId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: newCategory,
                    is_income: cat?.isIncome || false,
                    manually_categorized: true
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update category');
            }

            toast.success("Category updated");
            setEditingId(null);
            if (onUpdate) onUpdate();
        } catch (error: any) {
            toast.error("Failed to update category: " + error.message);
        }
    };

    const handleDelete = async (txId: string) => {
        if (!confirm("Are you sure you want to delete this transaction?")) return;

        try {
            const response = await fetch(`/api/user/transactions/${txId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete transaction');
            }

            toast.success("Transaction deleted");
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(txId);
                return next;
            });
            if (onUpdate) onUpdate();
        } catch (error: any) {
            toast.error("Failed to delete transaction: " + error.message);
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} transactions?`)) return;

        setIsDeleting(true);
        try {
            const response = await fetch('/api/user/transactions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedIds) })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete transactions');
            }

            toast.success(`${selectedIds.size} transactions deleted`);
            setSelectedIds(new Set());
            if (onUpdate) onUpdate();
        } catch (error: any) {
            toast.error("Failed to delete transactions: " + error.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(filtered.map(tx => tx.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="Search transactions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-700/50">
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                                    onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                                />
                            </TableHead>
                            <TableHead className="font-semibold text-xs py-2 uppercase tracking-wider">Date</TableHead>
                            <TableHead className="font-semibold text-xs py-2 uppercase tracking-wider">Description</TableHead>
                            <TableHead className="font-semibold text-xs py-2 uppercase tracking-wider">Amount</TableHead>
                            <TableHead className="font-semibold text-xs py-2 uppercase tracking-wider">Category</TableHead>
                            <TableHead className="font-semibold text-xs py-2 uppercase tracking-wider">Confidence</TableHead>
                            <TableHead className="font-semibold text-xs py-2 uppercase tracking-wider w-[80px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length > 0 ? filtered.map((tx) => (
                            <TableRow key={tx.id} className={cn(
                                "hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors",
                                selectedIds.has(tx.id) && "bg-emerald-50/30 dark:bg-emerald-900/10"
                            )}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedIds.has(tx.id)}
                                        onCheckedChange={() => toggleSelect(tx.id)}
                                    />
                                </TableCell>
                                <TableCell className="text-slate-600 dark:text-slate-400">
                                    {tx.date ? format(new Date(tx.date), 'MMM d, yyyy') : '-'}
                                </TableCell>
                                <TableCell className="font-medium text-slate-900 dark:text-white max-w-[200px] truncate">
                                    {tx.description || '-'}
                                </TableCell>
                                <TableCell>
                                    <span className={tx.is_income ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                                        {tx.is_income ? '+' : '-'}₦{(tx.naira_value || tx.amount || 0).toLocaleString()}
                                    </span>
                                    {tx.currency && tx.currency !== 'NGN' && (
                                        <span className="text-xs text-slate-400 ml-1">({tx.currency} {tx.amount})</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {editingId === tx.id ? (
                                        <Select value={editCategory} onValueChange={setEditCategory}>
                                            <SelectTrigger className="w-[150px] h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent position="popper" className="max-h-[300px]">
                                                {categories.map(cat => (
                                                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Badge variant={tx.is_income ? "default" : "secondary"} className={tx.is_income ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : ""}>
                                            {categories.find(c => c.value === tx.category)?.label || tx.category?.replace(/_/g, ' ') || 'Uncategorized'}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {tx.manually_categorized ? (
                                        <Badge variant="outline" className="text-xs">Manual</Badge>
                                    ) : tx.ai_confidence ? (
                                        <div className="flex items-center gap-1">
                                            {tx.ai_confidence < 0.7 && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                                            <span className={`text-xs ${tx.ai_confidence >= 0.7 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {Math.round(tx.ai_confidence * 100)}%
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-400">-</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        {editingId === tx.id ? (
                                            <>
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleCategoryChange(tx.id, editCategory)}>
                                                    <Check className="w-4 h-4 text-emerald-600" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                                                    <X className="w-4 h-4 text-red-600" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-emerald-600" onClick={() => { setEditingId(tx.id); setEditCategory(tx.category || ''); }}>
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(tx.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                    No transactions found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Floating Selection Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-slate-900 dark:bg-slate-800 text-white px-6 py-3 rounded-full border border-slate-700 dark:border-slate-600 shadow-2xl flex items-center gap-6">
                        <span className="text-sm font-medium">
                            {selectedIds.size} {selectedIds.size === 1 ? 'transaction' : 'transactions'} selected
                        </span>
                        <div className="h-4 w-px bg-slate-700" />
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-400 hover:text-white h-8"
                                onClick={() => setSelectedIds(new Set())}
                            >
                                Deselect all
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 px-4 rounded-full font-semibold shadow-sm hover:scale-105 transition-transform"
                                onClick={handleBatchDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4 mr-2" />
                                )}
                                Delete Selected
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

