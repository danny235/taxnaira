"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

const categoryLabels: Record<string, string> = {
    salary: 'Salary',
    business_revenue: 'Business Revenue',
    freelance_income: 'Freelance',
    foreign_income: 'Foreign Income',
    capital_gains: 'Capital Gains',
    crypto_sale: 'Crypto Sale',
    other_income: 'Other Income',
    rent: 'Rent',
    utilities: 'Utilities',
    food: 'Food',
    transportation: 'Transport',
    business_expenses: 'Business Exp.',
    pension_contributions: 'Pension',
    nhf_contributions: 'NHF',
    insurance: 'Insurance',
    transfers: 'Transfer',
    crypto_purchase: 'Crypto Buy',
    miscellaneous: 'Misc'
};

interface Transaction {
    tempId: number;
    date: string;
    description: string;
    amount: number;
    type: string; // 'credit' | 'debit'
    currency: string;
    category?: string;
    is_income?: boolean;
    ai_confidence?: number;
    selected?: boolean;
}

interface TransactionParserProps {
    fileUrl: string | null;
    fileId: string;
    userId: string;
    employmentType?: string;
    onComplete?: (count: number) => void;
}

export default function TransactionParser({ fileUrl, fileId, userId, employmentType, onComplete }: TransactionParserProps) {
    const [parsing, setParsing] = useState(false);
    const [classifying, setClassifying] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selected, setSelected] = useState<Record<number, boolean>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasStarted = useRef(false);

    const supabase = createClient();

    useEffect(() => {
        if (fileUrl && !hasStarted.current) {
            hasStarted.current = true;
            parseFile();
        }
    }, [fileUrl]);

    const parseFile = async () => {
        setParsing(true);
        setError(null);

        try {
            // TODO: Replace with actual AI parsing logic (e.g., via Edge Function)
            // For now, we simulate a delay and return mock data or basic extracted data
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Mock data for demonstration
            const mockTransactions: Transaction[] = [
                { tempId: 1, date: '2025-01-15', description: 'Salary Deposit', amount: 500000, type: 'credit', currency: 'NGN' },
                { tempId: 2, date: '2025-01-16', description: 'Uber Ride', amount: 2500, type: 'debit', currency: 'NGN' },
                { tempId: 3, date: '2025-01-18', description: 'Spar Supermarket', amount: 45000, type: 'debit', currency: 'NGN' },
                { tempId: 4, date: '2025-01-20', description: 'Electricity Bill', amount: 15000, type: 'debit', currency: 'NGN' },
                { tempId: 5, date: '2025-01-25', description: 'Freelance Project', amount: 150000, type: 'credit', currency: 'NGN' },
            ];

            const parsed = mockTransactions;

            if (parsed.length === 0) {
                setError("No transactions could be extracted from this file.");
                setParsing(false);
                return;
            }

            const withIds = parsed.map((tx, i) => ({ ...tx, tempId: i, selected: true }));
            setTransactions(withIds);
            setSelected(Object.fromEntries(withIds.map(tx => [tx.tempId, true])));
            setParsing(false);

            if (withIds.length > 0) {
                classifyTransactions(withIds);
            }
        } catch (e) {
            setError("Failed to parse file.");
            setParsing(false);
        }
    };

    const classifyTransactions = async (txList?: Transaction[]) => {
        const toClassify = txList ?? transactions;
        if (toClassify.length === 0) return;
        setClassifying(true);

        // TODO: AI Classification Logic
        await new Promise(resolve => setTimeout(resolve, 1500));

        const updated = toClassify.map((tx) => {
            // Simple rule-based mock classification
            let category = 'miscellaneous';
            let isIncome = tx.type === 'credit';

            if (tx.description.toLowerCase().includes('salary')) category = 'salary';
            else if (tx.description.toLowerCase().includes('uber')) category = 'transportation';
            else if (tx.description.toLowerCase().includes('spar')) category = 'food';
            else if (tx.description.toLowerCase().includes('electricity')) category = 'utilities';
            else if (tx.description.toLowerCase().includes('freelance')) category = 'freelance_income';

            return {
                ...tx,
                category,
                is_income: isIncome,
                ai_confidence: 0.9
            };
        });

        setTransactions(updated);
        setClassifying(false);
    };

    const toggleSelect = (tempId: number) => {
        setSelected(prev => ({ ...prev, [tempId]: !prev[tempId] }));
    };

    const selectAll = (checked: boolean) => {
        // If checking (checked === true), select all
        // If unchecking (checked === false or essentially !checked if passed as boolean), unselect all
        // Checkbox onCheckedChange gives `CheckedState` which is boolean | 'indeterminate'.
        // We'll treat it as boolean.

        const newSelected: Record<number, boolean> = {};
        transactions.forEach(tx => {
            newSelected[tx.tempId] = checked;
        });
        setSelected(newSelected);
    };

    const saveTransactions = async () => {
        setSaving(true);
        const toSave = transactions.filter(tx => selected[tx.tempId]);

        try {
            const records = toSave.map(tx => ({
                user_id: userId,
                date: tx.date,
                description: tx.description,
                amount: tx.amount,
                currency: tx.currency || 'NGN',
                naira_value: tx.currency === 'NGN' || !tx.currency ? tx.amount : tx.amount, // Simplified, assume 1:1 if NGN
                category: tx.category,
                is_income: tx.is_income,
                source_file_id: fileId,
                ai_confidence: tx.ai_confidence,
                tax_year: new Date().getFullYear()
            }));

            const { error } = await supabase.from('transactions').insert(records);
            if (error) throw error;

            await supabase.from('uploaded_files').update({
                processed: true,
                transactions_count: records.length
            }).eq('id', fileId);

            setSaving(false);
            if (onComplete) onComplete(records.length);
            toast.success(`Saved ${records.length} transactions`);
        } catch (e: any) {
            console.error('Save failed:', e);
            toast.error('Failed to save transactions: ' + e.message);
            setSaving(false);
        }
    };

    const selectedCount = Object.values(selected).filter(Boolean).length;

    return (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm text-foreground">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    AI Transaction Parser
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {transactions.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-slate-500 mb-4">Click to extract transactions from your file</p>
                        <Button onClick={parseFile} disabled={parsing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {parsing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Extracting...
                                </>
                            ) : (
                                'Extract Transactions'
                            )}
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Checkbox
                                    checked={selectedCount === transactions.length && transactions.length > 0}
                                    onCheckedChange={(c) => selectAll(c as boolean)}
                                />
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    {selectedCount} of {transactions.length} selected
                                </span>
                            </div>
                            {!transactions[0]?.category && (
                                <Button onClick={() => classifyTransactions()} disabled={classifying} variant="outline" size="sm">
                                    {classifying ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Classifying...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Auto-Classify
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>

                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[400px] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-slate-50 dark:bg-slate-700">
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Category</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((tx) => (
                                        <TableRow key={tx.tempId} className={!selected[tx.tempId] ? 'opacity-50' : ''}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selected[tx.tempId] || false}
                                                    onCheckedChange={() => toggleSelect(tx.tempId)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {tx.date ? format(new Date(tx.date), 'MMM d, yyyy') : '-'}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium max-w-[200px] truncate">
                                                {tx.description}
                                            </TableCell>
                                            <TableCell className={tx.is_income ? 'text-emerald-600' : 'text-red-600'}>
                                                {tx.is_income ? '+' : '-'}₦{tx.amount?.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                {tx.category ? (
                                                    <Badge variant="outline" className="text-xs">
                                                        {categoryLabels[tx.category] || tx.category}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">Pending</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {transactions[0]?.category && (
                            <Button
                                onClick={saveTransactions}
                                disabled={saving || selectedCount === 0}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Save {selectedCount} Transactions
                                    </>
                                )}
                            </Button>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
