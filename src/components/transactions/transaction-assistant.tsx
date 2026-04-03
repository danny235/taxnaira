"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Loader2, Sparkles, Edit2, Trash2, ChevronDown, ChevronUp, MessageSquare, Zap } from "lucide-react";
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
    embedded?: boolean;
    initialMessage?: string | null;
    context?: string;
}

export default function TransactionAssistant({
    transactions = [],
    onUpdate,
    creditBalance,
    onCreditUpdate,
    userId,
    embedded = false,
    initialMessage = null,
    context = "General",
}: TransactionAssistantProps) {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(embedded);

    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: initialMessage || 'Hi! I\'m Aza AI, your tax assistant. I can help you manage your transactions using natural language.\n\nTry asking me to:',
        },
    ]);

    useEffect(() => {
        if (initialMessage) {
            setMessages([
                {
                    role: "assistant",
                    content: initialMessage,
                }
            ]);
        }
    }, [initialMessage]);

    const suggestions = [
        "Add salary of ₦500k",
        "Categorize POS as personal",
        "Delete transactions < ₦100"
    ];
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const handleSend = async (overrideInput?: string) => {
        const textToSend = overrideInput || input;
        const trimmed = textToSend.trim();
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
        <div className={cn(
            "w-full rounded-2xl border transition-all duration-300 overflow-hidden",
            isOpen 
                ? "border-emerald-500/30 dark:border-emerald-500/20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg ring-1 ring-emerald-500/10" 
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
        )}>
            {/* Toolbar Header — always visible */}
            {!embedded && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                    <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
                        <div className={cn(
                            "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm shrink-0",
                            isOpen 
                                ? "bg-linear-to-br from-emerald-400 via-emerald-500 to-emerald-600 rotate-0 scale-110" 
                                : "bg-slate-100 dark:bg-slate-800 group-hover:scale-105"
                        )}>
                            <Sparkles className={cn(
                                "w-4 h-4 sm:w-5 sm:h-5 transition-colors",
                                isOpen ? "text-white animate-pulse" : "text-emerald-500"
                            )} />
                        </div>
                        <div className="text-left min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                 <span className="font-bold text-[13px] sm:text-sm text-slate-900 dark:text-white truncate">
                                    AI Transaction Assistant
                                </span>
                                {!isOpen && (
                                    <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-1 sm:px-1.5 py-0.5 rounded shrink-0">
                                        <Zap className="w-2 sm:w-2.5 h-2 sm:h-2.5 fill-current" /> Magic
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1 sm:line-clamp-none">
                                Add, bulk edit, recategorize, or delete transactions using natural language
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-1 sm:ml-0">
                        {creditBalance !== null && (
                            <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 hidden xs:block" />
                                 <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                    {creditBalance} <span className="hidden xs:inline">Credits</span>
                                </span>
                            </div>
                        )}
                        <div className="p-1 sm:p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 transition-colors group-hover:bg-slate-100 dark:group-hover:bg-slate-700">
                            {isOpen ? (
                                <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                            ) : (
                                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                            )}
                        </div>
                    </div>
                </button>
            )}


            {/* Expandable Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={embedded ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className={cn("overflow-hidden", embedded && "flex-1 flex flex-col")}
                    >
                        <div className={cn("border-t border-slate-200 dark:border-slate-700", embedded && "flex-1 flex flex-col border-0")}>
                            {/* Messages */}
                            <div className={cn(
                                "overflow-y-auto p-5 space-y-4 max-h-[350px] bg-slate-50/50 dark:bg-slate-900/50",
                                embedded && "flex-1 max-h-none"
                            )}>

                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex flex-col",
                                            msg.role === "user" ? "items-end" : "items-start"
                                        )}
                                    >
                                        <div className="flex items-center gap-1.5 mb-1 px-1">
                                            {msg.role === "assistant" ? (
                                                <>
                                                    <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold">A</div>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Aza AI</span>
                                                </>
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">You</span>
                                            )}
                                        </div>
                                        <div
                                            className={cn(
                                                "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                                                msg.role === "user"
                                                    ? "bg-emerald-600 text-white rounded-tr-none"
                                                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none"
                                            )}
                                        >
                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                            
                                            {i === 0 && msg.role === "assistant" && (
                                                <div className="flex flex-wrap gap-2 mt-4">
                                                    {suggestions.map((sug, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => handleSend(sug)}
                                                            className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors border border-emerald-200/50 dark:border-emerald-800/50"
                                                        >
                                                            {sug}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {(msg.editCount || msg.deleteCount) ? (
                                                <div className={cn(
                                                    "flex items-center gap-3 mt-3 pt-3 border-t text-xs font-semibold",
                                                    msg.role === "user" ? "border-white/20" : "border-slate-100 dark:border-slate-700"
                                                )}>
                                                    {msg.editCount ? (
                                                        <span className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400">
                                                            <Edit2 className="w-3 h-3" /> {msg.editCount} Updated
                                                        </span>
                                                    ) : null}
                                                    {msg.deleteCount ? (
                                                        <span className={cn(
                                                            "flex items-center gap-1",
                                                            msg.role === "user" ? "text-white" : "text-red-500"
                                                        )}>
                                                            <Trash2 className="w-3 h-3" /> {msg.deleteCount} Deleted
                                                        </span>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="flex flex-col items-start">
                                        <div className="flex items-center gap-1.5 mb-1 px-1">
                                            <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold">A</div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Aza AI</span>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                                            <div className="flex items-center gap-2 text-sm text-emerald-500 font-medium">
                                                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                                                Aza AI is thinking...
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                                <div className="relative flex items-end gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/5 transition-all">
                                    <Textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        placeholder='Type a command e.g. "Add a job for 50k"...'
                                        disabled={isLoading}
                                        className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-sm min-h-[44px] max-h-[120px] resize-none py-3 px-2 shadow-none"
                                        rows={1}
                                    />
                                    <Button
                                        onClick={() => handleSend()}
                                        disabled={isLoading || !input.trim()}
                                        className="h-10 w-10 p-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shrink-0 transition-transform active:scale-95 shadow-md shadow-emerald-500/20"
                                    >
                                        <Send className={cn("w-5 h-5", isLoading && "animate-pulse")} />
                                    </Button>
                                </div>
                                <div className="flex items-center justify-center gap-4 mt-3">
                                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                                        <Zap className="w-2.5 h-2.5 fill-current" /> Instant Actions
                                    </p>
                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        1 Credit Per Request
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
