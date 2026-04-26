import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DailyNotesProps {
  userId: string;
  colors: any;
  onBack: () => void;
}

export default function DailyNotes({ userId, colors, onBack }: DailyNotesProps) {
  const [notes, setNotes] = useState<any[]>([]);
  const [currentNote, setCurrentNote] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharedWithAdmin, setSharedWithAdmin] = useState(false);
  const [sharedWithClient, setSharedWithClient] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [userId, selectedDate]);

  const loadNotes = async () => {
    const { data } = await supabase
      .from('daily_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('date', selectedDate)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      setCurrentNote(data[0].note_text || '');
      setPhotos(data[0].photos || []);
      setSharedWithAdmin(data[0].shared_with_admin || false);
      setSharedWithClient(data[0].shared_with_client || false);
      setNotes(data);
    } else {
      setCurrentNote('');
      setPhotos([]);
      setSharedWithAdmin(false);
      setSharedWithClient(false);
      setNotes([]);
    }
  };

  const handlePhotoCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotos(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotos(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const saveNote = async () => {
    setLoading(true);
    try {
      const existingNote = notes.find(n => n.date === selectedDate);

      if (existingNote) {
        await supabase
          .from('daily_notes')
          .update({
            note_text: currentNote,
            photos: photos,
            shared_with_admin: sharedWithAdmin,
            shared_with_client: sharedWithClient,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingNote.id);
      } else {
        await supabase
          .from('daily_notes')
          .insert({
            user_id: userId,
            date: selectedDate,
            note_text: currentNote,
            photos: photos,
            shared_with_admin: sharedWithAdmin,
            shared_with_client: sharedWithClient
          });
      }

      await loadNotes();
      alert('Note enregistrée avec succès');
    } catch (err) {
      console.error('Error saving note:', err);
      alert('Erreur lors de l\'enregistrement');
    }
    setLoading(false);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      padding: '20px'
    }}>
      <div style={{
        background: colors.card,
        borderRadius: '20px',
        padding: '20px',
        maxWidth: '800px',
        margin: '0 auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <button
            onClick={onBack}
            style={{
              background: colors.light,
              border: 'none',
              borderRadius: '12px',
              padding: '10px 15px',
              cursor: 'pointer',
              marginRight: '15px',
              fontWeight: 'bold',
              color: colors.text
            }}
          >
            ← Retour
          </button>
          <h2 style={{ color: colors.primary, margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            📝 Notes Quotidiennes
          </h2>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            color: colors.text,
            marginBottom: '8px',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: `2px solid ${colors.light}`,
              background: colors.light,
              color: colors.text,
              fontSize: '14px',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            color: colors.text,
            marginBottom: '8px',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            Note du jour
          </label>
          <textarea
            value={currentNote}
            onChange={(e) => setCurrentNote(e.target.value)}
            placeholder="Décrivez ce qui a été réalisé aujourd'hui..."
            style={{
              width: '100%',
              minHeight: '150px',
              padding: '12px',
              borderRadius: '12px',
              border: `2px solid ${colors.light}`,
              background: colors.light,
              color: colors.text,
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            color: colors.text,
            marginBottom: '12px',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            Photos
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
            <button
              onClick={handlePhotoCapture}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: `2px dashed ${colors.primary}`,
                background: colors.light,
                textAlign: 'center',
                cursor: 'pointer',
                color: colors.primary,
                fontWeight: 'bold',
                fontSize: '14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '32px' }}>📸</span>
              Prendre photo
            </button>
            <label style={{
              padding: '16px',
              borderRadius: '12px',
              border: `2px dashed ${colors.secondary}`,
              background: colors.light,
              textAlign: 'center',
              cursor: 'pointer',
              color: colors.secondary,
              fontWeight: 'bold',
              fontSize: '14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '32px' }}>📂</span>
              Téléverser
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {photos.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            {photos.map((photo, index) => (
              <div key={index} style={{ position: 'relative' }}>
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    border: `2px solid ${colors.light}`
                  }}
                />
                <button
                  onClick={() => removePhoto(index)}
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
                    fontWeight: 'bold',
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
        )}

        <div style={{
          background: colors.light,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          border: `2px solid ${colors.primary}20`
        }}>
          <h3 style={{
            margin: '0 0 15px 0',
            color: colors.primary,
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            🔗 Partager les notes et photos
          </h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              padding: '12px',
              background: colors.card,
              borderRadius: '10px',
              border: `2px solid ${sharedWithAdmin ? colors.success : colors.light}`
            }}>
              <input
                type="checkbox"
                checked={sharedWithAdmin}
                onChange={(e) => setSharedWithAdmin(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: colors.text, fontSize: '14px' }}>
                  👨‍💼 Partager avec l'administrateur
                </div>
                <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '4px' }}>
                  L'admin pourra voir vos notes et photos
                </div>
              </div>
            </label>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              padding: '12px',
              background: colors.card,
              borderRadius: '10px',
              border: `2px solid ${sharedWithClient ? colors.success : colors.light}`
            }}>
              <input
                type="checkbox"
                checked={sharedWithClient}
                onChange={(e) => setSharedWithClient(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: colors.text, fontSize: '14px' }}>
                  👤 Partager avec le client
                </div>
                <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '4px' }}>
                  Le client pourra voir vos notes et photos directement dans l'application
                </div>
              </div>
            </label>
          </div>
        </div>

        <button
          onClick={saveNote}
          disabled={loading}
          style={{
            width: '100%',
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
            color: '#FFF',
            border: 'none',
            borderRadius: '14px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          {loading ? 'Enregistrement...' : '💾 Enregistrer la note'}
        </button>
      </div>
    </div>
  );
}
