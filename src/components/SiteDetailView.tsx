import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import DailyNotes from './DailyNotes';

interface SiteDetailViewProps {
  siteId: string;
  siteName: string;
  siteLocation?: string;
  userId: string;
  colors: any;
  onBack: () => void;
  lang?: string;
}

interface SiteImage {
  id: string;
  image_url: string;
  image_type: 'before' | 'during' | 'after';
  uploaded_at: string;
}

interface SiteNote {
  id: string;
  note_content: string;
  progress_percentage: number;
  created_at: string;
}

export default function SiteDetailView({ siteId, siteName, siteLocation, userId, colors, onBack, lang = 'fr' }: SiteDetailViewProps) {
  const [images, setImages] = useState<{ before: SiteImage[], during: SiteImage[], after: SiteImage[] }>({
    before: [],
    during: [],
    after: []
  });
  const [notes, setNotes] = useState<SiteNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showDailyNotes, setShowDailyNotes] = useState(false);

  useEffect(() => {
    loadSiteData();
  }, [siteId]);

  const loadSiteData = async () => {
    try {
      const siteIdStr = String(siteId);
      const { data: imagesData, error: imagesError } = await supabase
        .from('site_images')
        .select('*')
        .eq('site_id', siteIdStr)
        .order('uploaded_at', { ascending: true });

      if (imagesError) {
        console.error('Error loading images:', imagesError);
      }

      if (imagesData) {
        const categorized = {
          before: imagesData.filter(img => img.image_type === 'before'),
          during: imagesData.filter(img => img.image_type === 'during'),
          after: imagesData.filter(img => img.image_type === 'after')
        };
        setImages(categorized);
      }

      const { data: notesData, error: notesError } = await supabase
        .from('site_notes')
        .select('*')
        .eq('site_id', siteIdStr)
        .order('created_at', { ascending: false });

      if (notesError) {
        console.error('Error loading notes:', notesError);
      }

      if (notesData && notesData.length > 0) {
        setNotes(notesData);
        setProgress(notesData[0].progress_percentage || 0);
      }
    } catch (err) {
      console.error('Error loading site data:', err);
    }
  };

  const handleImageCapture = (type: 'before' | 'during' | 'after') => {
    const currentCount = images[type].length;
    const maxImages = 4;

    if (currentCount >= maxImages) {
      alert(`Vous pouvez ajouter maximum ${maxImages} images ${type === 'before' ? 'avant' : type === 'during' ? 'pendant' : 'après'}`);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        setUploading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          try {
            const { error: insertError } = await supabase
              .from('site_images')
              .insert({
                site_id: String(siteId),
                user_id: userId,
                image_url: base64Data,
                image_type: type
              });

            if (insertError) {
              console.error('Error inserting image:', insertError);
              alert(`Erreur lors de l'enregistrement: ${insertError.message}`);
            } else {
              await loadSiteData();
            }
          } catch (err) {
            console.error('Error saving image:', err);
            alert('Erreur lors de l\'enregistrement de la photo');
          } finally {
            setUploading(false);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'during' | 'after') => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const currentCount = images[type].length;
    const maxImages = 4;

    if (currentCount >= maxImages) {
      alert(`Vous pouvez téléverser maximum ${maxImages} images ${type === 'before' ? 'avant' : type === 'during' ? 'pendant' : 'après'}`);
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = [];

      for (let i = 0; i < Math.min(files.length, maxImages - currentCount); i++) {
        const file = files[i];

        const uploadPromise = new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = reader.result as string;

            try {
              const { error: insertError } = await supabase
                .from('site_images')
                .insert({
                  site_id: String(siteId),
                  user_id: userId,
                  image_url: base64Data,
                  image_type: type
                });

              if (insertError) {
                console.error('Error inserting image:', insertError);
                reject(insertError);
              } else {
                resolve();
              }
            } catch (err) {
              console.error('Error saving image:', err);
              reject(err);
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

        uploadPromises.push(uploadPromise);
      }

      await Promise.all(uploadPromises);
      await loadSiteData();
    } catch (err) {
      console.error('Error uploading images:', err);
      alert('Erreur lors du téléversement des images');
    } finally {
      setUploading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      const { error } = await supabase
        .from('site_notes')
        .insert({
          site_id: String(siteId),
          user_id: userId,
          note_content: newNote,
          progress_percentage: progress
        });

      if (!error) {
        setNewNote('');
        await loadSiteData();
      }
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const ImageSection = ({ title, type, emoji }: { title: string, type: 'before' | 'during' | 'after', emoji: string }) => (
    <div style={{ marginBottom: '12px' }}>
      <h4 style={{ color: colors.primary, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600' }}>
        {emoji} {title} ({images[type].length}/4)
      </h4>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px',
        marginBottom: '8px'
      }}>
        {images[type].map((img) => (
          <div
            key={img.id}
            style={{
              position: 'relative',
              paddingBottom: '60%',
              background: colors.background,
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
            }}
          >
            <img
              src={img.image_url}
              alt={`${type} ${img.id}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
        ))}

        {Array.from({ length: 4 - images[type].length }).map((_, idx) => (
          <div
            key={`empty-${idx}`}
            style={{
              position: 'relative',
              paddingBottom: '60%',
              background: colors.background,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px dashed ${colors.textLight}`
            }}
          >
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '11px',
              color: colors.textLight,
              textAlign: 'center'
            }}>
              Vide
            </div>
          </div>
        ))}
      </div>

      {images[type].length < 4 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            onClick={() => handleImageCapture(type)}
            disabled={uploading}
            style={{
              background: colors.primary,
              color: '#FFF',
              borderRadius: '10px',
              padding: '10px',
              textAlign: 'center',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              border: 'none',
              opacity: uploading ? 0.6 : 1
            }}
          >
            📸 Capturer
          </button>
          <label style={{
            display: 'block',
            background: colors.secondary,
            color: '#FFF',
            borderRadius: '10px',
            padding: '10px',
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '13px',
            opacity: uploading ? 0.6 : 1
          }}>
            📂 Téléverser
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImageUpload(e, type)}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </label>
        </div>
      )}
    </div>
  );

  if (showDailyNotes) {
    return <DailyNotes userId={userId} colors={colors} onBack={() => setShowDailyNotes(false)} />;
  }

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
        <h2 style={{ margin: 0, fontSize: '22px' }}>🏗️ {siteName}</h2>
        {siteLocation && (
          <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '14px' }}>
            📍 {siteLocation}
          </p>
        )}
        {siteLocation && (
          <button
            onClick={() => {
              const encoded = encodeURIComponent(siteLocation);
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`, '_blank');
            }}
            style={{
              marginTop: '12px',
              background: 'rgba(255,255,255,0.25)',
              border: '2px solid rgba(255,255,255,0.5)',
              color: '#FFF',
              padding: '10px 20px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            🗺️ {lang === 'fr' ? 'Itineraire GPS' : 'GPS Directions'}
          </button>
        )}
      </div>

      <div style={{ padding: '20px' }}>
        <div
          onClick={() => setShowDailyNotes(true)}
          style={{
            background: `linear-gradient(135deg, ${colors.success} 0%, ${colors.primary} 100%)`,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            color: '#FFF'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '15px',
              fontSize: '32px'
            }}>
              📝
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold' }}>
                {lang === 'fr' ? 'Notes Quotidiennes' : 'Daily Notes'}
              </h3>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
                {lang === 'fr' ? 'Documenter le travail journalier avec photos' : 'Document daily work with photos'}
              </p>
            </div>
            <div style={{ fontSize: '24px' }}>→</div>
          </div>
        </div>
        <div style={{
          background: '#FFF',
          borderRadius: '16px',
          padding: '12px',
          marginBottom: '15px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ color: colors.primary, marginBottom: '12px', fontSize: '16px', fontWeight: 'bold' }}>📊 Progression</h3>

          <div style={{
            background: colors.background,
            borderRadius: '12px',
            padding: '15px',
            marginBottom: '15px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <span style={{ fontWeight: 'bold', color: colors.text }}>Avancement</span>
              <span style={{ fontWeight: 'bold', fontSize: '18px', color: colors.primary }}>
                {progress}%
              </span>
            </div>
            <div style={{
              background: '#E0E0E0',
              borderRadius: '10px',
              height: '20px',
              overflow: 'hidden'
            }}>
              <div style={{
                background: `linear-gradient(90deg, ${colors.success} 0%, ${colors.primary} 100%)`,
                height: '100%',
                width: `${progress}%`,
                transition: 'width 0.3s ease',
                borderRadius: '10px'
              }} />
            </div>
          </div>

          <label style={{ display: 'block', marginBottom: '15px' }}>
            <span style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: colors.text }}>
              Modifier la progression:
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </label>
        </div>

        <div style={{
          background: '#FFF',
          borderRadius: '16px',
          padding: '12px',
          marginBottom: '15px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ color: colors.primary, marginBottom: '12px', fontSize: '16px', fontWeight: 'bold' }}>📸 Photos du Chantier</h3>

          <ImageSection title="Photos Avant" type="before" emoji="📷" />
          <ImageSection title="Photos Pendant" type="during" emoji="🔨" />
          <ImageSection title="Photos Après" type="after" emoji="✨" />

          {uploading && (
            <div style={{
              background: colors.warning + '20',
              borderRadius: '12px',
              padding: '15px',
              textAlign: 'center',
              color: colors.warning,
              fontWeight: 'bold'
            }}>
              ⏳ Téléversement en cours...
            </div>
          )}
        </div>

        <div style={{
          background: '#FFF',
          borderRadius: '16px',
          padding: '12px',
          marginBottom: '15px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ color: colors.primary, marginBottom: '12px', fontSize: '16px', fontWeight: 'bold' }}>📝 Notes d'Avancement</h3>

          <div style={{ marginBottom: '15px' }}>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Décrivez les travaux réalisés, matériaux utilisés, problèmes rencontrés..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                borderRadius: '12px',
                border: `2px solid ${colors.background}`,
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          <button
            onClick={handleAddNote}
            disabled={!newNote.trim()}
            style={{
              background: colors.primary,
              color: '#FFF',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: newNote.trim() ? 'pointer' : 'not-allowed',
              opacity: newNote.trim() ? 1 : 0.5,
              width: '100%'
            }}
          >
            ➕ Ajouter une note
          </button>

          <div style={{ marginTop: '20px' }}>
            {notes.map((note) => (
              <div
                key={note.id}
                style={{
                  background: colors.background,
                  borderRadius: '12px',
                  padding: '15px',
                  marginBottom: '10px'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{
                    fontSize: '12px',
                    color: colors.textLight
                  }}>
                    {new Date(note.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span style={{
                    background: colors.primary,
                    color: '#FFF',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {note.progress_percentage}%
                  </span>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: colors.text,
                  lineHeight: '1.5'
                }}>
                  {note.note_content}
                </p>
              </div>
            ))}

            {notes.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '30px',
                color: colors.textLight,
                fontSize: '14px'
              }}>
                Aucune note pour le moment
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
