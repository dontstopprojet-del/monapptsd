import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface RealtimeNotificationsProps {
  currentUser: any;
  darkMode: boolean;
  onNotificationClick?: (notification: any) => void;
}

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const RealtimeNotifications = ({ currentUser, darkMode, onNotificationClick }: RealtimeNotificationsProps) => {
  const [_notifications, setNotifications] = useState<Notification[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);
  const [_unreadCount, setUnreadCount] = useState(0);

  const C = {
    primary: '#1e40af',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3b82f6',
    card: darkMode ? '#1e293b' : '#FFFFFF',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#334155' : '#cbd5e1',
  };

  useEffect(() => {
    loadNotifications();

    const notificationsChannel = supabase
      .channel('realtime_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUser.id}`,
      }, (payload) => {
        const newNotification = payload.new as Notification;
        setNotifications((prev) => [newNotification, ...prev]);
        setLatestNotification(newNotification);
        setShowPopup(true);
        setUnreadCount((prev) => prev + 1);

        setTimeout(() => {
          setShowPopup(false);
        }, 5000);
      })
      .subscribe();

    const appUsersChannel = supabase
      .channel('new_user_registrations')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'app_users',
      }, async (payload) => {
        if (currentUser.role === 'admin') {
          const newUser = payload.new as any;
          const roleText = newUser.role === 'tech' ? 'technicien' : newUser.role === 'client' ? 'client' : newUser.role === 'office' ? 'employé de bureau' : 'utilisateur';
          await createNotification({
            type: newUser.role === 'tech' ? 'success' : 'info',
            title: 'Nouveau compte créé',
            message: `${newUser.name} (${roleText}) a créé un compte`,
          });
        }
      })
      .subscribe();

    const quoteRequestsChannel = supabase
      .channel('new_quote_requests')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'quote_requests',
      }, async (payload) => {
        console.log('🔔 NOUVEAU DEVIS REÇU:', payload.new);
        console.log('👤 Current user role:', currentUser.role);
        console.log('✅ Is admin?', currentUser.role === 'admin' || currentUser.role === 'office');

        if (currentUser.role === 'admin' || currentUser.role === 'office') {
          const newQuote = payload.new as any;
          console.log('📧 Création de notification pour admin/office');
          await createNotification({
            type: 'info',
            title: 'Nouvelle demande de devis',
            message: `${newQuote.name} a envoyé une demande de devis pour ${newQuote.service_type}`,
          });
          console.log('✅ Notification créée avec succès');
        } else {
          console.log('❌ User is not admin/office, skipping notification');
        }
      })
      .subscribe();

    const quoteUpdatesChannel = supabase
      .channel('quote_status_updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'quote_requests',
        filter: `user_id=eq.${currentUser.id}`,
      }, async (payload) => {
        const oldQuote = payload.old as any;
        const newQuote = payload.new as any;

        if (oldQuote.status !== newQuote.status) {
          let title = 'Mise à jour de votre projet';
          let message = '';
          let type: 'success' | 'info' | 'warning' | 'error' = 'info';

          switch (newQuote.status) {
            case 'reviewing':
              message = `Votre demande "${newQuote.service_type}" est en cours d'examen`;
              type = 'info';
              break;
            case 'quoted':
              title = 'Devis disponible !';
              message = `Votre devis pour "${newQuote.service_type}" est prêt. Consultez-le dans "Mes chantiers"`;
              type = 'success';
              break;
            case 'accepted':
              title = 'Projet accepté';
              message = `Merci d'avoir accepté ! Nous allons planifier votre projet "${newQuote.service_type}"`;
              type = 'success';
              break;
            case 'completed':
              title = 'Projet terminé';
              message = `Votre projet "${newQuote.service_type}" a été complété avec succès`;
              type = 'success';
              break;
            case 'rejected':
              message = `Votre devis pour "${newQuote.service_type}" a été refusé`;
              type = 'warning';
              break;
            case 'expired':
              message = `Le devis pour "${newQuote.service_type}" a expiré`;
              type = 'warning';
              break;
          }

          if (message) {
            await createNotification({
              type,
              title,
              message,
            });
          }
        }
      })
      .subscribe();

    return () => {
      notificationsChannel.unsubscribe();
      appUsersChannel.unsubscribe();
      quoteRequestsChannel.unsubscribe();
      quoteUpdatesChannel.unsubscribe();
    };
  }, [currentUser]);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const createNotification = async (notif: {
    type: 'success' | 'info' | 'warning' | 'error';
    title: string;
    message: string;
  }) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: currentUser.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationColor = (type: string) => {
    const colors: any = {
      success: C.success,
      info: C.info,
      warning: C.warning,
      error: C.danger,
    };
    return colors[type] || C.info;
  };

  const getNotificationIcon = (type: string) => {
    const icons: any = {
      success: '✓',
      info: 'ℹ',
      warning: '⚠',
      error: '✕',
    };
    return icons[type] || 'ℹ';
  };

  return (
    <>
      {showPopup && latestNotification && (
        <div
          onClick={() => {
            setShowPopup(false);
            markAsRead(latestNotification.id);
            onNotificationClick?.(latestNotification);
          }}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '320px',
            background: C.card,
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            padding: '16px',
            cursor: 'pointer',
            zIndex: 10000,
            borderLeft: `4px solid ${getNotificationColor(latestNotification.type)}`,
            animation: 'slideIn 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: getNotificationColor(latestNotification.type),
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: '800',
                flexShrink: 0,
              }}
            >
              {getNotificationIcon(latestNotification.type)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: C.text, marginBottom: '4px' }}>
                {latestNotification.title}
              </div>
              <div style={{ fontSize: '13px', color: C.textSecondary, lineHeight: '1.4' }}>
                {latestNotification.message}
              </div>
              <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '8px' }}>
                {new Date(latestNotification.created_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export default RealtimeNotifications;
