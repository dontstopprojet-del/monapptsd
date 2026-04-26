import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { safeFixed } from '../utils/safeFormat';

interface RealtimeUserMonitorProps {
  darkMode?: boolean;
}

interface UserStatusInfo {
  user_id: string;
  user_name: string;
  user_role: string;
  status: string;
  current_location_lat: number | null;
  current_location_lng: number | null;
  current_battery: number | null;
  current_kilometers: number;
  current_hours: number;
  is_on_break: boolean;
  break_duration_minutes: number | null;
  last_updated: string;
}

const RealtimeUserMonitor: React.FC<RealtimeUserMonitorProps> = ({ darkMode = false }) => {
  const [users, setUsers] = useState<UserStatusInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'technician' | 'office_employee'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const colors = {
    primary: darkMode ? '#3b82f6' : '#2563eb',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    background: darkMode ? '#1e293b' : '#ffffff',
    surface: darkMode ? '#334155' : '#f8fafc',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#475569' : '#e2e8f0',
  };

  const STATUS_LABELS: Record<string, string> = {
    in_service: 'En service',
    on_break: 'En pause',
    available: 'Disponible',
    sick: 'Malade',
    on_leave: 'En congé',
    offline: 'Hors ligne',
    other: 'Autre',
  };

  const STATUS_COLORS: Record<string, string> = {
    in_service: colors.success,
    on_break: colors.warning,
    available: colors.primary,
    sick: colors.danger,
    on_leave: colors.textSecondary,
    offline: '#64748b',
    other: colors.textSecondary,
  };

  const ROLE_LABELS: Record<string, string> = {
    technician: 'Technicien',
    office_employee: 'Bureau',
    admin: 'Admin',
  };

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);

      const { data: statusData, error: statusError } = await supabase
        .from('user_real_time_status')
        .select('*');

      if (statusError) throw statusError;

      const userIds = statusData?.map(s => s.user_id) || [];

      if (userIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const { data: usersData, error: usersError } = await supabase
        .from('app_users')
        .select('id, name, role')
        .in('id', userIds);

      if (usersError) throw usersError;

      const combined = statusData.map(status => {
        const user = usersData?.find(u => u.id === status.user_id);
        return {
          user_id: status.user_id,
          user_name: user?.name || 'Inconnu',
          user_role: user?.role || 'unknown',
          status: status.status,
          current_location_lat: status.current_location_lat,
          current_location_lng: status.current_location_lng,
          current_battery: status.current_battery,
          current_kilometers: status.current_kilometers,
          current_hours: status.current_hours,
          is_on_break: status.is_on_break,
          break_duration_minutes: status.break_duration_minutes,
          last_updated: status.last_updated,
        };
      });

      setUsers(combined);
      setLoading(false);
    } catch (error) {
      console.error('Error loading users:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();

    const subscription = supabase
      .channel('user_status_monitor')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_real_time_status' },
        () => {
          loadUsers();
        }
      )
      .subscribe();

    const interval = setInterval(loadUsers, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [loadUsers]);

  const filteredUsers = users.filter(user => {
    if (filter !== 'all' && user.user_role !== filter) return false;
    if (statusFilter !== 'all' && user.status !== statusFilter) return false;
    return true;
  });

  const getTimeSinceUpdate = (lastUpdated: string): string => {
    const now = new Date();
    const updated = new Date(lastUpdated);
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${Math.floor(diffHours / 24)}j`;
  };

  if (!loading && users.length === 0) {
    return (
      <div style={{
        padding: '20px',
        background: colors.background,
        borderRadius: '16px',
        border: `1px solid ${colors.border}`,
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: colors.text, marginBottom: '16px' }}>
          Suivi en Temps Réel
        </h2>
        <p style={{ color: colors.textSecondary }}>Aucun utilisateur actif pour le moment.</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      background: colors.background,
      borderRadius: '16px',
      border: `1px solid ${colors.border}`,
    }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: colors.text, marginBottom: '20px' }}>
        Suivi en Temps Réel
      </h2>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            color: colors.text,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <option value="all">Tous les rôles</option>
          <option value="technician">Techniciens</option>
          <option value="office_employee">Bureau</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            color: colors.text,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <option value="all">Tous les statuts</option>
          <option value="in_service">En service</option>
          <option value="on_break">En pause</option>
          <option value="available">Disponible</option>
          <option value="sick">Malade</option>
          <option value="on_leave">En congé</option>
          <option value="offline">Hors ligne</option>
        </select>

        <button
          onClick={loadUsers}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            background: colors.primary,
            color: 'white',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Actualiser
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}>
          Chargement...
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredUsers.map(user => (
            <div
              key={user.user_id}
              style={{
                background: colors.surface,
                padding: '20px',
                borderRadius: '12px',
                border: `2px solid ${colors.border}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: colors.text, marginBottom: '4px' }}>
                    {user.user_name}
                  </div>
                  <div style={{ fontSize: '14px', color: colors.textSecondary }}>
                    {ROLE_LABELS[user.user_role] || user.user_role}
                  </div>
                </div>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: STATUS_COLORS[user.status],
                  color: 'white',
                }}>
                  {STATUS_LABELS[user.status]}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '12px',
                marginBottom: '12px',
              }}>
                {user.current_battery !== null && (
                  <div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>
                      Batterie
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: colors.text }}>
                      {user.current_battery}%
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>
                    Heures
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: colors.text }}>
                    {safeFixed(user.current_hours, 2)}h
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>
                    Kilomètres
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: colors.text }}>
                    {safeFixed(user.current_kilometers, 2)} km
                  </div>
                </div>

                {user.current_location_lat && user.current_location_lng && (
                  <div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>
                      Position
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${user.current_location_lat},${user.current_location_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '14px',
                        color: colors.primary,
                        textDecoration: 'none',
                        fontWeight: '600',
                      }}
                    >
                      Voir sur la carte
                    </a>
                  </div>
                )}
              </div>

              {user.is_on_break && user.break_duration_minutes && (
                <div style={{
                  padding: '12px',
                  background: colors.warning,
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                }}>
                  En pause ({user.break_duration_minutes} min)
                </div>
              )}

              <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '8px' }}>
                Dernière mise à jour: {getTimeSinceUpdate(user.last_updated)}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredUsers.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}>
          Aucun utilisateur ne correspond aux filtres sélectionnés.
        </div>
      )}
    </div>
  );
};

export default RealtimeUserMonitor;
