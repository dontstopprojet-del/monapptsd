import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface IncidentFormProps {
  userId: string;
  colors: any;
  onBack: () => void;
  lang: string;
}

export default function IncidentForm({ userId, colors, onBack, lang }: IncidentFormProps) {
  const [formData, setFormData] = useState({
    incident_type: 'safety',
    severity: 'medium',
    title: '',
    description: '',
    location: '',
    incident_date: new Date().toISOString().slice(0, 16)
  });
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const t = lang === 'fr' ? {
    title: 'Déclaration d\'Incident',
    incidentType: 'Type d\'incident',
    severity: 'Gravité',
    incidentTitle: 'Titre',
    description: 'Description détaillée',
    location: 'Lieu',
    dateTime: 'Date et heure',
    photos: 'Photos (optionnel)',
    addPhoto: 'Ajouter photo',
    submit: 'Soumettre',
    cancel: 'Annuler',
    success: 'Incident déclaré avec succès',
    error: 'Erreur lors de la soumission',
    required: 'Champ requis',
    safety: 'Sécurité',
    equipment: 'Équipement',
    quality: 'Qualité',
    other: 'Autre',
    low: 'Faible',
    medium: 'Moyenne',
    high: 'Élevée',
    critical: 'Critique'
  } : {
    title: 'Incident Report',
    incidentType: 'Incident Type',
    severity: 'Severity',
    incidentTitle: 'Title',
    description: 'Detailed Description',
    location: 'Location',
    dateTime: 'Date and Time',
    photos: 'Photos (optional)',
    addPhoto: 'Add Photo',
    submit: 'Submit',
    cancel: 'Cancel',
    success: 'Incident reported successfully',
    error: 'Error submitting',
    required: 'Required field',
    safety: 'Safety',
    equipment: 'Equipment',
    quality: 'Quality',
    other: 'Other',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical'
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length >= 4) {
      alert(lang === 'fr' ? 'Maximum 4 photos' : 'Maximum 4 photos');
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImages([...images, base64]);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      alert(t.required);
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('incidents')
        .insert({
          user_id: userId,
          incident_type: formData.incident_type,
          severity: formData.severity,
          title: formData.title,
          description: formData.description,
          location: formData.location,
          incident_date: formData.incident_date,
          photos: images,
          status: 'open'
        });

      if (error) {
        alert(t.error);
        console.error('Error submitting incident:', error);
      } else {
        alert(t.success);
        onBack();
      }
    } catch (err) {
      console.error('Error:', err);
      alert(t.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background,
      paddingBottom: '80px'
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
        padding: '20px',
        color: '#FFF',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: '#FFF',
            fontSize: '24px',
            cursor: 'pointer',
            borderRadius: '8px',
            padding: '8px 15px',
            marginBottom: '15px'
          }}
        >
          ← Retour
        </button>
        <h2 style={{ margin: 0, fontSize: '22px' }}>⚠️ {t.title}</h2>
        <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '14px' }}>
          {lang === 'fr' ? 'Signalez tout incident survenu sur le chantier' : 'Report any incident that occurred on site'}
        </p>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{
          background: '#FFF',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: colors.text,
              fontSize: '14px'
            }}>
              {t.incidentType} *
            </label>
            <select
              value={formData.incident_type}
              onChange={(e) => setFormData(prev => ({ ...prev, incident_type: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: `2px solid ${colors.background}`,
                fontSize: '14px',
                fontFamily: 'inherit',
                cursor: 'pointer'
              }}
            >
              <option value="safety">⚠️ {t.safety}</option>
              <option value="equipment">🔧 {t.equipment}</option>
              <option value="quality">✨ {t.quality}</option>
              <option value="other">📝 {t.other}</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: colors.text,
              fontSize: '14px'
            }}>
              {t.severity} *
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px'
            }}>
              {[
                { value: 'low', label: t.low, color: '#4CAF50' },
                { value: 'medium', label: t.medium, color: '#FF9800' },
                { value: 'high', label: t.high, color: '#FF5722' },
                { value: 'critical', label: t.critical, color: '#D32F2F' }
              ].map(sev => (
                <button
                  key={sev.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, severity: sev.value }))}
                  style={{
                    background: formData.severity === sev.value ? sev.color : colors.background,
                    color: formData.severity === sev.value ? '#FFF' : colors.text,
                    border: `2px solid ${sev.color}`,
                    borderRadius: '12px',
                    padding: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {sev.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: colors.text,
              fontSize: '14px'
            }}>
              {t.incidentTitle} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={lang === 'fr' ? 'Ex: Chute de matériel' : 'Ex: Material fall'}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: `2px solid ${colors.background}`,
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: colors.text,
              fontSize: '14px'
            }}>
              {t.description} *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={lang === 'fr' ? 'Décrivez en détail ce qui s\'est passé...' : 'Describe in detail what happened...'}
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                borderRadius: '12px',
                border: `2px solid ${colors.background}`,
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: colors.text,
              fontSize: '14px'
            }}>
              {t.location}
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder={lang === 'fr' ? 'Zone ou chantier spécifique' : 'Specific area or site'}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: `2px solid ${colors.background}`,
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: colors.text,
              fontSize: '14px'
            }}>
              {t.dateTime}
            </label>
            <input
              type="datetime-local"
              value={formData.incident_date}
              onChange={(e) => setFormData(prev => ({ ...prev, incident_date: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: `2px solid ${colors.background}`,
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: colors.text,
              fontSize: '14px'
            }}>
              {t.photos} ({images.length}/4)
            </label>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              marginBottom: '10px'
            }}>
              {images.map((img, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img
                    src={img}
                    alt={`Incident ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '150px',
                      objectFit: 'cover',
                      borderRadius: '12px'
                    }}
                  />
                  <button
                    onClick={() => removeImage(idx)}
                    style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      background: colors.danger,
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '50%',
                      width: '30px',
                      height: '30px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {images.length < 4 && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <label style={{
                  flex: 1,
                  background: colors.secondary,
                  color: '#FFF',
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  📷 {lang === 'fr' ? 'Capturer' : 'Capture'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                <label style={{
                  flex: 1,
                  background: colors.primary,
                  color: '#FFF',
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  📁 {lang === 'fr' ? 'Téléverser' : 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            )}
          </div>

          <div style={{
            background: colors.warning + '20',
            border: `2px solid ${colors.warning}`,
            borderRadius: '12px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <p style={{ margin: 0, fontSize: '13px', color: colors.text }}>
              {lang === 'fr'
                ? '⚠️ Toute déclaration d\'incident est confidentielle et sera traitée rapidement par nos équipes.'
                : '⚠️ All incident reports are confidential and will be handled promptly by our teams.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onBack}
              style={{
                flex: 1,
                background: colors.background,
                color: colors.text,
                border: 'none',
                borderRadius: '12px',
                padding: '15px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                flex: 1,
                background: colors.success,
                color: '#FFF',
                border: 'none',
                borderRadius: '12px',
                padding: '15px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1
              }}
            >
              {submitting ? '⏳' : '✅'} {t.submit}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
