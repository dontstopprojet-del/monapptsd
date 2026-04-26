import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

interface LoginScreenProps {
  colors: any;
  translations: any;
  lang: string;
  darkMode: boolean;
  onLoginSuccess: (user: any, role: string) => void;
  onLanguageChange: () => void;
  onDarkModeToggle: () => void;
  onBackToHome?: () => void;
  isPasswordRecovery?: boolean;
}

const officeAccessMap: Record<string, { fr: string; en: string; ar: string }> = {
  'Directeur': { fr: 'Supervise toute l\'entreprise', en: 'Oversees the entire company', ar: 'يشرف على الشركة بأكملها' },
  'Responsable administratif & financier': { fr: 'Gestion du budget, facturation, fournisseurs', en: 'Budget management, invoicing, suppliers', ar: 'إدارة الميزانية والفوترة والموردين' },
  'Responsable RH': { fr: 'Recrutement, contrats, absences, paie', en: 'Recruitment, contracts, absences, payroll', ar: 'التوظيف والعقود والغياب والرواتب' },
  'Secrétaire / Assistante administrative': { fr: 'Accueil clients, devis, planning des équipes', en: 'Client reception, quotes, team scheduling', ar: 'استقبال العملاء والعروض وجدولة الفرق' },
  'Comptable (interne ou externe)': { fr: 'Comptabilité, déclarations, bilans', en: 'Accounting, declarations, balance sheets', ar: 'المحاسبة والإقرارات والميزانيات' },
};

