import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtimeProjects, useRealtimeTechnicians } from '../hooks/useRealtimeSync';

interface Technician {
  id: string;
  profile_id: string;
  name: string;
  status: string;
  role_level: string;
  completed_jobs: number;
  satisfaction_rate: number;
}

interface Chantier {
  id: string;
  title: string;
  status: string;
  location: string;
  scheduled_date: string | null;
  technician_id: string | null;
  description: string;
  quote_request_id: string | null;
}

interface TechnicianAssignerProps {
  darkMode: boolean;
}

const TechnicianAssigner: React.FC<TechnicianAssignerProps> = ({ darkMode }) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [unassignedChantiers, setUnassignedChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChantier, setSelectedChantier] = useState<string>('');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [assigningDate, setAssigningDate] = useState('');
  const [assigningTime, setAssigningTime] = useState('08:00');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const loadTechnicians = useCallback(async () => {
    try {
      setErrorMessage('');

      const { data: techData, error } = await supabase
        .from('technicians')
        .select('*')
        .order('completed_jobs', { ascending: true });

      if (error) {
        console.error('Erreur RLS ou SQL:', error);
        setErrorMessage(`Erreur chargement techniciens: ${error.message}`);
        throw error;
      }

      console.log('Techniciens chargés:', techData);

      const profileIds = techData?.map(t => t.profile_id).filter(Boolean) || [];

      if (profileIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('app_users')
          .select('id, name')
          .in('id', profileIds);

        if (usersError) {
          console.error('Erreur chargement utilisateurs:', usersError);
        }

        const techsWithNames = techData?.map(tech => ({
          ...tech,
          name: usersData?.find(u => u.id === tech.profile_id)?.name || 'Technicien inconnu',
        }));

        console.log('Techniciens avec noms:', techsWithNames);
        setTechnicians(techsWithNames || []);
      } else {
        console.log('Aucun technicien trouvé dans la base');
        setTechnicians([]);
      }
    } catch (error: any) {
      console.error('Erreur chargement techniciens:', error);
      setErrorMessage(`Impossible de charger les techniciens: ${error.message || 'Erreur inconnue'}`);
      setTechnicians([]);
    }
  }, []);

  const loadUnassignedChantiers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chantiers')
        .select('*')
        .is('technician_id', null)
        .eq('status', 'planned')
        .order('scheduled_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setUnassignedChantiers(data || []);
    } catch (error) {
      console.error('Erreur chargement chantiers:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadTechnicians(), loadUnassignedChantiers()]);
    setLoading(false);
  }, [loadTechnicians, loadUnassignedChantiers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtimeProjects(loadData);
  useRealtimeTechnicians(loadData);

  const handleAssign = async () => {
    if (!selectedChantier || !selectedTechnician) {
      alert('Veuillez sélectionner un chantier et un technicien');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('chantiers')
        .update({
          technician_id: selectedTechnician,
          scheduled_date: assigningDate || null,
          scheduled_time: assigningTime || '08:00',
        })
        .eq('id', selectedChantier);

      if (updateError) throw updateError;

      const chantier = unassignedChantiers.find(c => c.id === selectedChantier);
      const technician = technicians.find(t => t.id === selectedTechnician);

      if (technician) {
        const { data: userData } = await supabase
          .from('app_users')
          .select('id')
          .eq('id', technician.profile_id)
          .maybeSingle();

        if (userData) {
          await supabase
            .from('notifications')
            .insert({
              user_id: userData.id,
              type: 'success',
              title: 'Nouveau chantier assigné',
              message: `Le chantier "${chantier?.title}" vous a été assigné.`,
            });
        }
      }

      setSelectedChantier('');
      setSelectedTechnician('');
      setAssigningDate('');
      await loadData();

      alert('Technicien assigné avec succès!');
    } catch (error) {
      console.error('Erreur assignation:', error);
      alert('Erreur lors de l\'assignation');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Dispo':
      case 'disponible':
        return darkMode ? '#10b981' : '#059669';
      case 'En mission':
      case 'occupé':
        return darkMode ? '#f59e0b' : '#d97706';
      case 'Pause':
      case 'en_pause':
        return darkMode ? '#6b7280' : '#4b5563';
      default:
        return darkMode ? '#6b7280' : '#94a3b8';
    }
  };

  const colors = {
    background: darkMode ? '#1e293b' : '#ffffff',
    surface: darkMode ? '#334155' : '#f8fafc',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#475569' : '#e2e8f0',
    primary: darkMode ? '#3b82f6' : '#2563eb',
    success: '#10b981',
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        color: colors.text,
      }}>
        Chargement...
      </div>
    );
  }

  return (
    <div style={{
      background: colors.background,
      color: colors.text,
      padding: '24px',
      borderRadius: '12px',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>
        Assigner des techniciens aux chantiers
      </h2>

      {errorMessage && (
        <div style={{
          background: darkMode ? '#7f1d1d' : '#fee2e2',
          color: darkMode ? '#fca5a5' : '#991b1b',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: `1px solid ${darkMode ? '#991b1b' : '#fca5a5'}`,
        }}>
          <strong>Erreur:</strong> {errorMessage}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div style={{
          background: colors.surface,
          padding: '20px',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Techniciens disponibles ({technicians.length})
          </h3>

          {technicians.length === 0 ? (
            <div style={{ color: colors.textSecondary, padding: '16px', textAlign: 'center' }}>
              Aucun technicien disponible. Créez des comptes avec le rôle "Technicien".
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {technicians.map(tech => (
                <div
                  key={tech.id}
                  style={{
                    padding: '14px',
                    background: darkMode ? '#1e293b' : '#ffffff',
                    border: `2px solid ${selectedTechnician === tech.id ? colors.primary : colors.border}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setSelectedTechnician(tech.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontWeight: '700', marginBottom: '6px', fontSize: '15px' }}>{tech.name}</div>
                      <div style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '8px' }}>
                        {tech.completed_jobs} chantiers complétés
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: getStatusColor(tech.status),
                          color: '#ffffff',
                        }}>
                          {tech.status || 'Dispo'}
                        </span>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: darkMode ? '#1e3a8a' : '#dbeafe',
                          color: darkMode ? '#93c5fd' : '#1e40af',
                        }}>
                          {tech.role_level || 'Tech'}
                        </span>
                      </div>
                    </div>
                    {selectedTechnician === tech.id && (
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: colors.primary,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: '700',
                      }}>
                        ✓
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          background: colors.surface,
          padding: '20px',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Chantiers non assignés ({unassignedChantiers.length})
          </h3>

          {unassignedChantiers.length === 0 ? (
            <div style={{ color: colors.textSecondary, padding: '16px', textAlign: 'center' }}>
              Tous les chantiers sont assignés!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {unassignedChantiers.map(chantier => (
                <div
                  key={chantier.id}
                  style={{
                    padding: '12px',
                    background: darkMode ? '#1e293b' : '#ffffff',
                    border: `2px solid ${selectedChantier === chantier.id ? colors.success : colors.border}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setSelectedChantier(chantier.id)}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>{chantier.title}</div>
                  <div style={{ fontSize: '13px', color: colors.textSecondary }}>
                    {chantier.location}
                  </div>
                  {chantier.scheduled_date && (
                    <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '4px' }}>
                      Date prévue: {new Date(chantier.scheduled_date).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                  {chantier.quote_request_id && (
                    <div style={{
                      marginTop: '6px',
                      padding: '4px 8px',
                      background: darkMode ? '#065f46' : '#d1fae5',
                      color: darkMode ? '#34d399' : '#065f46',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      display: 'inline-block',
                    }}>
                      Créé depuis un devis
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedChantier && selectedTechnician && (
        <div style={{
          background: colors.surface,
          padding: '24px',
          borderRadius: '8px',
          border: `2px solid ${colors.success}`,
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Planifier l'assignation
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Date d'intervention
              </label>
              <input
                type="date"
                value={assigningDate}
                onChange={(e) => setAssigningDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  background: darkMode ? '#1e293b' : '#ffffff',
                  color: colors.text,
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Heure de début
              </label>
              <input
                type="time"
                value={assigningTime}
                onChange={(e) => setAssigningTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  background: darkMode ? '#1e293b' : '#ffffff',
                  color: colors.text,
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <button
            onClick={handleAssign}
            style={{
              width: '100%',
              padding: '14px',
              background: colors.success,
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Assigner le technicien au chantier
          </button>
        </div>
      )}

      {!selectedChantier || !selectedTechnician ? (
        <div style={{
          textAlign: 'center',
          color: colors.textSecondary,
          padding: '20px',
          background: colors.surface,
          borderRadius: '8px',
          border: `1px dashed ${colors.border}`,
        }}>
          Sélectionnez un technicien et un chantier pour effectuer une assignation
        </div>
      ) : null}
    </div>
  );
};

export default TechnicianAssigner;
