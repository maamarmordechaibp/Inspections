import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';

export interface Notification {
  id: string;
  inspector_id: string;
  inspector_name: string;
  title: string;
  body: string;
  inspection_count: number;
  scheduled_date: string;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      // Technicians only see their own notifications; admins/managers see all
      if (user.role === 'technician') {
        query = query.eq('inspector_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotifications((data || []) as Notification[]);
    } catch {
      // If Supabase fails, fall back to empty — notifications are non-critical
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch {
      // Best effort
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    try {
      const query = user?.role === 'technician'
        ? supabase.from('notifications').update({ is_read: true }).eq('inspector_id', user.id)
        : supabase.from('notifications').update({ is_read: true });

      await query.in('id', unreadIds);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Best effort
    }
  }, [notifications, user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh: fetchNotifications };
}