'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Loader2, Minus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useChat } from '@/hooks/use-chat'
import { useAuth } from '@/components/auth-provider'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ScrollArea } from '@/components/ui/scroll-area'

export function SupportChat() {
    const { user } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [message, setMessage] = useState('')
    const scrollRef = useRef<HTMLDivElement>(null)

    const { messages, isLoading, sendMessage, markAsRead } = useChat(user?.id)

    const unreadCount = messages.filter(m => m.sender_id !== user?.id && !m.is_read).length

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' })
        }
        if (isOpen && !isMinimized) {
            markAsRead()
        }
    }, [messages, isOpen, isMinimized, markAsRead])

    const handleSend = async () => {
        if (!message.trim()) return
        try {
            await sendMessage(message)
            setMessage('')
        } catch (error) {
            console.error('Failed to send message:', error)
        }
    }

    if (!user) return null

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            <AnimatePresence>
                {isOpen && !isMinimized && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="w-[350px] sm:w-[400px] h-[550px] bg-white dark:bg-slate-900 rounded-4xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 bg-emerald-600 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <MessageSquare className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm leading-tight">AzaWise Support</h3>
                                    <p className="text-[10px] opacity-80 font-medium">We usually reply in minutes</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-lg hover:bg-white/10 text-white"
                                    onClick={() => setIsMinimized(true)}
                                >
                                    <Minus className="w-4 h-4" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-lg hover:bg-white/10 text-white"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <ScrollArea className="flex-1 p-6 bg-slate-50/50 dark:bg-slate-950/20">
                            <div className="space-y-4">
                                <div className="text-center py-4">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Today</p>
                                </div>
                                
                                {messages.length === 0 && !isLoading && (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                        <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed">
                                            Hi {user.email?.split('@')[0]}! 👋 How can we help you today with your tax or finances?
                                        </p>
                                    </div>
                                )}

                                {messages.map((msg, idx) => {
                                    const isUser = msg.sender_id === user.id
                                    return (
                                        <div 
                                            key={idx} 
                                            className={cn(
                                                "flex flex-col max-w-[85%]",
                                                isUser ? "ml-auto items-end" : "items-start"
                                            )}
                                        >
                                            <div 
                                                className={cn(
                                                    "px-4 py-3 rounded-2xl text-xs shadow-sm",
                                                    isUser 
                                                        ? "bg-emerald-600 text-white rounded-tr-none" 
                                                        : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none"
                                                )}
                                            >
                                                {msg.content}
                                            </div>
                                            <span className="text-[9px] text-slate-400 mt-1 px-1">
                                                {format(new Date(msg.created_at), 'h:mm a')}
                                            </span>
                                        </div>
                                    )
                                })}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                             <div className="flex items-center gap-2 p-1 pl-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-emerald-500/10 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
                                <Input 
                                    placeholder="Type a message..."
                                    className="border-0 bg-transparent focus-visible:ring-0 text-xs h-10 shadow-none"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                />
                                <Button 
                                    size="icon" 
                                    className="h-8 w-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                                    onClick={handleSend}
                                    disabled={!message.trim()}
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </Button>
                             </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Button
                    onClick={() => {
                        setIsOpen(true)
                        setIsMinimized(false)
                    }}
                    className={cn(
                        "h-14 w-14 rounded-full shadow-2xl transition-all duration-500 overflow-hidden",
                        isOpen && !isMinimized ? "bg-white text-emerald-600 border border-slate-200" : "bg-emerald-600 text-white"
                    )}
                >
                    {isOpen && !isMinimized ? <Minus className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                    
                    {!isOpen && unreadCount > 0 && (
                         <span className="absolute -top-1 -right-1 flex h-5 w-5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 text-[10px] items-center justify-center text-white font-bold">
                                {unreadCount}
                            </span>
                        </span>
                    )}
                </Button>
            </motion.div>
        </div>
    )
}
