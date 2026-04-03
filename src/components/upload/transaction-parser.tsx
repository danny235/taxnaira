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
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, CheckCircle, AlertTriangle, FileText, Search, Brain, Zap, Info } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import Link from 'next/link';

import { format } from 'date-fns';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const CATEGORY_MAP: Record<string, string[]> = {
    Business: ['fuel', 'data', 'staff salary', 'bank_charges', 'tax_payments', 'miscellaneous'],
    Personal: ['fuel', 'data', 'staff salary', 'personal_expense', 'miscellaneous']
};

const ALL_SUBCATEGORIES = Array.from(new Set([
    ...CATEGORY_MAP.Business,
    ...CATEGORY_MAP.Personal
]));

const categoryLabels: Record<string, string> = {
    // Main Categories
    Business: 'Business',
    Personal: 'Personal',
};

interface Transaction {
    tempId: string;
    date: string;
    description: string;
    amount: number;
    type: string; // 'credit' | 'debit'
    is_income?: boolean;
    currency: string;
    category?: string;
    main_category?: string;
    sub_category?: string;
    account_name?: string;
    ai_confidence?: number;
    reasoning?: string;
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

    // Batch Extraction States
    const [batchState, setBatchState] = useState<{ hasMore: boolean; nextBatchIndex: number; totalChunks: number } | null>(null);
    const seenSignaturesRef = useRef<Set<string>>(new Set());
    const localTransactionCountRef = useRef(0);

    const [accountType, setAccountType] = useState('personal');
    const [importRules, setImportRules] = useState('');
    const [creditBalance, setCreditBalance] = useState<number | null>(null);
    const [aiToggle, setAiToggle] = useState(false);
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

                setTransactions(current => {
                    // Final fail-safe: Deduplicate against transactions already in state
                    const existingTempIds = new Set(current.map(tx => tx.tempId));
                    const newTxs = toExtract.filter(tx => !existingTempIds.has(tx.tempId));
                    return [...current, ...newTxs];
                });
                
