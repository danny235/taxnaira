"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, CheckCircle, AlertTriangle, FileText, Search, Brain, Zap } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from "@/components/ui/progress";
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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
    food_and_travel: 'Food & Travel',
    transportation: 'Transport',
    business_expense: 'Business Exp.',
    subscriptions: 'Subscription',
    professional_fees: 'Prof. Fees',
    maintenance: 'Maintenance',
    health: 'Health',
    donations: 'Donations',
    tax_payments: 'Tax Payout',
    bank_charges: 'Bank Charges',
    pension_contributions: 'Pension',
    nhf_contributions: 'NHF',
    insurance: 'Insurance',
    transfers: 'Transfer',
    crypto_purchase: 'Crypto Buy',
    personal_expense: 'Personal',
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

    // Premium Progress States
    const [parsingStatus, setParsingStatus] = useState<'idle' | 'reading' | 'extracting' | 'analyzing' | 'completing'>('idle');
    const [progress, setProgress] = useState(0);

    // Trickle Queue States
    const [trickleQueue, setTrickleQueue] = useState<Transaction[]>([]);
    const [totalPossibleCount, setTotalPossibleCount] = useState(0);

    const [accountType, setAccountType] = useState('personal');
    const [importRules, setImportRules] = useState('');
    const [creditBalance, setCreditBalance] = useState<number | null>(null);
    const queryClient = useQueryClient();
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        fetchBalance();
    }, []);

    // Effect to handle the "Visual Trickle"
    useEffect(() => {
        if (trickleQueue.length === 0) return;

        const timer = setInterval(() => {
            setTrickleQueue(prev => {
                if (prev.length === 0) return prev;

                // Pop 1-2 items to reveal
                const toExtract = prev.slice(0, Math.min(2, prev.length));
                const remaining = prev.slice(toExtract.length);

                setTransactions(current => [...current, ...toExtract]);
                setSelected(current => {
                    const next = { ...current };
                    toExtract.forEach(tx => { next[tx.tempId] = true; });
                    return next;
                });

                return remaining;
            });
        }, 150);

        return () => clearInterval(timer);
    }, [trickleQueue.length]);

    const fetchBalance = async () => {
        try {
            const res = await fetch('/api/user/profile');
            const data = await res.json();
            setCreditBalance(data.credit_balance ?? 0);
        } catch (e) {
            console.error("Failed to fetch balance:", e);
        }
    };



    const stopExtraction = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setParsing(false);
            setParsingStatus('idle');
            toast.info("Extraction stopped by user");
        }
    };

    const parseFile = async () => {
        setParsing(true);
        setError(null);
        setTransactions([]); // Clear existing
        setSelected({});
        setParsingStatus('reading');
        setProgress(10);

        // Initialize AbortController
        abortControllerRef.current = new AbortController();

        try {
            // Stage 1: File Preparation
            await new Promise(r => setTimeout(r, 800)); // Aesthetic beat
            setParsingStatus('extracting');
            setProgress(30);

            const response = await fetch('/api/ai/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId, fileUrl, accountType, importRules }),
                signal: abortControllerRef.current.signal
            });

            if (response.status === 402) {
                setError("Insufficient credits. Please top up your account to use AI extraction.");
                setParsing(false);
                setParsingStatus('idle');
                return;
            }

            if (!response.body) throw new Error("Failed to initialize stream reader");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let localTransactionCount = 0;

            // Stage 2: Streaming Analysis
            setParsingStatus('analyzing');

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // Keep incomplete line

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);

                        // Handle chunk of transactions
                        if (data.transactions) {
                            const newTxs = data.transactions.map((tx: any, i: number) => ({
                                ...tx,
                                tempId: localTransactionCount + i,
                                selected: true,
                                type: tx.is_income ? 'credit' : 'debit'
                            }));

                            localTransactionCount += newTxs.length;
                            setTotalPossibleCount(localTransactionCount);
                            // Add to queue instead of direct state for "trickle" effect
                            setTrickleQueue(prev => [...prev, ...newTxs]);

                            if (data.progress) setProgress(data.progress);
                        }

                        // Handle completion
                        if (data.status === 'complete') {
                            setParsingStatus('completing');
                            setProgress(100);

                            if (data.newBalance !== undefined) {
                                setCreditBalance(data.newBalance);
                                queryClient.setQueryData(['profile', userId], (oldData: any) => {
                                    if (!oldData) return oldData;
                                    return { ...oldData, credit_balance: data.newBalance };
                                });
                            }
                        }

                        if (data.error) throw new Error(data.error);

                    } catch (lineError) {
                        console.error("Failed to parse stream line:", lineError);
                    }
                }
            }

            setTimeout(() => {
                setParsing(false);
                setParsingStatus('idle');
            }, 800);

            toast.success(`AI discovered ${localTransactionCount} transactions in real-time`);
        } catch (e: any) {
            if (e.name === 'AbortError') return; // User stopped it
            console.error("AI Extraction Error:", e);
            const errorMessage = e.message || "Failed to parse file.";
            setError(errorMessage);
            toast.error(errorMessage);
            setParsing(false);
            setParsingStatus('idle');
        }
    };

    const classifyTransactions = async (txList?: Transaction[]) => {
        // Since the new extract API already classifies, 
        // we can just use it or leave this as a refine step.
        // For now, extraction includes classification.
        return;
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
                // user_id handled by API
                date: tx.date,
                description: tx.description,
                amount: tx.amount,
                currency: tx.currency || 'NGN',
                naira_value: tx.currency === 'NGN' || !tx.currency ? tx.amount : tx.amount,
                category: tx.category,
                is_income: tx.is_income,
                source_file_id: fileId,
                ai_confidence: tx.ai_confidence,
                tax_year: new Date().getFullYear()
            }));

            const response = await fetch('/api/user/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactions: records, fileId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save transactions');
            }

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
                    <div className="py-6 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium mb-3">Account Type</h3>
                                <RadioGroup
                                    defaultValue="personal"
                                    value={accountType}
                                    onValueChange={setAccountType}
                                    className="flex flex-col sm:flex-row gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="personal" id="personal" />
                                        <Label htmlFor="personal" className="cursor-pointer">Personal</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="business" id="business" />
                                        <Label htmlFor="business" className="cursor-pointer">Business</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="mixed" id="mixed" />
                                        <Label htmlFor="mixed" className="cursor-pointer">Mixed</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="import-rules">Custom Import Rules (Optional)</Label>
                                <p className="text-xs text-slate-500">
                                    Help the AI categorize your transactions by providing keyword mappings.
                                    For example: <br />
                                    Food: pizza, KFC, shawarma<br />
                                    Business spending: Shop rent, Goods, Shipping fee
                                </p>
                                <Textarea
                                    id="import-rules"
                                    placeholder="Food: pizza, KFC&#10;Personal spending: bolt, MTN&#10;Business spending: Shop rent, Shipping fee"
                                    value={importRules}
                                    onChange={(e) => setImportRules(e.target.value)}
                                    className="min-h-[100px]"
                                />
                            </div>
                        </div>

                        <AnimatePresence>
                            {parsing && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="p-6 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 backdrop-blur-sm shadow-inner space-y-4"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                {parsingStatus === 'reading' && <FileText className="w-5 h-5 animate-pulse" />}
                                                {parsingStatus === 'extracting' && <Search className="w-5 h-5 animate-spin" />}
                                                {parsingStatus === 'analyzing' && <Brain className="w-5 h-5 animate-bounce" />}
                                                {parsingStatus === 'completing' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                                                    {parsingStatus === 'reading' && 'Reading Document...'}
                                                    {parsingStatus === 'extracting' && 'Extracting Raw Text...'}
                                                    {parsingStatus === 'analyzing' && 'AI Analysis Engine Running...'}
                                                    {parsingStatus === 'completing' && 'Finalizing Transactions...'}
                                                </h4>
                                                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                                                    {parsingStatus === 'analyzing'
                                                        ? `Discovered ${transactions.length} items (${trickleQueue.length} in queue)...`
                                                        : 'Please wait while we process your file'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{progress}%</span>
                                        </div>
                                    </div>

                                    <Progress value={progress} className="h-2 bg-emerald-100 dark:bg-emerald-900/30" />

                                    <div className="flex justify-between gap-1 mt-4">
                                        {[
                                            { id: 'reading', icon: FileText, label: 'Read' },
                                            { id: 'extracting', icon: Search, label: 'Extract' },
                                            { id: 'analyzing', icon: Brain, label: 'Analyze' },
                                            { id: 'completing', icon: Zap, label: 'Finalize' }
                                        ].map((step, idx) => (
                                            <div key={step.id} className="flex-1 flex flex-col items-center gap-1 group">
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                                    progress >= (idx + 1) * 25 ? "bg-emerald-500 scale-125 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-200 dark:bg-slate-700"
                                                )} />
                                                <span className={cn(
                                                    "text-[9px] font-bold uppercase tracking-wider transition-colors",
                                                    progress >= (idx + 1) * 25 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                                                )}>
                                                    {step.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-2 flex justify-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={stopExtraction}
                                            className="text-emerald-600/50 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-900/20 text-[10px] h-7 uppercase tracking-tight font-bold"
                                        >
                                            <AlertTriangle className="w-3 h-3 mr-1.5" />
                                            Stop Extraction
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-slate-500">Available Credits:</span>
                                <span className={cn(
                                    "font-bold px-2 py-0.5 rounded-full",
                                    (creditBalance || 0) > 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                )}>
                                    {creditBalance !== null ? creditBalance : '...'}
                                </span>
                                {(creditBalance === 0) && (
                                    <Link href="/subscription">
                                        <Button variant="link" size="sm" className="text-emerald-600 h-auto p-0">Top up</Button>
                                    </Link>
                                )}
                            </div>
                            <Button
                                onClick={parseFile}
                                disabled={parsing || (creditBalance !== null && creditBalance < 1)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                            >
                                {parsing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        <span>Extracting...</span>
                                    </>
                                ) : (
                                    'Extract Transactions'
                                )}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <Checkbox
                                    checked={selectedCount === transactions.length && transactions.length > 0}
                                    onCheckedChange={(c) => selectAll(c as boolean)}
                                />
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    {selectedCount} of {transactions.length} selected
                                </span>
                            </div>
                            <Button onClick={() => parseFile()} disabled={parsing} variant="outline" size="sm" className="w-full sm:w-auto">
                                {parsing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2 text-emerald-500" />
                                        Re-Extract
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[400px] overflow-y-auto overflow-x-auto">
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
                                    <AnimatePresence initial={false}>
                                        {transactions.map((tx) => (
                                            <motion.tr
                                                key={tx.tempId}
                                                layout
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={cn(
                                                    !selected[tx.tempId] ? 'opacity-50' : '',
                                                    "transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                                )}
                                            >
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selected[tx.tempId] || false}
                                                        onCheckedChange={() => toggleSelect(tx.tempId)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-sm whitespace-nowrap">
                                                    {tx.date ? format(new Date(tx.date), 'MMM d, yyyy') : '-'}
                                                </TableCell>
                                                <TableCell className="text-sm font-medium min-w-[150px] max-w-[200px] truncate">
                                                    {tx.description}
                                                </TableCell>
                                                <TableCell className={cn(tx.is_income ? 'text-emerald-600' : 'text-red-600', "whitespace-nowrap")}>
                                                    {tx.is_income ? '+' : '-'}₦{tx.amount?.toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    {tx.category ? (
                                                        <Badge variant="outline" className="text-[10px] h-5 py-0">
                                                            {categoryLabels[tx.category] || tx.category}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-slate-400 text-[10px]">Pending</span>
                                                    )}
                                                </TableCell>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
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
