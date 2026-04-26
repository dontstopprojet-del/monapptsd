import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface AdminSettingsProps {
  darkMode: boolean;
  lang: string;
  onBack: () => void;
  currentUser: any;
  onToggleDarkMode?: () => void;
}

const AdminSettings = ({ darkMode, lang, onBack, currentUser, onToggleDarkMode }: AdminSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const defaultLegalTermsFr = `MENTIONS LÉGALES - TSD ET FILS

1. INFORMATIONS GÉNÉRALES
TSD et Fils est une entreprise spécialisée dans les services techniques et de sécurité en Guinée.

2. PROPRIÉTÉ INTELLECTUELLE
Tous les contenus présents sur cette application (textes, images, logos) sont protégés par le droit de la propriété intellectuelle.

3. PROTECTION DES DONNÉES
Conformément à la réglementation, nous nous engageons à protéger vos données personnelles. Les données collectées sont utilisées uniquement dans le cadre de nos services.

4. RESPONSABILITÉ
TSD et Fils s'efforce de fournir des informations exactes, mais ne peut garantir l'exactitude complète des données affichées.

5. CONTACT
Pour toute question concernant ces mentions légales, contactez-nous à : contact@tsdetfils.gn`;

  const defaultLegalTermsEn = `LEGAL TERMS - TSD ET FILS

1. GENERAL INFORMATION
TSD et Fils is a company specialized in technical and security services in Guinea.

2. INTELLECTUAL PROPERTY
All content on this application (texts, images, logos) is protected by intellectual property rights.

3. DATA PROTECTION
In accordance with regulations, we are committed to protecting your personal data. Collected data is used only for our services.

4. LIABILITY
TSD et Fils strives to provide accurate information but cannot guarantee complete accuracy of displayed data.

5. CONTACT
For any questions about these legal terms, contact us at: contact@tsdetfils.gn`;

  const defaultLegalTermsAr = `الشروط القانونية - TSD ET FILS

1. معلومات عامة
TSD et Fils هي شركة متخصصة في الخدمات الفنية والأمنية في غينيا.

2. الملكية الفكرية
جميع المحتويات الموجودة على هذا التطبيق (النصوص والصور والشعارات) محمية بموجب حقوق الملكية الفكرية.

3. حماية البيانات
وفقًا للوائح، نحن ملتزمون بحماية بياناتك الشخصية. يتم استخدام البيانات المجمعة فقط لخدماتنا.

4. المسؤولية
تسعى TSD et Fils جاهدة لتقديم معلومات دقيقة ولكن لا يمكنها ضمان الدقة الكاملة للبيانات المعروضة.

5. الاتصال
لأي أسئلة حول هذه الشروط القانونية، اتصل بنا على: contact@tsdetfils.gn`;

  const [settings, setSettings] = useState<any>({
    legal_terms_fr: defaultLegalTermsFr,
    legal_terms_en: defaultLegalTermsEn,
    legal_terms_ar: defaultLegalTermsAr,
    company_name: 'TSD et Fils',
    company_description: '',
    company_founded: '',
    company_location: '',
    chatbot_context: '',
    bank_name: '',
    bank_account: '',
    orange_money: '',
    merchant_account: '',
  });

  const C = useMemo(() => ({
    primary: '#1e40af',
    secondary: '#3b82f6',
    card: darkMode ? '#1e293b' : '#FFFFFF',
    bg: darkMode ? '#0f172a' : '#f8fafc',
    gray: darkMode ? '#0f172a' : '#f1f5f9',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#334155' : '#cbd5e1',
    success: '#10B981',
    danger: '#EF4444',
  }), [darkMode]);

  const t = useMemo(() => ({
    fr: {
      title: 'Paramètres Admin',
      security: 'Sécurité',
      darkMode: 'Mode Sombre',
      legalTermsFr: 'Mentions légales (FR)',
      legalTermsEn: 'Mentions légales (EN)',
      legalTermsAr: 'Mentions légales (AR)',
      companyInfo: 'Informations Entreprise',
      companyName: 'Nom de l\'entreprise',
      companyDescription: 'Description',
      companyFounded: 'Année de création',
      companyLocation: 'Localisation',
      paymentInfo: 'Informations de Paiement',
      bankName: 'Nom de la Banque',
      bankAccount: 'Numéro de Compte',
      orangeMoney: 'Numéro Orange Money',
      merchantAccount: 'Compte Marchand',
      chatbotContext: 'Contexte du Chatbot',
      save: 'Enregistrer',
      saving: 'Enregistrement...',
      successMessage: 'Paramètres enregistrés avec succès',
      errorMessage: 'Erreur lors de l\'enregistrement',
    },
    en: {
      title: 'Admin Settings',
      security: 'Security',
      darkMode: 'Dark Mode',
      legalTermsFr: 'Legal Terms (FR)',
      legalTermsEn: 'Legal Terms (EN)',
      legalTermsAr: 'Legal Terms (AR)',
      companyInfo: 'Company Information',
      companyName: 'Company Name',
      companyDescription: 'Description',
      companyFounded: 'Founded Year',
      companyLocation: 'Location',
      paymentInfo: 'Payment Information',
      bankName: 'Bank Name',
      bankAccount: 'Account Number',
      orangeMoney: 'Orange Money Number',
      merchantAccount: 'Merchant Account',
      chatbotContext: 'Chatbot Context',
      save: 'Save',
      saving: 'Saving...',
      successMessage: 'Settings saved successfully',
      errorMessage: 'Error saving settings',
    },
    ar: {
      title: 'إعدادات المسؤول',
      security: 'الأمان',
      darkMode: 'الوضع الداكن',
      legalTermsFr: 'الشروط القانونية (FR)',
      legalTermsEn: 'الشروط القانونية (EN)',
      legalTermsAr: 'الشروط القانونية (AR)',
      companyInfo: 'معلومات الشركة',
      companyName: 'اسم الشركة',
      companyDescription: 'الوصف',
      companyFounded: 'سنة التأسيس',
      companyLocation: 'الموقع',
      paymentInfo: 'معلومات الدفع',
      bankName: 'اسم البنك',
      bankAccount: 'رقم الحساب',
      orangeMoney: 'رقم Orange Money',
      merchantAccount: 'حساب التاجر',
      chatbotContext: 'سياق Chatbot',
      save: 'حفظ',
      saving: 'جارٍ الحفظ...',
      successMessage: 'تم حفظ الإعدادات بنجاح',
      errorMessage: 'خطأ أثناء الحفظ',
    }
  }), []);

  const text = useMemo(() => t[lang as 'fr' | 'en' | 'ar'] || t.fr, [lang, t]);

  useEffect(() => {
    loadSettings();

    const channel = supabase
      .channel('admin_settings_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_settings',
        },
        () => {
          loadSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*');

      if (error) throw error;

      if (data) {
        const newSettings: any = { ...settings };

        data.forEach((item: any) => {
          if (item.setting_key === 'legal_terms_fr') {
            newSettings.legal_terms_fr = item.setting_value;
          } else if (item.setting_key === 'legal_terms_en') {
            newSettings.legal_terms_en = item.setting_value;
          } else if (item.setting_key === 'legal_terms_ar') {
            newSettings.legal_terms_ar = item.setting_value;
          } else if (item.setting_key === 'company_info') {
            try {
              const companyData = JSON.parse(item.setting_value);
              newSettings.company_name = companyData.name || 'TSD et Fils';
              newSettings.company_description = companyData.description || '';
              newSettings.company_founded = companyData.founded || '';
              newSettings.company_location = companyData.location || '';
            } catch (e) {
              console.error('Error parsing company_info:', e);
            }
          } else if (item.setting_key === 'payment_info') {
            try {
              const paymentData = JSON.parse(item.setting_value);
              newSettings.bank_name = paymentData.bank_name || '';
              newSettings.bank_account = paymentData.bank_account || '';
              newSettings.orange_money = paymentData.orange_money || '';
              newSettings.merchant_account = paymentData.merchant_account || '';
            } catch (e) {
              console.error('Error parsing payment_info:', e);
            }
          } else if (item.setting_key === 'chatbot_context') {
            newSettings.chatbot_context = item.setting_value;
          }
        });

        setSettings(newSettings);
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = useCallback((field: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  }, []);

  const saveSettings = useCallback(async () => {
    setSaving(true);
    setMessage('');

    try {
      const updates = [
        {
          setting_key: 'legal_terms_fr',
          setting_value: settings.legal_terms_fr,
          setting_type: 'legal',
          updated_by: currentUser.id,
          updated_at: new Date().toISOString()
        },
        {
          setting_key: 'legal_terms_en',
          setting_value: settings.legal_terms_en,
          setting_type: 'legal',
          updated_by: currentUser.id,
          updated_at: new Date().toISOString()
        },
        {
          setting_key: 'legal_terms_ar',
          setting_value: settings.legal_terms_ar,
          setting_type: 'legal',
          updated_by: currentUser.id,
          updated_at: new Date().toISOString()
        },
        {
          setting_key: 'company_info',
          setting_value: JSON.stringify({
            name: settings.company_name,
            description: settings.company_description,
            founded: settings.company_founded,
            location: settings.company_location
          }),
          setting_type: 'company_info',
          updated_by: currentUser.id,
          updated_at: new Date().toISOString()
        },
        {
          setting_key: 'payment_info',
          setting_value: JSON.stringify({
            bank_name: settings.bank_name,
            bank_account: settings.bank_account,
            orange_money: settings.orange_money,
            merchant_account: settings.merchant_account
          }),
          setting_type: 'payment_info',
          updated_by: currentUser.id,
          updated_at: new Date().toISOString()
        },
        {
          setting_key: 'chatbot_context',
          setting_value: settings.chatbot_context,
          setting_type: 'chatbot',
          updated_by: currentUser.id,
          updated_at: new Date().toISOString()
        }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('admin_settings')
          .upsert(update, { onConflict: 'setting_key' });

        if (error) throw error;
      }

      setMessage(text.successMessage);
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setMessage(text.errorMessage);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  }, [settings, currentUser.id, text.successMessage, text.errorMessage]);


  if (loading) {
    return (
      <div style={{
        height: '100vh',
        background: C.bg,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ color: C.text }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', background: C.bg, overflow: 'auto', paddingBottom: '40px' }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a, #1e40af, #2563eb)',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            color: '#FFF',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{
            color: '#FFF',
            margin: 0,
            fontSize: '20px',
            fontWeight: '700'
          }}>
            ⚙️ {text.title}
          </h1>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {message && (
          <div style={{
            background: message.includes('succès') || message.includes('successfully') ? C.success : C.danger,
            color: '#FFF',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        <div style={{
          background: C.card,
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 1px 4px rgba(30,64,175,0.06)',
          border: `1px solid ${C.border}`
        }}>
          <h2 style={{
            color: C.text,
            margin: '0 0 20px',
            fontSize: '18px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            🔐 {text.security}
          </h2>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            background: darkMode ? '#0f172a' : '#f8fafc',
            borderRadius: '10px',
            border: `1px solid ${C.border}`,
            marginBottom: '12px'
          }}>
            <div>
              <div style={{
                color: C.text,
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '4px'
              }}>
                {text.darkMode}
              </div>
              <div style={{
                color: C.textSecondary,
                fontSize: '12px'
              }}>
                {lang === 'fr' ? 'Activer le thème sombre' : lang === 'en' ? 'Enable dark theme' : 'تفعيل الوضع الداكن'}
              </div>
            </div>
            <div
              onClick={onToggleDarkMode}
              style={{
                width: '50px',
                height: '28px',
                borderRadius: '14px',
                background: darkMode ? C.primary : '#cbd5e1',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.3s',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#FFF',
                position: 'absolute',
                top: '3px',
                left: darkMode ? '25px' : '3px',
                transition: 'left 0.3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px'
              }}>
                {darkMode ? '🌙' : '☀️'}
              </div>
            </div>
          </div>

        </div>

        <div style={{
          background: C.card,
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 1px 4px rgba(30,64,175,0.06)',
          border: `1px solid ${C.border}`
        }}>
          <h3 style={{
            color: C.text,
            margin: '0 0 16px',
            fontSize: '16px',
            fontWeight: '700'
          }}>
            {text.legalTermsFr}
          </h3>
          <textarea
            value={settings.legal_terms_fr}
            onChange={(e) => handleFieldChange('legal_terms_fr', e.target.value)}
            placeholder={text.legalTermsFr}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              borderRadius: '10px',
              border: `1px solid ${C.border}`,
              background: darkMode ? '#0f172a' : '#f8fafc',
              color: C.text,
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{
          background: C.card,
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 1px 4px rgba(30,64,175,0.06)',
          border: `1px solid ${C.border}`
        }}>
          <h3 style={{
            color: C.text,
            margin: '0 0 16px',
            fontSize: '16px',
            fontWeight: '700'
          }}>
            {text.legalTermsEn}
          </h3>
          <textarea
            value={settings.legal_terms_en}
            onChange={(e) => handleFieldChange('legal_terms_en', e.target.value)}
            placeholder={text.legalTermsEn}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              borderRadius: '10px',
              border: `1px solid ${C.border}`,
              background: darkMode ? '#0f172a' : '#f8fafc',
              color: C.text,
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{
          background: C.card,
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 1px 4px rgba(30,64,175,0.06)',
          border: `1px solid ${C.border}`
        }}>
          <h3 style={{
            color: C.text,
            margin: '0 0 16px',
            fontSize: '16px',
            fontWeight: '700'
          }}>
            {text.legalTermsAr}
          </h3>
          <textarea
            value={settings.legal_terms_ar}
            onChange={(e) => handleFieldChange('legal_terms_ar', e.target.value)}
            placeholder={text.legalTermsAr}
            dir="rtl"
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              borderRadius: '10px',
              border: `1px solid ${C.border}`,
              background: darkMode ? '#0f172a' : '#f8fafc',
              color: C.text,
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{
          background: C.card,
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 1px 4px rgba(30,64,175,0.06)',
          border: `1px solid ${C.border}`
        }}>
          <h3 style={{
            color: C.text,
            margin: '0 0 16px',
            fontSize: '16px',
            fontWeight: '700'
          }}>
            {text.companyInfo}
          </h3>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              color: C.textSecondary,
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '6px'
            }}>
              {text.companyName}
            </label>
            <input
              type="text"
              value={settings.company_name}
              onChange={(e) => handleFieldChange('company_name', e.target.value)}
              placeholder={text.companyName}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${C.border}`,
                background: darkMode ? '#0f172a' : '#f8fafc',
                color: C.text,
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              color: C.textSecondary,
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '6px'
            }}>
              {text.companyDescription}
            </label>
            <textarea
              value={settings.company_description}
              onChange={(e) => handleFieldChange('company_description', e.target.value)}
              placeholder={text.companyDescription}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${C.border}`,
                background: darkMode ? '#0f172a' : '#f8fafc',
                color: C.text,
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{
                display: 'block',
                color: C.textSecondary,
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '6px'
              }}>
                {text.companyFounded}
              </label>
              <input
                type="text"
                value={settings.company_founded}
                onChange={(e) => handleFieldChange('company_founded', e.target.value)}
                placeholder="2020"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: `1px solid ${C.border}`,
                  background: darkMode ? '#0f172a' : '#f8fafc',
                  color: C.text,
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                color: C.textSecondary,
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '6px'
              }}>
                {text.companyLocation}
              </label>
              <input
                type="text"
                value={settings.company_location}
                onChange={(e) => handleFieldChange('company_location', e.target.value)}
                placeholder="Guinée"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: `1px solid ${C.border}`,
                  background: darkMode ? '#0f172a' : '#f8fafc',
                  color: C.text,
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>

        <div style={{
          background: C.card,
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 1px 4px rgba(30,64,175,0.06)',
          border: `1px solid ${C.border}`
        }}>
          <h3 style={{
            color: C.text,
            margin: '0 0 16px',
            fontSize: '16px',
            fontWeight: '700'
          }}>
            💳 {text.paymentInfo}
          </h3>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              color: C.textSecondary,
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '6px'
            }}>
              {text.bankName}
            </label>
            <input
              type="text"
              value={settings.bank_name}
              onChange={(e) => handleFieldChange('bank_name', e.target.value)}
              placeholder={text.bankName}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${C.border}`,
                background: darkMode ? '#0f172a' : '#f8fafc',
                color: C.text,
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              color: C.textSecondary,
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '6px'
            }}>
              {text.bankAccount}
            </label>
            <input
              type="text"
              value={settings.bank_account}
              onChange={(e) => handleFieldChange('bank_account', e.target.value)}
              placeholder={text.bankAccount}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${C.border}`,
                background: darkMode ? '#0f172a' : '#f8fafc',
                color: C.text,
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{
                display: 'block',
                color: C.textSecondary,
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '6px'
              }}>
                {text.orangeMoney}
              </label>
              <input
                type="text"
                value={settings.orange_money}
                onChange={(e) => handleFieldChange('orange_money', e.target.value)}
                placeholder="+224..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: `1px solid ${C.border}`,
                  background: darkMode ? '#0f172a' : '#f8fafc',
                  color: C.text,
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                color: C.textSecondary,
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '6px'
              }}>
                {text.merchantAccount}
              </label>
              <input
                type="text"
                value={settings.merchant_account}
                onChange={(e) => handleFieldChange('merchant_account', e.target.value)}
                placeholder={text.merchantAccount}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: `1px solid ${C.border}`,
                  background: darkMode ? '#0f172a' : '#f8fafc',
                  color: C.text,
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>

        <div style={{
          background: C.card,
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 1px 4px rgba(30,64,175,0.06)',
          border: `1px solid ${C.border}`
        }}>
          <h3 style={{
            color: C.text,
            margin: '0 0 16px',
            fontSize: '16px',
            fontWeight: '700'
          }}>
            {text.chatbotContext}
          </h3>
          <textarea
            value={settings.chatbot_context}
            onChange={(e) => handleFieldChange('chatbot_context', e.target.value)}
            placeholder={text.chatbotContext}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              borderRadius: '10px',
              border: `1px solid ${C.border}`,
              background: darkMode ? '#0f172a' : '#f8fafc',
              color: C.text,
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            border: 'none',
            background: saving
              ? 'linear-gradient(135deg, #6b7280, #9ca3af)'
              : 'linear-gradient(135deg, #1e40af, #2563eb)',
            color: '#FFF',
            fontSize: '16px',
            fontWeight: '700',
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(30,64,175,0.3)',
            transition: 'all 0.3s'
          }}
        >
          {saving ? text.saving : text.save}
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;
