'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Send, Loader2, MessageSquare, User, Clock } from 'lucide-react';
import { useChat } from '@/hooks/use-chat';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function AdminChat() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reply, setReply] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading: chatLoading, sendMessage } = useChat(selectedUser?.user_id);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/admin/chat/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!reply.trim() || !selectedUser) return;
    try {
      await sendMessage(reply);
      setReply('');
    } catch (error) {
      console.error('Reply failed:', error);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 h-[700px] shadow-2xl">
      {/* Sidebar: User List */}
      <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-500" />
            Support Conversations
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search users..."
              className="pl-10 h-10 bg-slate-50 dark:bg-slate-800 border-0 focus-visible:ring-1 focus-visible:ring-emerald-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => (
                <button
                  key={conv.user_id}
                  onClick={() => setSelectedUser(conv)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group",
                    selectedUser?.user_id === conv.user_id
                      ? "bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/10 shadow-sm"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-slate-800">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
                      {conv.user?.full_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {conv.user?.full_name || 'Anonymous User'}
                      </span>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 px-1.5 min-w-5 h-5 flex items-center justify-center rounded-full text-[10px]">
                          {conv.unreadCount}
                        </Badge>
                      )}

                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate line-clamp-1 opacity-80">
                      {conv.lastMessage}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {format(new Date(conv.lastDate), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">
                <p>No conversations found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/30">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
                      {selectedUser.user?.full_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white leading-tight">
                        {selectedUser.user?.full_name}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                        {selectedUser.user?.email}
                    </p>
                  </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="w-5 h-5 text-slate-400" />
              </Button>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 px-8 py-6">
              <div className="space-y-6">
                {chatLoading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isSelf = msg.sender_id !== selectedUser.user_id;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex flex-col max-w-[80%]",
                          isSelf ? "ml-auto items-end" : "items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "px-4 py-3 rounded-2xl text-sm shadow-sm",
                            isSelf
                              ? "bg-emerald-600 text-white rounded-tr-none"
                              : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none"
                          )}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1 flex items-center gap-1 opacity-60">
                           {format(new Date(msg.created_at), 'h:mm a')}
                           {isSelf && msg.is_read && <span className="w-1 h-1 rounded-full bg-emerald-500 ml-1" />}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <div className="relative flex items-end gap-3 p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-emerald-500/10 focus-within:border-emerald-500/50 transition-all">
                <Input
                  placeholder="Type your reply..."
                  className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-sm h-12"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/20"
                  onClick={handleSendReply}
                  disabled={!reply.trim()}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
             <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6 opacity-30">
               <MessageSquare className="w-12 h-12" />
             </div>
             <h3 className="text-xl font-bold text-slate-600 dark:text-slate-200">No User Selected</h3>
             <p className="max-w-xs text-center mt-2 font-medium opacity-60">
               Select a conversation from the left to start replying to support requests.
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
