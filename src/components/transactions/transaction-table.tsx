"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { Search, Edit2, Check, X, Trash2, Loader2 } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

interface Transaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    naira_value?: number;
    currency?: string;
    category?: string;
    main_category?: string;
    sub_category?: string;
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
    const [editMainCategory, setEditMainCategory] = useState('');
    const [editSubCategory, setEditSubCategory] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);

    const filtered = transactions.filter(tx =>
        tx.description?.toLowerCase().includes(search.toLowerCase()) ||
        tx.sub_category?.toLowerCase().includes(search.toLowerCase()) ||
        tx.category?.toLowerCase().includes(search.toLowerCase())
    );

    const handleCategoryChange = async (txId: string, mainCat: string, subCat: string) => {
        setSavingId(txId);
        try {
            const response = await fetch(`/api/user/transactions/${txId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    main_category: mainCat,
                    sub_category: subCat,
                    category: subCat,
                    business_flag: mainCat.toLowerCase(),
                    manually_categorized: true
                })
            });

            if (!response.ok) throw new Error('Failed to update');

            toast.success("Transaction updated");
            setEditingId(null);
            if (onUpdate) onUpdate();
        } catch (error: any) {
            toast.error("Update failed: " + error.message);
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (txId: string) => {
        if (!confirm("Are you sure?")) return;
        setSavingId(txId);
        try {
            const response = await fetch(`/api/user/transactions/${txId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete');
            toast.success("Deleted");
            if (onUpdate) onUpdate();
        } catch (error: any) {
            toast.error("Delete failed");
        } finally {
            setSavingId(null);
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;
        setIsDeleting(true);
        try {
            const response = await fetch('/api/user/transactions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedIds) })
            });
            if (!response.ok) throw new Error('Failed');
            toast.success("Batch deleted");
            setSelectedIds(new Set());
            if (onUpdate) onUpdate();
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBatchCategoryChange = async (mainCat: string) => {
        setIsBulkUpdating(true);
        try {
            const response = await fetch('/api/user/transactions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: Array.from(selectedIds),
                    updates: { 
                        main_category: mainCat, 
                        business_flag: mainCat.toLowerCase(),
                        manually_categorized: true 
                    }
                })
            });
            if (!response.ok) throw new Error('Failed');
            toast.success("Batch updated");
            setSelectedIds(new Set());
            if (onUpdate) onUpdate();
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked) setSelectedIds(new Set(filtered.map(tx => tx.id)));
        else setSelectedIds(new Set());
    };

    return (
        <div className="space-y-4">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <Input
                    placeholder="Search transactions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-emerald-500"
                />
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                                    onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                                    className="border-slate-300 dark:border-slate-600"
                                />
                            </TableHead>
                            <TableHead className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Date</TableHead>
                            <TableHead className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Description</TableHead>
                            <TableHead className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Amount</TableHead>
                            <TableHead className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Taxable</TableHead>
                            <TableHead className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Category</TableHead>
                            <TableHead className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Sub Category</TableHead>
                            <TableHead className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 w-[80px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length > 0 ? filtered.map((tx) => (
                            <TableRow key={tx.id} className={cn(
                                "border-slate-200 dark:border-slate-700 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50",
                                selectedIds.has(tx.id) && "bg-emerald-50/50 dark:bg-emerald-950/20"
                            )}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedIds.has(tx.id)}
                                        onCheckedChange={() => {
                                            const next = new Set(selectedIds);
                                            if (next.has(tx.id)) next.delete(tx.id);
                                            else next.add(tx.id);
                                            setSelectedIds(next);
                                        }}
                                        className="border-slate-300 dark:border-slate-600"
                                    />
                                </TableCell>
                                <TableCell className="text-xs text-slate-600 dark:text-slate-400">{tx.date ? format(new Date(tx.date), 'MMM d, yyyy') : '-'}</TableCell>
                                <TableCell className="text-xs font-medium text-slate-900 dark:text-slate-200 truncate max-w-[200px]">{tx.description || '-'}</TableCell>
                                <TableCell className="text-xs">
                                    <span className={tx.is_income ? 'text-emerald-600' : 'text-red-600'}>
                                        {tx.is_income ? '+' : '-'}₦{(tx.naira_value || tx.amount || 0).toLocaleString()}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <Badge className={cn(
                                        "text-[10px] uppercase font-bold px-2", 
                                        tx.main_category === 'Business' ? "bg-emerald-600" : "bg-slate-500"
                                    )}>
                                        {tx.main_category === 'Business' ? 'Yes' : 'No'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {editingId === tx.id ? (
                                        <Select value={editMainCategory} onValueChange={setEditMainCategory}>
                                            <SelectTrigger className="w-[100px] h-7 text-[10px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                                                <SelectItem value="Business">Business</SelectItem>
                                                <SelectItem value="Personal">Personal</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">{tx.main_category || 'Personal'}</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {editingId === tx.id ? (
                                        <Input 
                                            value={editSubCategory} 
                                            onChange={(e) => setEditSubCategory(e.target.value)}
                                            className="h-7 text-[10px] w-[140px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-emerald-500"
                                        />
                                    ) : (
                                        <Badge variant="outline" className="text-[10px] font-medium border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                                            {tx.sub_category || tx.category?.replace(/_/g, ' ') || '-'}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1 justify-end">
                                        {savingId === tx.id ? (
                                            <div className="h-7 w-7 flex items-center justify-center">
                                                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                                            </div>
                                        ) : editingId === tx.id ? (
                                            <>
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCategoryChange(tx.id, editMainCategory, editSubCategory)}>
                                                    <Check className="w-4 h-4 text-emerald-600" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                                                    <X className="w-4 h-4 text-red-600" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-emerald-600" onClick={() => { 
                                                    setEditingId(tx.id); 
                                                    setEditMainCategory(tx.main_category || 'Personal');
                                                    setEditSubCategory(tx.sub_category || tx.category || ''); 
                                                }}>
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => handleDelete(tx.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-slate-400">No transactions found</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <div className="bg-slate-900 dark:bg-emerald-950 text-white px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl border border-slate-800 dark:border-emerald-800/50">
                        <span className="text-sm font-medium">{selectedIds.size} selected</span>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => setSelectedIds(new Set())}>Deselect</Button>
                            <Select onValueChange={handleBatchCategoryChange}>
                                <SelectTrigger className="w-[120px] h-8 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-0">
                                    <SelectValue placeholder="Set Taxable" />
                                </SelectTrigger>
                                <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                                    <SelectItem value="Business">Business</SelectItem>
                                    <SelectItem value="Personal">Personal</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="destructive" size="sm" className="h-8 bg-red-600 hover:bg-red-700" onClick={handleBatchDelete} disabled={isDeleting}>
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />} Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
