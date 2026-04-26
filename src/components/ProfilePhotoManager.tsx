import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type PhotoType = 'profile' | 'cover';

interface ProfilePhotoManagerProps {
  userId: string;
  currentProfilePhoto: string | null;
  currentCoverPhoto: string | null;
  onProfilePhotoChange: (url: string | null) => void;
  onCoverPhotoChange: (url: string | null) => void;
  darkMode: boolean;
  lang: string;
  activeMenu: PhotoType | null;
  onCloseMenu: () => void;
}

interface CropState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

const translations = {
  fr: {
    changePhoto: 'Changer la photo',
    removePhoto: 'Supprimer la photo',
    confirm: 'Confirmer',
    cancel: 'Annuler',
    uploading: 'Envoi...',
    errorSize: 'Le fichier ne doit pas depasser 5 Mo',
    errorType: 'Format non supporte. Utilisez JPG, PNG, GIF ou WebP',
    errorUpload: 'Erreur lors de l\'envoi',
    cropTitle: 'Ajuster la photo',
    zoom: 'Zoom',
    dragToMove: 'Glissez pour repositionner',
    profileTitle: 'Photo de profil',
    coverTitle: 'Photo de couverture',
  },
  en: {
    changePhoto: 'Change photo',
    removePhoto: 'Remove photo',
    confirm: 'Confirm',
    cancel: 'Cancel',
    uploading: 'Uploading...',
    errorSize: 'File must not exceed 5 MB',
    errorType: 'Unsupported format. Use JPG, PNG, GIF or WebP',
    errorUpload: 'Upload error',
    cropTitle: 'Adjust photo',
    zoom: 'Zoom',
    dragToMove: 'Drag to reposition',
    profileTitle: 'Profile photo',
    coverTitle: 'Cover photo',
  },
};

