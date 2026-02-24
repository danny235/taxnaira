"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, X, Send, Loader2, Sparkles, Edit2, Trash2 } from "lucide-react";
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
                'Hi! I\'m your AI transaction assistant. Tell me what you\'d like to do, e.g.:\n\n• "Change all POS transactions to personal expense"\n• "Delete all transactions under ₦100"\n• "Recategorize bank charges to business expenses"',
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
        <>
            {/* Floating Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="fixed bottom-6 right-6 z-50"
                    >
                        <Button
                            onClick={() => setIsOpen(true)}
                            className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all hover:scale-110"
                        >
                            <Bot className="w-6 h-6" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 w-full sm:w-[380px] h-full sm:h-auto sm:max-h-[520px] flex flex-col rounded-none sm:rounded-2xl border-0 sm:border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                <span className="font-bold text-sm">AI Assistant</span>
                                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
                                    {creditBalance !== null ? `${creditBalance} credits` : "..."}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-white hover:bg-white/20"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
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
                                    placeholder="e.g. Delete all POS transactions..."
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
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
