import { useState } from 'react';
import ProfilePhotoManager, { type PhotoType } from './ProfilePhotoManager';

interface ProfileHeaderProps {
  userId: string;
  userName: string;
  userEmail?: string;
  subtitle?: string;
  infoLines?: { label: string; value: string }[];
  badge?: { icon: string; label: string };
  profilePhoto: string | null;
  coverPhoto: string | null;
  onProfilePhotoChange: (url: string | null) => void;
  onCoverPhotoChange: (url: string | null) => void;
  onBack: () => void;
  darkMode: boolean;
  lang: string;
  primaryColor?: string;
  secondaryColor?: string;
  langToggle?: () => void;
  langLabel?: string;
}

export default function ProfileHeader({
  userId,
  userName,
  userEmail,
  subtitle,
  infoLines,
  badge,
  profilePhoto,
  coverPhoto,
  onProfilePhotoChange,
  onCoverPhotoChange,
  onBack,
  darkMode,
  lang,
  primaryColor = '#0D4A6E',
  secondaryColor = '#0A3D5C',
  langToggle,
  langLabel,
}: ProfileHeaderProps) {
  const [photoMenu, setPhotoMenu] = useState<PhotoType | null>(null);

  const colors = {
    card: darkMode ? '#1e293b' : '#ffffff',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
  };

  const coverGradient = `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`;

  return (
    <>
      <div style={{ position: 'relative' }}>
        <div
          style={{
            height: '180px',
            background: coverPhoto ? undefined : coverGradient,
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
          }}
          onClick={() => setPhotoMenu('cover')}
        >
          {coverPhoto && (
            <img
              src={coverPhoto}
              alt=""
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                display: 'block',
              }}
            />
          )}
          <div style={{
            position: 'absolute', inset: 0,
            background: coverPhoto
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.4))'
              : 'transparent',
          }} />

          <div style={{
            position: 'absolute', top: '16px', left: '16px', right: '16px',
            display: 'flex', justifyContent: 'space-between', zIndex: 2,
          }}>
            <button
              onClick={(e) => { e.stopPropagation(); onBack(); }}
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px', padding: '10px 14px',
                cursor: 'pointer', color: '#FFF', fontSize: '16px',
              }}
            >
              &larr;
            </button>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setPhotoMenu('cover'); }}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px', padding: '8px 10px',
                  cursor: 'pointer', color: '#FFF', fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                <span style={{ fontSize: '14px' }}>&#x1F4F7;</span>
              </button>
              {langToggle && (
                <button
                  onClick={(e) => { e.stopPropagation(); langToggle(); }}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    padding: '10px 14px', borderRadius: '12px',
                    color: '#FFF', cursor: 'pointer', fontWeight: '700', fontSize: '13px',
                  }}
                >
                  {langLabel || 'FR'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '-50px', textAlign: 'center', marginBottom: '20px',
          position: 'relative', zIndex: 3,
        }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div
              onClick={() => setPhotoMenu('profile')}
              style={{
                width: '100px', height: '100px', borderRadius: '50%',
                background: profilePhoto ? undefined : coverGradient,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontSize: '44px', margin: '0 auto',
                boxShadow: '0 6px 24px rgba(0,0,0,0.2)',
                overflow: 'hidden',
                border: `4px solid ${colors.card}`,
                cursor: 'pointer',
                color: '#fff', fontWeight: '700',
              }}
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (userName || '?').charAt(0).toUpperCase()
              )}
            </div>
            <button
              onClick={() => setPhotoMenu('profile')}
              style={{
                position: 'absolute', bottom: '2px', right: '2px',
                width: '32px', height: '32px', borderRadius: '50%',
                background: primaryColor, border: `3px solid ${colors.card}`,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                cursor: 'pointer', fontSize: '14px', color: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                padding: 0,
              }}
            >
              &#x1F4F7;
            </button>
          </div>
          <h3 style={{
            margin: '14px 0 4px', fontSize: '21px', color: colors.text,
            fontWeight: '800',
          }}>
            {userName}
          </h3>
          {subtitle && (
            <p style={{ color: colors.textSecondary, fontSize: '13px', margin: '0 0 4px', fontWeight: '600' }}>
              {subtitle}
            </p>
          )}
          {infoLines && infoLines.length > 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '3px',
              marginTop: '6px',
            }}>
              {infoLines.map((line, idx) => (
                <p key={idx} style={{
                  margin: 0, fontSize: '13px', color: colors.textSecondary, fontWeight: '500',
                }}>
                  <span style={{ fontWeight: '600', color: primaryColor }}>{line.label}:</span>{' '}
                  {line.value}
                </p>
              ))}
            </div>
          )}
          {badge && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: `${primaryColor}12`, padding: '6px 16px',
              borderRadius: '20px', marginTop: '6px',
              border: `1px solid ${primaryColor}25`,
            }}>
              <span style={{ fontSize: '13px' }}>{badge.icon}</span>
              <span style={{ color: primaryColor, fontSize: '13px', fontWeight: '700' }}>{badge.label}</span>
            </div>
          )}
          {userEmail && (
            <p style={{
              color: colors.textSecondary, fontSize: '13px',
              margin: '8px 0 0', fontWeight: '500',
            }}>
              {userEmail}
            </p>
          )}
        </div>
      </div>

      <ProfilePhotoManager
        userId={userId}
        currentProfilePhoto={profilePhoto}
        currentCoverPhoto={coverPhoto}
        onProfilePhotoChange={onProfilePhotoChange}
        onCoverPhotoChange={onCoverPhotoChange}
        darkMode={darkMode}
        lang={lang}
        activeMenu={photoMenu}
        onCloseMenu={() => setPhotoMenu(null)}
      />
    </>
  );
}