export default function ProfilePhotoManager({
  userId,
  currentProfilePhoto,
  currentCoverPhoto,
  onProfilePhotoChange,
  onCoverPhotoChange,
  darkMode,
  lang,
  activeMenu,
  onCloseMenu,
}: ProfilePhotoManagerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<PhotoType>('profile');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropState>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);

  const t = translations[lang as keyof typeof translations] || translations.fr;

  const colors = {
    bg: darkMode ? '#1e293b' : '#ffffff',
    surface: darkMode ? '#0f172a' : '#f8fafc',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#475569' : '#e2e8f0',
    primary: darkMode ? '#3b82f6' : '#2563eb',
    danger: '#ef4444',
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) return t.errorSize;
    if (!ALLOWED_TYPES.includes(file.type)) return t.errorType;
    return null;
  };

  const openFilePicker = (type: PhotoType) => {
    onCloseMenu();
    setError(null);
    setPreviewType(type);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setTimeout(() => setError(null), 4000);
      return;
    }

    selectedFileRef.current = file;
    setCrop({ scale: 1, offsetX: 0, offsetY: 0 });
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFileRef.current || !userId) return;
    setUploading(true);
    setError(null);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = previewUrl!;
      });

      const isProfile = previewType === 'profile';
      const outputW = isProfile ? 400 : 1200;
      const outputH = isProfile ? 400 : 400;

      canvas.width = outputW;
      canvas.height = outputH;

      const scaledW = img.width * crop.scale;
      const scaledH = img.height * crop.scale;

      const fitScale = Math.max(outputW / scaledW, outputH / scaledH);

      const drawW = scaledW * fitScale;
      const drawH = scaledH * fitScale;

      const cx = (outputW - drawW) / 2 + crop.offsetX * fitScale;
      const cy = (outputH - drawH) / 2 + crop.offsetY * fitScale;

      if (isProfile) {
        ctx.beginPath();
        ctx.arc(outputW / 2, outputH / 2, outputW / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      }

      ctx.drawImage(img, cx, cy, drawW, drawH);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Blob failed'))),
          'image/jpeg',
          0.85
        );
      });

      const fileName = `${userId}/${previewType}-${Date.now()}.jpg`;

      const oldUrl = isProfile ? currentProfilePhoto : currentCoverPhoto;
      if (oldUrl) {
        const match = oldUrl.match(/profile-photos\/(.+)/);
        if (match) {
          await supabase.storage.from('profile-photos').remove([match[1]]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      const field = isProfile ? 'profile_photo' : 'cover_photo';

      const { error: dbError } = await supabase
        .from('app_users')
        .update({ [field]: publicUrl })
        .eq('id', userId);

      if (dbError) throw dbError;

      if (isProfile) onProfilePhotoChange(publicUrl);
      else onCoverPhotoChange(publicUrl);

      setPreviewUrl(null);
      selectedFileRef.current = null;
    } catch (err) {
      console.error('Upload error:', err);
      setError(t.errorUpload);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async (type: PhotoType) => {
    onCloseMenu();
    const url = type === 'profile' ? currentProfilePhoto : currentCoverPhoto;
    if (!url) return;

    try {
      const match = url.match(/profile-photos\/(.+)/);
      if (match) {
        await supabase.storage.from('profile-photos').remove([match[1]]);
      }

      const field = type === 'profile' ? 'profile_photo' : 'cover_photo';
      await supabase.from('app_users').update({ [field]: null }).eq('id', userId);

      if (type === 'profile') onProfilePhotoChange(null);
      else onCoverPhotoChange(null);
    } catch (err) {
      console.error('Remove error:', err);
    }
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - crop.offsetX, y: e.clientY - crop.offsetY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [crop.offsetX, crop.offsetY]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setCrop((prev) => ({
      ...prev,
      offsetX: e.clientX - dragStart.x,
      offsetY: e.clientY - dragStart.y,
    }));
  }, [isDragging, dragStart]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const cancelPreview = () => {
    setPreviewUrl(null);
    selectedFileRef.current = null;
    setError(null);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {error && !previewUrl && (
        <div style={{
          position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
          background: colors.danger, color: '#fff', padding: '12px 24px',
          borderRadius: '12px', fontSize: '14px', zIndex: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxWidth: '90%', textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      {activeMenu && !previewUrl && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.3)' }}
            onClick={onCloseMenu}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401,
            background: colors.bg, borderRadius: '20px 20px 0 0',
            boxShadow: '0 -4px 30px rgba(0,0,0,0.2)',
            padding: '8px 0 24px', maxWidth: '480px', margin: '0 auto',
          }}>
            <div style={{
              width: '40px', height: '4px', borderRadius: '2px',
              background: colors.border, margin: '8px auto 20px',
            }} />
            <div style={{ padding: '0 20px' }}>
              <p style={{
                fontSize: '16px', fontWeight: '700', color: colors.text,
                margin: '0 0 16px', textAlign: 'center',
              }}>
                {activeMenu === 'profile' ? t.profileTitle : t.coverTitle}
              </p>
              <button
                onClick={() => openFilePicker(activeMenu)}
                style={{
                  width: '100%', padding: '16px', borderRadius: '14px',
                  background: colors.primary, color: '#fff', border: 'none',
                  fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                  marginBottom: '10px',
                }}
              >
                {t.changePhoto}
              </button>
              {(activeMenu === 'profile' ? currentProfilePhoto : currentCoverPhoto) && (
                <button
                  onClick={() => handleRemovePhoto(activeMenu)}
                  style={{
                    width: '100%', padding: '16px', borderRadius: '14px',
                    background: `${colors.danger}15`, color: colors.danger,
                    border: `1px solid ${colors.danger}30`, fontSize: '15px',
                    fontWeight: '600', cursor: 'pointer', marginBottom: '10px',
                  }}
                >
                  {t.removePhoto}
                </button>
              )}
              <button
                onClick={onCloseMenu}
                style={{
                  width: '100%', padding: '16px', borderRadius: '14px',
                  background: colors.surface, color: colors.textSecondary,
                  border: `1px solid ${colors.border}`, fontSize: '15px',
                  fontWeight: '600', cursor: 'pointer',
                }}
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </>
      )}

      {previewUrl && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,0.9)', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '100%', maxWidth: '500px', padding: '20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
          }}>
            <p style={{ color: '#fff', fontSize: '18px', fontWeight: '700', margin: 0 }}>
              {t.cropTitle}
            </p>

            <div
              style={{
                width: previewType === 'profile' ? '240px' : 'calc(100% - 20px)',
                maxWidth: previewType === 'cover' ? '460px' : undefined,
                height: previewType === 'profile' ? '240px' : '180px',
                borderRadius: previewType === 'profile' ? '50%' : '16px',
                overflow: 'hidden', position: 'relative',
                border: '3px solid rgba(255,255,255,0.2)',
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none', userSelect: 'none',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <img
                src={previewUrl}
                alt="Preview"
                draggable={false}
                style={{
                  position: 'absolute',
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  transform: `scale(${crop.scale}) translate(${crop.offsetX / crop.scale}px, ${crop.offsetY / crop.scale}px)`,
                  pointerEvents: 'none',
                }}
              />
            </div>

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>
              {t.dragToMove}
            </p>

            <div style={{
              width: '100%', maxWidth: '300px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                {t.zoom}
              </span>
              <input
                type="range" min="1" max="3" step="0.05"
                value={crop.scale}
                onChange={(e) => setCrop((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))}
                style={{ flex: 1, accentColor: colors.primary }}
              />
            </div>

            {error && (
              <div style={{
                background: `${colors.danger}22`, color: colors.danger,
                padding: '10px 20px', borderRadius: '10px', fontSize: '14px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '300px' }}>
              <button
                onClick={cancelPreview}
                disabled={uploading}
                style={{
                  flex: 1, padding: '14px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.1)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                  opacity: uploading ? 0.5 : 1,
                }}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  flex: 1, padding: '14px', borderRadius: '14px',
                  background: colors.primary, color: '#fff', border: 'none',
                  fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                  opacity: uploading ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {uploading && (
                  <div style={{
                    width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'profileSpinner 0.8s linear infinite',
                  }} />
                )}
                {uploading ? t.uploading : t.confirm}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes profileSpinner {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
