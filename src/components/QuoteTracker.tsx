import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { safeLocale } from '../utils/safeFormat';

interface QuoteTrackerProps {
  darkMode?: boolean;
  lang?: 'fr' | 'en' | 'ar';
  onBack?: () => void;
}

interface QuoteDetails {
  tracking_number: string;
  name: string;
  email: string;
  phone: string;
  service_type: string;
  address: string;
  description: string;
  urgency: string;
  status: string;
  response_notes: string | null;
  estimated_price: number | null;
  estimated_duration: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

const QuoteTracker: React.FC<QuoteTrackerProps> = ({
  darkMode = false,
  lang = 'fr',
  onBack,
}) => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [email, setEmail] = useState('');
  const [quoteDetails, setQuoteDetails] = useState<QuoteDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const texts = {
    fr: {
      title: 'Suivre mon Devis',
      subtitle: 'Entrez votre numéro de suivi et email pour consulter l\'état de votre demande',
      trackingNumber: 'Numéro de suivi',
      trackingPlaceholder: 'DEV-20260214-1234',
      email: 'Email',
      emailPlaceholder: 'votre.email@example.com',
      search: 'Rechercher',
      back: 'Retour',
      notFound: 'Aucun devis trouvé avec ces informations',
      quoteDetails: 'Détails du Devis',
      status: 'Statut',
      createdAt: 'Demande créée le',
      updatedAt: 'Dernière mise à jour',
      service: 'Service demandé',
      urgency: 'Urgence',
      address: 'Adresse',
      description: 'Description',
      responseNotes: 'Réponse de notre équipe',
      estimatedPrice: 'Prix estimé',
      estimatedDuration: 'Durée estimée',
      assignedTo: 'Assigné à',
      statusPending: 'En attente',
      statusReviewed: 'En cours d\'examen',
      statusQuoted: 'Devis envoyé',
      statusAccepted: 'Accepté',
      statusRejected: 'Rejeté',
      statusCompleted: 'Terminé',
      urgencyNormal: 'Normal',
      urgencyUrgent: 'Urgent',
      urgencyEmergency: 'Urgence',
      servicePlumbing: 'Plomberie Générale',
      serviceSanitary: 'Installation Sanitaire',
      serviceWaterHeater: 'Chauffe-eau',
      serviceRenovation: 'Rénovation',
      serviceMaintenance: 'Maintenance',
      serviceEmergency: 'Urgence',
      contactInfo: 'Informations de contact',
      noResponse: 'En attente de réponse',
      trackingInfo: 'Votre numéro de suivi vous a été envoyé par email lors de votre demande',
    },
    en: {
      title: 'Track my Quote',
      subtitle: 'Enter your tracking number and email to check your request status',
      trackingNumber: 'Tracking Number',
      trackingPlaceholder: 'DEV-20260214-1234',
      email: 'Email',
      emailPlaceholder: 'your.email@example.com',
      search: 'Search',
      back: 'Back',
      notFound: 'No quote found with this information',
      quoteDetails: 'Quote Details',
      status: 'Status',
      createdAt: 'Request created on',
      updatedAt: 'Last updated',
      service: 'Requested service',
      urgency: 'Urgency',
      address: 'Address',
      description: 'Description',
      responseNotes: 'Response from our team',
      estimatedPrice: 'Estimated price',
      estimatedDuration: 'Estimated duration',
      assignedTo: 'Assigned to',
      statusPending: 'Pending',
      statusReviewed: 'Under review',
      statusQuoted: 'Quote sent',
      statusAccepted: 'Accepted',
      statusRejected: 'Rejected',
      statusCompleted: 'Completed',
      urgencyNormal: 'Normal',
      urgencyUrgent: 'Urgent',
      urgencyEmergency: 'Emergency',
      servicePlumbing: 'General Plumbing',
      serviceSanitary: 'Sanitary Installation',
      serviceWaterHeater: 'Water Heater',
      serviceRenovation: 'Renovation',
      serviceMaintenance: 'Maintenance',
      serviceEmergency: 'Emergency',
      contactInfo: 'Contact information',
      noResponse: 'Awaiting response',
      trackingInfo: 'Your tracking number was sent to you by email when you made your request',
    },
    ar: {
      title: 'تتبع عرض السعر',
      subtitle: 'أدخل رقم التتبع والبريد الإلكتروني للتحقق من حالة طلبك',
      trackingNumber: 'رقم التتبع',
      trackingPlaceholder: 'DEV-20260214-1234',
      email: 'البريد الإلكتروني',
      emailPlaceholder: 'your.email@example.com',
      search: 'بحث',
      back: 'رجوع',
      notFound: 'لم يتم العثور على عرض سعر بهذه المعلومات',
      quoteDetails: 'تفاصيل عرض السعر',
      status: 'الحالة',
      createdAt: 'تم إنشاء الطلب في',
      updatedAt: 'آخر تحديث',
      service: 'الخدمة المطلوبة',
      urgency: 'الاستعجال',
      address: 'العنوان',
      description: 'الوصف',
      responseNotes: 'رد فريقنا',
      estimatedPrice: 'السعر المقدر',
      estimatedDuration: 'المدة المقدرة',
      assignedTo: 'مسند إلى',
      statusPending: 'قيد الانتظار',
      statusReviewed: 'قيد المراجعة',
      statusQuoted: 'تم إرسال عرض السعر',
      statusAccepted: 'مقبول',
      statusRejected: 'مرفوض',
      statusCompleted: 'مكتمل',
      urgencyNormal: 'عادي',
      urgencyUrgent: 'عاجل',
      urgencyEmergency: 'طارئ',
      servicePlumbing: 'السباكة العامة',
      serviceSanitary: 'التركيب الصحي',
      serviceWaterHeater: 'سخان المياه',
      serviceRenovation: 'التجديد',
      serviceMaintenance: 'الصيانة',
      serviceEmergency: 'طوارئ',
      contactInfo: 'معلومات الاتصال',
      noResponse: 'في انتظار الرد',
      trackingInfo: 'تم إرسال رقم التتبع إليك عبر البريد الإلكتروني عند تقديم طلبك',
    },
  };

