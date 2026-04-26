import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtimeProjects } from '../hooks/useRealtimeSync';

interface Chantier {
  id: string;
  title: string;
  location: string;
  description: string;
  client_name: string;
  rating: number;
  photos_after: string[];
  status: string;
  is_validated: boolean;
  is_public: boolean;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
}

interface ProjectValidationManagerProps {
  darkMode?: boolean;
  currentUser?: any;
  onBack?: () => void;
}

const ProjectValidationManager: React.FC<ProjectValidationManagerProps> = ({ darkMode = false, onBack }) => {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChantier, setSelectedChantier] = useState<Chantier | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const colors = {
    primary: '#3b82f6',
    background: darkMode ? '#0f172a' : '#ffffff',
    surface: darkMode ? '#1e293b' : '#f8fafc',
    card: darkMode ? '#334155' : '#ffffff',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#475569' : '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  };

  const loadChantiers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chantiers')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChantiers(data || []);
    } catch (error) {
      console.error('Error loading chantiers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChantiers();
  }, [loadChantiers]);

  useRealtimeProjects(loadChantiers, 'status=eq.completed');

  const handleValidate = async (chantierId: string, isPublic: boolean) => {
    try {
      const { error } = await supabase
        .from('chantiers')
        .update({
          is_validated: true,
          is_public: isPublic,
          progress: 100,
        })
        .eq('id', chantierId);

      if (error) throw error;
      setShowDetail(false);
      setSelectedChantier(null);
    } catch (error) {
      console.error('Error validating chantier:', error);
      alert('Erreur lors de la validation');
    }
  };

  const handleReject = async (chantierId: string) => {
    try {
      const { error } = await supabase
        .from('chantiers')
        .update({
          is_validated: false,
          is_public: false,
        })
        .eq('id', chantierId);

      if (error) throw error;
      setShowDetail(false);
      setSelectedChantier(null);
    } catch (error) {
      console.error('Error rejecting chantier:', error);
      alert('Erreur lors du rejet');
    }
  };

  const containerStyle: React.CSSProperties = {
    padding: '24px',
    background: colors.background,
    minHeight: '100vh',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '700',
    color: colors.text,
  };

  const cardStyle: React.CSSProperties = {
    background: colors.card,
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.1)',
    border: `1px solid ${colors.border}`,
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s',
  };

  const getBadgeColor = (chantier: Chantier) => {
    if (chantier.is_validated && chantier.is_public) return colors.success;
    if (chantier.is_validated && !chantier.is_public) return colors.warning;
    return colors.textSecondary;
  };

  const getBadgeText = (chantier: Chantier) => {
    if (chantier.is_validated && chantier.is_public) return 'Validé & Public';
    if (chantier.is_validated && !chantier.is_public) return 'Validé (Privé)';
    return 'En attente';
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>🎯 Validation des Projets</h1>
        {onBack && (
          <button
            style={{
              ...buttonStyle,
              background: colors.surface,
              color: colors.text,
            }}
            onClick={onBack}
          >
            ← Retour
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: colors.textSecondary }}>
          Chargement...
        </div>
      ) : chantiers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: colors.textSecondary }}>
          Aucun projet terminé à valider
        </div>
      ) : (
        <div>
          {chantiers.map((chantier) => (
            <div
              key={chantier.id}
              style={cardStyle}
              onClick={() => {
                setSelectedChantier(chantier);
                setShowDetail(true);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = darkMode
                  ? '0 4px 12px rgba(0,0,0,0.3)'
                  : '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = darkMode
                  ? 'none'
                  : '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: colors.text, marginBottom: '8px' }}>
                    {chantier.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '4px' }}>
                    📍 {chantier.location}
                  </p>
                  {chantier.client_name && (
                    <p style={{ fontSize: '14px', color: colors.textSecondary }}>
                      👤 {chantier.client_name}
                    </p>
                  )}
                </div>
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: getBadgeColor(chantier),
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {getBadgeText(chantier)}
                </div>
              </div>
              <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '12px' }}>
                {chantier.description || 'Pas de description'}
              </p>
              {chantier.rating > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '14px', color: colors.textSecondary }}>Note:</span>
                  {'⭐'.repeat(chantier.rating)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showDetail && selectedChantier && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => {
            setShowDetail(false);
            setSelectedChantier(null);
          }}
        >
          <div
            style={{
              background: colors.card,
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, marginBottom: '20px' }}>
              {selectedChantier.title}
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>
                <strong>Localisation:</strong> {selectedChantier.location}
              </p>
              {selectedChantier.client_name && (
                <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>
                  <strong>Client:</strong> {selectedChantier.client_name}
                </p>
              )}
              {selectedChantier.description && (
                <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>
                  <strong>Description:</strong> {selectedChantier.description}
                </p>
              )}
              {selectedChantier.rating > 0 && (
                <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>
                  <strong>Note:</strong> {'⭐'.repeat(selectedChantier.rating)}
                </p>
              )}
            </div>

            {selectedChantier.photos_after && selectedChantier.photos_after.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '12px' }}>
                  Photos du projet:
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {selectedChantier.photos_after.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                style={{
                  ...buttonStyle,
                  background: colors.success,
                  color: '#ffffff',
                  flex: 1,
                }}
                onClick={() => handleValidate(selectedChantier.id, true)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                ✓ Valider & Rendre Public
              </button>
              <button
                style={{
                  ...buttonStyle,
                  background: colors.warning,
                  color: '#ffffff',
                  flex: 1,
                }}
                onClick={() => handleValidate(selectedChantier.id, false)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                ✓ Valider (Privé)
              </button>
              <button
                style={{
                  ...buttonStyle,
                  background: colors.danger,
                  color: '#ffffff',
                  flex: 1,
                }}
                onClick={() => handleReject(selectedChantier.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                ✗ Rejeter
              </button>
              <button
                style={{
                  ...buttonStyle,
                  background: colors.surface,
                  color: colors.text,
                  flex: 1,
                }}
                onClick={() => {
                  setShowDetail(false);
                  setSelectedChantier(null);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectValidationManager;
