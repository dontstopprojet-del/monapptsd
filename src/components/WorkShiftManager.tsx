import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { safeFixed } from '../utils/safeFormat';

interface WorkShiftManagerProps {
  userId: string;
  colors: any;
}

interface ShiftData {
  id?: string;
  status: 'idle' | 'started' | 'paused' | 'ended';
  startTime?: Date;
  pauseStart?: Date;
  pauseEnd?: Date;
  totalKm: number;
  batteryLevel: number;
}

interface WorksiteCompletion {
  id: string;
  worksite_name: string;
  completion_time: string;
  notes: string;
}

export default function WorkShiftManager({ userId, colors }: WorkShiftManagerProps) {
  const [shift, setShift] = useState<ShiftData>({
    status: 'idle',
    totalKm: 0,
    batteryLevel: 100
  });
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [pauseDuration, setPauseDuration] = useState(0);
  const [completedWorksites, setCompletedWorksites] = useState<WorksiteCompletion[]>([]);
  const [showWorksiteForm, setShowWorksiteForm] = useState(false);
  const [worksiteName, setWorksiteName] = useState('');
  const [worksiteNotes, setWorksiteNotes] = useState('');
  const watchIdRef = useRef<number | null>(null);
  const pauseTimerRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long' });
  const maxPauseDuration = today === 'vendredi' ? 90 : 30;
  const keepGpsOnPause = today === 'vendredi';

  useEffect(() => {
    loadTodayShift();
    updateBatteryLevel();

    const batteryInterval = setInterval(updateBatteryLevel, 60000);
    return () => clearInterval(batteryInterval);
  }, []);

  useEffect(() => {
    if (shift.status === 'paused' && pauseTimerRef.current === null) {
      pauseTimerRef.current = window.setInterval(() => {
        setPauseDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= maxPauseDuration * 60) {
            handleEndPause();
          }
          return newDuration;
        });
      }, 1000);
    } else if (shift.status !== 'paused' && pauseTimerRef.current !== null) {
      clearInterval(pauseTimerRef.current);
      pauseTimerRef.current = null;
      setPauseDuration(0);
    }

    return () => {
      if (pauseTimerRef.current) {
        clearInterval(pauseTimerRef.current);
      }
    };
  }, [shift.status]);

  const loadTodayShift = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('work_shifts')
        .select('*')
        .eq('user_id', userId)
        .eq('shift_date', today)
        .maybeSingle();

      if (!error && data) {
        setShift({
          id: data.id,
          status: data.status || 'idle',
          startTime: data.start_time ? new Date(data.start_time) : undefined,
          totalKm: data.total_km || 0,
          batteryLevel: 100
        });

        if (data.status === 'started') {
          startGPSTracking();
        }
      }

      loadCompletedWorksites();
    } catch (err) {
      console.error('Error loading shift:', err);
    }
  };

  const loadCompletedWorksites = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('worksite_completions')
      .select('*')
      .eq('user_id', userId)
      .gte('completion_time', today)
      .order('completion_time', { ascending: false });

    if (data) {
      setCompletedWorksites(data);
    }
  };

  const handleCompleteWorksite = async () => {
    if (!worksiteName.trim()) {
      alert('Veuillez entrer le nom du chantier');
      return;
    }

    try {
      await supabase.from('worksite_completions').insert({
        user_id: userId,
        worksite_name: worksiteName,
        notes: worksiteNotes,
        completion_time: new Date().toISOString()
      });

      setWorksiteName('');
      setWorksiteNotes('');
      setShowWorksiteForm(false);
      loadCompletedWorksites();
      alert('Chantier marqué comme terminé !');
    } catch (err) {
      console.error('Error completing worksite:', err);
    }
  };

  const handleRestartDay = async () => {
    if (confirm('Redémarrer la journée ? Le GPS sera réactivé et le suivi reprendra.')) {
      const now = new Date().toISOString();
      try {
        if (shift.id) {
          await supabase
            .from('work_shifts')
            .update({ status: 'started', end_time: null })
            .eq('id', shift.id);
        } else {
          const today = new Date().toISOString().split('T')[0];
          const { data } = await supabase
            .from('work_shifts')
            .insert({
              user_id: userId,
              shift_date: today,
              start_time: now,
              status: 'started',
              total_km: 0
            })
            .select()
            .single();

          if (data) {
            setShift(prev => ({ ...prev, id: data.id }));
          }
        }

        setShift(prev => ({ ...prev, status: 'started' }));
        startGPSTracking();
      } catch (err) {
        console.error('Error restarting shift:', err);
      }
    }
  };

  const updateBatteryLevel = async () => {
    if ('getBattery' in navigator) {
      try {
        const battery: any = await (navigator as any).getBattery();
        const level = Math.round(battery.level * 100);
        setShift(prev => ({ ...prev, batteryLevel: level }));
      } catch (err) {
        console.error('Battery API error:', err);
      }
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const startGPSTracking = () => {
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          setGpsEnabled(true);

          if (lastPositionRef.current) {
            const distance = calculateDistance(
              lastPositionRef.current.lat,
              lastPositionRef.current.lng,
              position.coords.latitude,
              position.coords.longitude
            );

            if (distance > 0.01) {
              setShift(prev => ({ ...prev, totalKm: prev.totalKm + distance }));
            }
          }

          lastPositionRef.current = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          await supabase.from('technician_gps_tracking').insert({
            user_id: userId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            battery_level: shift.batteryLevel,
            is_active: true
          });
        },
        (error) => {
          console.error('GPS error:', error);
          setGpsEnabled(false);
        },
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }
  };

  const stopGPSTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setGpsEnabled(false);
    }
  };

  const handleStartShift = async () => {
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('work_shifts')
        .insert({
          user_id: userId,
          shift_date: today,
          start_time: now,
          status: 'started',
          total_km: 0
        })
        .select()
        .single();

      if (!error && data) {
        setShift({
          id: data.id,
          status: 'started',
          startTime: new Date(now),
          totalKm: 0,
          batteryLevel: shift.batteryLevel
        });
        startGPSTracking();
      }
    } catch (err) {
      console.error('Error starting shift:', err);
    }
  };

  const handleStartPause = async () => {
    if (!keepGpsOnPause) {
      stopGPSTracking();
    }

    const now = new Date().toISOString();
    try {
      await supabase
        .from('work_shifts')
        .update({ pause_start: now, status: 'paused' })
        .eq('id', shift.id);

      setShift(prev => ({ ...prev, status: 'paused', pauseStart: new Date(now) }));
    } catch (err) {
      console.error('Error starting pause:', err);
    }
  };

  const handleEndPause = async () => {
    if (!keepGpsOnPause) {
      startGPSTracking();
    }

    const now = new Date().toISOString();
    try {
      await supabase
        .from('work_shifts')
        .update({ pause_end: now, status: 'started' })
        .eq('id', shift.id);

      setShift(prev => ({ ...prev, status: 'started', pauseEnd: new Date(now) }));
      setPauseDuration(0);
    } catch (err) {
      console.error('Error ending pause:', err);
    }
  };

  const handleEndShift = async () => {
    stopGPSTracking();
    const now = new Date().toISOString();

    try {
      await supabase
        .from('work_shifts')
        .update({
          end_time: now,
          status: 'ended',
          total_km: shift.totalKm
        })
        .eq('id', shift.id);

      setShift({
        status: 'ended',
        totalKm: shift.totalKm,
        batteryLevel: shift.batteryLevel
      });
    } catch (err) {
      console.error('Error ending shift:', err);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      background: '#FFF',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.08)'
    }}>
      <h3 style={{
        color: colors.primary,
        marginBottom: '15px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '18px',
        fontWeight: '600'
      }}>
        🕐 Gestion de Journée
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          border: `1px solid ${colors.primary}30`
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📍</div>
          <div style={{ fontSize: '11px', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>GPS</div>
          <div style={{
            fontSize: '15px',
            fontWeight: 'bold',
            color: gpsEnabled ? colors.success : colors.danger
          }}>
            {gpsEnabled ? 'Actif' : 'Inactif'}
          </div>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${colors.success}15, ${colors.success}25)`,
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          border: `1px solid ${colors.success}30`
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔋</div>
          <div style={{ fontSize: '11px', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Batterie</div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: colors.text }}>
            {shift.batteryLevel}%
          </div>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${colors.secondary}15, ${colors.secondary}25)`,
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          border: `1px solid ${colors.secondary}30`
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🚗</div>
          <div style={{ fontSize: '11px', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Distance</div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: colors.text }}>
            {safeFixed(shift.totalKm, 2)} km
          </div>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${colors.warning}15, ${colors.warning}25)`,
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          border: `1px solid ${colors.warning}30`
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏸️</div>
          <div style={{ fontSize: '11px', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Pause Max</div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: colors.text }}>
            {maxPauseDuration} min
          </div>
        </div>
      </div>

      {shift.status === 'paused' && (
        <div style={{
          background: colors.warning + '20',
          border: `2px solid ${colors.warning}`,
          borderRadius: '12px',
          padding: '15px',
          marginBottom: '15px',
          textAlign: 'center'
        }}>
          <div style={{ color: colors.warning, fontWeight: 'bold', fontSize: '18px', marginBottom: '5px' }}>
            ⏸️ Pause en cours
          </div>
          <div style={{ fontSize: '24px', color: colors.text, fontWeight: 'bold' }}>
            {formatTime(pauseDuration)} / {maxPauseDuration}:00
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {shift.status === 'idle' && (
          <button
            onClick={handleStartShift}
            style={{
              background: `linear-gradient(135deg, ${colors.success}, ${colors.success}dd)`,
              color: '#FFF',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            ▶️ Début de Journée
          </button>
        )}

        {shift.status === 'started' && (
          <>
            <button
              onClick={() => setShowWorksiteForm(true)}
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                color: '#FFF',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              ✅ Finir Chantier
            </button>
            <button
              onClick={handleStartPause}
              style={{
                background: `linear-gradient(135deg, ${colors.warning}, ${colors.warning}dd)`,
                color: '#FFF',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              ⏸️ Pause
            </button>
            <button
              onClick={handleEndShift}
              style={{
                background: `linear-gradient(135deg, ${colors.danger}, ${colors.danger}dd)`,
                color: '#FFF',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              ⏹️ Fin de Journée
            </button>
          </>
        )}

        {shift.status === 'paused' && (
          <button
            onClick={handleEndPause}
            style={{
              background: `linear-gradient(135deg, ${colors.success}, ${colors.success}dd)`,
              color: '#FFF',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            ▶️ Reprendre
          </button>
        )}

        {shift.status === 'ended' && (
          <>
            <div style={{
              background: colors.success + '20',
              border: `2px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '15px',
              textAlign: 'center',
              color: colors.success,
              fontWeight: 'bold'
            }}>
              ✅ Journée Terminée - {safeFixed(shift.totalKm, 2)} km parcourus
            </div>
            <button
              onClick={handleRestartDay}
              style={{
                background: `linear-gradient(135deg, ${colors.secondary}, ${colors.primary})`,
                color: '#FFF',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              🔄 Redémarrer la Journée
            </button>
          </>
        )}
      </div>

      {showWorksiteForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000
        }}>
          <div style={{
            background: '#FFF',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{
              color: colors.primary,
              marginBottom: '20px',
              textAlign: 'center',
              fontSize: '20px',
              fontWeight: 'bold'
            }}>
              🏗️ Chantier Terminé
            </h3>

            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                color: colors.text,
                marginBottom: '8px',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                Nom du chantier *
              </label>
              <input
                type="text"
                value={worksiteName}
                onChange={(e) => setWorksiteName(e.target.value)}
                placeholder="Ex: Rénovation appartement 3A"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.light}`,
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                color: colors.text,
                marginBottom: '8px',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                Notes (optionnel)
              </label>
              <textarea
                value={worksiteNotes}
                onChange={(e) => setWorksiteNotes(e.target.value)}
                placeholder="Travaux réalisés, observations..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.light}`,
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowWorksiteForm(false);
                  setWorksiteName('');
                  setWorksiteNotes('');
                }}
                style={{
                  background: colors.light,
                  color: colors.text,
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleCompleteWorksite}
                style={{
                  background: colors.success,
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {completedWorksites.length > 0 && (
        <div style={{
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: `2px solid ${colors.light}`
        }}>
          <h4 style={{
            color: colors.text,
            marginBottom: '14px',
            fontSize: '15px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>📋</span>
            Chantiers terminés aujourd'hui ({completedWorksites.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {completedWorksites.map((worksite) => (
              <div
                key={worksite.id}
                style={{
                  background: `linear-gradient(135deg, ${colors.success}08, ${colors.success}15)`,
                  border: `1px solid ${colors.success}40`,
                  borderRadius: '12px',
                  padding: '14px',
                  transition: 'transform 0.2s'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 'bold',
                      color: colors.text,
                      fontSize: '14px',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ color: colors.success }}>✅</span>
                      {worksite.worksite_name}
                    </div>
                    {worksite.notes && (
                      <div style={{
                        fontSize: '12px',
                        color: colors.textSecondary,
                        marginBottom: '6px',
                        lineHeight: '1.4'
                      }}>
                        {worksite.notes}
                      </div>
                    )}
                    <div style={{
                      fontSize: '11px',
                      color: colors.textSecondary,
                      fontWeight: '500'
                    }}>
                      ⏰ {new Date(worksite.completion_time).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
