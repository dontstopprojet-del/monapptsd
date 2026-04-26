import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AppointmentBookingProps {
  darkMode?: boolean;
  lang?: 'fr' | 'en' | 'ar';
  quote: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const AppointmentBooking: React.FC<AppointmentBookingProps> = ({
  darkMode = false,
  lang = 'fr',
  quote,
  onSuccess,
  onCancel,
}) => {
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ date?: string; time?: string; general?: string }>({});

  const texts = {
    fr: {
      title: 'Prendre rendez-vous',
      subtitle: 'Choisissez la date et l\'heure qui vous conviennent',
      date: 'Date souhaitée',
      time: 'Heure souhaitée',
      submit: 'Confirmer le rendez-vous',
      cancel: 'Annuler',
      errorFields: 'Veuillez remplir la date et l\'heure',
      success: 'Rendez-vous demandé ! Nous vous contacterons pour confirmer.',
      error: 'Erreur lors de la prise de rendez-vous',
      morning: 'Matin (8h-12h)',
      afternoon: 'Après-midi (14h-18h)',
      minDate: 'La date doit être dans le futur',
    },
    en: {
      title: 'Book an appointment',
      subtitle: 'Choose a date and time that suits you',
      date: 'Preferred date',
      time: 'Preferred time',
      submit: 'Confirm appointment',
      cancel: 'Cancel',
      errorFields: 'Please fill in the date and time',
      success: 'Appointment requested! We will contact you to confirm.',
      error: 'Error booking appointment',
      morning: 'Morning (8am-12pm)',
      afternoon: 'Afternoon (2pm-6pm)',
      minDate: 'Date must be in the future',
    },
    ar: {
      title: 'حجز موعد',
      subtitle: 'اختر التاريخ والوقت المناسبين لك',
      date: 'التاريخ المفضل',
      time: 'الوقت المفضل',
      submit: 'تأكيد الموعد',
      cancel: 'إلغاء',
      errorFields: 'يرجى ملء التاريخ والوقت',
      success: 'تم طلب الموعد! سنتصل بك للتأكيد.',
      error: 'خطأ في حجز الموعد',
      morning: 'صباحا (8 صباحا-12 ظهرا)',
      afternoon: 'بعد الظهر (2 مساء-6 مساء)',
      minDate: 'يجب أن يكون التاريخ في المستقبل',
    },
  };

  const t = texts[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: { date?: string; time?: string; general?: string } = {};

    if (!scheduledDate) {
      newErrors.date = t.errorFields;
    }

    if (!scheduledTime) {
      newErrors.time = t.errorFields;
    }

    if (!scheduledDate || !scheduledTime) {
      setErrors(newErrors);
      return;
    }

    const selectedDate = new Date(scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setErrors({ date: t.minDate });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('appointments')
        .insert({
          quote_id: quote.id,
          user_id: user?.id || null,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
          service_type: quote.service_type,
          address: quote.address || null,
          location_coordinates: quote.location_coordinates || null,
          status: 'pending',
        });

      if (error) throw error;

      alert(t.success);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error booking appointment:', err);
      setErrors({ general: t.error });
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateString = minDate.toISOString().split('T')[0];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 1000,
    }}>
      <div style={{
        background: darkMode ? '#1e293b' : '#FFFFFF',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          marginBottom: '8px',
          color: darkMode ? '#f1f5f9' : '#0f172a',
        }}>
          {t.title}
        </h2>
        <p style={{
          fontSize: '14px',
          color: darkMode ? '#94a3b8' : '#64748b',
          marginBottom: '24px',
        }}>
          {t.subtitle}
        </p>

        <form noValidate onSubmit={handleSubmit}>
          {errors.general && (
            <div style={{
              padding: '12px',
              marginBottom: '20px',
              borderRadius: '8px',
              background: darkMode ? '#7f1d1d' : '#fee2e2',
              color: darkMode ? '#fecaca' : '#991b1b',
              fontSize: '14px',
              fontWeight: '500',
            }}>
              {errors.general}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: darkMode ? '#f1f5f9' : '#0f172a',
            }}>
              {t.date} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => {
                setScheduledDate(e.target.value);
                if (errors.date) {
                  const newErrors = { ...errors };
                  delete newErrors.date;
                  setErrors(newErrors);
                }
              }}
              min={minDateString}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: `2px solid ${errors.date ? '#ef4444' : darkMode ? '#334155' : '#e2e8f0'}`,
                background: darkMode ? '#0f172a' : '#FFFFFF',
                color: darkMode ? '#f1f5f9' : '#0f172a',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {errors.date && (
              <div style={{
                marginTop: '6px',
                fontSize: '13px',
                color: '#ef4444',
                fontWeight: '500',
              }}>
                {errors.date}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: darkMode ? '#f1f5f9' : '#0f172a',
            }}>
              {t.time} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={scheduledTime}
              onChange={(e) => {
                setScheduledTime(e.target.value);
                if (errors.time) {
                  const newErrors = { ...errors };
                  delete newErrors.time;
                  setErrors(newErrors);
                }
              }}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: `2px solid ${errors.time ? '#ef4444' : darkMode ? '#334155' : '#e2e8f0'}`,
                background: darkMode ? '#0f172a' : '#FFFFFF',
                color: darkMode ? '#f1f5f9' : '#0f172a',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            >
              <option value="">-- Sélectionnez --</option>
              <option value="morning">{t.morning}</option>
              <option value="afternoon">{t.afternoon}</option>
            </select>
            {errors.time && (
              <div style={{
                marginTop: '6px',
                fontSize: '13px',
                color: '#ef4444',
                fontWeight: '500',
              }}>
                {errors.time}
              </div>
            )}
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
          }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '8px',
                border: 'none',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1e40af, #3b82f6)',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '...' : t.submit}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '8px',
                border: `2px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                background: 'transparent',
                color: darkMode ? '#f1f5f9' : '#0f172a',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {t.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentBooking;
