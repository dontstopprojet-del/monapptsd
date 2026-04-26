import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { incomingRingtone, notificationSound } from '../utils/ringtones';

interface IncomingCallData {
  callerUser: any;
  conversationId: string;
  signalId: string;
  callType: 'voice' | 'video';
}

interface NotificationContextType {
  unreadMessageCount: number;
  missedCallCount: number;
  totalBadgeCount: number;
  incomingCall: IncomingCallData | null;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
  refreshUnreadCount: () => void;
  clearMissedCalls: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadMessageCount: 0,
  missedCallCount: 0,
  totalBadgeCount: 0,
  incomingCall: null,
  acceptIncomingCall: () => {},
  rejectIncomingCall: () => {},
  refreshUnreadCount: () => {},
  clearMissedCalls: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

interface Props {
  currentUser: any;
  children: React.ReactNode;
  onAcceptCall?: (call: IncomingCallData) => void;
}

export const NotificationProvider = ({ currentUser, children, onAcceptCall }: Props) => {
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [missedCallCount, setMissedCallCount] = useState(0);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const missedCallTimeout = useRef<number | null>(null);
  const onAcceptCallRef = useRef(onAcceptCall);
  onAcceptCallRef.current = onAcceptCall;
  const incomingCallRef = useRef(incomingCall);
  incomingCallRef.current = incomingCall;

  const refreshUnreadCount = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const { data: convos } = await supabase
        .from('conversations')
        .select('id')
        .or(`participant_1_id.eq.${currentUser.id},participant_2_id.eq.${currentUser.id}`);

      if (!convos || convos.length === 0) {
        setUnreadMessageCount(0);
        return;
      }

      const convoIds = convos.map(c => c.id);
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', convoIds)
        .eq('is_read', false)
        .neq('sender_id', currentUser.id);

      setUnreadMessageCount(count || 0);
    } catch {}
  }, [currentUser?.id]);

  const refreshMissedCalls = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const { count } = await supabase
        .from('call_history')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', currentUser.id)
        .eq('status', 'missed')
        .eq('is_read', false);

      setMissedCallCount(count || 0);
    } catch {}
  }, [currentUser?.id]);

  const clearMissedCalls = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      await supabase
        .from('call_history')
        .update({ is_read: true })
        .eq('receiver_id', currentUser.id)
        .eq('status', 'missed')
        .eq('is_read', false);
      setMissedCallCount(0);
    } catch {}
  }, [currentUser?.id]);

  const acceptIncomingCall = useCallback(() => {
    const call = incomingCallRef.current;
    if (!call) return;
    incomingRingtone.stop();
    if (missedCallTimeout.current) {
      clearTimeout(missedCallTimeout.current);
      missedCallTimeout.current = null;
    }
    setIncomingCall(null);
    onAcceptCallRef.current?.(call);
  }, []);

  const rejectIncomingCall = useCallback(async () => {
    const call = incomingCallRef.current;
    if (!call) return;
    incomingRingtone.stop();
    if (missedCallTimeout.current) {
      clearTimeout(missedCallTimeout.current);
      missedCallTimeout.current = null;
    }

    try {
      await supabase.from('call_signals')
        .update({ status: 'rejected' })
        .eq('id', call.signalId);

      await supabase.from('call_signals').insert({
        conversation_id: call.conversationId,
        caller_id: currentUser.id,
        receiver_id: call.callerUser.id,
        signal_type: 'call_reject',
        signal_data: {},
        status: 'rejected',
      });
    } catch {}

    setIncomingCall(null);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    refreshUnreadCount();
    refreshMissedCalls();

    const msgChannel = supabase
      .channel(`global_msg_notif_${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id !== currentUser.id) {
          setUnreadMessageCount(prev => prev + 1);
          notificationSound.playNotificationSound();

          (async () => {
            try {
              const { data: sender } = await supabase
                .from('app_users')
                .select('name')
                .eq('id', msg.sender_id)
                .maybeSingle();

              const senderName = sender?.name || 'Quelqu\'un';
              const contentPreview = msg.message_type === 'image'
                ? 'a envoy\u00E9 une image'
                : msg.message_type === 'audio'
                ? 'a envoy\u00E9 un message vocal'
                : msg.message_type === 'invoice'
                ? 'a envoy\u00E9 une facture'
                : (msg.content?.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content);

              await supabase.from('notifications').insert({
                user_id: currentUser.id,
                type: 'info',
                title: `Nouveau message de ${senderName}`,
                message: contentPreview,
              });
            } catch {}
          })();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      }, () => {
        refreshUnreadCount();
      })
      .subscribe();

    const callChannel = supabase
      .channel(`global_call_notif_${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_signals',
        filter: `receiver_id=eq.${currentUser.id}`,
      }, async (payload) => {
        const signal = payload.new as any;
        if (signal.status !== 'ringing') return;
        if (signal.signal_type !== 'offer' && signal.signal_type !== 'video_offer') return;
        if (incomingCallRef.current) return;

        let callerData = null;
        try {
          const { data } = await supabase
            .from('app_users')
            .select('*')
            .eq('id', signal.caller_id)
            .maybeSingle();
          callerData = data;
        } catch {}

        const callData: IncomingCallData = {
          callerUser: callerData || { id: signal.caller_id, name: 'Utilisateur', role: 'client' },
          conversationId: signal.conversation_id,
          signalId: signal.id,
          callType: signal.signal_type === 'video_offer' ? 'video' : 'voice',
        };

        setIncomingCall(callData);
        incomingRingtone.playIncomingRingtone();

        missedCallTimeout.current = window.setTimeout(async () => {
          incomingRingtone.stop();
          setIncomingCall(prev => {
            if (prev?.signalId === signal.id) {
              (async () => {
                try {
                  await supabase.from('call_signals')
                    .update({ status: 'missed' })
                    .eq('id', signal.id);

                  await supabase.from('call_history').insert({
                    conversation_id: signal.conversation_id,
                    caller_id: signal.caller_id,
                    receiver_id: currentUser.id,
                    call_type: signal.signal_type === 'video_offer' ? 'video' : 'voice',
                    status: 'missed',
                    is_urgent: false,
                    duration_seconds: 0,
                    started_at: signal.created_at,
                    ended_at: new Date().toISOString(),
                  });
                } catch {}
                setMissedCallCount(c => c + 1);
              })();
              return null;
            }
            return prev;
          });
        }, 30000);
      })
      .subscribe();

    const callEndChannel = supabase
      .channel(`global_call_end_${currentUser.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_signals',
        filter: `receiver_id=eq.${currentUser.id}`,
      }, (payload) => {
        const signal = payload.new as any;
        if (signal.status === 'ended' || signal.status === 'missed') {
          setIncomingCall(prev => {
            if (prev?.signalId === signal.id) {
              incomingRingtone.stop();
              if (missedCallTimeout.current) {
                clearTimeout(missedCallTimeout.current);
                missedCallTimeout.current = null;
              }
              return null;
            }
            return prev;
          });
        }
      })
      .subscribe();

    return () => {
      msgChannel.unsubscribe();
      callChannel.unsubscribe();
      callEndChannel.unsubscribe();
      incomingRingtone.stop();
      if (missedCallTimeout.current) clearTimeout(missedCallTimeout.current);
    };
  }, [currentUser?.id, refreshUnreadCount, refreshMissedCalls]);

  const totalBadgeCount = unreadMessageCount + missedCallCount;

  return (
    <NotificationContext.Provider value={{
      unreadMessageCount,
      missedCallCount,
      totalBadgeCount,
      incomingCall,
      acceptIncomingCall,
      rejectIncomingCall,
      refreshUnreadCount,
      clearMissedCalls,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