const LoginScreen = ({ translations: t, lang, darkMode, onLoginSuccess, onLanguageChange, onDarkModeToggle, onBackToHome, isPasswordRecovery }: LoginScreenProps) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('client');
  const [contractNumber, setContractNumber] = useState('');
  const [echelon, setEchelon] = useState('');
  const [status, setStatus] = useState('');
  const [officePosition, setOfficePosition] = useState('');
  const [city, setCity] = useState('');
  const [createdDate, setCreatedDate] = useState('');
  const [mad, setMad] = useState('');
  const [creationLocation, setCreationLocation] = useState('');
  const [district, setDistrict] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [contractSignatureDate, setContractSignatureDate] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('Célibataire');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [resetPasswordMessage, setResetPasswordMessage] = useState('');

  useEffect(() => {
    if (isPasswordRecovery) {
      setShowResetPassword(true);
    }
  }, [isPasswordRecovery]);

  const getText = (fr: string, en: string, ar: string): string => {
    if (lang === 'ar') return ar;
    if (lang === 'en') return en;
    return fr;
  };

  const translateError = (errorMessage: string): string => {
    if (lang === 'ar') {
      const errorTranslationsAr: { [key: string]: string } = {
        'Invalid login credentials': 'بيانات الاعتماد غير صالحة',
        'Email rate limit exceeded': 'تم تجاوز حد المحاولات. يرجى المحاولة بعد قليل',
        'User already registered': 'هذا البريد الإلكتروني مسجل بالفعل',
        'Un compte avec cet email existe déjà': 'يوجد حساب بهذا البريد الإلكتروني بالفعل. يرجى تسجيل الدخول',
        'Password should be at least 6 characters': 'يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل',
        'Unable to validate email address': 'تعذر التحقق من صحة عنوان البريد الإلكتروني',
        'Signup requires a valid password': 'يتطلب التسجيل كلمة مرور صالحة',
        'Email not confirmed': 'البريد الإلكتروني غير مؤكد',
        'Invalid email': 'بريد إلكتروني غير صالح',
        'Password is known to be weak and easy to guess': 'كلمة المرور ضعيفة وسهلة التخمين. يرجى اختيار كلمة مرور مختلفة'
      };
      for (const [englishError, arabicError] of Object.entries(errorTranslationsAr)) {
        if (errorMessage.includes(englishError)) {
          return arabicError;
        }
      }
      return errorMessage;
    }

    if (lang === 'en') {
      const errorTranslationsEn: { [key: string]: string } = {
        'Un compte avec cet email existe déjà': 'An account with this email already exists. Please login'
      };
      for (const [frenchError, englishError] of Object.entries(errorTranslationsEn)) {
        if (errorMessage.includes(frenchError)) {
          return englishError;
        }
      }
      return errorMessage;
    }

    const errorTranslations: { [key: string]: string } = {
      'Invalid login credentials': 'Identifiants de connexion invalides',
      'Email rate limit exceeded': 'Limite de tentatives dépassée. Veuillez réessayer dans quelques instants',
      'User already registered': 'Cet email est déjà enregistré',
      'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères',
      'Unable to validate email address': 'Impossible de valider l\'adresse email',
      'Signup requires a valid password': 'L\'inscription nécessite un mot de passe valide',
      'Email not confirmed': 'Email non confirmé',
      'Invalid email': 'Email invalide',
      'Password is known to be weak and easy to guess': 'Le mot de passe est connu pour être faible et facile à deviner. Veuillez en choisir un différent'
    };

    for (const [englishError, frenchError] of Object.entries(errorTranslations)) {
      if (errorMessage.includes(englishError)) {
        return frenchError;
      }
    }

    return errorMessage;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (password !== passwordConfirm) {
          throw new Error(getText('Les mots de passe ne correspondent pas', 'Passwords do not match', 'كلمات المرور غير متطابقة'));
        }

        if (!phone) {
          throw new Error(getText('Veuillez entrer votre numéro de téléphone', 'Please enter your phone number', 'الرجاء إدخال رقم هاتفك'));
        }

        if (!phone.startsWith('+')) {
          throw new Error(getText('Le numéro doit commencer par un indicatif (ex: +224, +32)', 'Phone number must start with a country code (e.g. +224, +32)', 'يجب أن يبدأ الرقم برمز البلد (مثال: 224+، 32+)'));
        }

        if (!dateOfBirth) {
          throw new Error(getText('Veuillez entrer votre date de naissance', 'Please enter your date of birth', 'الرجاء إدخال تاريخ ميلادك'));
        }

        if (!contractSignatureDate && role !== 'admin') {
          throw new Error(getText('Veuillez entrer la date de signature du contrat', 'Please enter the contract signature date', 'الرجاء إدخال تاريخ توقيع العقد'));
        }

        if (role === 'client' && !city.trim()) {
          throw new Error(getText('La ville de résidence est obligatoire pour les clients', 'City of residence is required for clients', 'مدينة الإقامة مطلوبة للعملاء'));
        }

        if ((role === 'client' || role === 'tech') && !contractNumber.trim()) {
          throw new Error(getText('Le numéro de contrat est obligatoire', 'Contract number is required', 'رقم العقد مطلوب'));
        }

        if (role === 'admin' && !email.endsWith('@tsdetfils.com')) {
          throw new Error(getText('Les administrateurs doivent utiliser un email @tsdetfils.com', 'Administrators must use a @tsdetfils.com email', 'يجب على المسؤولين استخدام بريد إلكتروني @tsdetfils.com'));
        }

        if (role === 'admin' && !createdDate) {
          throw new Error(getText('La date de création est obligatoire', 'Creation date is required', 'تاريخ الإنشاء مطلوب'));
        }

        if (role === 'admin' && !mad.trim()) {
          throw new Error(getText('Le champ MAD est obligatoire', 'MAD field is required', 'حقل MAD مطلوب'));
        }

        if (role === 'admin' && !creationLocation.trim()) {
          throw new Error(getText('Le lieu de création est obligatoire', 'Creation location is required', 'مكان الإنشاء مطلوب'));
        }

        if (role === 'admin' && !district.trim()) {
          throw new Error(getText('Le quartier est obligatoire', 'District is required', 'الحي مطلوب'));
        }

        if (role === 'admin' && !postalCode.trim()) {
          throw new Error(getText('Le code postal est obligatoire', 'Postal code is required', 'الرمز البريدي مطلوب'));
        }

        if (role === 'tech' && !echelon) {
          throw new Error(getText('Veuillez sélectionner un échelon', 'Please select a rank', 'الرجاء تحديد رتبة'));
        }

        if (role === 'office' && !officePosition) {
          throw new Error(getText('Veuillez sélectionner un poste', 'Please select a position', 'الرجاء تحديد منصب'));
        }

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}`
          }
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('app_users')
            .upsert({
              id: authData.user.id,
              email,
              name,
              role,
              phone: phone || null,
              date_of_birth: dateOfBirth || null,
              contract_signature_date: contractSignatureDate || null,
              marital_status: maritalStatus || null,
              contract_number: contractNumber || null,
              echelon: echelon || null,
              status: status || null,
              office_position: officePosition || null,
              city: city || null,
              created_date: createdDate || null,
              mad: mad || null,
              creation_location: creationLocation || null,
              district: district || null,
              postal_code: postalCode || null
            }, { onConflict: 'id' });

          if (profileError) {
            console.error('[Signup] app_users upsert failed:', profileError.message, profileError.details, profileError.hint);
            throw profileError;
          }

          setShowEmailVerification(true);
        }
      } else {
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        if (authData.user) {
          const { data: userData, error: fetchError } = await supabase
            .from('app_users')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (fetchError) throw fetchError;

          if (userData) {
            onLoginSuccess({
              id: userData.id,
              name: userData.name,
              email: userData.email,
              phone: userData.phone || '',
              birthDate: userData.birth_date || '',
              role: userData.role,
              profilePhoto: userData.profile_photo || '',
              status: userData.status || '',
              office_position: userData.office_position || '',
              contractNumber: userData.contract_number || '',
              echelon: userData.echelon || ''
            }, userData.role);
          }
        }
      }
    } catch (err: any) {
      console.error('[Auth] Error:', err.message, err);
      const errorMessage = err.message || getText('Une erreur est survenue', 'An error occurred', 'حدث خطأ');
      setError(translateError(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResetMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}`,
      });

      if (error) throw error;

      setResetMessage(
        getText(
          'Un email de réinitialisation a été envoyé à votre adresse',
          'A password reset email has been sent to your address',
          'تم إرسال بريد إلكتروني لإعادة تعيين كلمة المرور إلى عنوانك'
        )
      );

      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
        setResetMessage('');
      }, 3000);
    } catch (error: any) {
      setResetMessage(
        getText(
          `Erreur: ${translateError(error.message)}`,
          `Error: ${error.message}`,
          `خطأ: ${translateError(error.message)}`
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      setResetPasswordMessage(getText(
        'Les mots de passe ne correspondent pas',
        'Passwords do not match',
        'كلمات المرور غير متطابقة'
      ));
      return;
    }
    if (newPassword.length < 6) {
      setResetPasswordMessage(getText(
        'Le mot de passe doit contenir au moins 6 caracteres',
        'Password must be at least 6 characters',
        'يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل'
      ));
      return;
    }
    setLoading(true);
    setResetPasswordMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setResetPasswordMessage(getText(
        'Mot de passe modifie avec succes ! Vous pouvez maintenant vous connecter.',
        'Password updated successfully! You can now log in.',
        'تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.'
      ));
      setTimeout(() => {
        setShowResetPassword(false);
        setNewPassword('');
        setNewPasswordConfirm('');
        setResetPasswordMessage('');
        window.history.replaceState({}, '', window.location.pathname);
      }, 2500);
    } catch (err: any) {
      setResetPasswordMessage(getText(
        `Erreur: ${translateError(err.message)}`,
        `Error: ${err.message}`,
        `خطأ: ${translateError(err.message)}`
      ));
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = useMemo(() => ({
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0D3B54 0%, #0D4A6E 35%, #0A3D5C 65%, #0A3D5C 100%)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '30px 15px',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  }), [darkMode]);

  if (showEmailVerification) {
    return (
      <div style={containerStyle}>
        <div style={{
          background: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(20px)',
          borderRadius: '28px',
          padding: '50px 30px',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
          zIndex: 1,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>&#9993;</div>
          <h2 style={{ color: '#FFF', fontSize: '22px', marginBottom: '12px', fontWeight: '700' }}>
            {getText('Verifiez votre email', 'Verify your email', 'تحقق من بريدك الإلكتروني')}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px', lineHeight: '1.6', marginBottom: '8px' }}>
            {getText(
              'Un email de confirmation a ete envoye a :',
              'A confirmation email has been sent to:',
              'تم إرسال بريد تأكيد إلى:'
            )}
          </p>
          <p style={{ color: '#00D4FF', fontSize: '16px', fontWeight: '700', marginBottom: '20px', wordBreak: 'break-all' }}>
            {email}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '1.5', marginBottom: '30px' }}>
            {getText(
              'Cliquez sur le lien dans l\'email pour activer votre compte, puis revenez ici pour vous connecter.',
              'Click the link in the email to activate your account, then come back here to log in.',
              'انقر على الرابط في البريد الإلكتروني لتفعيل حسابك، ثم عد هنا لتسجيل الدخول.'
            )}
          </p>
          <button
            onClick={() => {
              setShowEmailVerification(false);
              setIsSignUp(false);
              setPassword('');
              setPasswordConfirm('');
            }}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #00D4FF, #0D4A6E)',
              color: '#FFF',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(0,212,255,0.3)',
            }}
          >
            {getText('Aller a la connexion', 'Go to login', 'الذهاب لتسجيل الدخول')}
          </button>
        </div>
      </div>
    );
  }

  if (showResetPassword) {
    return (
      <div style={containerStyle}>
        <div style={{
          background: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(20px)',
          borderRadius: '28px',
          padding: '40px 30px',
          maxWidth: '420px',
          width: '100%',
          zIndex: 1,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>&#128274;</div>
            <h2 style={{ color: '#FFF', fontSize: '22px', fontWeight: '700', margin: 0 }}>
              {getText('Nouveau mot de passe', 'New password', 'كلمة مرور جديدة')}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginTop: '8px' }}>
              {getText(
                'Choisissez un nouveau mot de passe pour votre compte',
                'Choose a new password for your account',
                'اختر كلمة مرور جديدة لحسابك'
              )}
            </p>
          </div>
          <form onSubmit={handleUpdatePassword}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                {getText('Nouveau mot de passe', 'New password', 'كلمة المرور الجديدة')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)', color: '#FFF',
                  fontSize: '15px', boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                {getText('Confirmer le mot de passe', 'Confirm password', 'تأكيد كلمة المرور')}
              </label>
              <input
                type="password"
                value={newPasswordConfirm}
                onChange={e => setNewPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)', color: '#FFF',
                  fontSize: '15px', boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
            {resetPasswordMessage && (
              <p style={{
                textAlign: 'center', fontSize: '14px', marginBottom: '16px',
                color: resetPasswordMessage.includes('succes') || resetPasswordMessage.includes('success') ? '#4CAF50' : '#FF6B6B',
                background: resetPasswordMessage.includes('succes') || resetPasswordMessage.includes('success') ? 'rgba(76,175,80,0.15)' : 'rgba(255,107,107,0.15)',
                padding: '10px', borderRadius: '10px',
              }}>
                {resetPasswordMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                border: 'none',
                background: loading ? '#666' : 'linear-gradient(135deg, #00D4FF, #0D4A6E)',
                color: '#FFF', fontSize: '16px', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 25px rgba(0,212,255,0.3)',
              }}
            >
              {loading
                ? getText('Modification...', 'Updating...', '...جاري التحديث')
                : getText('Modifier le mot de passe', 'Update password', 'تحديث كلمة المرور')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 15px',
        zIndex: 2,
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              style={{
                background: 'rgba(255,255,255,0.25)',
                backdropFilter: 'blur(10px)',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '25px',
                color: '#FFF',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '18px' }}>{'\u2190'}</span>
              {lang === 'fr' ? 'Accueil' : lang === 'en' ? 'Home' : '\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629'}
            </button>
          )}
          <button
            onClick={onLanguageChange}
            style={{
              background: 'rgba(255,255,255,0.25)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '25px',
              color: '#FFF',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
          >
            {lang === 'fr' ? 'EN' : lang === 'en' ? 'AR' : 'FR'}
          </button>
        </div>
        <button
          onClick={onDarkModeToggle}
          style={{
            background: 'rgba(255,255,255,0.25)',
            backdropFilter: 'blur(10px)',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '25px',
            color: '#FFF',
            cursor: 'pointer',
            fontSize: '20px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}
        >
          {darkMode ? '\u2600\uFE0F' : '\uD83C\uDF19'}
        </button>
      </div>

      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
        animation: 'fadeInDown 0.8s ease-out',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          width: '140px',
          height: '140px',
          margin: '0 auto 25px',
          position: 'relative',
          animation: 'float 3s ease-in-out infinite'
        }}>
          <div style={{
            position: 'absolute',
            inset: '-10px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(20px)'
          }}></div>

          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #00D4FF 0%, #0D4A6E 50%, #00B8D4 100%)',
            borderRadius: '35px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            transform: 'rotate(-8deg)'
          }}></div>

          <div style={{
            position: 'absolute',
            inset: '8px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            borderRadius: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(-8deg)',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <svg width="85" height="85" viewBox="0 0 120 120" fill="none">
              <defs>
                <linearGradient id="pipeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00D4FF"/>
                  <stop offset="50%" stopColor="#0D4A6E"/>
                  <stop offset="100%" stopColor="#00B8D4"/>
                </linearGradient>
                <linearGradient id="faucetGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#E8F7FF"/>
                  <stop offset="50%" stopColor="#00B8D4"/>
                  <stop offset="100%" stopColor="#0D4A6E"/>
                </linearGradient>
                <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.9"/>
                  <stop offset="100%" stopColor="#0088CC" stopOpacity="0.7"/>
                </linearGradient>
              </defs>

              <g transform="translate(60, 20)">
                <circle cx="0" cy="0" r="18" fill="url(#pipeGradient)" opacity="0.9"/>

                <rect x="-4" y="0" width="8" height="35" rx="2" fill="url(#faucetGradient)"/>

                <ellipse cx="0" cy="35" rx="12" ry="6" fill="url(#pipeGradient)"/>

                <path d="M-10 35 Q-12 40 -10 45 L10 45 Q12 40 10 35 Z" fill="url(#faucetGradient)"/>

                <rect x="-2" y="45" width="4" height="8" rx="2" fill="url(#pipeGradient)"/>
              </g>

              <g>
                <ellipse cx="60" cy="58" rx="2.5" ry="4" fill="url(#waterGradient)">
                  <animate attributeName="cy" values="58;75;75" dur="1.5s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="1;1;0" dur="1.5s" repeatCount="indefinite"/>
                </ellipse>

                <ellipse cx="55" cy="60" rx="2" ry="3.5" fill="url(#waterGradient)">
                  <animate attributeName="cy" values="60;78;78" dur="1.8s" repeatCount="indefinite" begin="0.3s"/>
                  <animate attributeName="opacity" values="1;1;0" dur="1.8s" repeatCount="indefinite" begin="0.3s"/>
                </ellipse>

                <ellipse cx="65" cy="61" rx="2" ry="3.5" fill="url(#waterGradient)">
                  <animate attributeName="cy" values="61;79;79" dur="1.6s" repeatCount="indefinite" begin="0.6s"/>
                  <animate attributeName="opacity" values="1;1;0" dur="1.6s" repeatCount="indefinite" begin="0.6s"/>
                </ellipse>
              </g>

              <g transform="translate(30, 75)">
                <path d="M0 5 L15 5 L15 0 L25 0 L25 20 L15 20 L15 15 L0 15 Z" fill="url(#pipeGradient)" opacity="0.8"/>
                <circle cx="25" cy="10" r="8" fill="url(#pipeGradient)"/>
                <circle cx="25" cy="10" r="5" fill="#0D4A6E" opacity="0.3"/>
              </g>

              <g transform="translate(65, 75)">
                <path d="M0 0 L10 0 L10 5 L25 5 L25 15 L10 15 L10 20 L0 20 Z" fill="url(#pipeGradient)" opacity="0.8"/>
                <circle cx="0" cy="10" r="8" fill="url(#pipeGradient)"/>
                <circle cx="0" cy="10" r="5" fill="#0D4A6E" opacity="0.3"/>
              </g>

              <circle cx="60" cy="85" r="3" fill="url(#waterGradient)" opacity="0.5">
                <animate attributeName="r" values="3;8;3" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/>
              </circle>
            </svg>
          </div>
        </div>

        <h1
          style={{
            fontSize: '38px',
            fontWeight: '800',
            color: '#FFF',
            margin: '0 0 10px',
            textShadow: '0 4px 20px rgba(0,0,0,0.4)',
            letterSpacing: '2px'
          }}>
          TSD et Fils
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.95)',
          fontSize: '15px',
          textAlign: 'center',
          margin: '0',
          fontWeight: '500',
          textShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}>
          {t.slogan}
        </p>
      </div>

      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: darkMode
          ? 'rgba(255,255,255,0.1)'
          : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '25px',
        padding: '35px 30px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        animation: 'fadeInUp 0.8s ease-out',
        position: 'relative',
        zIndex: 1,
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: darkMode ? '#FFF' : '#2C3E50',
          textAlign: 'center',
          margin: '0 0 25px'
        }}>
          {isSignUp
            ? getText('Créer un compte', 'Create account', 'إنشاء حساب')
            : getText('Connexion', 'Login', 'تسجيل الدخول')}
        </h2>

        <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {isSignUp && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: darkMode ? '#FFF' : '#2C3E50',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {getText('Nom complet', 'Full name', 'الاسم الكامل')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                  background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#00D4FF'}
                onBlur={(e) => e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
              />
            </div>
          )}

          {isSignUp && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: darkMode ? '#FFF' : '#2C3E50',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {getText('Numéro de téléphone *', 'Phone number *', 'رقم الهاتف *')}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+224 XXX XXX XXX"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                  background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#00D4FF'}
                onBlur={(e) => e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
              />
            </div>
          )}

          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: darkMode ? '#FFF' : '#2C3E50',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                color: darkMode ? '#FFF' : '#2C3E50',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#4ECDC4'}
              onBlur={(e) => e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: darkMode ? '#FFF' : '#2C3E50',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              {getText('Mot de passe', 'Password', 'كلمة المرور')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                style={{
                  width: '100%',
                  padding: '14px',
                  paddingRight: '50px',
                  borderRadius: '12px',
                  border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                  background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#00D4FF'}
                onBlur={(e) => e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={darkMode ? '#FFF' : '#2C3E50'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {showPassword ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {!isSignUp && (
            <div style={{
              textAlign: 'right',
              marginTop: '-10px'
            }}>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#00D4FF',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {getText('Mot de passe oublié ?', 'Forgot password?', 'نسيت كلمة المرور؟')}
              </button>
            </div>
          )}

          {isSignUp && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: darkMode ? '#FFF' : '#2C3E50',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {getText('Confirmer le mot de passe', 'Confirm Password', 'تأكيد كلمة المرور')}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPasswordConfirm ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                    minLength={6}
                  style={{
                    width: '100%',
                    padding: '14px',
                    paddingRight: '50px',
                    borderRadius: '12px',
                    border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                    background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                    color: darkMode ? '#FFF' : '#2C3E50',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#4ECDC4'}
                  onBlur={(e) => e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={darkMode ? '#FFF' : '#2C3E50'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {showPasswordConfirm ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>
          )}

          {isSignUp && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: darkMode ? '#FFF' : '#2C3E50',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {getText('Rôle', 'Role', 'الدور')}
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                  background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '15px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="client" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                  {getText('Client', 'Client', 'عميل')}
                </option>
                <option value="tech" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                  {getText('Technicien', 'Technician', 'فني')}
                </option>
                <option value="office" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                  {getText('Membre de bureau', 'Office Member', 'عضو مكتب')}
                </option>
                <option value="admin" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                  {getText('Administrateur', 'Administrator', 'مسؤول')}
                </option>
              </select>
            </div>
          )}

          {isSignUp && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: role === 'admin' ? '1fr' : '1fr 1fr', gap: '18px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: darkMode ? '#FFF' : '#2C3E50',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {getText('Date de naissance *', 'Date of birth *', 'تاريخ الميلاد *')}
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                      background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                      color: darkMode ? '#FFF' : '#2C3E50',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border-color 0.3s'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#00D4FF'}
                    onBlur={(e) => e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
                  />
                </div>

                {role !== 'admin' && (
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: darkMode ? '#FFF' : '#2C3E50',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {getText('Date de signature du contrat *', 'Contract signature date *', 'تاريخ توقيع العقد *')}
                    </label>
                    <input
                      type="date"
                      value={contractSignatureDate}
                      onChange={(e) => setContractSignatureDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '12px',
                        border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                        background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                        color: darkMode ? '#FFF' : '#2C3E50',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'border-color 0.3s'
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#00D4FF'}
                      onBlur={(e) => e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
                    />
                  </div>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {getText('État civil *', 'Marital status *', 'الحالة المدنية *')}
                </label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                    style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                    background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                    color: darkMode ? '#FFF' : '#2C3E50',
                    fontSize: '15px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Célibataire" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                    {getText('Célibataire', 'Single', 'أعزب')}
                  </option>
                  <option value="Marié(e)" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                    {getText('Marié(e)', 'Married', 'متزوج')}
                  </option>
                  <option value="Divorcé(e)" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                    {getText('Divorcé(e)', 'Divorced', 'مطلق')}
                  </option>
                  <option value="Veuf(ve)" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                    {getText('Veuf(ve)', 'Widowed', 'أرمل')}
                  </option>
                </select>
              </div>
            </>
          )}

          {isSignUp && role === 'client' && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: darkMode ? '#FFF' : '#2C3E50',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {getText('Ville de résidence *', 'City of residence *', 'مدينة الإقامة *')}
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder=""
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                  background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#00D4FF'}
                onBlur={(e) => e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
              />
            </div>
          )}

          {isSignUp && role === 'client' && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: darkMode ? '#FFF' : '#2C3E50',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {getText('Numéro de contrat *', 'Contract Number *', 'رقم العقد *')}
              </label>
              <input
                type="text"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value.toUpperCase())}
                placeholder=""
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                  background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#00D4FF'}
                onBlur={(e) => e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
              />
            </div>
          )}

          {isSignUp && role === 'tech' && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: darkMode ? '#FFF' : '#2C3E50',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {getText('Numéro de contrat *', 'Contract Number *', 'رقم العقد *')}
              </label>
              <input
                type="text"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value.toUpperCase())}
                placeholder=""
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                  background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#00D4FF'}
                onBlur={(e) => e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
              />
            </div>
          )}

          {isSignUp && role === 'tech' && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: darkMode ? '#FFF' : '#2C3E50',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {getText('Échelon *', 'Rank *', 'الرتبة *')}
              </label>
              <select
                value={echelon}
                onChange={(e) => setEchelon(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                  background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '15px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                  {getText('Sélectionner un échelon', 'Select a rank', 'اختر رتبة')}
                </option>
                <option value="Apprenti" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                  {getText('Apprenti', 'Apprentice', 'متدرب')}
                </option>
                <option value="Manœuvre" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                  {getText('Manœuvre', 'Laborer', 'عامل')}
                </option>
                <option value="Manœuvre Spécialisé" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                  {getText('Manœuvre Spécialisé', 'Specialized Laborer', 'عامل متخصص')}
                </option>
                <option value="Manœuvre Spécialisé d'Élite" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                  {getText('Manœuvre Spécialisé d\'Élite', 'Elite Specialized Laborer', 'عامل متخصص متميز')}
                </option>
                <option value="Chef d'équipe A" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                  {getText('Chef d\'équipe A', 'Team Leader A', 'قائد فريق A')}
                </option>
                <option value="Chef d'équipe B" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                  {getText('Chef d\'équipe B', 'Team Leader B', 'قائد فريق B')}
                </option>
                <option value="Qualifié 1er Échelon" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                  {getText('Qualifié 1er Échelon', 'Qualified 1st Rank', 'مؤهل رتبة أولى')}
                </option>
                <option value="Qualifié 2e Échelon" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                  {getText('Qualifié 2e Échelon', 'Qualified 2nd Rank', 'مؤهل رتبة ثانية')}
                </option>
                <option value="Contremaître" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                  {getText('Contremaître', 'Foreman', 'رئيس العمال')}
                </option>
              </select>
            </div>
          )}

          {isSignUp && role === 'office' && (
            <>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {getText('Poste *', 'Position *', 'المنصب *')}
                </label>
                <select
                  value={officePosition}
                  onChange={(e) => {
                    const pos = e.target.value;
                    const access = pos ? (officeAccessMap[pos]?.[lang === 'ar' ? 'ar' : lang === 'en' ? 'en' : 'fr'] || '') : '';
                    setOfficePosition(pos);
                    setStatus(access);
                  }}
                    style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                    background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                    color: darkMode ? '#FFF' : '#2C3E50',
                    fontSize: '15px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                    {getText('Sélectionner un poste', 'Select a position', 'اختر منصب')}
                  </option>
                  <option value="Directeur" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                    {getText('Directeur', 'Director', 'مدير')}
                  </option>
                  <option value="Responsable administratif & financier" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                    {getText('Responsable administratif & financier', 'Administrative & Financial Manager', 'مدير إداري ومالي')}
                  </option>
                  <option value="Responsable RH" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                    {getText('Responsable RH', 'HR Manager', 'مدير الموارد البشرية')}
                  </option>
                  <option value="Secrétaire / Assistante administrative" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                    {getText('Secrétaire / Assistante administrative', 'Secretary / Administrative Assistant', 'سكرتير / مساعد إداري')}
                  </option>
                  <option value="Comptable (interne ou externe)" style={{ background: darkMode ? '#2C3E50' : '#FFF' }}>
                    {getText('Comptable (interne ou externe)', 'Accountant (internal or external)', 'محاسب (داخلي أو خارجي)')}
                  </option>
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {getText('Accès', 'Access', 'الوصول')}
                </label>
                <div style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                  background: darkMode ? 'rgba(0,0,0,0.2)' : '#F3F4F6',
                  color: status ? (darkMode ? '#FFF' : '#2C3E50') : (darkMode ? '#666' : '#999'),
                  fontSize: '14px',
                  fontStyle: status ? 'normal' : 'italic',
                  minHeight: '20px'
                }}>
                  {status || getText('Sélectionnez un poste pour voir les accès', 'Select a position to see access', 'اختر منصبًا لرؤية الوصول')}
                </div>
              </div>
            </>
          )}

          {isSignUp && role === 'admin' && (
            <>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {getText('Date de création *', 'Creation date *', 'تاريخ الإنشاء *')}
                </label>
                <input
                  type="date"
                  value={createdDate}
                  onChange={(e) => setCreatedDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                    background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                    color: darkMode ? '#FFF' : '#2C3E50',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#00D4FF'}
                  onBlur={(e) => e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {getText('MAD *', 'MAD *', 'MAD *')}
                </label>
                <input
                  type="text"
                  value={mad}
                  onChange={(e) => setMad(e.target.value)}
                  placeholder=""
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                    background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                    color: darkMode ? '#FFF' : '#2C3E50',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#00D4FF'}
                  onBlur={(e) => e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {getText('Lieu de création *', 'Creation location *', 'مكان الإنشاء *')}
                </label>
                <input
                  type="text"
                  value={creationLocation}
                  onChange={(e) => setCreationLocation(e.target.value)}
                  placeholder=""
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                    background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                    color: darkMode ? '#FFF' : '#2C3E50',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#00D4FF'}
                  onBlur={(e) => e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {getText('Quartier *', 'District *', 'الحي *')}
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder=""
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                    background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                    color: darkMode ? '#FFF' : '#2C3E50',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#00D4FF'}
                  onBlur={(e) => e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {getText('Code postal *', 'Postal code *', 'الرمز البريدي *')}
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder=""
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                    background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                    color: darkMode ? '#FFF' : '#2C3E50',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#00D4FF'}
                  onBlur={(e) => e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
                />
              </div>
            </>
          )}

          {error && (
            <div style={{
              padding: '12px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading
                ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
                : 'linear-gradient(135deg, #00D4FF 0%, #0D4A6E 100%)',
              color: '#FFF',
              border: 'none',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(0,212,255,0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              marginTop: '10px'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,212,255,0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,212,255,0.3)';
            }}
          >
            {loading
              ? getText('Chargement...', 'Loading...', 'جاري التحميل...')
              : isSignUp
                ? getText("S'inscrire", 'Sign up', 'التسجيل')
                : getText('Se connecter', 'Login', 'تسجيل الدخول')}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '20px'
        }}>
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#00D4FF',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isSignUp
              ? getText('Déjà un compte ? Se connecter', 'Already have an account? Login', 'هل لديك حساب؟ تسجيل الدخول')
              : getText('Pas de compte ? S\'inscrire', 'No account? Sign up', 'ليس لديك حساب؟ التسجيل')}
          </button>
        </div>
      </div>

      <div style={{
        textAlign: 'center',
        marginTop: '30px',
        animation: 'fadeInUp 0.8s ease-out'
      }}>
        <div style={{
          background: darkMode
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(255,255,255,0.3)',
          backdropFilter: 'blur(10px)',
          display: 'inline-block',
          padding: '12px 25px',
          borderRadius: '20px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
        }}>
          <p style={{
            color: '#FFF',
            margin: '0 0 5px',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            📞 <a href="tel:+224610553255" style={{
              color: '#FFF',
              textDecoration: 'none'
            }}>+224 610 55 32 55</a>
          </p>
          <p style={{
            color: 'rgba(255,255,255,0.9)',
            margin: 0,
            fontSize: '13px'
          }}>
            ✉️ <a href="mailto:contact@tsdetfils.com" style={{
              color: 'rgba(255,255,255,0.9)',
              textDecoration: 'none'
            }}>contact@tsdetfils.com</a>
          </p>
        </div>
      </div>

      {showForgotPassword && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 2000
        }}>
          <div style={{
            background: darkMode
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '30px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{
              margin: '0 0 10px',
              color: darkMode ? '#FFF' : '#2C3E50',
              fontSize: '20px',
              fontWeight: '700'
            }}>
              {getText('Réinitialiser le mot de passe', 'Reset Password', 'إعادة تعيين كلمة المرور')}
            </h3>
            <p style={{
              margin: '0 0 20px',
              color: darkMode ? 'rgba(255,255,255,0.7)' : '#666',
              fontSize: '14px'
            }}>
              {getText(
                'Entrez votre email pour recevoir un lien de réinitialisation',
                'Enter your email to receive a reset link',
                'أدخل بريدك الإلكتروني لتلقي رابط إعادة التعيين'
              )}
            </p>

            <form noValidate onSubmit={handleForgotPassword}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                    background: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                    color: darkMode ? '#FFF' : '#2C3E50',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#4ECDC4'}
                  onBlur={(e) => e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
                />
              </div>

              {resetMessage && (
                <div style={{
                  padding: '10px',
                  borderRadius: '8px',
                  marginBottom: '15px',
                  background: resetMessage.includes('Erreur') || resetMessage.includes('Error')
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(76, 175, 80, 0.1)',
                  border: `1px solid ${resetMessage.includes('Erreur') || resetMessage.includes('Error')
                    ? 'rgba(239, 68, 68, 0.3)'
                    : 'rgba(76, 175, 80, 0.3)'}`,
                  color: resetMessage.includes('Erreur') || resetMessage.includes('Error')
                    ? '#EF4444'
                    : '#4CAF50',
                  fontSize: '13px',
                  textAlign: 'center'
                }}>
                  {resetMessage}
                </div>
              )}

              <div style={{
                display: 'flex',
                gap: '10px'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                    setResetMessage('');
                  }}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: darkMode ? '2px solid rgba(255,255,255,0.2)' : '2px solid #E0E0E0',
                    background: 'transparent',
                    color: darkMode ? '#FFF' : '#2C3E50',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {getText('Annuler', 'Cancel', 'إلغاء')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: loading
                      ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
                      : 'linear-gradient(135deg, #00D4FF 0%, #0D4A6E 100%)',
                    color: '#FFF',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 15px rgba(0,212,255,0.3)'
                  }}
                >
                  {loading
                    ? getText('Envoi...', 'Sending...', 'جاري الإرسال...')
                    : getText('Envoyer', 'Send', 'إرسال')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default LoginScreen;
