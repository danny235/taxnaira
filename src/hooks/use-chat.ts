import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useChat(targetUserId?: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchMessages = useCallback(async () => {
    if (!targetUserId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, supabase]);

  useEffect(() => {
    fetchMessages();

    if (!targetUserId) return;

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`chat:${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${targetUserId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, fetchMessages, supabase]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !targetUserId) return;

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, user_id: targetUserId }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      // The message will be added to state via the real-time subscription
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  return { messages, isLoading, sendMessage, refresh: fetchMessages };
}
