'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Send, Loader2, MessageSquare, User, Clock, ChevronLeft } from 'lucide-react';
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

  const { messages, isLoading: chatLoading, sendMessage, markAsRead } = useChat(selectedUser?.user_id);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (selectedUser) {
      markAsRead();
      setConversations(prev => prev.map(c => 
        c.user_id === selectedUser.user_id ? { ...c, unreadCount: 0 } : c
      ));
    }
  }, [messages, selectedUser, markAsRead]);

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
    <div className="flex flex-col lg:flex-row bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 h-[600px] lg:h-[700px] shadow-2xl">
      {/* Sidebar: User List */}
      <div className={cn(
        "w-full lg:w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col",
        selectedUser && "hidden lg:flex"
      )}>
        <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg lg:text-xl font-bold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500" />
            Support
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
                    "w-full flex items-center gap-3 p-3 rounded-2xl transition-all",
                    selectedUser?.user_id === conv.user_id
                      ? "bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/10 shadow-sm"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold">
                      {conv.user?.full_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-white truncate text-sm">
                        {conv.user?.full_name || 'Anonymous'}
                      </span>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 px-1.5 h-4 flex items-center justify-center rounded-full text-[10px]">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate opacity-80">
                      {conv.lastMessage}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">
                <p>No conversations found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/30",
        !selectedUser && "hidden lg:flex"
      )}>
        <ChatWindow 
          selectedUser={selectedUser} 
          setSelectedUser={setSelectedUser} 
          messages={messages} 
          chatLoading={chatLoading} 
          sendMessage={sendMessage} 
          reply={reply} 
          setReply={setReply} 
          messagesEndRef={messagesEndRef} 
          handleSendReply={handleSendReply} 
        />
      </div>
    </div>
  );
}

function ChatWindow({ 
  selectedUser, 
  setSelectedUser, 
  messages, 
  chatLoading, 
  reply, 
  setReply, 
  messagesEndRef, 
  handleSendReply 
}: any) {
  if (!selectedUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 opacity-50">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-600 dark:text-slate-200">No User Selected</h3>
        <p className="max-w-xs mx-auto mt-2 text-sm opacity-60">
          Select a conversation to start replying to support requests.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="px-4 lg:px-6 py-3 lg:py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden h-8 w-8" 
            onClick={() => setSelectedUser(null)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Avatar className="h-8 w-8 lg:h-10 lg:w-10">
            <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold">
              {selectedUser.user?.full_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white leading-tight text-sm lg:text-base truncate">
              {selectedUser.user?.full_name || 'Anonymous'}
            </h3>
            <p className="text-[10px] lg:text-xs text-slate-400 truncate">
              {selectedUser.user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 lg:p-6 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="space-y-4 lg:space-y-6">
          {chatLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
          ) : (
            messages.map((msg: any, i: number) => {
              const isSelf = msg.sender_id !== selectedUser.user_id;
              return (
                <div
                  key={msg.id || i}
                  className={cn(
                    "flex flex-col max-w-[85%] lg:max-w-[75%]",
                    isSelf ? "ml-auto items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "px-4 py-2 lg:py-3 rounded-2xl text-sm lg:text-sm shadow-sm",
                      isSelf
                        ? "bg-emerald-600 text-white rounded-tr-none"
                        : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 opacity-60 flex items-center gap-1 px-1">
                     <Clock className="w-2.5 h-2.5" />
                     {format(new Date(msg.created_at), 'h:mm a')}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 lg:p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <form 
          className="relative flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendReply();
          }}
        >
          <Input
            placeholder="Type a reply..."
            className="flex-1 bg-slate-50 dark:bg-slate-800/50 border-0 focus-visible:ring-1 focus-visible:ring-emerald-500/50 h-10 lg:h-12 text-sm"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <Button
            size="icon"
            type="submit"
            className="h-10 w-10 lg:h-12 lg:w-12 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
            disabled={!reply.trim()}
          >
            <Send className="w-4 h-4 lg:w-5 lg:h-5" />
          </Button>
        </form>
      </div>
    </>
  );
}
