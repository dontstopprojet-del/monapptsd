import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ClientQuoteTrackerProps {
  darkMode?: boolean;
  lang?: 'fr' | 'en' | 'ar';
  onBack?: () => void;
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
}

const ClientQuoteTracker: React.FC<ClientQuoteTrackerProps> = ({
  darkMode = false,
  lang = 'fr',
  onBack,
}) => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [email, setEmail] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    if (quote && !quote.viewed_at) {
      markAsViewed(quote.tracking_number);
    }
  }, [quote]);

  const markAsViewed = async (trackingNum: string) => {
    try {
      const { error } = await supabase.rpc('record_quote_view', {
        quote_tracking_number: trackingNum,
      });
      if (error) console.error('Erreur lors du marquage comme vu:', error);
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setQuote(null);

    if (!trackingNumber || !email) {
      setError(texts[lang].errorFields);
      return;
    }

    setLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('quote_requests')
        .select('*')
        .eq('tracking_number', trackingNumber.toUpperCase())
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError(texts[lang].errorNotFound);
        return;
      }

      setQuote(data as Quote);
      setShowActions(data.status === 'quoted');
    } catch (err: any) {
      console.error('Erreur:', err);
      setError(texts[lang].errorLoading);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!quote) return;

    if (!confirm(texts[lang].confirmAccept)) return;

    try {
      const { error } = await supabase.rpc('accept_quote', {
        quote_tracking_number: quote.tracking_number,
      });

      if (error) throw error;

      alert(texts[lang].successAccept);
      setQuote({ ...quote, status: 'accepted' });
      setShowActions(false);
    } catch (err) {
      console.error('Erreur:', err);
      alert(texts[lang].errorAction);
    }
  };

  const handleReject = async () => {
    if (!quote) return;

    const reason = prompt(texts[lang].rejectReason);
    if (reason === null) return;

    try {
      const { error } = await supabase.rpc('reject_quote', {
        quote_tracking_number: quote.tracking_number,
        reason: reason || null,
      });

      if (error) throw error;

      alert(texts[lang].successReject);
      setQuote({ ...quote, status: 'rejected' });
      setShowActions(false);
    } catch (err) {
      console.error('Erreur:', err);
      alert(texts[lang].errorAction);
    }
  };

  const texts = {
    fr: {
      title: 'Suivre Mon Devis',
      subtitle: 'Entrez votre numéro de suivi et votre email pour consulter l\'état de votre demande',
      trackingNumber: 'Numéro de suivi',
      trackingPlaceholder: 'Ex: TSD-2024-001',
      email: 'Email',
      emailPlaceholder: 'votre@email.com',
      search: 'Rechercher',
      back: 'Retour',
      errorFields: 'Veuillez remplir tous les champs',
      errorNotFound: 'Aucun devis trouvé avec ces informations',
      errorLoading: 'Erreur lors du chargement',
      errorAction: 'Erreur lors de l\'action',
      statusTitle: 'Statut de votre demande',
      quoteDetails: 'Détails du devis',
      yourInfo: 'Vos informations',
      name: 'Nom',
      phone: 'Téléphone',
      service: 'Service demandé',
      address: 'Adresse',
      urgency: 'Urgence',
      description: 'Description',
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
      statusPending: 'En attente',
      statusReviewing: 'En cours d\'examen',
      statusQuoted: 'Devis envoyé',
      statusAccepted: 'Accepté',
      statusRejected: 'Refusé',
      statusExpired: 'Expiré',
      statusCompleted: 'Terminé',
      statusPendingDesc: 'Votre demande a été reçue et sera traitée prochainement.',
      statusReviewingDesc: 'Votre demande est en cours d\'examen par notre équipe.',
      statusQuotedDesc: 'Nous avons préparé un devis pour vous. Consultez les détails ci-dessous.',
      statusAcceptedDesc: 'Vous avez accepté notre devis. Nous vous contacterons pour planifier les travaux.',
      statusRejectedDesc: 'Vous avez refusé ce devis. N\'hésitez pas à nous contacter pour toute question.',
      statusExpiredDesc: 'Ce devis a expiré. Contactez-nous pour un nouveau devis.',
      statusCompletedDesc: 'Les travaux ont été réalisés avec succès.',
      contactUs: 'Nous contacter',
      phoneNumber: '+224 610 55 32 55',
    },
    en: {
      title: 'Track My Quote',
      subtitle: 'Enter your tracking number and email to check the status of your request',
      trackingNumber: 'Tracking Number',
      trackingPlaceholder: 'Ex: TSD-2024-001',
      email: 'Email',
      emailPlaceholder: 'your@email.com',
      search: 'Search',
      back: 'Back',
      errorFields: 'Please fill in all fields',
      errorNotFound: 'No quote found with this information',
      errorLoading: 'Error loading',
      errorAction: 'Error performing action',
      statusTitle: 'Status of your request',
      quoteDetails: 'Quote Details',
      yourInfo: 'Your Information',
      name: 'Name',
      phone: 'Phone',
      service: 'Requested Service',
      address: 'Address',
      urgency: 'Urgency',
      description: 'Description',
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
      statusPending: 'Pending',
      statusReviewing: 'Under Review',
      statusQuoted: 'Quote Sent',
      statusAccepted: 'Accepted',
      statusRejected: 'Declined',
      statusExpired: 'Expired',
      statusCompleted: 'Completed',
      statusPendingDesc: 'Your request has been received and will be processed soon.',
      statusReviewingDesc: 'Your request is being reviewed by our team.',
      statusQuotedDesc: 'We have prepared a quote for you. See details below.',
      statusAcceptedDesc: 'You have accepted our quote. We will contact you to schedule the work.',
      statusRejectedDesc: 'You have declined this quote. Feel free to contact us for any questions.',
      statusExpiredDesc: 'This quote has expired. Contact us for a new quote.',
      statusCompletedDesc: 'The work has been completed successfully.',
      contactUs: 'Contact Us',
      phoneNumber: '+224 610 55 32 55',
    },
    ar: {
      title: 'تتبع عرض السعر الخاص بي',
      subtitle: 'أدخل رقم التتبع والبريد الإلكتروني للتحقق من حالة طلبك',
      trackingNumber: 'رقم التتبع',
      trackingPlaceholder: 'مثال: TSD-2024-001',
      email: 'البريد الإلكتروني',
      emailPlaceholder: 'your@email.com',
      search: 'بحث',
      back: 'رجوع',
      errorFields: 'يرجى ملء جميع الحقول',
      errorNotFound: 'لم يتم العثور على عرض سعر بهذه المعلومات',
      errorLoading: 'خطأ في التحميل',
      errorAction: 'خطأ في تنفيذ الإجراء',
      statusTitle: 'حالة طلبك',
      quoteDetails: 'تفاصيل عرض السعر',
      yourInfo: 'معلوماتك',
      name: 'الاسم',
      phone: 'الهاتف',
      service: 'الخدمة المطلوبة',
      address: 'العنوان',
      urgency: 'الاستعجال',
      description: 'الوصف',
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
      statusPending: 'قيد الانتظار',
      statusReviewing: 'قيد المراجعة',
      statusQuoted: 'تم إرسال عرض السعر',
      statusAccepted: 'مقبول',
      statusRejected: 'مرفوض',
      statusExpired: 'منتهي الصلاحية',
      statusCompleted: 'مكتمل',
      statusPendingDesc: 'تم استلام طلبك وسيتم معالجته قريبًا.',
      statusReviewingDesc: 'يتم مراجعة طلبك من قبل فريقنا.',
      statusQuotedDesc: 'لقد أعددنا عرض سعر لك. انظر التفاصيل أدناه.',
      statusAcceptedDesc: 'لقد قبلت عرضنا. سنتصل بك لجدولة العمل.',
      statusRejectedDesc: 'لقد رفضت عرض السعر هذا. لا تتردد في الاتصال بنا لأي أسئلة.',
      statusExpiredDesc: 'انتهت صلاحية عرض السعر هذا. اتصل بنا للحصول على عرض سعر جديد.',
      statusCompletedDesc: 'تم إكمال العمل بنجاح.',
      contactUs: 'اتصل بنا',
      phoneNumber: '+224 610 55 32 55',
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

  const getStatusDescription = (status: string) => {
    const descriptions: Record<string, string> = {
      pending: t.statusPendingDesc,
      reviewing: t.statusReviewingDesc,
      quoted: t.statusQuotedDesc,
      accepted: t.statusAcceptedDesc,
      rejected: t.statusRejectedDesc,
      expired: t.statusExpiredDesc,
      completed: t.statusCompletedDesc,
    };
    return descriptions[status] || '';
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

  const isExpired = quote?.validity_date && new Date(quote.validity_date) < new Date();

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: darkMode
      ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  };

  const cardStyle: React.CSSProperties = {
    maxWidth: '900px',
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

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {onBack && (
          <button
            onClick={onBack}
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
              transition: 'all 0.3s',
            }}
          >
            ← {t.back}
          </button>
        )}

        <h1 style={titleStyle}>{t.title}</h1>
        <p style={subtitleStyle}>{t.subtitle}</p>

        {!quote ? (
          <form onSubmit={handleSearch}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: darkMode ? '#f1f5f9' : '#0f172a',
              }}>
                {t.trackingNumber}
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder={t.trackingPlaceholder}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  fontSize: '16px',
                  border: `2px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  background: darkMode ? '#0f172a' : '#f8fafc',
                  color: darkMode ? '#f1f5f9' : '#0f172a',
                  outline: 'none',
                  transition: 'all 0.3s',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: darkMode ? '#f1f5f9' : '#0f172a',
              }}>
                {t.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  fontSize: '16px',
                  border: `2px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  background: darkMode ? '#0f172a' : '#f8fafc',
                  color: darkMode ? '#f1f5f9' : '#0f172a',
                  outline: 'none',
                  transition: 'all 0.3s',
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '16px',
                background: darkMode ? '#7f1d1d' : '#fee2e2',
                color: darkMode ? '#fecaca' : '#991b1b',
                borderRadius: '12px',
                marginBottom: '24px',
                fontSize: '14px',
                fontWeight: '600',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1e40af, #3b82f6)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
              }}
            >
              {loading ? '...' : t.search}
            </button>
          </form>
        ) : (
          <div>
            <div style={{
              padding: '24px',
              background: getStatusColor(quote.status),
              color: '#FFFFFF',
              borderRadius: '16px',
              marginBottom: '32px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', opacity: 0.9 }}>
                {t.statusTitle}
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>
                {getStatusLabel(quote.status)}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.95 }}>
                {getStatusDescription(quote.status)}
              </div>
            </div>

            <div style={{
              padding: '24px',
              background: darkMode ? '#0f172a' : '#f8fafc',
              borderRadius: '16px',
              marginBottom: '24px',
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                marginBottom: '20px',
                color: darkMode ? '#f1f5f9' : '#0f172a',
              }}>
                {t.yourInfo}
              </h3>

              <InfoRow label={t.trackingNumber} value={quote.tracking_number} darkMode={darkMode} />
              <InfoRow label={t.name} value={quote.name} darkMode={darkMode} />
              <InfoRow label={t.email} value={quote.email} darkMode={darkMode} />
              <InfoRow label={t.phone} value={quote.phone} darkMode={darkMode} />
              <InfoRow label={t.service} value={quote.service_type} darkMode={darkMode} />
              <InfoRow label={t.address} value={quote.address} darkMode={darkMode} />
              <InfoRow label={t.createdAt} value={formatDate(quote.created_at)} darkMode={darkMode} />
              <InfoRow label={t.updatedAt} value={formatDate(quote.updated_at)} darkMode={darkMode} />

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
                  {quote.description}
                </div>
              </div>
            </div>

            {quote.response_notes && (
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
                  {quote.response_notes}
                </div>
              </div>
            )}

            {quote.estimated_price && (
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
                  {quote.estimated_price.toLocaleString()} GNF
                </div>
                {quote.estimated_duration && (
                  <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.95 }}>
                    {t.estimatedDuration}: {quote.estimated_duration}
                  </div>
                )}
                {quote.validity_date && (
                  <div style={{
                    fontSize: '13px',
                    marginTop: '12px',
                    padding: '8px 12px',
                    background: isExpired ? '#ef4444' : 'rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                  }}>
                    {isExpired ? t.expired : `${t.validUntil}: ${formatDate(quote.validity_date)}`}
                  </div>
                )}
              </div>
            )}

            {showActions && !isExpired && (
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <button
                  onClick={handleAccept}
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
                    transition: 'all 0.3s',
                  }}
                >
                  ✓ {t.acceptQuote}
                </button>
                <button
                  onClick={handleReject}
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
                    transition: 'all 0.3s',
                  }}
                >
                  ✕ {t.rejectQuote}
                </button>
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

            <button
              onClick={() => {
                setQuote(null);
                setTrackingNumber('');
                setEmail('');
                setError('');
              }}
              style={{
                width: '100%',
                marginTop: '24px',
                padding: '14px',
                background: darkMode ? '#334155' : '#e2e8f0',
                color: darkMode ? '#f1f5f9' : '#0f172a',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              ← Nouvelle recherche
            </button>
          </div>
        )}
      </div>
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

export default ClientQuoteTracker;
