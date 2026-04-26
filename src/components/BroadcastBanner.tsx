import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  target_roles: string[];
  image_url: string | null;
}

interface Props {
  userRole: 'client' | 'tech' | 'office' | 'visitor';
  darkMode?: boolean;
}

const TYPE_CONFIG: Record<string, { icon: string; gradient: string; border: string }> = {
  announcement: { icon: '📢', gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)', border: '#0891b2' },
  promotion: { icon: '🎉', gradient: 'linear-gradient(135deg, #059669, #10b981)', border: '#059669' },
  alert: { icon: '🚨', gradient: 'linear-gradient(135deg, #dc2626, #ef4444)', border: '#dc2626' },
  info: { icon: 'ℹ️', gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)', border: '#2563eb' },
};

const BroadcastBanner = ({ userRole, darkMode = false }: Props) => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = sessionStorage.getItem('dismissed_broadcasts');
    if (saved) setDismissed(new Set(JSON.parse(saved)));
  }, []);

  useEffect(() => {
    const fetchBroadcasts = async () => {
      const { data } = await supabase
        .from('admin_broadcasts')
        .select('id, title, message, type, priority, target_roles, image_url')
        .eq('is_active', true)
        .lte('starts_at', new Date().toISOString())
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      const filtered = (data || []).filter(b => b.target_roles.includes(userRole));
      setBroadcasts(filtered);
    };

    fetchBroadcasts();

    const channel = supabase
      .channel('broadcasts_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_broadcasts' }, () => {
        fetchBroadcasts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userRole]);

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    sessionStorage.setItem('dismissed_broadcasts', JSON.stringify([...next]));
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const visible = broadcasts.filter(b => !dismissed.has(b.id));
  if (visible.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 12px 0' }}>
      {visible.map(b => {
        const config = TYPE_CONFIG[b.type] || TYPE_CONFIG.info;
        const isExpanded = expanded.has(b.id);
        const isLong = b.message.length > 100;

        return (
          <div
            key={b.id}
            style={{
              background: darkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
              borderRadius: '12px',
              borderLeft: `4px solid ${config.border}`,
              padding: '10px 12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              animation: 'slideDown 0.3s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: config.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                flexShrink: 0,
              }}>
                {config.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: '700',
                  fontSize: '13px',
                  color: darkMode ? '#f1f5f9' : '#1e293b',
                  marginBottom: '2px',
                }}>
                  {b.title}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: darkMode ? '#94a3b8' : '#64748b',
                  lineHeight: '1.5',
                  overflow: 'hidden',
                  maxHeight: isLong && !isExpanded ? '36px' : 'none',
                }}>
                  {b.message}
                </div>
                {isLong && (
                  <button
                    onClick={() => toggleExpand(b.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: config.border,
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: '2px 0',
                    }}
                  >
                    {isExpanded ? 'Moins' : 'Lire plus...'}
                  </button>
                )}
                {b.image_url && (
                  <img
                    src={b.image_url}
                    alt=""
                    style={{
                      width: '100%', maxHeight: '120px',
                      objectFit: 'cover', borderRadius: '8px',
                      marginTop: '6px',
                    }}
                  />
                )}
              </div>
              <button
                onClick={() => dismiss(b.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: darkMode ? '#64748b' : '#94a3b8',
                  fontSize: '16px',
                  cursor: 'pointer',
                  padding: '0',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default BroadcastBanner;
