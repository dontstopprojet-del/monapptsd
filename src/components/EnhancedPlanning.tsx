import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtimePlanning, useRealtimePlanningTechnicians, useRealtimeProjects } from '../hooks/useRealtimeSync';
import { safeDate } from '../utils/safeFormat';

interface TechnicianDetail {
  id: string;
  name: string;
  status: string;
  role_level: string;
  completed_jobs?: number;
  absence_count?: number;
  sick_leave_count?: number;
  complaint_count?: number;
  contract_date?: string;
  years_of_service?: number;
  months_of_service?: number;
  distance_to_site?: number;
}

interface PlanningItem {
  id: string;
  chantier_id: string;
  technician_id: string;
  scheduled_date: string;
  end_date?: string;
  start_time: string;
  end_time: string;
  chantier_title?: string;
  chantier_location?: string;
  chantier_lat?: number;
  chantier_lng?: number;
  technician_name?: string;
  technicians?: TechnicianDetail[];
  status?: string;
}

interface Technician {
  id: string;
  name: string;
  profile_id?: string;
  status?: string;
  role_level?: string;
  home_lat?: number;
  home_lng?: number;
  completed_jobs?: number;
  absence_count?: number;
  sick_leave_count?: number;
  complaint_count?: number;
  contract_date?: string;
  distance_km?: number;
  seniority_years?: number;
  satisfaction_rate?: number;
  home_address?: string;
  color?: string;
  is_available?: boolean;
}

interface EnhancedPlanningProps {
  userRole: string;
  darkMode?: boolean;
}