                setSelected(current => {
                    const next = { ...current };
                    toExtract.forEach(tx => { 
                        // Auto-select if high confidence (>80%) or if confidence not provided (legacy)
                        if (tx.ai_confidence === undefined || tx.ai_confidence > 0.8) {
                            next[tx.tempId] = true; 
                        }
                    });
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

    const getTransactionSignature = (tx: any) => {
        // 1. Normalize Date (YYYY-MM-DD)
        let dateStr = '0000-00-00';
        try {
            const d = new Date(tx.date);
            if (!isNaN(d.getTime())) {
                dateStr = d.toISOString().split('T')[0];
            }
        } catch (e) {
            console.error("Signature date error:", e);
        }

        // 2. Normalize Amount (handles strings with symbols/commas safely)
        let amtValue = tx.amount;
        if (typeof amtValue === 'string') {
            amtValue = amtValue.replace(/[^0-9.-]/g, '');
        }
        const amount = Number(amtValue || 0).toFixed(2);

        // 3. Normalize Description:
        // - Lowercase, remove all non-alphanumeric
        // - This handles "Apple Macbook" vs "Apple MacBook" vs "Apple-Macbook"
        const desc = (tx.description || '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .trim();

        return `${dateStr}|${amount}|${desc}`;
    };

    const parseFile = async (batchIndex: number = 0) => {
        setParsing(true);
        setError(null);
        setBatchState(null);

        // Only clear state on first batch
        if (batchIndex === 0) {
            setTransactions([]);
            setSelected({});
            setTrickleQueue([]);
            seenSignaturesRef.current = new Set();
        }

        setParsingStatus('reading');
        setProgress(10);

        // Initialize AbortController
        abortControllerRef.current = new AbortController();

        try {
            // Stage 1: File Preparation
            await new Promise(r => setTimeout(r, 500));
            setParsingStatus('extracting');
            setProgress(20);

            const response = await fetch('/api/ai/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId, fileUrl, accountType, importRules, batchIndex }),
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
                            const uniqueNewTxs = data.transactions
                                .map((tx: any) => {
                                    const sig = getTransactionSignature(tx);
                                    if (seenSignaturesRef.current.has(sig)) return null;
                                    seenSignaturesRef.current.add(sig);

                                    // Sanitize Amount for display/state
                                    let amt = tx.amount;
                                    if (typeof amt === 'string') {
                                        amt = parseFloat(amt.replace(/[^0-9.-]/g, ''));
                                    }

                                    return {
                                        ...tx,
                                        amount: isNaN(amt) ? 0 : amt,
                                        selected: true,
                                        type: tx.is_income ? 'credit' : 'debit'
                                    };
                                })
                                .filter(Boolean) as any[];

                            if (uniqueNewTxs.length > 0) {
                                // Use the signature as the unique key (tempId)
                                // This solves the "duplicate key 0" error forever.
                                const finalTxs = uniqueNewTxs.map(tx => ({
                                    ...tx,
                                    tempId: getTransactionSignature(tx)
                                }));

                                setTotalPossibleCount(prev => prev + finalTxs.length);
                                
                                // Internal deduplication check before adding to queue
                                setTrickleQueue(prev => {
                                    const next = [...prev];
                                    for (const tx of finalTxs) {
                                        // Final check to prevent race conditions or AI repetition
                                        const isAlreadyInQueue = next.some(qTx => qTx.tempId === tx.tempId);
                                        if (!isAlreadyInQueue) {
                                            next.push(tx);
                                        }
                                    }
                                    return next;
                                });
                            }

                            if (data.progress) setProgress(data.progress);
                        }

                        // Handle completion
                        if (data.status === 'complete') {
                            setParsingStatus('completing');
                            setProgress(data.progress || 100);

                            if (data.newBalance !== undefined) {
                                setCreditBalance(data.newBalance);
                                queryClient.setQueryData(['profile', userId], (oldData: any) => {
                                    if (!oldData) return oldData;
                                    return { ...oldData, credit_balance: data.newBalance };
                                });
                            }

                            // Store batch info for Continue button
                            if (data.hasMore) {
                                setBatchState({
                                    hasMore: true,
                                    nextBatchIndex: data.nextBatchIndex,
                                    totalChunks: data.totalChunks,
                                });
                            } else {
                                setBatchState(null);
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

            if (batchState?.hasMore) {
                toast.success(`Batch complete! Found ${localTransactionCountRef.current} transactions so far. More remaining.`);
            } else {
                toast.success(`AI discovered ${localTransactionCountRef.current} transactions in real-time`);
            }
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

    const toggleSelect = (id: string) => {
        setSelected(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCategoryChange = (id: string, field: 'main_category' | 'category' | 'sub_category', value: string) => {
        setTransactions(prev => prev.map(tx => {
            if (tx.tempId === id) {
                const updated = { ...tx, [field]: value };
                // If main_category changes, we can optionally pick a default broad category
                if (field === 'main_category' && !tx.category) {
                    updated.category = CATEGORY_MAP[value][0];
                }
                return updated;
            }
            return tx;
        }));
    };

    const getCategorySummary = () => {
        const summary: Record<string, Record<string, number>> = {};
        
        transactions.forEach(tx => {
            if (!selected[tx.tempId]) return;
            const main = tx.main_category || 'Uncategorized';
            const sub = tx.sub_category || 'Other';
            
            if (!summary[main]) summary[main] = {};
            if (!summary[main][sub]) summary[main][sub] = 0;
            
            // We use absolute value for summary or actual? 
            // The user asked for "total summary", usually absolute spend or net?
            // Given the context of "Business/Personal", we'll track absolute spend.
            summary[main][sub] += Math.abs(tx.amount || 0);
        });
        
        return summary;
    };

    const selectAll = (checked: boolean) => {
        // If checking (checked === true), select all
        // If unchecking (checked === false or essentially !checked if passed as boolean), unselect all
        // Checkbox onCheckedChange gives `CheckedState` which is boolean | 'indeterminate'.
        // We'll treat it as boolean.

        const newSelected: Record<string, boolean> = {};
        transactions.forEach(tx => {
            newSelected[tx.tempId] = checked;
        });
        setSelected(newSelected);
    };

    const saveTransactions = async () => {
        setSaving(true);
        const records = transactions
            .filter(tx => selected[tx.tempId])
            .map(tx => {
                const { tempId, account_name, reasoning, ai_confidence, selected, type, ...rest } = tx;
                // Prepend account name to description if available
                const finalDescription = account_name && tx.description && !tx.description.includes(account_name)
                    ? `[${account_name}] ${tx.description}`
                    : tx.description || account_name || 'No description';
                
                return {
                    ...rest,
                    description: finalDescription,
                    source: 'upload',
                    source_file_id: fileId,
                    tax_year: new Date(tx.date).getFullYear(),
                    main_category: tx.main_category,
                    business_flag: tx.main_category?.toLowerCase(),
                    category: tx.category || tx.sub_category || tx.main_category,
                    sub_category: tx.sub_category,
                    naira_value: tx.currency === 'NGN' || !tx.currency ? tx.amount : tx.amount
                };
            });

        try {
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
                <p className="text-xs text-slate-500 mt-1">
                    Upload bank statements, receipts, and even <b>WhatsApp chat screenshots</b> to automatically extract transactions.
                </p>
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
                        <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
                            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <p className="text-sm text-amber-800 dark:text-amber-300">
                                <span className="font-bold">Pro tip:</span> Upload monthly statements instead of full-year exports for significantly faster AI processing.
                            </p>
                        </div>
                            <div className="flex flex-col gap-4 p-4 mb-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <Label className="text-sm font-bold flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-emerald-500" />
                                    Import Context
                                </Label>
                                <RadioGroup 
                                    defaultValue="business" 
                                    value={accountType} 
                                    onValueChange={setAccountType}
                                    className="flex items-center gap-6"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="business" id="business" />
                                        <Label htmlFor="business" className="cursor-pointer font-medium">Business Transactions</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="personal" id="personal" />
                                        <Label htmlFor="personal" className="cursor-pointer font-medium">Personal Transactions</Label>
                                    </div>
                                </RadioGroup>
                                <p className="text-[10px] text-slate-500">
                                    This tells the AI how to initially classify this batch of transactions.
                                </p>
                            </div>

                        <div className="space-y-4">
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

                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                            {/* Credits Display */}
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Available Balance</span>
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all duration-300",
                                            (creditBalance || 0) > 0 
                                                ? "bg-emerald-50/50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400" 
                                                : "bg-red-50/50 border-red-100 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
                                        )}>
                                            <Zap className="w-3 h-3" />
                                            <span>{creditBalance !== null ? creditBalance : '...'} Credits</span>
                                        </div>
                                        {(creditBalance === 0) && (
                                            <Link href="/subscription">
                                                <Button variant="ghost" size="sm" className="text-emerald-600 h-7 px-2 text-[10px] font-bold hover:bg-emerald-50">TOP UP</Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Extraction Controls */}
                            <div className="flex items-center gap-4 bg-slate-50/80 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-300 hover:shadow-md">
                                <div className="flex items-center gap-3 px-2 border-r border-slate-200 dark:border-slate-700 mr-1">
                                    <Switch 
                                        id="ai-extract-toggle" 
                                        checked={aiToggle} 
                                        onCheckedChange={setAiToggle}
                                        className="data-[state=checked]:bg-emerald-500 scale-90"
                                    />
                                    <Label htmlFor="ai-extract-toggle" className="text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer whitespace-nowrap">
                                        Use AI <span className="text-[10px] text-slate-400 font-normal ml-1">(1 Credit)</span>
                                    </Label>
                                </div>
                                <Button
                                    onClick={() => parseFile(0)}
                                    disabled={parsing || !aiToggle || (creditBalance !== null && creditBalance < 1)}
                                    className={cn(
                                        "h-10 px-6 rounded-lg font-bold text-xs transition-all duration-300 shadow-sm",
                                        "bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-200 dark:disabled:bg-slate-800"
                                    )}
                                >
                                    {parsing ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                            Reading data...
                                        </>
                                    ) : (
                                        <>
                                            <Brain className="w-3.5 h-3.5 mr-2" />
                                            Analyze with AI
                                        </>
                                    )}
                                </Button>
                            </div>
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

                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-emerald-500" />
                                    Categorized Extraction Summary
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {Object.entries(getCategorySummary()).map(([main, subs]) => (
                                        <div key={main} className="space-y-2">
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{main}</div>
                                            <div className="space-y-1">
                                                {Object.entries(subs).map(([sub, total]) => (
                                                    <div key={sub} className="flex justify-between text-sm py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                        <span className="text-slate-600 dark:text-slate-400">{(categoryLabels[sub] || sub).replace(/_/g, ' ')}</span>
                                                        <span className="font-medium">₦{total.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between text-sm font-bold pt-1 text-emerald-600">
                                                    <span>Total</span>
                                                    <span>₦{Object.values(subs).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {Object.keys(getCategorySummary()).length === 0 && (
                                        <div className="col-span-3 text-center py-4 text-slate-400 text-sm">
                                            No transactions selected for summary
                                        </div>
                                    )}
                                </div>
                            </div>

                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[400px] overflow-y-auto overflow-x-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b border-slate-200 dark:border-slate-700">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Account</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Amount</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Taxable</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Category</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sub Category</TableHead>
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
                                                <TableCell className="text-xs whitespace-nowrap text-slate-600 dark:text-slate-400">
                                                    {tx.date ? format(new Date(tx.date), 'MMM d, yyyy') : '-'}
                                                </TableCell>
                                                <TableCell className="text-[10px] font-medium text-slate-900 dark:text-slate-200 truncate max-w-[120px]" title={tx.account_name}>
                                                    {tx.account_name || <span className="text-slate-400 dark:text-slate-600 italic">None</span>}
                                                </TableCell>
                                                <TableCell className="text-[10px] font-medium text-slate-600 dark:text-slate-400 truncate max-w-[150px]" title={tx.description}>
                                                    {tx.description}
                                                </TableCell>
                                                <TableCell className={cn(tx.is_income ? 'text-emerald-600' : 'text-red-600', "whitespace-nowrap font-bold")}>
                                                    {tx.is_income ? '+' : '-'}{tx.currency || '₦'}{tx.amount?.toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn(
                                                        "text-[10px] uppercase font-bold px-2 border-0 shadow-sm", 
                                                        tx.main_category === 'Business' ? "bg-emerald-600 text-white" : "bg-slate-500 text-white"
                                                    )}>
                                                        {tx.main_category === 'Business' ? 'Yes' : 'No'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={tx.main_category || 'Business'}
                                                        onValueChange={(val) => handleCategoryChange(tx.tempId, 'main_category', val)}
                                                    >
                                                        <SelectTrigger className="h-8 text-[10px] w-[80px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                                            <SelectValue placeholder="Category" />
                                                        </SelectTrigger>
                                                        <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                                                            <SelectItem value="Business">Business</SelectItem>
                                                            <SelectItem value="Personal">Personal</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={tx.sub_category || tx.category || ''}
                                                        onChange={(e) => handleCategoryChange(tx.tempId, 'sub_category', e.target.value)}
                                                        className="h-8 text-[10px] w-[120px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-emerald-500"
                                                        placeholder="Specific detail..."
                                                    />
                                                </TableCell>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex gap-3">
                            {/* Datalist for subcategory suggestions */}
                            <datalist id="subcategory-suggestions">
                                {ALL_SUBCATEGORIES.map(sub => (
                                    <option key={sub} value={sub}>{categoryLabels[sub] || sub}</option>
                                ))}
                            </datalist>
                            <Button
                                onClick={saveTransactions}
                                disabled={saving || selectedCount === 0}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-lg shadow-emerald-500/20"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Confirm & Save {selectedCount} Transactions
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}
                {/* Continue Processing Banner — always visible when more batches remain */}
                <AnimatePresence>
                    {batchState?.hasMore && !parsing && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="mt-4 p-5 rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-900/20 backdrop-blur-sm"
                        >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center shrink-0">
                                        <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                                            Batch {batchState.nextBatchIndex} of {batchState.totalChunks} ready
                                        </h4>
                                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                                            Found {transactions.length} transactions so far. More data remaining in your document.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setBatchState(null)}
                                        className="text-xs text-slate-400 hover:text-slate-600"
                                    >
                                        Stop here
                                    </Button>
                                    <Button
                                        onClick={() => parseFile(batchState.nextBatchIndex)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex-1 sm:flex-none"
                                    >
                                        Continue →
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </CardContent>
        </Card>
    );
}
