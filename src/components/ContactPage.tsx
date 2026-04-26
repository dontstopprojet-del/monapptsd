import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ContactPageProps {
  darkMode?: boolean;
  lang?: 'fr' | 'en' | 'ar';
  onBack?: () => void;
}

const ContactPage: React.FC<ContactPageProps> = ({
  darkMode = false,
  lang = 'fr',
  onBack,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const texts = {
    fr: {
      title: 'Contactez-Nous',
      subtitle: 'Notre équipe est disponible 24h/24 pour répondre à vos besoins',
      name: 'Nom complet',
      email: 'Email',
      phone: 'Téléphone',
      message: 'Votre message',
      submit: 'Envoyer le message',
      back: 'Retour',
      contactInfo: 'Informations de Contact',
      phoneLabel: 'Téléphone',
      emailLabel: 'Email',
      addressLabel: 'Adresse',
      hoursLabel: 'Horaires',
      emergency: 'Urgence 24/7',
      emergencyDesc: 'Service d\'urgence disponible à tout moment',
      callNow: 'Appeler maintenant',
      address: 'Conakry, Guinée',
      hours: 'Lundi - Dimanche : 24h/24',
      successMessage: 'Message envoyé avec succès! Nous vous contacterons rapidement.',
      errorSending: 'Erreur lors de l\'envoi du message',
      errorAllFields: 'Tous les champs sont obligatoires',
    },
    en: {
      title: 'Contact Us',
      subtitle: 'Our team is available 24/7 to meet your needs',
      name: 'Full Name',
      email: 'Email',
      phone: 'Phone',
      message: 'Your message',
      submit: 'Send Message',
      back: 'Back',
      contactInfo: 'Contact Information',
      phoneLabel: 'Phone',
      emailLabel: 'Email',
      addressLabel: 'Address',
      hoursLabel: 'Hours',
      emergency: 'Emergency 24/7',
      emergencyDesc: 'Emergency service available at any time',
      callNow: 'Call now',
      address: 'Conakry, Guinea',
      hours: 'Monday - Sunday: 24/7',
      successMessage: 'Message sent successfully! We will contact you quickly.',
      errorSending: 'Error sending message',
      errorAllFields: 'All fields are required',
    },
    ar: {
      title: 'اتصل بنا',
      subtitle: 'فريقنا متاح على مدار 24/7 لتلبية احتياجاتك',
      name: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      phone: 'الهاتف',
      message: 'رسالتك',
      submit: 'إرسال الرسالة',
      back: 'رجوع',
      contactInfo: 'معلومات الاتصال',
      phoneLabel: 'الهاتف',
      emailLabel: 'البريد الإلكتروني',
      addressLabel: 'العنوان',
      hoursLabel: 'ساعات العمل',
      emergency: 'طوارئ 24/7',
      emergencyDesc: 'خدمة الطوارئ متاحة في أي وقت',
      callNow: 'اتصل الآن',
      address: 'كوناكري، غينيا',
      hours: 'الاثنين - الأحد: على مدار الساعة',
      successMessage: 'تم إرسال الرسالة بنجاح! سنتصل بك قريباً.',
      errorSending: 'خطأ في إرسال الرسالة',
      errorAllFields: 'جميع الحقول مطلوبة',
    },
  };

  const t = texts[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !phone || !message) {
      alert(t.errorAllFields);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert({
          name,
          email: email.toLowerCase(),
          phone,
          message,
          status: 'unread',
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      alert(t.successMessage);

      setName('');
      setEmail('');
      setPhone('');
      setMessage('');

    } catch (error: any) {
      console.error('Erreur:', error);
      alert(t.errorSending);
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

  const contentStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '40px',
    fontWeight: '800',
    marginBottom: '12px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '18px',
    color: darkMode ? '#94a3b8' : '#64748b',
    textAlign: 'center',
    marginBottom: '60px',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '40px',
    marginBottom: '40px',
  };

  const cardStyle: React.CSSProperties = {
    background: darkMode ? '#1e293b' : '#FFFFFF',
    borderRadius: '24px',
    padding: '40px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '30px',
    color: darkMode ? '#f1f5f9' : '#0f172a',
  };

  const infoItemStyle: React.CSSProperties = {
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
  };

  const infoLabelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '600',
    color: darkMode ? '#94a3b8' : '#64748b',
    marginBottom: '8px',
  };

  const infoValueStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: darkMode ? '#f1f5f9' : '#0f172a',
  };

  const emergencyBoxStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
    padding: '30px',
    borderRadius: '16px',
    color: '#FFFFFF',
    textAlign: 'center',
  };

  const inputGroupStyle: React.CSSProperties = {
    marginBottom: '20px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: darkMode ? '#f1f5f9' : '#0f172a',
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
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '150px',
    resize: 'vertical',
    fontFamily: 'inherit',
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
  };

  const backButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: `2px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
    background: 'transparent',
    color: darkMode ? '#f1f5f9' : '#0f172a',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '12px',
  };

  const emergencyButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid #FFFFFF',
    background: 'rgba(255, 255, 255, 0.2)',
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '20px',
  };

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <h1 style={titleStyle}>{t.title}</h1>
        <p style={subtitleStyle}>{t.subtitle}</p>

        <div style={gridStyle}>
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>{t.contactInfo}</h2>

            <div style={infoItemStyle}>
              <div style={infoLabelStyle}>{t.phoneLabel}</div>
              <div style={infoValueStyle}>+224 610 55 32 55</div>
            </div>

            <div style={infoItemStyle}>
              <div style={infoLabelStyle}>{t.emailLabel}</div>
              <div style={infoValueStyle}>contact@tsdetfils.com</div>
            </div>

            <div style={infoItemStyle}>
              <div style={infoLabelStyle}>{t.addressLabel}</div>
              <div style={infoValueStyle}>{t.address}</div>
            </div>

            <div style={{ ...infoItemStyle, border: 'none' }}>
              <div style={infoLabelStyle}>{t.hoursLabel}</div>
              <div style={infoValueStyle}>{t.hours}</div>
            </div>

            <div style={emergencyBoxStyle}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚨</div>
              <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
                {t.emergency}
              </div>
              <div style={{ fontSize: '14px', marginBottom: '20px', opacity: 0.9 }}>
                {t.emergencyDesc}
              </div>
              <button
                style={emergencyButtonStyle}
                onClick={() => window.location.href = 'tel:+224610553255'}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                📞 {t.callNow}
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>{t.message}</h2>

            <form noValidate onSubmit={handleSubmit}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>{t.name} *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = darkMode ? '#334155' : '#e2e8f0'}
                />
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>{t.email} *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = darkMode ? '#334155' : '#e2e8f0'}
                />
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>{t.phone} *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = darkMode ? '#334155' : '#e2e8f0'}
                />
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>{t.message} *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={loading}
                  style={textareaStyle}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = darkMode ? '#334155' : '#e2e8f0'}
                />
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
                {loading ? '⏳ Envoi...' : `📨 ${t.submit}`}
              </button>

              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  disabled={loading}
                  style={backButtonStyle}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = darkMode ? '#334155' : '#f1f5f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  ← {t.back}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
