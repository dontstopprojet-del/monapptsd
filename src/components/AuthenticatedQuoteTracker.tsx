import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AppointmentBooking from './AppointmentBooking';
import { safeFixed, safeLocale } from '../utils/safeFormat';

interface AuthenticatedQuoteTrackerProps {
  darkMode?: boolean;
  lang?: 'fr' | 'en' | 'ar';
  currentUser?: any;
  onBack?: () => void;
  onNewQuote?: () => void;
}

interface Quote {
  id: string;
  tracking_number: string;
  name: string;
  email: string;
  phone: string;
  service_type: string;
  address: string;
  description: string;
  urgency: string;
  status: string;
  created_at: string;
  updated_at: string;
  response_notes: string | null;
  estimated_price: number | null;
  estimated_duration: string | null;
  validity_date: string | null;
  viewed_at: string | null;
  image_urls: string[] | null;
  location_coordinates: { lat: number; lng: number; address: string } | null;
}

const AuthenticatedQuoteTracker: React.FC<AuthenticatedQuoteTrackerProps> = ({
  darkMode = false,
  lang = 'fr',
  currentUser,
  onBack,
  onNewQuote,
}) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'quoted' | 'accepted'>('all');
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentQuote, setAppointmentQuote] = useState<Quote | null>(null);

  useEffect(() => {
    const setupRealtimeAndFetch = async () => {
      if (!currentUser) return;

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      fetchQuotes();

      const channel = supabase
        .channel('authenticated_quotes_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'quote_requests',
            filter: `user_id=eq.${authUser.id}`,
          },
          () => {
            fetchQuotes();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtimeAndFetch();
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [currentUser]);

  const fetchQuotes = async () => {
    if (!currentUser) return;

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      let query = supabase
        .from('quote_requests')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchQuotes();
    }
  }, [filter]);

  const handleAccept = async (quote: Quote) => {
    if (!confirm(texts[lang].confirmAccept)) return;

    try {
      const { error } = await supabase.rpc('accept_quote', {
        quote_tracking_number: quote.tracking_number,
      });

      if (error) throw error;

      alert(texts[lang].successAccept);
      fetchQuotes();
      setSelectedQuote(null);
    } catch (err) {
      console.error('Erreur:', err);
      alert(texts[lang].errorAction);
    }
  };

  const handleReject = async (quote: Quote) => {
    const reason = prompt(texts[lang].rejectReason);
    if (reason === null) return;

    try {
      const { error } = await supabase.rpc('reject_quote', {
        quote_tracking_number: quote.tracking_number,
        reason: reason || null,
      });

      if (error) throw error;

      alert(texts[lang].successReject);
      fetchQuotes();
      setSelectedQuote(null);
    } catch (err) {
      console.error('Erreur:', err);
      alert(texts[lang].errorAction);
    }
  };

  const texts = {
    fr: {
      title: 'Suivi de Devis',
      subtitle: 'Consultez et gérez tous vos devis',
      back: 'Retour',
      newQuote: 'Nouvelle Demande',
      filterAll: 'Tous',
      filterPending: 'En attente',
      filterQuoted: 'Avec devis',
      filterAccepted: 'Acceptés',
      noQuotes: 'Aucun devis pour le moment',
      noQuotesDesc: 'Vous n\'avez pas encore fait de demande de devis',
      trackingNumber: 'Numéro de suivi',
      service: 'Service',
      status: 'Statut',
      date: 'Date',
      viewDetails: 'Voir détails',
      statusPending: 'En attente',
      statusReviewing: 'En cours d\'examen',
      statusQuoted: 'Devis envoyé',
      statusAccepted: 'Accepté',
      statusRejected: 'Refusé',
      statusExpired: 'Expiré',
      statusCompleted: 'Terminé',
      quoteDetails: 'Détails du Devis',
      name: 'Nom',
      email: 'Email',
      phone: 'Téléphone',
      address: 'Adresse',
      description: 'Description',
      urgency: 'Urgence',
      createdAt: 'Date de demande',
      updatedAt: 'Dernière mise à jour',
      response: 'Réponse de TSD & FILS',
      estimatedPrice: 'Prix estimé',
      estimatedDuration: 'Durée estimée',
      validUntil: 'Valide jusqu\'au',
      expired: 'Ce devis a expiré',
      acceptQuote: 'Accepter le devis',
      rejectQuote: 'Refuser le devis',
      confirmAccept: 'Êtes-vous sûr de vouloir accepter ce devis ? Nous vous contacterons pour planifier les travaux.',
      rejectReason: 'Pourquoi refusez-vous ce devis ? (optionnel)',
      successAccept: 'Devis accepté ! Nous vous contacterons bientôt.',
      successReject: 'Devis refusé. Merci de nous avoir consultés.',
      errorAction: 'Erreur lors de l\'action',
      images: 'Photos jointes',
      contactUs: 'Nous contacter',
      phoneNumber: '+224 610 55 32 55',
      locationShared: 'Position partagée',
      coordinates: 'Coordonnées',
      bookAppointment: 'Prendre rendez-vous',
      appointmentDesc: 'Planifiez votre intervention',
    },
    en: {
      title: 'Quote Tracking',
      subtitle: 'View and manage all your quotes',
      back: 'Back',
      newQuote: 'New Request',
      filterAll: 'All',
      filterPending: 'Pending',
      filterQuoted: 'With Quote',
      filterAccepted: 'Accepted',
      noQuotes: 'No quotes yet',
      noQuotesDesc: 'You haven\'t made any quote requests yet',
      trackingNumber: 'Tracking Number',
      service: 'Service',
      status: 'Status',
      date: 'Date',
      viewDetails: 'View details',
      statusPending: 'Pending',
      statusReviewing: 'Under Review',
      statusQuoted: 'Quote Sent',
      statusAccepted: 'Accepted',
      statusRejected: 'Declined',
      statusExpired: 'Expired',
      statusCompleted: 'Completed',
      quoteDetails: 'Quote Details',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      description: 'Description',
      urgency: 'Urgency',
      createdAt: 'Request Date',
      updatedAt: 'Last Update',
      response: 'Response from TSD & SONS',
      estimatedPrice: 'Estimated Price',
      estimatedDuration: 'Estimated Duration',
      validUntil: 'Valid Until',
      expired: 'This quote has expired',
      acceptQuote: 'Accept Quote',
      rejectQuote: 'Decline Quote',
      confirmAccept: 'Are you sure you want to accept this quote? We will contact you to schedule the work.',
      rejectReason: 'Why are you declining this quote? (optional)',
      successAccept: 'Quote accepted! We will contact you soon.',
      successReject: 'Quote declined. Thank you for consulting us.',
      errorAction: 'Error performing action',
      images: 'Attached Photos',
      contactUs: 'Contact Us',
      phoneNumber: '+224 610 55 32 55',
      locationShared: 'Location shared',
      coordinates: 'Coordinates',
      bookAppointment: 'Book appointment',
      appointmentDesc: 'Schedule your service',
    },
    ar: {
      title: 'تتبع عروض الأسعار',
      subtitle: 'عرض وإدارة جميع عروض الأسعار الخاصة بك',
      back: 'رجوع',
      newQuote: 'طلب جديد',
      filterAll: 'الكل',
      filterPending: 'قيد الانتظار',
      filterQuoted: 'مع عرض سعر',
      filterAccepted: 'مقبول',
      noQuotes: 'لا توجد عروض أسعار حتى الآن',
      noQuotesDesc: 'لم تقم بأي طلبات عروض أسعار حتى الآن',
      trackingNumber: 'رقم التتبع',
      service: 'الخدمة',
      status: 'الحالة',
      date: 'التاريخ',
      viewDetails: 'عرض التفاصيل',
      statusPending: 'قيد الانتظار',
      statusReviewing: 'قيد المراجعة',
      statusQuoted: 'تم إرسال عرض السعر',
      statusAccepted: 'مقبول',
      statusRejected: 'مرفوض',
      statusExpired: 'منتهي الصلاحية',
      statusCompleted: 'مكتمل',
      quoteDetails: 'تفاصيل عرض السعر',
      name: 'الاسم',
      email: 'البريد الإلكتروني',
      phone: 'الهاتف',
      address: 'العنوان',
      description: 'الوصف',
      urgency: 'الاستعجال',
      createdAt: 'تاريخ الطلب',
      updatedAt: 'آخر تحديث',
      response: 'رد من TSD & FILS',
      estimatedPrice: 'السعر المقدر',
      estimatedDuration: 'المدة المقدرة',
      validUntil: 'صالح حتى',
      expired: 'انتهت صلاحية عرض السعر هذا',
      acceptQuote: 'قبول عرض السعر',
      rejectQuote: 'رفض عرض السعر',
      confirmAccept: 'هل أنت متأكد من قبول عرض السعر هذا؟ سنتصل بك لجدولة العمل.',
      rejectReason: 'لماذا ترفض عرض السعر هذا؟ (اختياري)',
      successAccept: 'تم قبول عرض السعر! سنتصل بك قريبًا.',
      successReject: 'تم رفض عرض السعر. شكرا لاستشارتنا.',
      errorAction: 'خطأ في تنفيذ الإجراء',
      images: 'الصور المرفقة',
      contactUs: 'اتصل بنا',
      phoneNumber: '+224 610 55 32 55',
      locationShared: 'تم مشاركة الموقع',
      coordinates: 'الإحداثيات',
      bookAppointment: 'حجز موعد',
      appointmentDesc: 'جدولة الخدمة الخاصة بك',
    },
  };

  const t = texts[lang];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      reviewing: '#3b82f6',
      quoted: '#8b5cf6',
      accepted: '#10b981',
      rejected: '#ef4444',
      expired: '#6b7280',
      completed: '#059669',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: t.statusPending,
      reviewing: t.statusReviewing,
      quoted: t.statusQuoted,
      accepted: t.statusAccepted,
      rejected: t.statusRejected,
      expired: t.statusExpired,
      completed: t.statusCompleted,
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString(lang === 'ar' ? 'ar-SA' : lang === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
    maxWidth: '1200px',
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
    marginBottom: '40px',
  };

  if (selectedQuote) {
    const isExpired = selectedQuote.validity_date && new Date(selectedQuote.validity_date) < new Date();
    const showActions = selectedQuote.status === 'quoted' && !isExpired;

    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <button
            onClick={() => setSelectedQuote(null)}
            style={{
              marginBottom: '24px',
              padding: '12px 24px',
              background: darkMode ? '#334155' : '#e2e8f0',
              color: darkMode ? '#f1f5f9' : '#0f172a',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            ← {t.back}
          </button>

          <h2 style={titleStyle}>{t.quoteDetails}</h2>

          <div style={{
            padding: '24px',
            background: getStatusColor(selectedQuote.status),
            color: '#FFFFFF',
            borderRadius: '16px',
            marginBottom: '32px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', fontWeight: '800' }}>
              {getStatusLabel(selectedQuote.status)}
            </div>
          </div>

          <div style={{
            padding: '24px',
            background: darkMode ? '#0f172a' : '#f8fafc',
            borderRadius: '16px',
            marginBottom: '24px',
          }}>
            <InfoRow label={t.trackingNumber} value={selectedQuote.tracking_number} darkMode={darkMode} />
            <InfoRow label={t.service} value={selectedQuote.service_type} darkMode={darkMode} />
            <InfoRow label={t.address} value={selectedQuote.address} darkMode={darkMode} />

            {selectedQuote.location_coordinates && (
              <div style={{
                padding: '16px',
                marginTop: '16px',
                background: darkMode ? '#0f172a' : '#f0fdf4',
                borderRadius: '12px',
                border: `2px solid ${darkMode ? '#059669' : '#10b981'}`,
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: darkMode ? '#10b981' : '#059669',
                  marginBottom: '8px',
                }}>
                  📍 {t.locationShared}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: darkMode ? '#94a3b8' : '#64748b',
                }}>
                  {t.coordinates}: {safeFixed(selectedQuote?.location_coordinates?.lat, 4)}, {safeFixed(selectedQuote?.location_coordinates?.lng, 4)}
                </div>
              </div>
            )}

            <InfoRow label={t.createdAt} value={formatDate(selectedQuote.created_at)} darkMode={darkMode} />
            <InfoRow label={t.updatedAt} value={formatDate(selectedQuote.updated_at)} darkMode={darkMode} />

            <div style={{ marginTop: '20px' }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: darkMode ? '#94a3b8' : '#64748b',
              }}>
                {t.description}
              </div>
              <div style={{
                padding: '16px',
                background: darkMode ? '#1e293b' : '#ffffff',
                borderRadius: '12px',
                fontSize: '14px',
                lineHeight: '1.6',
                color: darkMode ? '#f1f5f9' : '#0f172a',
              }}>
                {selectedQuote.description}
              </div>
            </div>
          </div>

          {selectedQuote.image_urls && selectedQuote.image_urls.length > 0 && (
            <div style={{
              padding: '24px',
              background: darkMode ? '#0f172a' : '#f8fafc',
              borderRadius: '16px',
              marginBottom: '24px',
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '16px',
                color: darkMode ? '#f1f5f9' : '#0f172a',
              }}>
                {t.images}
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '12px',
              }}>
                {selectedQuote.image_urls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Image ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '150px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {selectedQuote.response_notes && (
            <div style={{
              padding: '24px',
              background: darkMode ? '#0f172a' : '#f8fafc',
              borderRadius: '16px',
              marginBottom: '24px',
              border: `2px solid ${darkMode ? '#3b82f6' : '#60a5fa'}`,
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                marginBottom: '12px',
                color: darkMode ? '#60a5fa' : '#1e40af',
              }}>
                {t.response}
              </h3>
              <div style={{
                fontSize: '14px',
                lineHeight: '1.6',
                color: darkMode ? '#f1f5f9' : '#0f172a',
                whiteSpace: 'pre-wrap',
              }}>
                {selectedQuote.response_notes}
              </div>
            </div>
          )}

          {selectedQuote.estimated_price && (
            <div style={{
              padding: '24px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: '16px',
              marginBottom: '24px',
              color: '#FFFFFF',
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', opacity: 0.9 }}>
                {t.estimatedPrice}
              </div>
              <div style={{ fontSize: '36px', fontWeight: '800' }}>
                {safeLocale(selectedQuote.estimated_price)} GNF
              </div>
              {selectedQuote.estimated_duration && (
                <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.95 }}>
                  {t.estimatedDuration}: {selectedQuote.estimated_duration}
                </div>
              )}
              {selectedQuote.validity_date && (
                <div style={{
                  fontSize: '13px',
                  marginTop: '12px',
                  padding: '8px 12px',
                  background: isExpired ? '#ef4444' : 'rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                }}>
                  {isExpired ? t.expired : `${t.validUntil}: ${formatDate(selectedQuote.validity_date)}`}
                </div>
              )}
            </div>
          )}

          {showActions && (
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <button
                onClick={() => handleAccept(selectedQuote)}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                ✓ {t.acceptQuote}
              </button>
              <button
                onClick={() => handleReject(selectedQuote)}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: darkMode ? '#334155' : '#e2e8f0',
                  color: darkMode ? '#f1f5f9' : '#0f172a',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                ✕ {t.rejectQuote}
              </button>
            </div>
          )}

          {selectedQuote.status === 'accepted' && (
            <div style={{ marginBottom: '24px' }}>
              <button
                onClick={() => {
                  setAppointmentQuote(selectedQuote);
                  setShowAppointmentModal(true);
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                📅 {t.bookAppointment}
              </button>
              <div style={{
                fontSize: '13px',
                color: darkMode ? '#94a3b8' : '#64748b',
                textAlign: 'center',
                marginTop: '8px',
              }}>
                {t.appointmentDesc}
              </div>
            </div>
          )}

          <div style={{
            padding: '20px',
            background: darkMode ? '#334155' : '#e0f2fe',
            borderRadius: '12px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '14px',
              color: darkMode ? '#cbd5e1' : '#075985',
              marginBottom: '8px',
            }}>
              {t.contactUs}
            </div>
            <a
              href={`tel:${t.phoneNumber}`}
              style={{
                fontSize: '20px',
                fontWeight: '700',
                color: darkMode ? '#60a5fa' : '#1e40af',
                textDecoration: 'none',
              }}
            >
              {t.phoneNumber}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                padding: '12px 24px',
                background: darkMode ? '#334155' : '#e2e8f0',
                color: darkMode ? '#f1f5f9' : '#0f172a',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              ← {t.back}
            </button>
          )}
          {onNewQuote && (
            <button
              onClick={onNewQuote}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              + {t.newQuote}
            </button>
          )}
        </div>

        <h1 style={titleStyle}>{t.title}</h1>
        <p style={subtitleStyle}>{t.subtitle}</p>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', justifyContent: 'center' }}>
          {(['all', 'pending', 'quoted', 'accepted'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '10px 20px',
                background: filter === f
                  ? 'linear-gradient(135deg, #1e40af, #3b82f6)'
                  : darkMode ? '#334155' : '#e2e8f0',
                color: filter === f ? '#FFFFFF' : darkMode ? '#f1f5f9' : '#0f172a',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              {f === 'all' ? t.filterAll : f === 'pending' ? t.filterPending : f === 'quoted' ? t.filterQuoted : t.filterAccepted}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: darkMode ? '#94a3b8' : '#64748b' }}>
            Chargement...
          </div>
        ) : quotes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📋</div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '8px',
              color: darkMode ? '#f1f5f9' : '#0f172a',
            }}>
              {t.noQuotes}
            </h3>
            <p style={{ color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '24px' }}>
              {t.noQuotesDesc}
            </p>
            {onNewQuote && (
              <button
                onClick={onNewQuote}
                style={{
                  padding: '14px 32px',
                  background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '700',
                }}
              >
                + {t.newQuote}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {quotes.map((quote) => (
              <div
                key={quote.id}
                onClick={() => setSelectedQuote(quote)}
                style={{
                  padding: '24px',
                  background: darkMode ? '#0f172a' : '#f8fafc',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  border: `2px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                  <div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: darkMode ? '#f1f5f9' : '#0f172a',
                      marginBottom: '8px',
                    }}>
                      {quote.service_type}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: darkMode ? '#94a3b8' : '#64748b',
                      marginBottom: '4px',
                    }}>
                      {t.trackingNumber}: {quote.tracking_number}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: darkMode ? '#94a3b8' : '#64748b',
                    }}>
                      {formatDate(quote.created_at)}
                    </div>
                  </div>
                  <div style={{
                    padding: '8px 16px',
                    background: getStatusColor(quote.status),
                    color: '#FFFFFF',
                    borderRadius: '50px',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}>
                    {getStatusLabel(quote.status)}
                  </div>
                </div>
                <div style={{
                  fontSize: '14px',
                  color: darkMode ? '#cbd5e1' : '#475569',
                  lineHeight: '1.6',
                  marginBottom: '16px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {quote.description}
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: darkMode ? '#60a5fa' : '#1e40af',
                }}>
                  {t.viewDetails} →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAppointmentModal && appointmentQuote && (
        <AppointmentBooking
          darkMode={darkMode}
          lang={lang}
          quote={appointmentQuote}
          onSuccess={() => {
            setShowAppointmentModal(false);
            setAppointmentQuote(null);
            alert(texts[lang].successAccept);
          }}
          onCancel={() => {
            setShowAppointmentModal(false);
            setAppointmentQuote(null);
          }}
        />
      )}
    </div>
  );
};

const InfoRow: React.FC<{
  label: string;
  value: string;
  darkMode: boolean;
}> = ({ label, value, darkMode }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
  }}>
    <span style={{ color: darkMode ? '#94a3b8' : '#64748b', fontSize: '14px', fontWeight: '500' }}>
      {label}
    </span>
    <span style={{ color: darkMode ? '#f1f5f9' : '#0f172a', fontSize: '14px', fontWeight: '600', textAlign: 'right' }}>
      {value}
    </span>
  </div>
);

export default AuthenticatedQuoteTracker;
