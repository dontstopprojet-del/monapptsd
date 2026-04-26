import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Appointment {
  id: string;
  quote_id: string | null;
  user_id: string | null;
  scheduled_date: string;
  scheduled_time: string;
  service_type: string;
  address: string | null;
  location_coordinates: any;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  assigned_name?: string;
}

interface AppointmentManagerProps {
  darkMode: boolean;
  currentUser: any;
}

const AppointmentManager: React.FC<AppointmentManagerProps> = ({ darkMode }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    status: '',
    assigned_to: '',
  });

  const colors = {
    primary: darkMode ? '#3b82f6' : '#2563eb',
    background: darkMode ? '#1e293b' : '#ffffff',
    surface: darkMode ? '#334155' : '#f8fafc',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#475569' : '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  };

  useEffect(() => {
    fetchAppointments();
    fetchTechnicians();

    const channel = supabase
      .channel('appointment_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [appointments, filterStatus, searchTerm]);

  const fetchTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, name, email')
        .eq('role', 'tech')
        .order('name');

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des techniciens:', error);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          quote:quote_requests(name, email, phone),
          assigned:app_users!appointments_assigned_to_fkey(name)
        `)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((apt: any) => ({
        ...apt,
        client_name: apt.quote?.name,
        client_email: apt.quote?.email,
        client_phone: apt.quote?.phone,
        assigned_name: apt.assigned?.name,
      }));

      setAppointments(formatted);
    } catch (error) {
      console.error('Erreur lors du chargement des rendez-vous:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = appointments;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => a.status === filterStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.client_name?.toLowerCase().includes(term) ||
        a.client_email?.toLowerCase().includes(term) ||
        a.service_type?.toLowerCase().includes(term) ||
        a.address?.toLowerCase().includes(term)
      );
    }

    setFilteredAppointments(filtered);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setEditData({
      status: appointment.status,
      assigned_to: appointment.assigned_to || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedAppointment) return;

    try {
      const updates: any = {
        status: editData.status,
        assigned_to: editData.assigned_to || null,
        updated_at: new Date().toISOString(),
      };

      if (editData.status === 'confirmed' && !selectedAppointment.confirmed_at) {
        updates.confirmed_at = new Date().toISOString();
      }

      if (editData.status === 'completed' && !selectedAppointment.completed_at) {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedAppointment(null);
      fetchAppointments();
      alert('Rendez-vous mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour du rendez-vous');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; label: string } } = {
      pending: { color: colors.warning, label: 'En attente' },
      confirmed: { color: colors.primary, label: 'Confirmé' },
      completed: { color: colors.success, label: 'Terminé' },
      cancelled: { color: colors.danger, label: 'Annulé' },
    };

    const config = statusConfig[status] || { color: colors.textSecondary, label: status };

    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        background: `${config.color}20`,
        color: config.color,
        fontSize: '12px',
        fontWeight: '600',
      }}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: colors.textSecondary,
      }}>
        Chargement des rendez-vous...
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      background: colors.background,
      minHeight: '100vh',
    }}>
      <div style={{
        marginBottom: '24px',
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: colors.text,
          marginBottom: '8px',
        }}>
          Gestion des Rendez-vous
        </h1>
        <p style={{
          color: colors.textSecondary,
          fontSize: '14px',
        }}>
          {appointments.length} rendez-vous au total
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: '1',
            minWidth: '200px',
            padding: '12px 16px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            color: colors.text,
            fontSize: '14px',
          }}
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            color: colors.text,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="confirmed">Confirmés</option>
          <option value="completed">Terminés</option>
          <option value="cancelled">Annulés</option>
        </select>
      </div>

      <div style={{
        background: colors.surface,
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        {filteredAppointments.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: colors.textSecondary,
          }}>
            Aucun rendez-vous trouvé
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: darkMode ? '#1e293b' : '#f1f5f9' }}>
                <th style={{ padding: '16px', textAlign: 'left', color: colors.text, fontWeight: '600', fontSize: '13px' }}>
                  Date / Heure
                </th>
                <th style={{ padding: '16px', textAlign: 'left', color: colors.text, fontWeight: '600', fontSize: '13px' }}>
                  Client
                </th>
                <th style={{ padding: '16px', textAlign: 'left', color: colors.text, fontWeight: '600', fontSize: '13px' }}>
                  Service
                </th>
                <th style={{ padding: '16px', textAlign: 'left', color: colors.text, fontWeight: '600', fontSize: '13px' }}>
                  Adresse
                </th>
                <th style={{ padding: '16px', textAlign: 'left', color: colors.text, fontWeight: '600', fontSize: '13px' }}>
                  Assigné à
                </th>
                <th style={{ padding: '16px', textAlign: 'left', color: colors.text, fontWeight: '600', fontSize: '13px' }}>
                  Statut
                </th>
                <th style={{ padding: '16px', textAlign: 'center', color: colors.text, fontWeight: '600', fontSize: '13px' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((appointment, index) => (
                <tr
                  key={appointment.id}
                  style={{
                    borderTop: `1px solid ${colors.border}`,
                    background: index % 2 === 0 ? colors.background : colors.surface,
                  }}
                >
                  <td style={{ padding: '16px', color: colors.text, fontSize: '14px' }}>
                    <div style={{ fontWeight: '600' }}>{formatDate(appointment.scheduled_date)}</div>
                    <div style={{ color: colors.textSecondary, fontSize: '12px' }}>{appointment.scheduled_time}</div>
                  </td>
                  <td style={{ padding: '16px', color: colors.text, fontSize: '14px' }}>
                    <div style={{ fontWeight: '600' }}>{appointment.client_name || 'N/A'}</div>
                    <div style={{ color: colors.textSecondary, fontSize: '12px' }}>{appointment.client_email}</div>
                    <div style={{ color: colors.textSecondary, fontSize: '12px' }}>{appointment.client_phone}</div>
                  </td>
                  <td style={{ padding: '16px', color: colors.text, fontSize: '14px' }}>
                    {appointment.service_type}
                  </td>
                  <td style={{ padding: '16px', color: colors.textSecondary, fontSize: '13px', maxWidth: '200px' }}>
                    {appointment.address || 'Non spécifié'}
                  </td>
                  <td style={{ padding: '16px', color: colors.text, fontSize: '14px' }}>
                    {appointment.assigned_name || 'Non assigné'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {getStatusBadge(appointment.status)}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleEditAppointment(appointment)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        background: colors.primary,
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEditModal && selectedAppointment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: colors.background,
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.text,
              marginBottom: '24px',
            }}>
              Modifier le Rendez-vous
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: colors.text,
              }}>
                Statut
              </label>
              <select
                value={editData.status}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: colors.surface,
                  color: colors.text,
                  fontSize: '14px',
                }}
              >
                <option value="pending">En attente</option>
                <option value="confirmed">Confirmé</option>
                <option value="completed">Terminé</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: colors.text,
              }}>
                Assigner à un technicien
              </label>
              <select
                value={editData.assigned_to}
                onChange={(e) => setEditData({ ...editData, assigned_to: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: colors.surface,
                  color: colors.text,
                  fontSize: '14px',
                }}
              >
                <option value="">Non assigné</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name} ({tech.email})
                  </option>
                ))}
              </select>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.primary,
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentManager;