  const t = texts[lang];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      reviewed: '#3b82f6',
      quoted: '#10b981',
      accepted: '#10b981',
      rejected: '#ef4444',
      completed: '#6366f1',
    };
    return colors[status] || '#64748b';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: t.statusPending,
      reviewed: t.statusReviewed,
      quoted: t.statusQuoted,
      accepted: t.statusAccepted,
      rejected: t.statusRejected,
      completed: t.statusCompleted,
    };
    return labels[status] || status;
  };

  const getServiceLabel = (service: string) => {
    const labels: Record<string, string> = {
      plumbing: t.servicePlumbing,
      sanitary: t.serviceSanitary,
      water_heater: t.serviceWaterHeater,
      renovation: t.serviceRenovation,
      maintenance: t.serviceMaintenance,
      emergency: t.serviceEmergency,
    };
    return labels[service] || service;
  };

  const getUrgencyLabel = (urgency: string) => {
    const labels: Record<string, string> = {
      normal: t.urgencyNormal,
      urgent: t.urgencyUrgent,
      emergency: t.urgencyEmergency,
    };
    return labels[urgency] || urgency;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!trackingNumber || !email) {
      setError(t.notFound);
      return;
    }

    setLoading(true);
    setError('');
    setQuoteDetails(null);

    try {
      const { data, error: searchError } = await supabase
        .from('quote_requests')
        .select('*')
        .eq('tracking_number', trackingNumber.trim().toUpperCase())
        .eq('client_email_for_tracking', email.trim().toLowerCase())
        .maybeSingle();

      if (searchError) throw searchError;

      if (!data) {
        setError(t.notFound);
      } else {
        setQuoteDetails(data as QuoteDetails);
      }
    } catch (err) {
      console.error('Error searching quote:', err);
      setError(t.notFound);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: darkMode
      ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  };

  const cardStyle: React.CSSProperties = {
    maxWidth: '800px',
    margin: '0 auto',
    background: darkMode ? '#1e293b' : '#FFFFFF',
    borderRadius: '24px',
    padding: '48px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '36px',
    fontWeight: '800',
    marginBottom: '12px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '16px',
    color: darkMode ? '#94a3b8' : '#64748b',
    textAlign: 'center',
    marginBottom: '32px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: `2px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
    background: darkMode ? '#0f172a' : '#FFFFFF',
    color: darkMode ? '#f1f5f9' : '#0f172a',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: 'none',
    background: loading
      ? darkMode ? '#475569' : '#cbd5e1'
      : 'linear-gradient(135deg, #1e40af, #3b82f6)',
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: '700',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '16px',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>{t.title}</h1>
        <p style={subtitleStyle}>{t.subtitle}</p>

        {!quoteDetails ? (
          <>
            <form onSubmit={handleSearch}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: darkMode ? '#f1f5f9' : '#0f172a',
                }}>
                  {t.trackingNumber}
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                  placeholder={t.trackingPlaceholder}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = darkMode ? '#334155' : '#e2e8f0'}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: darkMode ? '#f1f5f9' : '#0f172a',
                }}>
                  {t.email}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = darkMode ? '#334155' : '#e2e8f0'}
                />
              </div>

              {error && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: '#fef2f2',
                  border: '2px solid #fecaca',
                  color: '#dc2626',
                  fontSize: '14px',
                  marginBottom: '16px',
                  textAlign: 'center',
                }}>
                  {error}
                </div>
              )}

              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: darkMode ? '#334155' : '#e0f2fe',
                color: darkMode ? '#94a3b8' : '#075985',
                fontSize: '13px',
                marginBottom: '16px',
                textAlign: 'center',
              }}>
                💡 {t.trackingInfo}
              </div>

              <button
                type="submit"
                disabled={loading}
                style={buttonStyle}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {loading ? '⏳ Recherche...' : `🔍 ${t.search}`}
              </button>
            </form>

            {onBack && (
              <button
                onClick={onBack}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: `2px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                  background: 'transparent',
                  color: darkMode ? '#f1f5f9' : '#0f172a',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '12px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = darkMode ? '#334155' : '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                ← {t.back}
              </button>
            )}
          </>
        ) : (
          <div>
            <div style={{
              background: getStatusColor(quoteDetails.status),
              color: '#fff',
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'center',
              fontSize: '18px',
              fontWeight: '700',
              marginBottom: '24px',
            }}>
              {getStatusLabel(quoteDetails.status)}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: darkMode ? '#f1f5f9' : '#0f172a',
                marginBottom: '16px',
              }}>
                {t.quoteDetails}
              </h3>

              <div style={{
                background: darkMode ? '#0f172a' : '#f8fafc',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '12px',
              }}>
                <div style={{ fontSize: '13px', color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '4px' }}>
                  {t.trackingNumber}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: darkMode ? '#f1f5f9' : '#0f172a', fontFamily: 'monospace' }}>
                  {quoteDetails.tracking_number}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '12px',
              }}>
                <div style={{
                  background: darkMode ? '#0f172a' : '#f8fafc',
                  padding: '16px',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '13px', color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '4px' }}>
                    {t.service}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                    {getServiceLabel(quoteDetails.service_type)}
                  </div>
                </div>

                <div style={{
                  background: darkMode ? '#0f172a' : '#f8fafc',
                  padding: '16px',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '13px', color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '4px' }}>
                    {t.urgency}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                    {getUrgencyLabel(quoteDetails.urgency)}
                  </div>
                </div>
              </div>

              <div style={{
                background: darkMode ? '#0f172a' : '#f8fafc',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '12px',
              }}>
                <div style={{ fontSize: '13px', color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '4px' }}>
                  {t.address}
                </div>
                <div style={{ fontSize: '15px', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                  {quoteDetails.address}
                </div>
              </div>

              <div style={{
                background: darkMode ? '#0f172a' : '#f8fafc',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '12px',
              }}>
                <div style={{ fontSize: '13px', color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '4px' }}>
                  {t.description}
                </div>
                <div style={{ fontSize: '15px', color: darkMode ? '#f1f5f9' : '#0f172a', lineHeight: '1.6' }}>
                  {quoteDetails.description}
                </div>
              </div>

              {quoteDetails.response_notes && (
                <div style={{
                  background: darkMode ? '#0f172a' : '#e0f2fe',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  border: `2px solid ${darkMode ? '#334155' : '#bae6fd'}`,
                }}>
                  <div style={{ fontSize: '13px', color: darkMode ? '#94a3b8' : '#075985', marginBottom: '8px', fontWeight: '600' }}>
                    {t.responseNotes}
                  </div>
                  <div style={{ fontSize: '15px', color: darkMode ? '#f1f5f9' : '#0c4a6e', lineHeight: '1.6' }}>
                    {quoteDetails.response_notes}
                  </div>
                </div>
              )}

              {quoteDetails.estimated_price && (
                <div style={{
                  background: darkMode ? '#0f172a' : '#f8fafc',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '12px',
                }}>
                  <div style={{ fontSize: '13px', color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '4px' }}>
                    {t.estimatedPrice}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>
                    {safeLocale(quoteDetails.estimated_price)} GNF
                  </div>
                </div>
              )}

              {quoteDetails.estimated_duration && (
                <div style={{
                  background: darkMode ? '#0f172a' : '#f8fafc',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '12px',
                }}>
                  <div style={{ fontSize: '13px', color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '4px' }}>
                    {t.estimatedDuration}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                    {quoteDetails.estimated_duration}
                  </div>
                </div>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}>
                <div style={{
                  background: darkMode ? '#0f172a' : '#f8fafc',
                  padding: '12px',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '12px', color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '4px' }}>
                    {t.createdAt}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                    {formatDate(quoteDetails.created_at)}
                  </div>
                </div>

                <div style={{
                  background: darkMode ? '#0f172a' : '#f8fafc',
                  padding: '12px',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '12px', color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '4px' }}>
                    {t.updatedAt}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                    {formatDate(quoteDetails.updated_at)}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setQuoteDetails(null);
                setTrackingNumber('');
                setEmail('');
                setError('');
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: `2px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                background: 'transparent',
                color: darkMode ? '#f1f5f9' : '#0f172a',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = darkMode ? '#334155' : '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              ← {t.back}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteTracker;
