import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AuthenticatedQuoteFormProps {
  darkMode?: boolean;
  lang?: 'fr' | 'en' | 'ar';
  currentUser?: any;
  onSuccess?: () => void;
  onBack?: () => void;
}

const AuthenticatedQuoteForm: React.FC<AuthenticatedQuoteFormProps> = ({
  darkMode = false,
  lang = 'fr',
  currentUser,
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

  useEffect(() => {
    console.log('Current user in AuthenticatedQuoteForm:', currentUser);
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
    }
  }, [currentUser]);

  const texts = {
    fr: {
      title: 'Nouvelle Demande de Devis',
      subtitle: 'Remplissez ce formulaire pour recevoir un devis personnalisé',
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
      descriptionPlaceholder: 'Décrivez votre besoin en détail : type de travaux, surface, matériaux souhaités, etc.',
      errorAllFields: 'Tous les champs obligatoires doivent être remplis',
      successMessage: 'Demande envoyée avec succès!',
      errorSending: 'Erreur lors de l\'envoi de la demande',
      photos: 'Photos (optionnel)',
      photosDesc: 'Ajoutez des photos pour mieux illustrer votre besoin',
      addPhotos: 'Ajouter des photos',
      maxPhotos: 'Maximum 5 photos',
      successTitle: 'Demande envoyée avec succès !',
      successMessage2: 'Votre demande de devis a été enregistrée. Notre équipe vous contactera sous 24h.',
      trackingTitle: 'Votre numéro de suivi',
      trackingDesc: 'Conservez ce numéro pour suivre l\'état de votre demande :',
      trackingNote: 'Vous pouvez consulter tous vos devis dans l\'onglet "Suivi".',
      newQuote: 'Nouvelle demande',
      viewMyQuotes: 'Voir mes devis',
      location: 'Position géographique',
      locationDesc: 'Partagez votre position GPS pour que nous puissions vous localiser précisément et vous envoyer nos techniciens rapidement',
      shareLocation: 'Partager ma position',
      locationShared: 'Position partagée',
      coordinates: 'Coordonnées',
      removeLocation: 'Supprimer la position',
      locationError: 'Impossible d\'obtenir votre position. Veuillez vérifier vos paramètres de localisation.',
    },
    en: {
      title: 'New Quote Request',
      subtitle: 'Fill out this form to receive a personalized quote',
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
      descriptionPlaceholder: 'Describe your need in detail: type of work, area, desired materials, etc.',
      errorAllFields: 'All required fields must be filled',
      successMessage: 'Request sent successfully!',
      errorSending: 'Error sending request',
      photos: 'Photos (optional)',
      photosDesc: 'Add photos to better illustrate your need',
      addPhotos: 'Add photos',
      maxPhotos: 'Maximum 5 photos',
      successTitle: 'Request sent successfully!',
      successMessage2: 'Your quote request has been registered. Our team will contact you within 24h.',
      trackingTitle: 'Your tracking number',
      trackingDesc: 'Keep this number to track the status of your request:',
      trackingNote: 'You can view all your quotes in the "Tracking" tab.',
      newQuote: 'New request',
      viewMyQuotes: 'View my quotes',
      location: 'Geographic location',
      locationDesc: 'Share your GPS location so we can locate you precisely and send our technicians quickly',
      shareLocation: 'Share my location',
      locationShared: 'Location shared',
      coordinates: 'Coordinates',
      removeLocation: 'Remove location',
      locationError: 'Unable to get your location. Please check your location settings.',
    },
    ar: {
      title: 'طلب عرض سعر جديد',
      subtitle: 'املأ هذا النموذج للحصول على عرض سعر مخصص',
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
      descriptionPlaceholder: 'صف احتياجاتك بالتفصيل: نوع العمل، المساحة، المواد المرغوبة، إلخ.',
      errorAllFields: 'يجب ملء جميع الحقول المطلوبة',
      successMessage: 'تم إرسال الطلب بنجاح!',
      errorSending: 'خطأ في إرسال الطلب',
      photos: 'الصور (اختياري)',
      photosDesc: 'أضف صورًا لتوضيح احتياجاتك بشكل أفضل',
      addPhotos: 'إضافة صور',
      maxPhotos: 'الحد الأقصى 5 صور',
      successTitle: 'تم إرسال الطلب بنجاح!',
      successMessage2: 'تم تسجيل طلب عرض السعر الخاص بك. سيتصل بك فريقنا خلال 24 ساعة.',
      trackingTitle: 'رقم التتبع الخاص بك',
      trackingDesc: 'احتفظ بهذا الرقم لتتبع حالة طلبك:',
      trackingNote: 'يمكنك عرض جميع عروض الأسعار الخاصة بك في علامة التبويب "التتبع".',
      newQuote: 'طلب جديد',
      viewMyQuotes: 'عرض عروض الأسعار الخاصة بي',
      location: 'الموقع الجغرافي',
      locationDesc: 'شارك موقع GPS الخاص بك حتى نتمكن من تحديد موقعك بدقة وإرسال الفنيين بسرعة',
      shareLocation: 'مشاركة موقعي',
      locationShared: 'تم مشاركة الموقع',
      coordinates: 'الإحداثيات',
      removeLocation: 'إزالة الموقع',
      locationError: 'غير قادر على الحصول على موقعك. يرجى التحقق من إعدادات الموقع الخاصة بك.',
    },
  };

  const t = texts[lang];

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

  const handleLocationShare = () => {
    if (!navigator.geolocation) {
      alert(t.locationError);
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({
          lat: latitude,
          lng: longitude,
          address: `Conakry, Guinée (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
        });
        setLocationLoading(false);
      },
      (_error) => {
        alert(t.locationError);
        setLocationLoading(false);
      }
    );
  };

  const removeLocation = () => {
    setLocation(null);
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      console.log('Auth check - User:', authUser);
      console.log('Auth check - Error:', authError);

      if (authError || !authUser) {
        console.error('Auth error:', authError);
        setErrors({ general: 'Erreur d\'authentification. Veuillez vous reconnecter.' });
        setLoading(false);
        return;
      }

      console.log('User authenticated, ID:', authUser.id);

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

      const quoteData = {
        name,
        email: email.toLowerCase(),
        phone,
        service_type: serviceType,
        address: location?.address || null,
        description,
        urgency,
        status: 'pending',
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        user_id: authUser.id,
        location_coordinates: location ? { lat: location.lat, lng: location.lng, address: location.address } : null,
        created_at: new Date().toISOString(),
      };

      console.log('Inserting quote with data:', quoteData);

      const { data: insertedQuote, error } = await supabase
        .from('quote_requests')
        .insert(quoteData)
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        console.error('Auth user ID:', authUser?.id);
        console.error('Error details:', JSON.stringify(error, null, 2));
        setErrors({ general: `Erreur: ${error.message || 'Impossible de créer le devis. Veuillez réessayer.'}` });
        setLoading(false);
        return;
      }

      if (insertedQuote && insertedQuote.tracking_number) {
        setTrackingNumber(insertedQuote.tracking_number);
        setShowSuccess(true);
      } else {
        alert(t.successMessage);
        if (onSuccess) onSuccess();
      }

      setServiceType('');
      setDescription('');
      setUrgency('normal');
      setImages([]);
      setImagePreviews([]);

    } catch (error: any) {
      console.error('Erreur complète:', error);
      const errorMessage = error?.message || error?.error_description || '';
      setErrors({ general: `${t.errorSending}${errorMessage ? ' - ' + errorMessage : ''}` });
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

  if (showSuccess && trackingNumber) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>✅</div>
            <h2 style={titleStyle}>{t.successTitle}</h2>
            <p style={{ ...subtitleStyle, marginBottom: '32px' }}>{t.successMessage2}</p>

            <div style={{
              padding: '24px',
              background: darkMode ? '#0f172a' : '#f8fafc',
              borderRadius: '16px',
              marginBottom: '24px',
            }}>
              <p style={{
                fontSize: '14px',
                color: darkMode ? '#94a3b8' : '#64748b',
                marginBottom: '12px',
              }}>
                {t.trackingTitle}
              </p>
              <div style={{
                fontSize: '28px',
                fontWeight: '800',
                color: darkMode ? '#60a5fa' : '#1e40af',
                letterSpacing: '2px',
                marginBottom: '16px',
              }}>
                {trackingNumber}
              </div>
              <p style={{
                fontSize: '13px',
                color: darkMode ? '#94a3b8' : '#64748b',
                lineHeight: '1.6',
              }}>
                {t.trackingNote}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setTrackingNumber(null);
                }}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                {t.newQuote}
              </button>
              <button
                onClick={onSuccess}
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
                {t.viewMyQuotes}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            }}
          >
            ← {t.back}
          </button>
        )}

        <h1 style={titleStyle}>{t.title}</h1>
        <p style={subtitleStyle}>{t.subtitle}</p>

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
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: darkMode ? '#f1f5f9' : '#0f172a',
            }}>
              {t.name}
            </label>
            <input
              type="text"
              value={name}
              readOnly
              style={{
                ...inputStyle,
                opacity: 0.7,
                borderColor: errors.name ? '#ef4444' : (darkMode ? '#475569' : '#cbd5e1')
              }}
            />
            {errors.name && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.name}
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
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
                readOnly
                style={{ ...inputStyle, opacity: 0.7 }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: darkMode ? '#f1f5f9' : '#0f172a',
              }}>
                {t.phone}
              </label>
              <input
                type="tel"
                value={phone}
                readOnly
                style={{ ...inputStyle, opacity: 0.7 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: darkMode ? '#f1f5f9' : '#0f172a',
            }}>
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
                disabled={locationLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: locationLoading
                    ? darkMode ? '#334155' : '#e2e8f0'
                    : 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: locationLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {locationLoading ? '⏳ ...' : `📍 ${t.shareLocation}`}
              </button>
            ) : (
              <div style={{
                padding: '16px',
                background: darkMode ? '#0f172a' : '#f0fdf4',
                borderRadius: '12px',
                border: `2px solid ${darkMode ? '#059669' : '#10b981'}`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: darkMode ? '#10b981' : '#059669',
                  }}>
                    ✓ {t.locationShared}
                  </span>
                  <button
                    type="button"
                    onClick={removeLocation}
                    style={{
                      padding: '6px 12px',
                      background: 'transparent',
                      border: `1px solid ${darkMode ? '#ef4444' : '#dc2626'}`,
                      color: darkMode ? '#ef4444' : '#dc2626',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    ✕ {t.removeLocation}
                  </button>
                </div>
                <div style={{
                  fontSize: '13px',
                  color: darkMode ? '#94a3b8' : '#64748b',
                }}>
                  {t.coordinates}: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: darkMode ? '#f1f5f9' : '#0f172a',
            }}>
              {t.serviceType} <span style={{ color: '#ef4444' }}>*</span>
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
              style={{
                ...inputStyle,
                border: `2px solid ${errors.serviceType ? '#ef4444' : darkMode ? '#334155' : '#e2e8f0'}`,
              }}
            >
              <option value="">{t.selectService}</option>
              <option value="Plomberie Générale">{t.service1}</option>
              <option value="Installation Sanitaire">{t.service2}</option>
              <option value="Chauffe-eau">{t.service3}</option>
              <option value="Rénovation">{t.service4}</option>
              <option value="Maintenance">{t.service5}</option>
              <option value="Urgence">{t.service6}</option>
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

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: darkMode ? '#f1f5f9' : '#0f172a',
            }}>
              {t.description} <span style={{ color: '#ef4444' }}>*</span>
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

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: darkMode ? '#f1f5f9' : '#0f172a',
            }}>
              {t.urgency}
            </label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              style={inputStyle}
            >
              <option value="normal">{t.urgencyNormal}</option>
              <option value="urgent">{t.urgencyUrgent}</option>
              <option value="emergency">{t.urgencyEmergency}</option>
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: darkMode ? '#f1f5f9' : '#0f172a',
            }}>
              {t.photos}
            </label>
            <p style={{
              fontSize: '13px',
              color: darkMode ? '#94a3b8' : '#64748b',
              marginBottom: '12px',
            }}>
              {t.photosDesc}
            </p>

            {imagePreviews.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '12px',
                marginBottom: '12px',
              }}>
                {imagePreviews.map((preview, index) => (
                  <div key={index} style={{ position: 'relative' }}>
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '120px',
                        objectFit: 'cover',
                        borderRadius: '12px',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: '#ef4444',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '700',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {images.length < 5 && (
              <label style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: darkMode ? '#334155' : '#e2e8f0',
                color: darkMode ? '#f1f5f9' : '#0f172a',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}>
                + {t.addPhotos}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

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
            }}
          >
            {loading ? '...' : t.submit}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthenticatedQuoteForm;