const EnhancedPlanning: React.FC<EnhancedPlanningProps> = ({ userRole, darkMode = false }) => {
  const [planningItems, setPlanningItems] = useState<PlanningItem[]>([]);
  const [view, setView] = useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    chantier_id: '',
    scheduled_date: '',
    end_date: '',
    start_time: '08:00',
    end_time: '17:00',
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

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const earthRadiusKm = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(earthRadiusKm * c * 10) / 10;
  };

  const calculateSeniority = (contractDate: string): { years: number; months: number } => {
    if (!contractDate) return { years: 0, months: 0 };
    const start = new Date(contractDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    return { years, months };
  };

  const getStartDate = () => {
    if (view === 'custom' && customStartDate) {
      return customStartDate;
    }
    if (view === 'day') {
      return currentDate.toISOString().split('T')[0];
    }
    if (view === 'week') {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      return start.toISOString().split('T')[0];
    }
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    return start.toISOString().split('T')[0];
  };

  const getEndDate = () => {
    if (view === 'custom' && customEndDate) {
      return customEndDate;
    }
    if (view === 'day') {
      return currentDate.toISOString().split('T')[0];
    }
    if (view === 'week') {
      const end = new Date(currentDate);
      end.setDate(end.getDate() - end.getDay() + 6);
      return end.toISOString().split('T')[0];
    }
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return end.toISOString().split('T')[0];
  };

  const loadPlanningData = useCallback(async () => {
    try {
      setLoading(true);
      const startDate = getStartDate();
      const endDate = getEndDate();

      const { data, error } = await supabase
        .from('planning')
        .select(`
          *,
          chantier:chantiers(title, status, location, location_lat, location_lng)
        `)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      const planningIds = data?.map(p => p.id) || [];
      let planningTechsMap: Record<string, TechnicianDetail[]> = {};
      let ptData: any[] | null = null;

      if (planningIds.length > 0) {
        const { data: ptDataResult } = await supabase
          .from('planning_technicians')
          .select(`
            planning_id,
            technician_id,
            technician:technicians(
              id, profile_id, status, role_level,
              home_lat, home_lng, completed_jobs,
              absence_count, sick_leave_count, complaint_count,
              contract_date
            )
          `)
          .in('planning_id', planningIds);

        ptData = ptDataResult;

        const profileIds = ptData?.map((pt: any) => pt.technician?.profile_id).filter(Boolean) || [];

        let userNames: Record<string, string> = {};
        if (profileIds.length > 0) {
          const { data: usersData } = await supabase
            .from('app_users')
            .select('id, name')
            .in('id', profileIds);

          usersData?.forEach(u => {
            userNames[u.id] = u.name;
          });
        }

        ptData?.forEach((pt: any) => {
          if (!planningTechsMap[pt.planning_id]) {
            planningTechsMap[pt.planning_id] = [];
          }

          const tech = pt.technician;
          const seniority = calculateSeniority(tech?.contract_date);

          planningTechsMap[pt.planning_id].push({
            id: tech?.id,
            name: userNames[tech?.profile_id] || 'Technicien',
            status: tech?.status || 'Dispo',
            role_level: tech?.role_level || 'Tech',
            completed_jobs: tech?.completed_jobs || 0,
            absence_count: tech?.absence_count || 0,
            sick_leave_count: tech?.sick_leave_count || 0,
            complaint_count: tech?.complaint_count || 0,
            years_of_service: seniority.years,
            months_of_service: seniority.months,
          });
        });
      }

      const chantiersData = await supabase
        .from('chantiers')
        .select('id, location_lat, location_lng')
        .in('id', data?.map(p => p.chantier_id).filter(Boolean) || []);

      const chantierCoordsMap: Record<string, { lat: number; lng: number }> = {};
      chantiersData.data?.forEach((ch: any) => {
        if (ch.location_lat && ch.location_lng) {
          chantierCoordsMap[ch.id] = { lat: ch.location_lat, lng: ch.location_lng };
        }
      });

      const formatted = (data || []).map((item: any) => {
        const chantierCoords = chantierCoordsMap[item.chantier_id];
        const techsWithDistance = (planningTechsMap[item.id] || []).map(tech => {
          const techData = ptData?.find((pt: any) => pt.technician?.id === tech.id)?.technician;
          let distance = undefined;

          if (chantierCoords && techData?.home_lat && techData?.home_lng) {
            distance = calculateDistance(
              techData.home_lat,
              techData.home_lng,
              chantierCoords.lat,
              chantierCoords.lng
            );
          }

          return { ...tech, distance_to_site: distance };
        });

        return {
          ...item,
          chantier_title: item.chantier?.title,
          chantier_location: item.chantier?.location,
          chantier_lat: item.chantier?.location_lat,
          chantier_lng: item.chantier?.location_lng,
          status: item.chantier?.status,
          technicians: techsWithDistance,
        };
      });

      setPlanningItems(formatted);
    } catch (error) {
      console.error('Error loading planning:', error);
    } finally {
      setLoading(false);
    }
  }, [view, currentDate, customStartDate, customEndDate]);

  const loadTechnicians = async (chantierId?: string) => {
    try {
      if (chantierId) {
        const { data, error } = await supabase.rpc('get_all_technicians_for_chantier', {
          p_chantier_id: chantierId
        });

        if (error) throw error;

        const formatted = data?.map((tech: any) => ({
          id: tech.technician_id,
          name: tech.technician_name || 'Technicien',
          status: tech.status || 'Dispo',
          role_level: tech.role_level || 'Tech',
          distance_km: tech.distance_km,
          seniority_years: tech.seniority_years,
          completed_jobs: tech.completed_jobs || 0,
          absence_count: tech.absence_count || 0,
          sick_leave_count: tech.sick_leave_count || 0,
          complaint_count: tech.complaint_count || 0,
          satisfaction_rate: tech.satisfaction_rate || 0,
          home_address: tech.home_address,
          color: tech.color,
          is_available: tech.is_available,
        }));

        setTechnicians(formatted || []);
      } else {
        const { data, error } = await supabase
          .from('technicians')
          .select(`
            id,
            profile_id,
            status,
            role_level,
            completed_jobs,
            absence_count,
            sick_leave_count,
            complaint_count,
            satisfaction_rate,
            contract_date,
            home_address,
            color
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const profileIds = data?.map(t => t.profile_id).filter(Boolean) || [];

        if (profileIds.length > 0) {
          const { data: usersData } = await supabase
            .from('app_users')
            .select('id, name')
            .in('id', profileIds);

          const techsWithNames = data?.map(tech => {
            const contractDate = tech.contract_date ? new Date(tech.contract_date) : null;
            const seniorityYears = contractDate
              ? Math.floor((Date.now() - contractDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
              : 0;

            return {
              ...tech,
              name: usersData?.find(u => u.id === tech.profile_id)?.name || 'Technicien',
              seniority_years: seniorityYears,
            };
          });

          setTechnicians(techsWithNames || []);
        }
      }
    } catch (error) {
      console.error('Error loading technicians:', error);
    }
  };

  const loadChantiers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chantiers')
        .select('id, title, status, location, scheduled_date, technician_id')
        .in('status', ['planned', 'inProgress'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChantiers(data || []);
    } catch (error) {
      console.error('Error loading chantiers:', error);
    }
  }, []);

  useEffect(() => {
    loadPlanningData();
    loadTechnicians();
    loadChantiers();
  }, [loadPlanningData, loadChantiers]);

  useEffect(() => {
    if (formData.chantier_id) {
      loadTechnicians(formData.chantier_id);
    }
  }, [formData.chantier_id]);

  const handleDataUpdate = useCallback(() => {
    loadPlanningData();
    loadChantiers();
  }, [loadPlanningData, loadChantiers]);

  useRealtimePlanning(handleDataUpdate);
  useRealtimePlanningTechnicians(handleDataUpdate);
  useRealtimeProjects(loadChantiers);

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const toggleTechnicianSelection = (techId: string) => {
    setSelectedTechnicians(prev =>
      prev.includes(techId)
        ? prev.filter(id => id !== techId)
        : [...prev, techId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.chantier_id || selectedTechnicians.length === 0 || !formData.scheduled_date) {
      alert('Veuillez sélectionner un chantier, au moins un technicien et une date');
      return;
    }

    try {
      setLoading(true);

      const { data: planningData, error: planningError } = await supabase
        .from('planning')
        .insert({
          chantier_id: formData.chantier_id,
          technician_id: selectedTechnicians[0],
          scheduled_date: formData.scheduled_date,
          end_date: formData.end_date || formData.scheduled_date,
          start_time: formData.start_time,
          end_time: formData.end_time,
        })
        .select()
        .single();

      if (planningError) throw planningError;

      const planningTechInserts = selectedTechnicians.map(techId => ({
        planning_id: planningData.id,
        technician_id: techId,
      }));

      const { error: techError } = await supabase
        .from('planning_technicians')
        .insert(planningTechInserts);

      if (techError) throw techError;

      alert(`Planning créé avec ${selectedTechnicians.length} technicien(s)`);
      setShowForm(false);
      setFormData({
        chantier_id: '',
        scheduled_date: '',
        end_date: '',
        start_time: '08:00',
        end_time: '17:00',
      });
      setSelectedTechnicians([]);
      loadPlanningData();
    } catch (error: any) {
      console.error('Error creating planning:', error);
      alert('Erreur lors de la création du planning');
    } finally {
      setLoading(false);
    }
  };

  const formatDateHeader = () => {
    if (view === 'custom') {
      return `${safeDate(customStartDate)} - ${safeDate(customEndDate)}`;
    }
    if (view === 'day') {
      return safeDate(currentDate);
    }
    if (view === 'week') {
      const start = new Date(getStartDate());
      const end = new Date(getEndDate());
      return `${safeDate(start)} - ${safeDate(end)}`;
    }
    return safeDate(currentDate);
  };

  const getStatusColor = (status?: string) => {
    const statusColors: Record<string, string> = {
      planned: colors.warning,
      inProgress: colors.primary,
      completed: colors.success,
    };
    return statusColors[status || ''] || colors.textSecondary;
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', background: colors.background, minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.text, marginBottom: '20px' }}>
          Planning Chantiers
        </h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <button
            onClick={() => setView('day')}
            style={{
              padding: '10px 20px',
              background: view === 'day' ? colors.primary : colors.surface,
              color: view === 'day' ? '#fff' : colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Jour
          </button>
          <button
            onClick={() => setView('week')}
            style={{
              padding: '10px 20px',
              background: view === 'week' ? colors.primary : colors.surface,
              color: view === 'week' ? '#fff' : colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Semaine
          </button>
          <button
            onClick={() => setView('month')}
            style={{
              padding: '10px 20px',
              background: view === 'month' ? colors.primary : colors.surface,
              color: view === 'month' ? '#fff' : colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Mois
          </button>
          <button
            onClick={() => setView('custom')}
            style={{
              padding: '10px 20px',
              background: view === 'custom' ? colors.primary : colors.surface,
              color: view === 'custom' ? '#fff' : colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Personnalisé
          </button>
        </div>

        {view === 'custom' && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: colors.textSecondary }}>
                Date de début
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  background: colors.surface,
                  color: colors.text,
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: colors.textSecondary }}>
                Date de fin
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  background: colors.surface,
                  color: colors.text,
                }}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {view !== 'custom' && (
              <>
                <button
                  onClick={navigatePrevious}
                  style={{
                    padding: '8px 16px',
                    background: colors.surface,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  ←
                </button>
                <span style={{ fontSize: '16px', fontWeight: '600', color: colors.text, minWidth: '200px', textAlign: 'center' }}>
                  {formatDateHeader()}
                </span>
                <button
                  onClick={navigateNext}
                  style={{
                    padding: '8px 16px',
                    background: colors.surface,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  →
                </button>
              </>
            )}
            {view === 'custom' && customStartDate && customEndDate && (
              <span style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>
                {formatDateHeader()}
              </span>
            )}
          </div>

          {(userRole === 'admin' || userRole === 'office') && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                padding: '10px 20px',
                background: colors.success,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              + Nouveau Planning
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: colors.textSecondary }}>
          Chargement...
        </div>
      ) : planningItems.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          background: colors.surface,
          borderRadius: '12px',
          border: `2px dashed ${colors.border}`,
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: colors.text, marginBottom: '8px' }}>
            Aucun chantier planifié
          </div>
          <div style={{ fontSize: '14px', color: colors.textSecondary }}>
            Assignez des techniciens aux chantiers pour voir le planning
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {planningItems.map((item) => (
            <div
              key={item.id}
              style={{
                background: colors.surface,
                padding: '20px',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                boxShadow: darkMode ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: colors.text, marginBottom: '6px' }}>
                    {item.chantier_title || 'Chantier sans titre'}
                  </div>
                  <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '4px' }}>
                    📍 {item.chantier_location || 'Aucune adresse'}
                  </div>
                  <div style={{ fontSize: '14px', color: colors.textSecondary }}>
                    📅 {safeDate(item.scheduled_date)}
                    {item.end_date && item.end_date !== item.scheduled_date && (
                      <> → {safeDate(item.end_date)}</>
                    )}
                    {' • '}
                    🕐 {item.start_time} - {item.end_time}
                  </div>
                </div>
                <div
                  style={{
                    padding: '6px 14px',
                    background: getStatusColor(item.status),
                    color: '#fff',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {item.status === 'planned' ? 'Planifié' : item.status === 'inProgress' ? 'En cours' : 'Terminé'}
                </div>
              </div>

              {item.technicians && item.technicians.length > 0 && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: colors.textSecondary, marginBottom: '12px' }}>
                    Techniciens assignés ({item.technicians.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                    {item.technicians.map((tech) => (
                      <div
                        key={tech.id}
                        style={{
                          padding: '16px',
                          background: darkMode ? '#1e293b' : '#ffffff',
                          border: `1px solid ${colors.border}`,
                          borderRadius: '12px',
                          fontSize: '13px',
                          color: colors.text,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          minWidth: '280px',
                          flex: '1',
                          boxShadow: darkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '15px' }}>
                            <span
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: tech.status === 'Dispo' ? colors.success :
                                           tech.status === 'En mission' ? colors.warning :
                                           colors.danger,
                              }}
                            />
                            {tech.name}
                          </div>
                          {tech.distance_to_site && (
                            <div style={{
                              padding: '4px 10px',
                              background: darkMode ? '#065f46' : '#d1fae5',
                              color: darkMode ? '#6ee7b7' : '#047857',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              <span>🚗</span>
                              {tech.distance_to_site} km
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '11px' }}>
                          <span style={{
                            padding: '4px 10px',
                            background: darkMode ? '#334155' : '#f1f5f9',
                            borderRadius: '5px',
                            fontWeight: '600',
                          }}>
                            {tech.status || 'Dispo'}
                          </span>
                          <span style={{
                            padding: '4px 10px',
                            background: darkMode ? '#1e3a8a' : '#dbeafe',
                            color: darkMode ? '#93c5fd' : '#1e40af',
                            borderRadius: '5px',
                            fontWeight: '600',
                          }}>
                            {tech.role_level || 'Tech'}
                          </span>
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          paddingTop: '8px',
                          borderTop: `1px solid ${colors.border}`,
                          fontSize: '11px',
                          color: colors.textSecondary,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>📅</span>
                            <span>
                              {tech.years_of_service || 0}a {tech.months_of_service || 0}m
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>✅</span>
                            <span>{tech.completed_jobs || 0} projets</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🚫</span>
                            <span>{tech.absence_count || 0} absences</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🏥</span>
                            <span>{tech.sick_leave_count || 0} maladies</span>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            gridColumn: '1 / -1',
                            padding: '4px',
                            background: tech.complaint_count && tech.complaint_count > 0
                              ? (darkMode ? '#7f1d1d' : '#fee2e2')
                              : 'transparent',
                            borderRadius: '4px',
                          }}>
                            <span>⚠️</span>
                            <span style={{
                              color: tech.complaint_count && tech.complaint_count > 0
                                ? (darkMode ? '#fca5a5' : '#dc2626')
                                : colors.textSecondary,
                              fontWeight: tech.complaint_count && tech.complaint_count > 0 ? '700' : '400',
                            }}>
                              {tech.complaint_count || 0} plainte{(tech.complaint_count || 0) !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <>
          <div
            onClick={() => setShowForm(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1000,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: colors.background,
              padding: '30px',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              zIndex: 1001,
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, marginBottom: '24px' }}>
              Créer un planning
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                  Chantier
                </label>
                <select
                  value={formData.chantier_id}
                  onChange={(e) => {
                    const chantierId = e.target.value;
                    setFormData({ ...formData, chantier_id: chantierId });
                    if (chantierId) {
                      loadTechnicians(chantierId);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    background: colors.surface,
                    color: colors.text,
                    fontSize: '14px',
                  }}
                  required
                >
                  <option value="">Sélectionner un chantier</option>
                  {chantiers.map((chantier) => (
                    <option key={chantier.id} value={chantier.id}>
                      {chantier.title} - {chantier.location}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                  Techniciens (sélection multiple)
                </label>
                <div style={{ display: 'grid', gap: '10px', maxHeight: '400px', overflow: 'auto', padding: '8px', background: colors.surface, borderRadius: '8px' }}>
                  {technicians.map((tech) => (
                    <div
                      key={tech.id}
                      onClick={() => toggleTechnicianSelection(tech.id)}
                      style={{
                        padding: '14px',
                        background: selectedTechnicians.includes(tech.id) ? colors.primary : darkMode ? '#1e293b' : '#ffffff',
                        color: selectedTechnicians.includes(tech.id) ? '#fff' : colors.text,
                        border: `2px solid ${selectedTechnicians.includes(tech.id) ? colors.primary : colors.border}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '15px', flex: 1 }}>
                          <span style={{ fontSize: '18px' }}>
                            {selectedTechnicians.includes(tech.id) ? '✓' : ''}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div>{tech.name}</div>
                            {tech.distance_km !== undefined && tech.seniority_years !== undefined && (
                              <div style={{ fontSize: '9px', fontWeight: '500', opacity: 0.7, marginTop: '2px' }}>
                                ✅ Données complètes
                              </div>
                            )}
                          </div>
                        </div>
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: selectedTechnicians.includes(tech.id)
                              ? '#fff'
                              : (tech.status === 'Dispo' ? colors.success :
                                 tech.status === 'En mission' ? colors.warning :
                                 colors.danger),
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '8px' }}>
                        <span style={{
                          padding: '4px 8px',
                          background: selectedTechnicians.includes(tech.id)
                            ? 'rgba(255,255,255,0.2)'
                            : (darkMode ? '#334155' : '#f1f5f9'),
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}>
                          📍 {tech.status || 'Dispo'}
                        </span>
                        <span style={{
                          padding: '4px 8px',
                          background: selectedTechnicians.includes(tech.id)
                            ? 'rgba(255,255,255,0.2)'
                            : (darkMode ? '#1e3a8a' : '#dbeafe'),
                          color: selectedTechnicians.includes(tech.id)
                            ? '#fff'
                            : (darkMode ? '#93c5fd' : '#1e40af'),
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}>
                          👷 {tech.role_level || 'Tech'}
                        </span>
                      </div>

                      <div style={{
                        padding: '6px 10px',
                        background: selectedTechnicians.includes(tech.id)
                          ? 'rgba(255,255,255,0.15)'
                          : (darkMode ? '#0f172a' : '#f8fafc'),
                        borderRadius: '6px',
                        marginBottom: '8px'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '4px', opacity: 0.9 }}>
                          🚗 Distance: {tech.distance_km ? `${tech.distance_km} km` : formData.chantier_id ? 'GPS manquant' : 'Sélectionner chantier'}
                        </div>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '4px',
                        fontSize: '10px',
                        marginTop: '8px',
                      }}>
                        <div style={{
                          padding: '4px 6px',
                          background: selectedTechnicians.includes(tech.id)
                            ? 'rgba(255,255,255,0.15)'
                            : (darkMode ? '#0f172a' : '#f1f5f9'),
                          borderRadius: '4px',
                          textAlign: 'center',
                        }}>
                          <div style={{ fontWeight: '700', marginBottom: '2px' }}>
                            {tech.seniority_years || 0} ans
                          </div>
                          <div style={{ opacity: 0.8 }}>Ancienneté</div>
                        </div>

                        <div style={{
                          padding: '4px 6px',
                          background: selectedTechnicians.includes(tech.id)
                            ? 'rgba(255,255,255,0.15)'
                            : (darkMode ? '#0f172a' : '#f1f5f9'),
                          borderRadius: '4px',
                          textAlign: 'center',
                        }}>
                          <div style={{ fontWeight: '700', marginBottom: '2px' }}>
                            {tech.completed_jobs || 0}
                          </div>
                          <div style={{ opacity: 0.8 }}>Projets</div>
                        </div>

                        <div style={{
                          padding: '4px 6px',
                          background: selectedTechnicians.includes(tech.id)
                            ? 'rgba(255,255,255,0.15)'
                            : (darkMode ? '#0f172a' : '#f1f5f9'),
                          borderRadius: '4px',
                          textAlign: 'center',
                        }}>
                          <div style={{ fontWeight: '700', marginBottom: '2px' }}>
                            {tech.satisfaction_rate || 0}%
                          </div>
                          <div style={{ opacity: 0.8 }}>Satisfaction</div>
                        </div>

                        <div style={{
                          padding: '4px 6px',
                          background: selectedTechnicians.includes(tech.id)
                            ? 'rgba(255,255,255,0.15)'
                            : (darkMode ? '#0f172a' : '#fef3c7'),
                          color: selectedTechnicians.includes(tech.id)
                            ? '#fff'
                            : (darkMode ? '#fbbf24' : '#92400e'),
                          borderRadius: '4px',
                          textAlign: 'center',
                        }}>
                          <div style={{ fontWeight: '700', marginBottom: '2px' }}>
                            {tech.absence_count || 0}
                          </div>
                          <div style={{ opacity: 0.8 }}>Absences</div>
                        </div>

                        <div style={{
                          padding: '4px 6px',
                          background: selectedTechnicians.includes(tech.id)
                            ? 'rgba(255,255,255,0.15)'
                            : (darkMode ? '#0f172a' : '#fee2e2'),
                          color: selectedTechnicians.includes(tech.id)
                            ? '#fff'
                            : (darkMode ? '#f87171' : '#991b1b'),
                          borderRadius: '4px',
                          textAlign: 'center',
                        }}>
                          <div style={{ fontWeight: '700', marginBottom: '2px' }}>
                            {tech.sick_leave_count || 0}
                          </div>
                          <div style={{ opacity: 0.8 }}>Maladies</div>
                        </div>

                        <div style={{
                          padding: '4px 6px',
                          background: selectedTechnicians.includes(tech.id)
                            ? 'rgba(255,255,255,0.15)'
                            : (darkMode ? '#0f172a' : '#fecaca'),
                          color: selectedTechnicians.includes(tech.id)
                            ? '#fff'
                            : (darkMode ? '#ef4444' : '#7f1d1d'),
                          borderRadius: '4px',
                          textAlign: 'center',
                        }}>
                          <div style={{ fontWeight: '700', marginBottom: '2px' }}>
                            {tech.complaint_count || 0}
                          </div>
                          <div style={{ opacity: 0.8 }}>Plaintes</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '6px' }}>
                  {selectedTechnicians.length} technicien(s) sélectionné(s)
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      background: colors.surface,
                      color: colors.text,
                      fontSize: '14px',
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      background: colors.surface,
                      color: colors.text,
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                    Heure de début
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      background: colors.surface,
                      color: colors.text,
                      fontSize: '14px',
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                    Heure de fin
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      background: colors.surface,
                      color: colors.text,
                      fontSize: '14px',
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: colors.success,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '16px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Création...' : 'Créer le planning'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: colors.surface,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '16px',
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default EnhancedPlanning;
