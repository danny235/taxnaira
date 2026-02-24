"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Loader2, Sparkles, Edit2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Message {
    role: "user" | "assistant";
    content: string;
    editCount?: number;
    deleteCount?: number;
}

interface TransactionAssistantProps {
    transactions: any[];
    onUpdate: () => void;
    creditBalance: number | null;
    onCreditUpdate: (balance: number) => void;
    userId: string;
}

export default function TransactionAssistant({
    transactions,
    onUpdate,
    creditBalance,
    onCreditUpdate,
    userId,
}: TransactionAssistantProps) {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content:
                'Tell me what you\'d like to do, e.g.:\n\n• "Change all POS transactions to personal expense"\n• "Delete all transactions under ₦100"\n• "Recategorize bank charges to business expenses"',
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        if (creditBalance !== null && creditBalance < 1) {
            toast.error("Insufficient credits. Please top up.");
            return;
        }

        setInput("");
        const updatedMessages: Message[] = [...messages, { role: "user", content: trimmed }];
        setMessages(updatedMessages);
        setIsLoading(true);

        try {
            // Send conversation history (skip initial greeting) for multi-turn context
            const history = updatedMessages.slice(1).map(m => ({
                role: m.role,
                content: m.content,
            }));

            const response = await fetch("/api/ai/transactions-assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: trimmed, transactions, history }),
            });

            if (response.status === 402) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        content: "You're out of credits! Please top up to continue using the AI assistant.",
                    },
                ]);
                return;
            }

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Something went wrong");
            }

            const data = await response.json();

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: data.reply,
                    editCount: data.editCount,
                    deleteCount: data.deleteCount,
                },
            ]);

            if (data.newBalance !== undefined) {
                onCreditUpdate(data.newBalance);
                // Sync header credits via react-query cache
                queryClient.setQueryData(['profile', userId], (oldData: any) => {
                    if (!oldData) return oldData;
                    return { ...oldData, credit_balance: data.newBalance };
                });
            }

            if (data.editCount > 0 || data.deleteCount > 0) {
                onUpdate();
            }
        } catch (error: any) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: `Sorry, I encountered an error: ${error.message}`,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            {/* Toolbar Header — always visible */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                            AI Transaction Assistant
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Bulk edit, recategorize, or delete transactions using natural language
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {creditBalance !== null && (
                        <span className="text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                            {creditBalance} credits
                        </span>
                    )}
                    {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                </div>
            </button>

            {/* Expandable Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-slate-200 dark:border-slate-700">
                            {/* Messages */}
                            <div className="overflow-y-auto p-4 space-y-3 max-h-[320px]">
                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex",
                                            msg.role === "user" ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                                                msg.role === "user"
                                                    ? "bg-emerald-600 text-white rounded-br-md"
                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-md"
                                            )}
                                        >
                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                            {(msg.editCount || msg.deleteCount) ? (
                                                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/20 dark:border-slate-700 text-xs">
                                                    {msg.editCount ? (
                                                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                            <Edit2 className="w-3 h-3" /> {msg.editCount} edited
                                                        </span>
                                                    ) : null}
                                                    {msg.deleteCount ? (
                                                        <span className="flex items-center gap-1 text-red-500">
                                                            <Trash2 className="w-3 h-3" /> {msg.deleteCount} deleted
                                                        </span>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                Thinking...
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-3 border-t border-slate-200 dark:border-slate-700">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSend();
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <Input
                                        ref={inputRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder='e.g. "Change all POS to personal expense"'
                                        disabled={isLoading}
                                        className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm h-9"
                                    />
                                    <Button
                                        type="submit"
                                        disabled={isLoading || !input.trim()}
                                        className="h-9 w-9 p-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shrink-0"
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </form>
                                <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                                    1 credit per request · Changes are applied instantly
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
