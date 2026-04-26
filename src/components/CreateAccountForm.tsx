import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface CreateAccountFormProps {
  onClose: () => void;
  onSuccess: () => void;
  darkMode: boolean;
  colors: any;
  lang: string;
}

const officeAccessMap: Record<string, { fr: string; en: string }> = {
  'Directeur': { fr: 'Supervise toute l\'entreprise', en: 'Oversees the entire company' },
  'Responsable administratif & financier': { fr: 'Gestion du budget, facturation, fournisseurs', en: 'Budget management, invoicing, suppliers' },
  'Responsable RH': { fr: 'Recrutement, contrats, absences, paie', en: 'Recruitment, contracts, absences, payroll' },
  'Secrétaire / Assistante administrative': { fr: 'Accueil clients, devis, planning des équipes', en: 'Client reception, quotes, team scheduling' },
  'Comptable (interne ou externe)': { fr: 'Comptabilité, déclarations, bilans', en: 'Accounting, declarations, balance sheets' },
};

const CreateAccountForm = ({ onClose, onSuccess, darkMode, colors, lang }: CreateAccountFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'client',
    contract_number: '',
    echelon: '',
    status: '',
    office_position: '',
    date_of_birth: '',
    contract_signature_date: '',
    marital_status: 'Célibataire',
    city: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');


  const t = lang === 'fr' ? {
    title: 'Créer un Compte',
    name: 'Nom complet',
    email: 'Email',
    password: 'Mot de passe',
    phone: 'Téléphone',
    role: 'Rôle',
    client: 'Client',
    tech: 'Technicien',
    office: 'Membre de bureau',
    admin: 'Administrateur',
    contractNumber: 'Numéro de contrat',
    echelon: 'Échelon',
    selectEchelon: 'Sélectionner un échelon',
    manoeuvre: 'Manœuvre',
    manoeuvreSpecialise: 'Manœuvre Spécialisé',
    manoeuvreElite: 'Manœuvre Spécialisé d\'Élite',
    qualifie1: 'Qualifié 1er Échelon',
    qualifie2: 'Qualifié 2e Échelon',
    apprenti: 'Apprenti',
    chefEquipeA: 'Chef d\'équipe A',
    chefEquipeB: 'Chef d\'équipe B',
    contremaitre: 'Contremaître',
    directeur: 'Directeur',
    responsableAdminFinancier: 'Responsable administratif & financier',
    responsableRH: 'Responsable RH',
    secretaireAssistante: 'Secrétaire / Assistante administrative',
    comptableInterneExterne: 'Comptable (interne ou externe)',
    status: 'Statut Bureau',
    selectStatus: 'Sélectionner un poste',
    position: 'Statut',
    dateOfBirth: 'Date de naissance',
    contractDate: 'Date de signature du contrat',
    maritalStatus: 'État civil',
    single: 'Célibataire',
    married: 'Marié(e)',
    divorced: 'Divorcé(e)',
    widowed: 'Veuf(ve)',
    city: 'Ville de résidence',
    create: 'Créer le compte',
    cancel: 'Annuler',
    creating: 'Création...',
    success: 'Compte créé avec succès',
    error: 'Erreur lors de la création',
    required: 'Champs obligatoires'
  } : {
    title: 'Create Account',
    name: 'Full name',
    email: 'Email',
    password: 'Password',
    phone: 'Phone',
    role: 'Role',
    client: 'Client',
    tech: 'Technician',
    office: 'Office Member',
    admin: 'Administrator',
    contractNumber: 'Contract number',
    echelon: 'Rank',
    selectEchelon: 'Select a rank',
    manoeuvre: 'Laborer',
    manoeuvreSpecialise: 'Specialized Laborer',
    manoeuvreElite: 'Elite Specialized Laborer',
    qualifie1: 'Qualified 1st Rank',
    qualifie2: 'Qualified 2nd Rank',
    apprenti: 'Apprentice',
    chefEquipeA: 'Team Leader A',
    chefEquipeB: 'Team Leader B',
    contremaitre: 'Foreman',
    directeur: 'Director',
    responsableAdminFinancier: 'Administrative & Financial Manager',
    responsableRH: 'HR Manager',
    secretaireAssistante: 'Secretary / Administrative Assistant',
    comptableInterneExterne: 'Accountant (internal or external)',
    status: 'Office Status',
    selectStatus: 'Select a position',
    position: 'Status',
    dateOfBirth: 'Date of birth',
    contractDate: 'Contract signature date',
    maritalStatus: 'Marital status',
    single: 'Single',
    married: 'Married',
    divorced: 'Divorced',
    widowed: 'Widowed',
    city: 'City of residence',
    create: 'Create account',
    cancel: 'Cancel',
    creating: 'Creating...',
    success: 'Account created successfully',
    error: 'Error creating account',
    required: 'Required fields'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`,
    background: darkMode ? '#2a2a3e' : '#FFF',
    color: darkMode ? '#FFF' : '#2C3E50',
    fontSize: '14px',
    boxSizing: 'border-box' as const
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '5px',
    fontSize: '14px',
    fontWeight: '600' as const,
    color: darkMode ? '#FFF' : '#2C3E50'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const needsContractDate = formData.role !== 'admin';
    if (!formData.name || !formData.email || !formData.password || !formData.date_of_birth || !formData.marital_status || (needsContractDate && !formData.contract_signature_date)) {
      setMessage(t.required);
      return;
    }

    if (formData.role === 'client' && !formData.city.trim()) {
      setMessage(lang === 'fr' ? 'La ville de résidence est obligatoire pour les clients' : 'City of residence is required for clients');
      return;
    }

    if (formData.role === 'tech' && !formData.echelon) {
      setMessage(lang === 'fr' ? 'L\'échelon est obligatoire pour les techniciens' : 'Rank is required for technicians');
      return;
    }

    if (formData.role === 'office' && !formData.office_position) {
      setMessage(lang === 'fr' ? 'Le poste est obligatoire pour les employés de bureau' : 'Position is required for office employees');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}`,
          data: {
            name: formData.name,
            role: formData.role,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('app_users')
          .upsert({
            id: authData.user.id,
            email: formData.email,
            name: formData.name,
            phone: formData.phone,
            role: formData.role,
            contract_number: formData.contract_number || null,
            echelon: formData.echelon || null,
            status: formData.status || null,
            office_position: formData.office_position || null,
            date_of_birth: formData.date_of_birth,
            contract_signature_date: formData.contract_signature_date,
            marital_status: formData.marital_status,
            city: formData.city || null,
            contract_date: formData.contract_signature_date || new Date().toISOString().split('T')[0]
          }, { onConflict: 'id' });

        if (profileError) {
          console.error('[CreateAccount] app_users upsert failed:', profileError.message, profileError.details, profileError.hint);
          throw profileError;
        }

        const emailMsg = lang === 'fr'
          ? 'Compte cree ! Un email de verification a ete envoye.'
          : 'Account created! A verification email has been sent.';
        setMessage(emailMsg);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2500);
      }
    } catch (error: any) {
      setMessage(`${t.error}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 1000,
      overflow: 'auto',
    }}>
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'url(/tsd.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.1,
        zIndex: 0,
      }} />
      <div style={{
        background: darkMode ? '#1a1a2e' : '#FFF',
        borderRadius: '16px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          background: darkMode ? '#1a1a2e' : '#FFF',
          zIndex: 1
        }}>
          <h2 style={{
            margin: 0,
            color: darkMode ? '#FFF' : '#2C3E50',
            fontSize: '20px'
          }}>
            {t.title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: darkMode ? '#FFF' : '#2C3E50'
            }}
          >
            ×
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {message && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '15px',
              background: message.includes(t.error) || message.includes(t.required) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(76, 175, 80, 0.1)',
              color: message.includes(t.error) || message.includes(t.required) ? '#ef4444' : '#4caf50',
              fontSize: '14px'
            }}>
              {message}
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>{t.name} *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={labelStyle}>{t.email} *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                style={inputStyle}
                />
            </div>
            <div>
              <label style={labelStyle}>{t.password} *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                style={inputStyle}
                  minLength={6}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={labelStyle}>{t.phone}</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t.role} *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value, echelon: '', status: '', office_position: '', contract_number: '', city: '' }))}
                style={inputStyle}
                >
                <option value="client">{t.client}</option>
                <option value="tech">{t.tech}</option>
                <option value="office">{t.office}</option>
                <option value="admin">{t.admin}</option>
              </select>
            </div>
          </div>

          {formData.role === 'tech' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={labelStyle}>{t.contractNumber}</label>
                <input
                  type="text"
                  value={formData.contract_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, contract_number: e.target.value }))}
                  style={inputStyle}
                  placeholder=""
                />
              </div>
              <div>
                <label style={labelStyle}>{t.echelon} *</label>
                <select
                  value={formData.echelon}
                  onChange={(e) => setFormData(prev => ({ ...prev, echelon: e.target.value }))}
                  style={inputStyle}
                    >
                  <option value="">{t.selectEchelon}</option>
                  <option value="Apprenti">{t.apprenti}</option>
                  <option value="Manœuvre">{t.manoeuvre}</option>
                  <option value="Manœuvre Spécialisé">{t.manoeuvreSpecialise}</option>
                  <option value="Manœuvre Spécialisé d'Élite">{t.manoeuvreElite}</option>
                  <option value="Chef d'équipe A">{t.chefEquipeA}</option>
                  <option value="Chef d'équipe B">{t.chefEquipeB}</option>
                  <option value="Qualifié 1er Échelon">{t.qualifie1}</option>
                  <option value="Qualifié 2e Échelon">{t.qualifie2}</option>
                  <option value="Contremaître">{t.contremaitre}</option>
                </select>
              </div>
            </div>
          )}

          {formData.role === 'office' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={labelStyle}>{t.contractNumber}</label>
                <input
                  type="text"
                  value={formData.contract_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, contract_number: e.target.value }))}
                  style={inputStyle}
                  placeholder=""
                />
              </div>
              <div>
                <label style={labelStyle}>{t.position} *</label>
                <select
                  value={formData.office_position}
                  onChange={(e) => {
                    const pos = e.target.value;
                    const access = pos ? (officeAccessMap[pos]?.[lang === 'fr' ? 'fr' : 'en'] || '') : '';
                    setFormData(prev => ({ ...prev, office_position: pos, status: access }));
                  }}
                  style={inputStyle}
                    >
                  <option value="">{t.selectStatus}</option>
                  <option value="Directeur">{t.directeur}</option>
                  <option value="Responsable administratif & financier">{t.responsableAdminFinancier}</option>
                  <option value="Responsable RH">{t.responsableRH}</option>
                  <option value="Secrétaire / Assistante administrative">{t.secretaireAssistante}</option>
                  <option value="Comptable (interne ou externe)">{t.comptableInterneExterne}</option>
                </select>
              </div>
            </div>
          )}

          {formData.role === 'office' && (
            <div style={{ marginBottom: '15px' }}>
              <label style={labelStyle}>{lang === 'fr' ? 'Acces' : 'Access'}</label>
              <div style={{
                padding: '12px 14px',
                borderRadius: '8px',
                border: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`,
                background: darkMode ? '#1a1a2e' : '#F3F4F6',
                color: formData.status ? (darkMode ? '#FFF' : '#2C3E50') : (darkMode ? '#666' : '#999'),
                fontSize: '14px',
                fontStyle: formData.status ? 'normal' : 'italic',
                minHeight: '20px'
              }}>
                {formData.status || (lang === 'fr' ? 'Selectionnez un statut pour voir les acces' : 'Select a status to see access')}
              </div>
            </div>
          )}

          {formData.role === 'client' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={labelStyle}>{t.city} *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  style={inputStyle}
                  placeholder=""
                    />
              </div>
              <div>
                <label style={labelStyle}>{t.contractNumber}</label>
                <input
                  type="text"
                  value={formData.contract_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, contract_number: e.target.value }))}
                  style={inputStyle}
                  placeholder=""
                />
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: formData.role === 'admin' ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={labelStyle}>{t.dateOfBirth} *</label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                style={inputStyle}
                />
            </div>
            {formData.role !== 'admin' && (
              <div>
                <label style={labelStyle}>{t.contractDate} *</label>
                <input
                  type="date"
                  value={formData.contract_signature_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, contract_signature_date: e.target.value }))}
                  style={inputStyle}
                  />
              </div>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>{t.maritalStatus} *</label>
            <select
              value={formData.marital_status}
              onChange={(e) => setFormData(prev => ({ ...prev, marital_status: e.target.value }))}
              style={inputStyle}
            >
              <option value="Célibataire">{t.single}</option>
              <option value="Marié(e)">{t.married}</option>
              <option value="Divorcé(e)">{t.divorced}</option>
              <option value="Veuf(ve)">{t.widowed}</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: `2px solid ${darkMode ? '#333' : '#E0E0E0'}`,
                background: 'transparent',
                color: darkMode ? '#FFF' : '#2C3E50',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: loading ? '#999' : colors.primary,
                color: '#FFF',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? t.creating : t.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAccountForm;
