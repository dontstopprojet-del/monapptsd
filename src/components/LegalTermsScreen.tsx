import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface LegalTermsScreenProps {
  userId: string;
  onAccepted: () => void;
  colors: any;
  lang: string;
}

export default function LegalTermsScreen({ userId, onAccepted, colors, lang }: LegalTermsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const t = lang === 'fr' ? {
    title: 'Mentions Légales et Conditions',
    loading: 'Chargement...',
    alertMessage: 'Vous devez approuver les mentions légales pour continuer',
    readWarning: 'Veuillez lire attentivement avant de signer',
    confirmText: "J'ai lu et compris les mentions légales ci-dessus",
    approve: "J'approuve",
    disapprove: "Je N'approuve Pas",
    paymentTitle: 'Conditions de Paiement',
    paymentItems: [
      '<strong>Pas de commission</strong> sur les prestations',
      '<strong>60% du salaire</strong> sera versé le <strong>20 de chaque mois</strong>',
      '<strong>40% restant (solde)</strong> sera versé au plus tard le <strong>08 du mois suivant</strong>',
      '<strong>Prime de performance</strong> selon la satisfaction client',
      '<strong>Bonus spécial</strong> pour les clients satisfaits (5 étoiles) ⭐⭐⭐⭐⭐',
      '<strong>Indemnités de déplacement</strong> incluses'
    ],
    obligationsTitle: 'Obligations du Technicien',
    obligationsItems: [
      'Activer le GPS en début de journée',
      'Documenter les chantiers (photos avant/pendant/après)',
      'Respecter les horaires et pauses réglementaires',
      'Maintenir un haut niveau de qualité de service',
      "Communiquer régulièrement sur l'avancement des travaux"
    ],
    workTimeTitle: 'Temps de Travail',
    workTimeItems: [
      '<strong>Lundi à Jeudi</strong> : Pause maximum de 30 minutes (GPS désactivé)',
      '<strong>Vendredi</strong> : Pause maximum de 1H30 (GPS reste actif)',
      'Utilisation du bouton "Début de journée" obligatoire',
      'Utilisation du bouton "Fin de journée" obligatoire'
    ],
    latePaymentTitle: 'Pénalités de Retard de Paiement',
    latePaymentItems: [
      '<strong>2% de pénalité</strong> appliqués automatiquement dès le <strong>lendemain de la date d\'échéance</strong>',
      '<strong>5% supplémentaire</strong> pour <strong>chaque semaine de retard</strong> au-delà de la première semaine',
      'Les pénalités sont calculées sur le montant total de la facture',
      'Exemple : Facture de 10 000 000 GNF échue le 21/02 → Le 22/02 : +2% (200 000 GNF) → Après 1 semaine : +5% (500 000 GNF) supplémentaire',
      'Les pénalités sont <strong>cumulatives</strong> et <strong>non négociables</strong>',
    ],
    dataProtectionTitle: 'Protection des Données',
    dataProtectionText: 'Les données de localisation GPS sont utilisées uniquement à des fins de gestion opérationnelle et de sécurité. Elles sont partagées avec l\'administration pour optimiser les interventions.',
    terminationTitle: 'Résiliation',
    terminationText: 'Les deux parties peuvent résilier le contrat avec un préavis de 30 jours. Les paiements en cours seront honorés selon le calendrier établi.'
  } : {
    title: 'Legal Terms and Conditions',
    loading: 'Loading...',
    alertMessage: 'You must approve the legal terms to continue',
    readWarning: 'Please read carefully before signing',
    confirmText: 'I have read and understood the above legal terms',
    approve: 'I Approve',
    disapprove: 'I Do Not Approve',
    paymentTitle: 'Payment Terms',
    paymentItems: [
      '<strong>No commission</strong> on services',
      '<strong>60% of salary</strong> will be paid on the <strong>20th of each month</strong>',
      '<strong>Remaining 40% (balance)</strong> will be paid by the <strong>8th of the following month</strong>',
      '<strong>Performance bonus</strong> based on customer satisfaction',
      '<strong>Special bonus</strong> for satisfied customers (5 stars) ⭐⭐⭐⭐⭐',
      '<strong>Travel allowances</strong> included'
    ],
    obligationsTitle: 'Technician Obligations',
    obligationsItems: [
      'Enable GPS at the start of the day',
      'Document work sites (before/during/after photos)',
      'Respect schedules and regulatory breaks',
      'Maintain a high level of service quality',
      'Communicate regularly on work progress'
    ],
    workTimeTitle: 'Working Hours',
    workTimeItems: [
      '<strong>Monday to Thursday</strong>: Maximum 30-minute break (GPS disabled)',
      '<strong>Friday</strong>: Maximum 1H30 break (GPS remains active)',
      'Use of "Start of day" button is mandatory',
      'Use of "End of day" button is mandatory'
    ],
    latePaymentTitle: 'Late Payment Penalties',
    latePaymentItems: [
      '<strong>2% penalty</strong> applied automatically from the <strong>day after the due date</strong>',
      '<strong>5% additional</strong> for <strong>each week of delay</strong> beyond the first week',
      'Penalties are calculated on the total invoice amount',
      'Example: Invoice of 10,000,000 GNF due on 02/21 → 02/22: +2% (200,000 GNF) → After 1 week: +5% (500,000 GNF) additional',
      'Penalties are <strong>cumulative</strong> and <strong>non-negotiable</strong>',
    ],
    dataProtectionTitle: 'Data Protection',
    dataProtectionText: 'GPS location data is used solely for operational management and security purposes. It is shared with administration to optimize interventions.',
    terminationTitle: 'Termination',
    terminationText: 'Both parties may terminate the contract with 30 days\' notice. Pending payments will be honored according to the established schedule.'
  };

  useEffect(() => {
    checkAcceptance();
  }, [userId]);

  const checkAcceptance = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_terms_acceptance')
        .select('accepted')
        .eq('user_id', userId)
        .eq('terms_version', '1.0')
        .maybeSingle();

      if (error) {
        console.error('[LegalTerms] Check failed:', error.code, error.message, error.details, error.hint);
      }

      if (!error && data?.accepted) {
        onAccepted();
      }
    } catch (err) {
      console.error('[LegalTerms] Check exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (approved: boolean) => {
    if (!approved) {
      alert(t.alertMessage);
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const { error } = await supabase
        .from('legal_terms_acceptance')
        .upsert({
          user_id: userId,
          accepted: true,
          accepted_at: new Date().toISOString(),
          terms_version: '1.0'
        }, { onConflict: 'user_id,terms_version' });

      if (error) {
        console.error('[LegalTerms] Save failed:', error.code, error.message, error.details, error.hint);
        setSaveError(lang === 'fr'
          ? `Erreur de sauvegarde: ${error.message}. Veuillez reessayer.`
          : `Save error: ${error.message}. Please retry.`);
        setSaving(false);
        return;
      }

      console.log('[LegalTerms] Acceptance saved successfully for user', userId);
      onAccepted();
    } catch (err: any) {
      console.error('[LegalTerms] Save exception:', err);
      setSaveError(lang === 'fr'
        ? `Erreur inattendue: ${err.message}. Veuillez reessayer.`
        : `Unexpected error: ${err.message}. Please retry.`);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>{t.loading}</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
      padding: '20px'
    }}>
      <div style={{
        background: '#FFF',
        borderRadius: '20px',
        padding: '25px',
        maxWidth: '600px',
        margin: '0 auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: colors.primary, marginBottom: '20px', textAlign: 'center' }}>
          {t.title}
        </h2>

        <div style={{
          background: colors.background,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '25px',
          maxHeight: '400px',
          overflowY: 'auto',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          <h3 style={{ color: colors.primary, marginBottom: '15px' }}>{t.paymentTitle}</h3>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            {t.paymentItems.map((item, index) => (
              <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ul>

          <h3 style={{ color: colors.primary, marginBottom: '15px' }}>{t.obligationsTitle}</h3>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            {t.obligationsItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>

          <h3 style={{ color: colors.primary, marginBottom: '15px' }}>{t.workTimeTitle}</h3>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            {t.workTimeItems.map((item, index) => (
              <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ul>

          <h3 style={{ color: '#ef4444', marginBottom: '15px', background: '#fef2f2', padding: '10px 12px', borderRadius: '8px', border: '2px solid #fca5a5' }}>{t.latePaymentTitle}</h3>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            {t.latePaymentItems.map((item: string, index: number) => (
              <li key={index} style={{ marginBottom: '8px', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ul>

          <h3 style={{ color: colors.primary, marginBottom: '15px' }}>{t.dataProtectionTitle}</h3>
          <p style={{ marginBottom: '10px' }}>
            {t.dataProtectionText}
          </p>

          <h3 style={{ color: colors.primary, marginBottom: '15px' }}>{t.terminationTitle}</h3>
          <p>
            {t.terminationText}
          </p>
        </div>

        <div style={{
          background: colors.danger + '20',
          borderRadius: '12px',
          padding: '15px',
          marginBottom: '20px',
          border: `2px solid ${colors.danger}`
        }}>
          <p style={{ color: colors.danger, fontWeight: 'bold', margin: 0, textAlign: 'center' }}>
            {t.readWarning}
          </p>
        </div>

        <p style={{
          textAlign: 'center',
          marginBottom: '25px',
          fontSize: '15px',
          fontWeight: 'bold',
          color: colors.text
        }}>
          {t.confirmText}
        </p>

        {saveError && (
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            marginBottom: '15px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {saveError}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <button
            onClick={() => handleApproval(false)}
            disabled={saving}
            style={{
              background: colors.danger,
              color: '#FFF',
              border: 'none',
              borderRadius: '12px',
              padding: '15px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => { if (!saving) e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {t.disapprove}
          </button>

          <button
            onClick={() => handleApproval(true)}
            disabled={saving}
            style={{
              background: saving ? '#999' : colors.success,
              color: '#FFF',
              border: 'none',
              borderRadius: '12px',
              padding: '15px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => { if (!saving) e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {saving
              ? (lang === 'fr' ? 'Sauvegarde...' : 'Saving...')
              : t.approve}
          </button>
        </div>
      </div>
    </div>
  );
}
