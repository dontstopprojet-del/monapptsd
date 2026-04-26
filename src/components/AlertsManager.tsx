import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtimeAlerts, useRealtimeUsers } from '../hooks/useRealtimeSync';

interface AlertsManagerProps {
  userId: string;
  userRole: string;
  colors: any;
  onBack?: () => void;
}

export default function AlertsManager({ userId, userRole, colors, onBack }: AlertsManagerProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [alertType, setAlertType] = useState('mission');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const loadAlerts = useCallback(async () => {
    const query = userRole === 'admin'
      ? supabase.from('admin_alerts').select('*, recipient:app_users!recipient_id(name, email)')
      : supabase.from('admin_alerts').select('*').eq('recipient_id', userId);

    const { data } = await query.order('created_at', { ascending: false });
    if (data) {
      setAlerts(data);
      const unread = data.filter(a => !a.is_read && a.recipient_id === userId).length;
      setUnreadCount(unread);
    }
  }, [userId, userRole]);

  const loadUsers = useCallback(async () => {
    const { data } = await supabase
      .from('app_users')
      .select('*')
      .neq('role', 'admin')
      .order('name');
    if (data) setUsers(data);
  }, []);

  useEffect(() => {
    loadAlerts();
    if (userRole === 'admin') {
      loadUsers();
    }
  }, [loadAlerts, loadUsers, userRole]);

  useRealtimeAlerts(loadAlerts, userRole === 'admin' ? undefined : userId);
  useRealtimeUsers(loadUsers);

  const createAlert = async () => {
    if (!selectedRecipient || !title || !message) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    const { error } = await supabase.from('admin_alerts').insert({
      recipient_id: selectedRecipient,
      alert_type: alertType,
      title,
      message,
      created_by: userId
    });

    if (!error) {
      setShowCreateForm(false);
      setSelectedRecipient('');
      setTitle('');
      setMessage('');
      loadAlerts();
      alert('Alerte envoyée avec succès');
    }
  };

  const sendToAll = async () => {
    if (!title || !message) {
      alert('Veuillez remplir le titre et le message');
      return;
    }

    if (!confirm('Envoyer cette alerte à tous les utilisateurs ?')) {
      return;
    }

    const alertsToInsert = users.map(user => ({
      recipient_id: user.id,
      alert_type: alertType,
      title,
      message,
      created_by: userId
    }));

    const { error } = await supabase.from('admin_alerts').insert(alertsToInsert);

    if (!error) {
      setShowCreateForm(false);
      setSelectedRecipient('');
      setTitle('');
      setMessage('');
      loadAlerts();
      alert(`Alerte envoyée à ${users.length} utilisateurs avec succès`);
    }
  };

  const markAsRead = async (alertId: string) => {
    await supabase
      .from('admin_alerts')
      .update({ is_read: true })
      .eq('id', alertId);
    loadAlerts();
  };

  const deleteAlert = async (alertId: string) => {
    if (confirm('Supprimer cette alerte ?')) {
      await supabase.from('admin_alerts').delete().eq('id', alertId);
      loadAlerts();
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'mission': return '🎯';
      case 'reunion': return '📅';
      case 'convocation': return '⚠️';
      default: return '📢';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      padding: '20px'
    }}>
      <div style={{
        background: colors.card,
        borderRadius: '20px',
        padding: '20px',
        maxWidth: '800px',
        margin: '0 auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  background: colors.light,
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 15px',
                  cursor: 'pointer',
                  marginRight: '15px',
                  fontWeight: 'bold',
                  color: colors.text
                }}
              >
                ← Retour
              </button>
            )}
            <h2 style={{ color: colors.primary, margin: 0, fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🔔 Alertes
              {unreadCount > 0 && userRole !== 'admin' && (
                <span style={{
                  background: colors.danger,
                  color: '#FFF',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {unreadCount}
                </span>
              )}
            </h2>
          </div>
          {userRole === 'admin' && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{
                background: colors.success,
                color: '#FFF',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              + Nouvelle
            </button>
          )}
        </div>

        {showCreateForm && userRole === 'admin' && (
          <div style={{
            background: colors.light,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: colors.text, marginBottom: '15px', fontWeight: 'bold' }}>Créer une alerte</h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', color: colors.text, marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                Destinataire <span style={{ fontSize: '12px', fontWeight: 'normal', color: colors.textSecondary }}>(optionnel si envoi à tous)</span>
              </label>
              <select
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.light}`,
                  background: '#FFF',
                  color: colors.text,
                  fontSize: '14px',
                  fontFamily: 'inherit'
                }}
              >
                <option value="">Sélectionner un utilisateur</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                Type d'alerte
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {['mission', 'reunion', 'convocation', 'general'].map(type => (
                  <button
                    key={type}
                    onClick={() => setAlertType(type)}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '12px',
                      border: alertType === type ? `2px solid ${colors.primary}` : `2px solid ${colors.light}`,
                      background: alertType === type ? colors.primary + '20' : '#FFF',
                      cursor: 'pointer',
                      fontSize: '11px',
                      color: colors.text,
                      textTransform: 'capitalize',
                      fontWeight: alertType === type ? 'bold' : 'normal'
                    }}
                  >
                    {getAlertIcon(type)}<br/>{type}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', color: colors.text, marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                Titre
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de l'alerte"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.light}`,
                  background: '#FFF',
                  color: colors.text,
                  fontSize: '14px',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', color: colors.text, marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message de l'alerte"
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.light}`,
                  background: '#FFF',
                  color: colors.text,
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: `2px solid ${colors.light}`,
                    background: '#FFF',
                    color: colors.text,
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={createAlert}
                  disabled={!selectedRecipient || !title || !message}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: (!selectedRecipient || !title || !message) ? colors.light : colors.primary,
                    color: (!selectedRecipient || !title || !message) ? colors.textSecondary : '#FFF',
                    cursor: (!selectedRecipient || !title || !message) ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                >
                  Envoyer
                </button>
              </div>
              <button
                onClick={sendToAll}
                disabled={!title || !message || users.length === 0}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: (!title || !message || users.length === 0) ? colors.light : `linear-gradient(135deg, ${colors.warning}, #FF9800)`,
                  color: (!title || !message || users.length === 0) ? colors.textSecondary : '#FFF',
                  cursor: (!title || !message || users.length === 0) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  fontSize: '14px'
                }}
              >
                📢 Envoyer à tous ({users.length} utilisateurs)
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {alerts.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: colors.textSecondary
            }}>
              <span style={{ fontSize: '64px', display: 'block', marginBottom: '15px' }}>🔔</span>
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Aucune alerte</div>
              <div style={{ fontSize: '14px' }}>Vous n'avez pas encore reçu d'alertes</div>
            </div>
          ) : (
            alerts.map(alert => (
              <div
                key={alert.id}
                style={{
                  background: alert.is_read ? colors.light : colors.secondary + '15',
                  borderRadius: '12px',
                  padding: '16px',
                  border: alert.is_read ? `1px solid ${colors.light}` : `2px solid ${colors.secondary}`,
                  boxShadow: alert.is_read ? 'none' : '0 4px 12px rgba(0,0,0,0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '28px', marginRight: '12px' }}>
                        {getAlertIcon(alert.alert_type)}
                      </span>
                      <div>
                        <h3 style={{ margin: 0, color: colors.text, fontSize: '16px', fontWeight: 'bold' }}>
                          {alert.title}
                        </h3>
                        <p style={{
                          margin: '2px 0 0',
                          fontSize: '11px',
                          color: colors.textSecondary,
                          fontWeight: '500'
                        }}>
                          {new Date(alert.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {userRole === 'admin' && alert.recipient && (
                            <> • {alert.recipient.name}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <p style={{ margin: '0 0 0 40px', color: colors.text, fontSize: '14px', lineHeight: '1.5' }}>
                      {alert.message}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '15px' }}>
                    {!alert.is_read && userRole !== 'admin' && (
                      <button
                        onClick={() => markAsRead(alert.id)}
                        style={{
                          background: colors.success,
                          color: '#FFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        ✓ Lue
                      </button>
                    )}
                    {userRole === 'admin' && (
                      <button
                        onClick={() => deleteAlert(alert.id)}
                        style={{
                          background: colors.danger,
                          color: '#FFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
