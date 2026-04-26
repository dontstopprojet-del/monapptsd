import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { safeFixed } from '../utils/safeFormat';

interface WorkShiftTrackerProps {
  userId: string;
  userRole: 'technician' | 'office_employee';
  darkMode?: boolean;
}

interface UserStatus {
  status: string;
  current_session_id: string | null;
  current_location_lat: number | null;
  current_location_lng: number | null;
  current_battery: number | null;
  current_kilometers: number;
  current_hours: number;
  break_start_time: string | null;
  break_duration_minutes: number | null;
  is_on_break: boolean;
  last_updated: string;
}

const WorkShiftTracker: React.FC<WorkShiftTrackerProps> = ({ userId, userRole, darkMode = false }) => {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [battery, setBattery] = useState<number | null>(null);
  const [remainingBreakTime, setRemainingBreakTime] = useState<number>(0);
  const [showBreakAlert, setShowBreakAlert] = useState(false);
  const [shiftModal, setShiftModal] = useState<{
    type: 'confirm' | 'info';
    title: string;
    message: string;
    confirmLabel?: string;
    confirmColor?: string;
    onConfirm: () => void;
  } | null>(null);

  const locationWatchId = useRef<number | null>(null);
  const sessionStartKm = useRef<number>(0);
  const sessionStartTime = useRef<Date | null>(null);

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

  useEffect(() => {
    loadUserStatus();
    getBatteryLevel();

    const subscription = supabase
      .channel('user_status_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_real_time_status', filter: `user_id=eq.${userId}` },
        () => {
          loadUserStatus();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
      }
    };
  }, [userId]);

  useEffect(() => {
    if (userStatus?.is_on_break && userStatus.break_start_time && userStatus.break_duration_minutes) {
      const breakDuration = userStatus.break_duration_minutes;
      const interval = setInterval(() => {
        const breakStart = new Date(userStatus.break_start_time!);
        const now = new Date();
        const elapsedMinutes = Math.floor((now.getTime() - breakStart.getTime()) / 60000);
        const remaining = breakDuration - elapsedMinutes;

        setRemainingBreakTime(Math.max(0, remaining));

        if (remaining <= 0 && !showBreakAlert) {
          setShowBreakAlert(true);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [userStatus?.is_on_break, userStatus?.break_start_time, userStatus?.break_duration_minutes, showBreakAlert]);

  const loadUserStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('user_real_time_status')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserStatus(data);
      } else {
        await supabase
          .from('user_real_time_status')
          .insert({
            user_id: userId,
            status: 'offline',
            current_kilometers: 0,
            current_hours: 0,
            is_on_break: false,
          });
        loadUserStatus();
      }
    } catch (error) {
      console.error('Error loading user status:', error);
    }
  };

  const getBatteryLevel = async () => {
    if ('getBattery' in navigator) {
      try {
        const batteryManager: any = await (navigator as any).getBattery();
        setBattery(Math.round(batteryManager.level * 100));

        batteryManager.addEventListener('levelchange', () => {
          setBattery(Math.round(batteryManager.level * 100));
        });
      } catch (error) {
        console.log('Battery API not available');
      }
    }
  };

  const startLocationTracking = () => {
    if ('geolocation' in navigator) {
      locationWatchId.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          if (userStatus?.current_session_id) {
            const lastLat = userStatus.current_location_lat;
            const lastLng = userStatus.current_location_lng;

            let additionalKm = 0;
            if (lastLat && lastLng) {
              additionalKm = calculateDistance(lastLat, lastLng, latitude, longitude);
            }

            await supabase
              .from('user_real_time_status')
              .update({
                current_location_lat: latitude,
                current_location_lng: longitude,
                current_battery: battery,
                current_kilometers: (userStatus.current_kilometers || 0) + additionalKm,
              })
              .eq('user_id', userId);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000,
        }
      );
    }
  };

  const stopLocationTracking = () => {
    if (locationWatchId.current !== null) {
      navigator.geolocation.clearWatch(locationWatchId.current);
      locationWatchId.current = null;
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation non disponible'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 15000,
      });
    });
  };

  const executeStartDay = async () => {
    setLoading(true);
    try {
      let latitude = 0;
      let longitude = 0;

      try {
        const position = await getPosition();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch {
        setLoading(false);
        setShiftModal({
          type: 'info',
          title: 'GPS obligatoire',
          message: 'La position GPS est obligatoire pour demarrer la journee. Veuillez activer votre GPS et reessayer.',
          onConfirm: () => setShiftModal(null),
        });
        return;
      }

      const { data: existingStatus } = await supabase
        .from('user_real_time_status')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingStatus) {
        await supabase
          .from('user_real_time_status')
          .insert({
            user_id: userId,
            status: 'offline',
            current_kilometers: 0,
            current_hours: 0,
            is_on_break: false,
          });
      }

      const { data: session, error: sessionError } = await supabase
        .from('work_sessions')
        .insert({
          user_id: userId,
          session_date: new Date().toISOString().split('T')[0],
          start_time: new Date().toISOString(),
          start_battery: battery,
          start_location_lat: latitude || null,
          start_location_lng: longitude || null,
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Session create error:', sessionError);
        setShiftModal({ type: 'info', title: 'Erreur', message: 'Erreur creation session: ' + sessionError.message, onConfirm: () => setShiftModal(null) });
        return;
      }

      const { error: statusError } = await supabase
        .from('user_real_time_status')
        .update({
          status: 'in_service',
          current_session_id: session.id,
          current_location_lat: latitude || null,
          current_location_lng: longitude || null,
          current_battery: battery,
          current_kilometers: 0,
          current_hours: 0,
        })
        .eq('user_id', userId);

      if (statusError) {
        console.error('Status update error:', statusError);
        setShiftModal({ type: 'info', title: 'Erreur', message: 'Erreur mise a jour statut: ' + statusError.message, onConfirm: () => setShiftModal(null) });
        return;
      }

      sessionStartKm.current = 0;
      sessionStartTime.current = new Date();

      if (latitude && longitude) {
        startLocationTracking();
      }

      const hoursInterval = setInterval(async () => {
        if (sessionStartTime.current) {
          const hours = (new Date().getTime() - sessionStartTime.current.getTime()) / 3600000;
          await supabase
            .from('user_real_time_status')
            .update({ current_hours: hours })
            .eq('user_id', userId);
        }
      }, 60000);

      (window as any).hoursInterval = hoursInterval;

      await loadUserStatus();
      setShiftModal({ type: 'info', title: 'Journee demarree', message: 'Votre journee de travail a bien ete demarree!', confirmColor: colors.success, onConfirm: () => setShiftModal(null) });
    } catch (error: any) {
      console.error('Error starting day:', error);
      setShiftModal({ type: 'info', title: 'Erreur', message: 'Erreur lors du demarrage: ' + (error.message || 'Erreur inconnue'), onConfirm: () => setShiftModal(null) });
    } finally {
      setLoading(false);
    }
  };

  const handleStartDay = () => {
    if (!navigator.geolocation) {
      setShiftModal({ type: 'info', title: 'GPS indisponible', message: 'La geolocalisation n\'est pas disponible sur votre appareil.', onConfirm: () => setShiftModal(null) });
      return;
    }
    setShiftModal({
      type: 'confirm',
      title: 'Debut de journee',
      message: 'Voulez-vous demarrer votre journee de travail?',
      confirmLabel: 'Demarrer',
      confirmColor: colors.success,
      onConfirm: () => { setShiftModal(null); executeStartDay(); },
    });
  };

  const executeStartBreak = async () => {
    const today = new Date().getDay();
    const isFriday = today === 5;
    const breakDuration = isFriday ? 90 : 30;

    setLoading(true);
    try {
      if (isFriday) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;

            await supabase
              .from('work_session_events')
              .insert({
                session_id: userStatus?.current_session_id,
                event_type: 'break_start',
                event_time: new Date().toISOString(),
                duration_minutes: breakDuration,
                location_lat: latitude,
                location_lng: longitude,
                battery_level: battery,
              });

            await supabase
              .from('user_real_time_status')
              .update({
                status: 'on_break',
                is_on_break: true,
                break_start_time: new Date().toISOString(),
                break_duration_minutes: breakDuration,
              })
              .eq('user_id', userId);

            setLoading(false);
            setShowBreakAlert(false);
            loadUserStatus();
          },
          (error) => {
            console.error('Geolocation error:', error);
            setShiftModal({ type: 'info', title: 'Erreur GPS', message: 'La pause du vendredi doit etre geolocalisee. Veuillez activer votre GPS.', onConfirm: () => setShiftModal(null) });
            setLoading(false);
          }
        );
      } else {
        await supabase
          .from('work_session_events')
          .insert({
            session_id: userStatus?.current_session_id,
            event_type: 'break_start',
            event_time: new Date().toISOString(),
            duration_minutes: breakDuration,
            battery_level: battery,
          });

        await supabase
          .from('user_real_time_status')
          .update({
            status: 'on_break',
            is_on_break: true,
            break_start_time: new Date().toISOString(),
            break_duration_minutes: breakDuration,
          })
          .eq('user_id', userId);

        setLoading(false);
        setShowBreakAlert(false);
        loadUserStatus();
      }
    } catch (error) {
      console.error('Error starting break:', error);
      setShiftModal({ type: 'info', title: 'Erreur', message: 'Erreur lors du demarrage de la pause.', onConfirm: () => setShiftModal(null) });
      setLoading(false);
    }
  };

  const handleStartBreak = () => {
    const today = new Date().getDay();
    const isFriday = today === 5;
    const breakDuration = isFriday ? 90 : 30;
    setShiftModal({
      type: 'confirm',
      title: 'Pause',
      message: `Voulez-vous prendre une pause de ${breakDuration} minutes?${isFriday ? ' (Pause vendredi - geolocalisation requise)' : ''}`,
      confirmLabel: 'Prendre une pause',
      confirmColor: colors.warning,
      onConfirm: () => { setShiftModal(null); executeStartBreak(); },
    });
  };

  const executeEndBreak = async () => {
    setLoading(true);
    try {
      await supabase
        .from('work_session_events')
        .insert({
          session_id: userStatus?.current_session_id,
          event_type: 'break_end',
          event_time: new Date().toISOString(),
          battery_level: battery,
        });

      await supabase
        .from('user_real_time_status')
        .update({
          status: 'in_service',
          is_on_break: false,
          break_start_time: null,
          break_duration_minutes: null,
        })
        .eq('user_id', userId);

      setShowBreakAlert(false);
      loadUserStatus();
    } catch (error) {
      console.error('Error ending break:', error);
      setShiftModal({ type: 'info', title: 'Erreur', message: 'Erreur lors de la fin de la pause.', onConfirm: () => setShiftModal(null) });
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = () => {
    setShiftModal({
      type: 'confirm',
      title: 'Fin de pause',
      message: 'Voulez-vous reprendre le travail?',
      confirmLabel: 'Reprendre',
      confirmColor: colors.success,
      onConfirm: () => { setShiftModal(null); executeEndBreak(); },
    });
  };

  const executeEndMission = async () => {
    setLoading(true);
    try {
      await supabase
        .from('work_session_events')
        .insert({
          session_id: userStatus?.current_session_id,
          event_type: 'mission_end',
          event_time: new Date().toISOString(),
          battery_level: battery,
        });

      await supabase
        .from('user_real_time_status')
        .update({ status: 'available' })
        .eq('user_id', userId);

      loadUserStatus();
    } catch (error) {
      console.error('Error ending mission:', error);
      setShiftModal({ type: 'info', title: 'Erreur', message: 'Erreur lors de la fin de mission.', onConfirm: () => setShiftModal(null) });
    } finally {
      setLoading(false);
    }
  };

  const handleEndMission = () => {
    setShiftModal({
      type: 'confirm',
      title: 'Fin de mission',
      message: 'Voulez-vous terminer cette mission?',
      confirmLabel: 'Terminer la mission',
      confirmColor: colors.primary,
      onConfirm: () => { setShiftModal(null); executeEndMission(); },
    });
  };

  const executeEndDay = async () => {
    setLoading(true);
    const hoursWorked = userStatus?.current_hours || 0;
    const kmDriven = userStatus?.current_kilometers || 0;
    try {
      let latitude = 0;
      let longitude = 0;
      try {
        const position = await getPosition();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch {
        setShiftModal({
          type: 'info',
          title: 'GPS obligatoire',
          message: 'La position GPS est obligatoire pour terminer la journee. Veuillez activer votre GPS et reessayer.',
          onConfirm: () => setShiftModal(null),
        });
        return;
      }

      await supabase
        .from('work_sessions')
        .update({
          end_time: new Date().toISOString(),
          end_battery: battery,
          end_location_lat: latitude || null,
          end_location_lng: longitude || null,
          total_hours: hoursWorked,
          total_kilometers: kmDriven,
        })
        .eq('id', userStatus?.current_session_id);

      await supabase
        .from('user_real_time_status')
        .update({
          status: 'offline',
          current_session_id: null,
          current_kilometers: 0,
          current_hours: 0,
          is_on_break: false,
          break_start_time: null,
          break_duration_minutes: null,
        })
        .eq('user_id', userId);

      stopLocationTracking();

      if ((window as any).hoursInterval) {
        clearInterval((window as any).hoursInterval);
      }

      loadUserStatus();
      setShiftModal({
        type: 'info',
        title: 'Journee terminee',
        message: `Heures: ${safeFixed(hoursWorked, 2)}h\nKilometres: ${safeFixed(kmDriven, 2)}km`,
        confirmColor: colors.success,
        onConfirm: () => setShiftModal(null),
      });
    } catch (error) {
      console.error('Error ending day:', error);
      setShiftModal({ type: 'info', title: 'Erreur', message: 'Erreur lors de la fin de journee.', onConfirm: () => setShiftModal(null) });
    } finally {
      setLoading(false);
    }
  };

  const handleEndDay = () => {
    setShiftModal({
      type: 'confirm',
      title: 'Fin de journee',
      message: `Voulez-vous terminer votre journee?\n\nHeures: ${safeFixed(userStatus?.current_hours, 2)}h\nKilometres: ${safeFixed(userStatus?.current_kilometers, 2)}km`,
      confirmLabel: 'Terminer la journee',
      confirmColor: colors.danger,
      onConfirm: () => { setShiftModal(null); executeEndDay(); },
    });
  };

  const handleChangeStatus = async (newStatus: string) => {
    try {
      await supabase
        .from('user_real_time_status')
        .update({ status: newStatus })
        .eq('user_id', userId);

      if (userStatus?.current_session_id) {
        await supabase
          .from('work_session_events')
          .insert({
            session_id: userStatus.current_session_id,
            event_type: 'status_change',
            event_time: new Date().toISOString(),
            notes: `Changed to: ${newStatus}`,
          });
      }

      loadUserStatus();
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  if (!userStatus) {
    return <div style={{ padding: '20px', color: colors.text }}>Chargement...</div>;
  }

  const isSessionActive = userStatus.current_session_id !== null;

  return (
    <div style={{ padding: '20px', background: colors.background, borderRadius: '16px', marginBottom: '20px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: colors.text, marginBottom: '20px' }}>
        Suivi de Journée
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: colors.surface,
          padding: '16px',
          borderRadius: '12px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>Statut</div>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: STATUS_COLORS[userStatus.status]
          }}>
            {STATUS_LABELS[userStatus.status]}
          </div>
        </div>

        {battery !== null && (
          <div style={{
            background: colors.surface,
            padding: '16px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>Batterie</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: colors.text }}>
              {battery}%
            </div>
          </div>
        )}

        <div style={{
          background: colors.surface,
          padding: '16px',
          borderRadius: '12px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>Heures</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: colors.text }}>
            {safeFixed(userStatus.current_hours, 2)}h
          </div>
        </div>

        <div style={{
          background: colors.surface,
          padding: '16px',
          borderRadius: '12px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>Kilomètres</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: colors.text }}>
            {safeFixed(userStatus.current_kilometers, 2)} km
          </div>
        </div>
      </div>

      {userStatus.is_on_break && (
        <div style={{
          background: colors.warning,
          color: 'white',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
            Pause en cours
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {Math.floor(remainingBreakTime / 60)}:{String(remainingBreakTime % 60).padStart(2, '0')}
          </div>
          {showBreakAlert && (
            <div style={{ marginTop: '8px', fontSize: '14px' }}>
              Temps de pause dépassé!
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {!isSessionActive && (
          <button
            onClick={handleStartDay}
            disabled={loading}
            style={{
              padding: '16px',
              background: colors.success,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Chargement...' : 'Début de journée'}
          </button>
        )}

        {isSessionActive && !userStatus.is_on_break && (
          <>
            <button
              onClick={handleStartBreak}
              disabled={loading}
              style={{
                padding: '16px',
                background: colors.warning,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Chargement...' : 'Pause'}
            </button>

            {userRole === 'technician' && (
              <button
                onClick={handleEndMission}
                disabled={loading}
                style={{
                  padding: '16px',
                  background: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Chargement...' : 'Fin de mission'}
              </button>
            )}
          </>
        )}

        {isSessionActive && userStatus.is_on_break && (
          <button
            onClick={handleEndBreak}
            disabled={loading}
            style={{
              padding: '16px',
              background: colors.success,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Chargement...' : 'Reprendre'}
          </button>
        )}

        {isSessionActive && (
          <button
            onClick={handleEndDay}
            disabled={loading}
            style={{
              padding: '16px',
              background: colors.danger,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Chargement...' : 'Fin de journée'}
          </button>
        )}
      </div>

      {isSessionActive && (
        <div style={{ marginTop: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: colors.text,
            marginBottom: '8px'
          }}>
            Changer le statut
          </label>
          <select
            value={userStatus.status}
            onChange={(e) => handleChangeStatus(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              fontSize: '14px',
              background: colors.surface,
              color: colors.text,
            }}
          >
            <option value="in_service">En service</option>
            <option value="available">Disponible</option>
            <option value="sick">Malade</option>
            <option value="on_leave">En congé</option>
            <option value="other">Autre</option>
          </select>
        </div>
      )}

      {shiftModal && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}} onClick={() => setShiftModal(null)}>
          <div style={{background:colors.background,borderRadius:'20px',padding:'24px',width:'100%',maxWidth:'400px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}} onClick={e => e.stopPropagation()}>
            <h3 style={{margin:'0 0 12px',fontSize:'18px',fontWeight:'700',color:colors.text}}>{shiftModal.title}</h3>
            <p style={{margin:'0 0 20px',fontSize:'14px',color:colors.textSecondary,lineHeight:'1.5',whiteSpace:'pre-line'}}>{shiftModal.message}</p>
            <div style={{display:'flex',gap:'10px'}}>
              {shiftModal.type === 'confirm' && (
                <button
                  onClick={() => setShiftModal(null)}
                  style={{flex:1,padding:'14px',borderRadius:'12px',border:`1px solid ${colors.border}`,background:'transparent',color:colors.textSecondary,fontWeight:'600',fontSize:'14px',cursor:'pointer'}}
                >
                  Annuler
                </button>
              )}
              <button
                onClick={shiftModal.onConfirm}
                style={{flex:1,padding:'14px',borderRadius:'12px',border:'none',background:shiftModal.confirmColor || colors.primary,color:'#FFF',fontWeight:'700',fontSize:'14px',cursor:'pointer'}}
              >
                {shiftModal.type === 'info' ? 'OK' : (shiftModal.confirmLabel || 'Confirmer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkShiftTracker;
