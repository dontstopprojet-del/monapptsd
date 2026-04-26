import React, { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface DevisFormProps {
  darkMode?: boolean;
  lang?: 'fr' | 'en' | 'ar';
  onSuccess?: () => void;
  onBack?: () => void;
}

const DevisForm: React.FC<DevisFormProps> = ({
  darkMode = false,
  lang = 'fr',
  onSuccess,
  onBack,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const texts = {
    fr: {
      title: 'Demande de Devis',
      subtitle: 'Remplissez ce formulaire pour recevoir un devis gratuit et personnalisé',
      name: 'Nom complet',
      email: 'Email',
      phone: 'Téléphone',
      serviceType: 'Type de service',
      selectService: 'Sélectionnez un service',
      service1: 'Plomberie Générale',
      service2: 'Installation Sanitaire',
      service3: 'Chauffe-eau',
      service4: 'Rénovation',
      service5: 'Maintenance',
      service6: 'Urgence',
      description: 'Description détaillée du projet',
      urgency: 'Niveau d\'urgence',
      urgencyNormal: 'Normal (sous 3-5 jours)',
      urgencyUrgent: 'Urgent (sous 24h)',
      urgencyEmergency: 'Urgence (intervention immédiate)',
      submit: 'Envoyer la demande',
      back: 'Retour',
      namePlaceholder: 'Jean Dupont',
      emailPlaceholder: 'jean.dupont@example.com',
      phonePlaceholder: '+224 610 55 32 55',
      descriptionPlaceholder: 'Décrivez votre besoin en détail : type de travaux, surface, matériaux souhaités, etc.',
      location: 'Position géographique',
      locationDesc: 'Partagez votre position GPS pour que nous puissions vous localiser précisément et vous envoyer nos techniciens rapidement',
      shareLocation: 'Partager ma position',
      locationShared: 'Position partagée',
      coordinates: 'Coordonnées',
      removeLocation: 'Supprimer la position',
      locationError: 'Impossible d\'obtenir votre position. Veuillez vérifier vos paramètres de localisation.',
      errorAllFields: 'Tous les champs obligatoires doivent être remplis',
      errorInvalidEmail: 'Email invalide',
      successMessage: 'Demande envoyée avec succès! Nous vous contacterons sous 24h.',
      errorSending: 'Erreur lors de l\'envoi de la demande',
      freeQuote: 'Devis gratuit et sans engagement',
      response24h: 'Réponse sous 24h garantie',
      expertAdvice: 'Conseils d\'expert inclus',
      photos: 'Photos (optionnel)',
      photosDesc: 'Ajoutez des photos pour mieux illustrer votre besoin',
      addPhotos: 'Ajouter des photos',
      maxPhotos: 'Maximum 5 photos',
      successTitle: 'Demande envoyée avec succès !',
      successMessage2: 'Votre demande de devis a été enregistrée. Nous vous contacterons sous 24h.',
      trackingTitle: 'Votre numéro de suivi',
      trackingDesc: 'Conservez ce numéro pour suivre l\'état de votre demande :',
      trackingNote: 'Ce numéro vous a également été envoyé par email. Vous pouvez l\'utiliser pour consulter l\'état de votre demande à tout moment.',
      newQuote: 'Nouvelle demande',
    },
    en: {
      title: 'Quote Request',
      subtitle: 'Fill out this form to receive a free personalized quote',
      name: 'Full Name',
      email: 'Email',
      phone: 'Phone',
      serviceType: 'Service Type',
      selectService: 'Select a service',
      service1: 'General Plumbing',
      service2: 'Sanitary Installation',
      service3: 'Water Heater',
      service4: 'Renovation',
      service5: 'Maintenance',
      service6: 'Emergency',
      description: 'Detailed project description',
      urgency: 'Urgency Level',
      urgencyNormal: 'Normal (within 3-5 days)',
      urgencyUrgent: 'Urgent (within 24h)',
      urgencyEmergency: 'Emergency (immediate intervention)',
      submit: 'Send Request',
      back: 'Back',
      namePlaceholder: 'John Doe',
      emailPlaceholder: 'john.doe@example.com',
      phonePlaceholder: '+224 610 55 32 55',
      descriptionPlaceholder: 'Describe your need in detail: type of work, area, desired materials, etc.',
      location: 'Geographic location',
      locationDesc: 'Share your GPS location so we can locate you precisely and send our technicians quickly',
      shareLocation: 'Share my location',
      locationShared: 'Location shared',
      coordinates: 'Coordinates',
      removeLocation: 'Remove location',
      locationError: 'Unable to get your location. Please check your location settings.',
      errorAllFields: 'All required fields must be filled',
      errorInvalidEmail: 'Invalid email',
      successMessage: 'Request sent successfully! We will contact you within 24h.',
      errorSending: 'Error sending request',
      freeQuote: 'Free quote without commitment',
      response24h: 'Response within 24h guaranteed',
      expertAdvice: 'Expert advice included',
      photos: 'Photos (optional)',
      photosDesc: 'Add photos to better illustrate your need',
      addPhotos: 'Add photos',
      maxPhotos: 'Maximum 5 photos',
      successTitle: 'Request sent successfully!',
      successMessage2: 'Your quote request has been registered. We will contact you within 24h.',
      trackingTitle: 'Your tracking number',
      trackingDesc: 'Keep this number to track the status of your request:',
      trackingNote: 'This number has also been sent to you by email. You can use it to check the status of your request at any time.',
      newQuote: 'New request',
    },
    ar: {
      title: 'طلب عرض سعر',
      subtitle: 'املأ هذا النموذج للحصول على عرض سعر مجاني ومخصص',
      name: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      phone: 'الهاتف',
      serviceType: 'نوع الخدمة',
      selectService: 'اختر خدمة',
      service1: 'السباكة العامة',
      service2: 'التركيب الصحي',
      service3: 'سخان المياه',
      service4: 'التجديد',
      service5: 'الصيانة',
      service6: 'طوارئ',
      description: 'وصف تفصيلي للمشروع',
      urgency: 'مستوى الاستعجال',
      urgencyNormal: 'عادي (خلال 3-5 أيام)',
      urgencyUrgent: 'عاجل (خلال 24 ساعة)',
      urgencyEmergency: 'طارئ (تدخل فوري)',
      submit: 'إرسال الطلب',
      back: 'رجوع',
      namePlaceholder: 'أحمد محمد',
      emailPlaceholder: 'ahmed.mohamed@example.com',
      phonePlaceholder: '+224 610 55 32 55',
      descriptionPlaceholder: 'صف احتياجاتك بالتفصيل: نوع العمل، المساحة، المواد المرغوبة، إلخ.',
      location: 'الموقع الجغرافي',
      locationDesc: 'شارك موقع GPS الخاص بك حتى نتمكن من تحديد موقعك بدقة وإرسال الفنيين بسرعة',
      shareLocation: 'مشاركة موقعي',
      locationShared: 'تم مشاركة الموقع',
      coordinates: 'الإحداثيات',
      removeLocation: 'إزالة الموقع',
      locationError: 'غير قادر على الحصول على موقعك. يرجى التحقق من إعدادات الموقع الخاصة بك.',
      errorAllFields: 'يجب ملء جميع الحقول المطلوبة',
      errorInvalidEmail: 'البريد الإلكتروني غير صالح',
      successMessage: 'تم إرسال الطلب بنجاح! سنتصل بك خلال 24 ساعة.',
      errorSending: 'خطأ في إرسال الطلب',
      freeQuote: 'عرض سعر مجاني بدون التزام',
      response24h: 'رد خلال 24 ساعة مضمون',
      expertAdvice: 'استشارة خبير مشمولة',
      photos: 'الصور (اختياري)',
      photosDesc: 'أضف صورًا لتوضيح احتياجاتك بشكل أفضل',
      addPhotos: 'إضافة صور',
      maxPhotos: 'الحد الأقصى 5 صور',
      successTitle: 'تم إرسال الطلب بنجاح!',
      successMessage2: 'تم تسجيل طلب عرض السعر الخاص بك. سنتصل بك خلال 24 ساعة.',
      trackingTitle: 'رقم التتبع الخاص بك',
      trackingDesc: 'احتفظ بهذا الرقم لتتبع حالة طلبك:',
      trackingNote: 'تم إرسال هذا الرقم إليك أيضًا عبر البريد الإلكتروني. يمكنك استخدامه للتحقق من حالة طلبك في أي وقت.',
      newQuote: 'طلب جديد',
    },
  };

  const t = texts[lang];

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const totalImages = images.length + newFiles.length;

    if (totalImages > 5) {
      alert(t.maxPhotos);
      return;
    }

    setImages(prev => [...prev, ...newFiles]);

    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  }, []);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
  }, []);

  const handleLocationShare = () => {
    if (!navigator.geolocation) {
      alert(t.locationError);
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr`
          );
          const data = await response.json();
          const formattedAddress = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

          setLocation({
            lat: latitude,
            lng: longitude,
            address: formattedAddress,
          });
        } catch (error) {
          console.error('Error getting address:', error);
          setLocation({
            lat: latitude,
            lng: longitude,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          });
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert(t.locationError);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: { [key: string]: string } = {};

    if (!name) newErrors.name = t.errorAllFields;
    if (!email) newErrors.email = t.errorAllFields;
    if (!phone) newErrors.phone = t.errorAllFields;
    if (!serviceType) newErrors.serviceType = t.errorAllFields;
    if (!description) newErrors.description = t.errorAllFields;

    if (email && !isValidEmail(email)) {
      newErrors.email = t.errorInvalidEmail;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      let imageUrls: string[] = [];

      if (images.length > 0) {
        const uploadPromises = images.map(async (file, index) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${index}.${fileExt}`;
          const filePath = `quote-images/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('public-files')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            return null;
          }

          const { data } = supabase.storage
            .from('public-files')
            .getPublicUrl(filePath);

          return data.publicUrl;
        });

        const uploadedUrls = await Promise.all(uploadPromises);
        imageUrls = uploadedUrls.filter(url => url !== null) as string[];
      }

      const { data: insertedQuote, error } = await supabase
        .from('quote_requests')
        .insert({
          name,
          email: email.toLowerCase(),
          phone,
          service_type: serviceType,
          address: location?.address || null,
          description,
          urgency,
          status: 'pending',
          image_urls: imageUrls.length > 0 ? imageUrls : null,
          location_coordinates: location ? { lat: location.lat, lng: location.lng, address: location.address } : null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      if (insertedQuote && insertedQuote.tracking_number) {
        setTrackingNumber(insertedQuote.tracking_number);
        setShowSuccess(true);

        setName('');
        setEmail('');
        setPhone('');
        setServiceType('');
        setDescription('');
        setUrgency('normal');
        setImages([]);
        setImagePreviews([]);
        setLocation(null);
      } else {
        alert(t.successMessage);

        setName('');
        setEmail('');
        setPhone('');
        setServiceType('');
        setDescription('');
        setUrgency('normal');
        setImages([]);
        setImagePreviews([]);
        setLocation(null);

        if (onSuccess) {
          onSuccess();
        }
      }

    } catch (error: any) {
      console.error('Erreur:', error);
      setErrors({ general: t.errorSending });
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
    marginBottom: '40px',
  };

  const badgesStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '40px',
    flexWrap: 'wrap',
  };

  const badgeStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '50px',
    background: darkMode ? '#334155' : '#e0f2fe',
    color: darkMode ? '#e2e8f0' : '#075985',
    fontSize: '13px',
    fontWeight: '600',
  };

  const inputGroupStyle: React.CSSProperties = {
    marginBottom: '24px',
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
    marginTop: '8px',
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

  const requiredStyle: React.CSSProperties = {
    color: '#ef4444',
    marginLeft: '4px',
  };

  if (showSuccess && trackingNumber) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{
            textAlign: 'center',
            marginBottom: '32px',
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '16px',
            }}>
              ✅
            </div>
            <h1 style={{
              ...titleStyle,
              marginBottom: '16px',
            }}>
              {t.successTitle}
            </h1>
            <p style={{
              fontSize: '16px',
              color: darkMode ? '#94a3b8' : '#64748b',
              marginBottom: '32px',
            }}>
              {t.successMessage2}
            </p>
          </div>

          <div style={{
            background: darkMode ? '#0f172a' : '#f0f9ff',
            padding: '24px',
            borderRadius: '16px',
            border: `2px solid ${darkMode ? '#334155' : '#bae6fd'}`,
            marginBottom: '24px',
          }}>
            <div style={{
              fontSize: '14px',
              color: darkMode ? '#94a3b8' : '#0369a1',
              fontWeight: '600',
              marginBottom: '12px',
              textAlign: 'center',
            }}>
              {t.trackingTitle}
            </div>
            <div style={{
              fontSize: '13px',
              color: darkMode ? '#94a3b8' : '#075985',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              {t.trackingDesc}
            </div>
            <div style={{
              background: darkMode ? '#1e293b' : '#ffffff',
              padding: '20px',
              borderRadius: '12px',
              fontFamily: 'monospace',
              fontSize: '24px',
              fontWeight: '700',
              textAlign: 'center',
              color: darkMode ? '#60a5fa' : '#0369a1',
              letterSpacing: '2px',
              marginBottom: '16px',
            }}>
              {trackingNumber}
            </div>
            <div style={{
              fontSize: '12px',
              color: darkMode ? '#94a3b8' : '#0369a1',
              textAlign: 'center',
              lineHeight: '1.6',
            }}>
              {t.trackingNote}
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            flexDirection: 'column',
          }}>
            <button
              onClick={() => {
                setShowSuccess(false);
                setTrackingNumber(null);
              }}
              style={{
                ...buttonStyle,
                marginTop: '0',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {t.newQuote}
            </button>

            {onBack && (
              <button
                onClick={onBack}
                style={backButtonStyle}
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>{t.title}</h1>
        <p style={subtitleStyle}>{t.subtitle}</p>

        <div style={badgesStyle}>
          <div style={badgeStyle}>✅ {t.freeQuote}</div>
          <div style={badgeStyle}>⚡ {t.response24h}</div>
          <div style={badgeStyle}>💡 {t.expertAdvice}</div>
        </div>

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

          <div style={inputGroupStyle}>
            <label style={labelStyle}>
              {t.name}
              <span style={requiredStyle}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                handleNameChange(e);
                if (errors.name) {
                  const newErrors = { ...errors };
                  delete newErrors.name;
                  setErrors(newErrors);
                }
              }}
              placeholder={t.namePlaceholder}
              disabled={loading}
              style={{
                ...inputStyle,
                border: `2px solid ${errors.name ? '#ef4444' : darkMode ? '#334155' : '#e2e8f0'}`,
              }}
              onFocus={(e) => e.target.style.borderColor = errors.name ? '#ef4444' : '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = errors.name ? '#ef4444' : darkMode ? '#334155' : '#e2e8f0'}
            />
            {errors.name && (
              <div style={{
                marginTop: '6px',
                fontSize: '13px',
                color: '#ef4444',
                fontWeight: '500',
              }}>
                {errors.name}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>
                {t.email}
                <span style={requiredStyle}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  handleEmailChange(e);
                  if (errors.email) {
                    const newErrors = { ...errors };
                    delete newErrors.email;
                    setErrors(newErrors);
                  }
                }}
                placeholder={t.emailPlaceholder}
                disabled={loading}
                style={{
                  ...inputStyle,
                  border: `2px solid ${errors.email ? '#ef4444' : darkMode ? '#334155' : '#e2e8f0'}`,
                }}
                onFocus={(e) => e.target.style.borderColor = errors.email ? '#ef4444' : '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = errors.email ? '#ef4444' : darkMode ? '#334155' : '#e2e8f0'}
              />
              {errors.email && (
                <div style={{
                  marginTop: '6px',
                  fontSize: '13px',
                  color: '#ef4444',
                  fontWeight: '500',
                }}>
                  {errors.email}
                </div>
              )}
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>
                {t.phone}
                <span style={requiredStyle}>*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  handlePhoneChange(e);
                  if (errors.phone) {
                    const newErrors = { ...errors };
                    delete newErrors.phone;
                    setErrors(newErrors);
                  }
                }}
                placeholder={t.phonePlaceholder}
                disabled={loading}
                style={{
                  ...inputStyle,
                  border: `2px solid ${errors.phone ? '#ef4444' : darkMode ? '#334155' : '#e2e8f0'}`,
                }}
                onFocus={(e) => e.target.style.borderColor = errors.phone ? '#ef4444' : '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = errors.phone ? '#ef4444' : darkMode ? '#334155' : '#e2e8f0'}
              />
              {errors.phone && (
                <div style={{
                  marginTop: '6px',
                  fontSize: '13px',
                  color: '#ef4444',
                  fontWeight: '500',
                }}>
                  {errors.phone}
                </div>
              )}
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>
              {t.serviceType}
              <span style={requiredStyle}>*</span>
            </label>
            <select
              value={serviceType}
              onChange={(e) => {
                setServiceType(e.target.value);
                if (errors.serviceType) {
                  const newErrors = { ...errors };
                  delete newErrors.serviceType;
                  setErrors(newErrors);
                }
              }}
              disabled={loading}
              style={{
                ...inputStyle,
                border: `2px solid ${errors.serviceType ? '#ef4444' : darkMode ? '#334155' : '#e2e8f0'}`,
              }}
              onFocus={(e) => e.target.style.borderColor = errors.serviceType ? '#ef4444' : '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = errors.serviceType ? '#ef4444' : darkMode ? '#334155' : '#e2e8f0'}
            >
              <option value="">{t.selectService}</option>
              <option value="plumbing">{t.service1}</option>
              <option value="sanitary">{t.service2}</option>
              <option value="water_heater">{t.service3}</option>
              <option value="renovation">{t.service4}</option>
              <option value="maintenance">{t.service5}</option>
              <option value="emergency">{t.service6}</option>
            </select>
            {errors.serviceType && (
              <div style={{
                marginTop: '6px',
                fontSize: '13px',
                color: '#ef4444',
                fontWeight: '500',
              }}>
                {errors.serviceType}
              </div>
            )}
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>
              📍 {t.location}
            </label>
            <p style={{
              fontSize: '13px',
              color: darkMode ? '#94a3b8' : '#64748b',
              marginBottom: '12px',
            }}>
              {t.locationDesc}
            </p>

            {!location ? (
              <button
                type="button"
                onClick={handleLocationShare}
                disabled={locationLoading || loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: `2px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                  background: darkMode ? '#0f172a' : '#f0f9ff',
                  color: darkMode ? '#60a5fa' : '#0369a1',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: locationLoading || loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  if (!locationLoading && !loading) {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.background = darkMode ? '#1e293b' : '#dbeafe';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = darkMode ? '#334155' : '#e2e8f0';
                  e.currentTarget.style.background = darkMode ? '#0f172a' : '#f0f9ff';
                }}
              >
                {locationLoading ? '📍 Obtention de la position...' : `📍 ${t.shareLocation}`}
              </button>
            ) : (
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: darkMode ? '#0f172a' : '#f0f9ff',
                border: `2px solid ${darkMode ? '#334155' : '#bae6fd'}`,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px',
                }}>
                  <div style={{
                    fontSize: '13px',
                    color: darkMode ? '#60a5fa' : '#0369a1',
                    fontWeight: '600',
                  }}>
                    ✅ {t.locationShared}
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocation(null)}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '0',
                    }}
                  >
                    {t.removeLocation}
                  </button>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: darkMode ? '#94a3b8' : '#075985',
                  lineHeight: '1.5',
                }}>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>{t.coordinates}:</strong> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </div>
                  <div>
                    <strong style={{ fontSize: '11px' }}>📍</strong> {location.address}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>
              {t.urgency}
              <span style={requiredStyle}>*</span>
            </label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              disabled={loading}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = darkMode ? '#334155' : '#e2e8f0'}
            >
              <option value="normal">{t.urgencyNormal}</option>
              <option value="urgent">{t.urgencyUrgent}</option>
              <option value="emergency">{t.urgencyEmergency}</option>
            </select>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>
              {t.description}
              <span style={requiredStyle}>*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                handleDescriptionChange(e);
                if (errors.description) {
                  const newErrors = { ...errors };
                  delete newErrors.description;
                  setErrors(newErrors);
                }
              }}
              placeholder={t.descriptionPlaceholder}
              disabled={loading}
              style={{
                ...textareaStyle,
                border: `2px solid ${errors.description ? '#ef4444' : darkMode ? '#334155' : '#e2e8f0'}`,
              }}
              onFocus={(e) => e.target.style.borderColor = errors.description ? '#ef4444' : '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = errors.description ? '#ef4444' : darkMode ? '#334155' : '#e2e8f0'}
            />
            {errors.description && (
              <div style={{
                marginTop: '6px',
                fontSize: '13px',
                color: '#ef4444',
                fontWeight: '500',
              }}>
                {errors.description}
              </div>
            )}
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>
              {t.photos}
            </label>
            <div style={{ fontSize: '12px', color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '12px' }}>
              {t.photosDesc}
            </div>

            {imagePreviews.length < 5 && (
              <div style={{
                marginBottom: '16px',
              }}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  disabled={loading}
                  id="image-upload"
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="image-upload"
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: `2px dashed ${darkMode ? '#334155' : '#e2e8f0'}`,
                    background: darkMode ? '#0f172a' : '#f8fafc',
                    color: darkMode ? '#f1f5f9' : '#0f172a',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = darkMode ? '#1e293b' : '#eff6ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = darkMode ? '#334155' : '#e2e8f0';
                    e.currentTarget.style.background = darkMode ? '#0f172a' : '#f8fafc';
                  }}
                >
                  📷 {t.addPhotos} ({imagePreviews.length}/5)
                </label>
              </div>
            )}

            {imagePreviews.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '12px',
              }}>
                {imagePreviews.map((preview, index) => (
                  <div
                    key={index}
                    style={{
                      position: 'relative',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      paddingTop: '100%',
                      background: darkMode ? '#0f172a' : '#f1f5f9',
                    }}
                  >
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      disabled={loading}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: '700',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
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
            {loading ? '⏳ Envoi en cours...' : `📨 ${t.submit}`}
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
  );
};

export default DevisForm;
