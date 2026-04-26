import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeSyncOptions {
  table: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: (payload: any) => void;
}

export const useRealtimeSync = (options: UseRealtimeSyncOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const {
    table,
    event = '*',
    filter,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
  } = options;

  const handleInsert = useCallback((payload: any) => {
    if (onInsert) onInsert(payload);
    if (onChange) onChange(payload);
  }, [onInsert, onChange]);

  const handleUpdate = useCallback((payload: any) => {
    if (onUpdate) onUpdate(payload);
    if (onChange) onChange(payload);
  }, [onUpdate, onChange]);

  const handleDelete = useCallback((payload: any) => {
    if (onDelete) onDelete(payload);
    if (onChange) onChange(payload);
  }, [onDelete, onChange]);

  useEffect(() => {
    const channelName = `realtime_${table}_${Date.now()}`;
    const channel = supabase.channel(channelName);

    const config: any = {
      event,
      schema: 'public',
      table,
    };

    if (filter) {
      config.filter = filter;
    }

    if (event === '*') {
      channel
        .on('postgres_changes', { ...config, event: 'INSERT' }, handleInsert)
        .on('postgres_changes', { ...config, event: 'UPDATE' }, handleUpdate)
        .on('postgres_changes', { ...config, event: 'DELETE' }, handleDelete);
    } else {
      const handler = event === 'INSERT' ? handleInsert : event === 'UPDATE' ? handleUpdate : handleDelete;
      channel.on('postgres_changes', config, handler);
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to ${table} realtime updates`);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, event, filter, handleInsert, handleUpdate, handleDelete]);
};

export const useRealtimeProjects = (onUpdate: () => void, filter?: string) => {
  useRealtimeSync({
    table: 'chantiers',
    onChange: onUpdate,
    filter,
  });
};

export const useRealtimeExpenses = (onUpdate: () => void, filter?: string) => {
  useRealtimeSync({
    table: 'expenses',
    onChange: onUpdate,
    filter,
  });
};

export const useRealtimeInvoices = (onUpdate: () => void, filter?: string) => {
  useRealtimeSync({
    table: 'invoices',
    onChange: onUpdate,
    filter,
  });
};

export const useRealtimeStock = (onUpdate: () => void) => {
  useRealtimeSync({
    table: 'stock_items',
    onChange: onUpdate,
  });
};

export const useRealtimePlanning = (onUpdate: () => void, filter?: string) => {
  useRealtimeSync({
    table: 'planning',
    onChange: onUpdate,
    filter,
  });
};

export const useRealtimePlanningTechnicians = (onUpdate: () => void, filter?: string) => {
  useRealtimeSync({
    table: 'planning_technicians',
    onChange: onUpdate,
    filter,
  });
};

export const useRealtimeQuotes = (onUpdate: () => void, filter?: string) => {
  useRealtimeSync({
    table: 'quote_requests',
    onChange: onUpdate,
    filter,
  });
};

export const useRealtimeAppointments = (onUpdate: () => void, filter?: string) => {
  useRealtimeSync({
    table: 'appointments',
    onChange: onUpdate,
    filter,
  });
};

export const useRealtimeUsers = (onUpdate: () => void) => {
  useRealtimeSync({
    table: 'app_users',
    onChange: onUpdate,
  });
};

export const useRealtimeMessages = (onUpdate: () => void, filter?: string) => {
  useRealtimeSync({
    table: 'messages',
    onChange: onUpdate,
    filter,
  });
};

export const useRealtimeNotifications = (onUpdate: () => void, userId?: string) => {
  useRealtimeSync({
    table: 'notifications',
    onChange: onUpdate,
    filter: userId ? `user_id=eq.${userId}` : undefined,
  });
};

export const useRealtimeAlerts = (onUpdate: () => void, userId?: string) => {
  useRealtimeSync({
    table: 'admin_alerts',
    onChange: onUpdate,
    filter: userId ? `recipient_id=eq.${userId}` : undefined,
  });
};

export const useRealtimeTechnicians = (onUpdate: () => void, filter?: string) => {
  useRealtimeSync({
    table: 'technicians',
    onChange: onUpdate,
    filter,
  });
};
