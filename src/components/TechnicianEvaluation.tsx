import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  currentUser: any;
  darkMode: boolean;
  lang: string;
  onBack: () => void;
}

interface Evaluation {
  id: string;
  intervention_id: string | null;
  client_id: string;
  technicien_id: string;
  note: number;
  commentaire: string;
  date: string;
  client?: { name: string } | null;
  technicien?: { name: string } | null;
}

interface TechStats {
  id: string;
  name: string;
  avgNote: number;
  totalEvals: number;
  distribution: Record<number, number>;
}

interface Technician {
  id: string;
  name: string;
}

const STARS = [1, 2, 3, 4, 5];

interface EvalFormProps {
  technicians: Technician[];
  darkMode: boolean;
  onSubmit: (data: { technicien_id: string; note: number; commentaire: string; date: string }) => Promise<void>;
  onCancel?: () => void;
  showCancel?: boolean;
}

const EvaluationForm = memo(({ technicians, darkMode, onSubmit, onCancel, showCancel }: EvalFormProps) => {
  const [technicien_id, setTechnicienId] = useState('');
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [saving, setSaving] = useState(false);
  const [date] = useState(new Date().toISOString().split('T')[0]);

  const colors = useMemo(() => ({
    primary: '#0891b2',
    surface: darkMode ? '#1e293b' : '#ffffff',
    border: darkMode ? '#334155' : '#e2e8f0',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSub: darkMode ? '#94a3b8' : '#64748b',
    gold: '#f59e0b',
  }), [darkMode]);

  const handleSubmit = async () => {
    setSaving(true);
    await onSubmit({ technicien_id, note, commentaire, date });
    setSaving(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 6 }}>Technicien *</label>
        <select
          value={technicien_id}
          onChange={(e) => setTechnicienId(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 14 }}
        >
          <option value="">Sélectionner le technicien</option>
          {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 8 }}>Note *</label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {STARS.map((s) => (
            <span
              key={s}
              onClick={() => setNote(s)}
              style={{ fontSize: 32, color: s <= note ? colors.gold : (darkMode ? '#475569' : '#d1d5db'), cursor: 'pointer', transition: 'color 0.15s', userSelect: 'none' }}
            >
              ★
            </span>
          ))}
          <span style={{ color: colors.textSub, fontSize: 14, marginLeft: 6 }}>
            {note === 0 ? 'Cliquez pour noter' : `${note}/5`}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 6 }}>Commentaire (optionnel)</label>
        <textarea
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Partagez votre expérience avec ce technicien..."
          rows={4}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        {showCancel && onCancel && (
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.text, cursor: 'pointer', fontSize: 14 }}>
            Annuler
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{ flex: 2, padding: '12px', borderRadius: 8, border: 'none', background: colors.primary, color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Envoi en cours...' : 'Soumettre mon évaluation'}
        </button>
      </div>
    </div>
  );
});

const TechnicianEvaluation = ({ currentUser, darkMode, onBack }: Props) => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'noter' | 'classement' | 'historique'>('classement');
  const [showFormModal, setShowFormModal] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedTech, setSelectedTech] = useState<string>('');

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'office';
  const isClient = currentUser?.role === 'client';

  const colors = useMemo(() => ({
    primary: '#0891b2',
    bg: darkMode ? '#0f172a' : '#f1f5f9',
    surface: darkMode ? '#1e293b' : '#ffffff',
    card: darkMode ? '#1e293b' : '#ffffff',
    border: darkMode ? '#334155' : '#e2e8f0',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSub: darkMode ? '#94a3b8' : '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    gold: '#f59e0b',
  }), [darkMode]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadEvaluations(), loadTechnicians()]);
    setLoading(false);
  };

  const loadEvaluations = async () => {
    const { data, error } = await supabase
      .from('evaluations_techniciens')
      .select('*, client:client_id(name), technicien:technicien_id(name)')
      .order('date', { ascending: false });
    if (!error && data) setEvaluations(data as Evaluation[]);
  };

  const loadTechnicians = async () => {
    const { data } = await supabase
      .from('app_users')
      .select('id, name')
      .eq('role', 'tech')
      .order('name');
    if (data) setTechnicians(data);
  };

  const handleCloseModal = useCallback(() => setShowFormModal(false), []);

  const handleSubmitEvaluation = useCallback(async (data: { technicien_id: string; note: number; commentaire: string; date: string }) => {
    if (!data.technicien_id || data.note === 0) {
      setMessage('Veuillez sélectionner un technicien et attribuer une note');
      return;
    }
    setMessage('');
    try {
      const { error } = await supabase.from('evaluations_techniciens').insert({
        client_id: currentUser.id,
        technicien_id: data.technicien_id,
        note: data.note,
        commentaire: data.commentaire,
        date: data.date,
      });
      if (error) throw error;
      setMessage('Évaluation soumise avec succès. Merci !');
      setShowFormModal(false);
      await loadEvaluations();
    } catch (err: any) {
      setMessage('Erreur: ' + (err.message || 'Impossible de soumettre'));
    }
  }, [currentUser.id]);

  const techStats: TechStats[] = useMemo(() => {
    return technicians.map((tech) => {
      const techEvals = evaluations.filter((e) => e.technicien_id === tech.id);
      const totalEvals = techEvals.length;
      const avgNote = totalEvals > 0 ? techEvals.reduce((sum, e) => sum + e.note, 0) / totalEvals : 0;
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      techEvals.forEach((e) => { distribution[e.note] = (distribution[e.note] || 0) + 1; });
      return { id: tech.id, name: tech.name, avgNote, totalEvals, distribution };
    }).sort((a, b) => b.avgNote - a.avgNote);
  }, [technicians, evaluations]);

  const filteredEvals = selectedTech
    ? evaluations.filter((e) => e.technicien_id === selectedTech)
    : evaluations;

  const renderStars = (note: number, size = 20) => (
    <div style={{ display: 'flex', gap: 2 }}>
      {STARS.map((s) => (
        <span key={s} style={{ fontSize: size, color: s <= note ? colors.gold : (darkMode ? '#475569' : '#d1d5db') }}>★</span>
      ))}
    </div>
  );

  const noteColor = (avg: number) => {
    if (avg >= 4.5) return colors.success;
    if (avg >= 3.5) return colors.warning;
    if (avg >= 2) return '#f97316';
    return colors.danger;
  };

  if (loading) {
    return (
      <div style={{ background: colors.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: colors.primary, fontSize: 18 }}>Chargement...</div>
      </div>
    );
  }

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: colors.primary, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', width: 36, height: 36, cursor: 'pointer', fontSize: 18 }}>
          ←
        </button>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Évaluations Techniciens</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{evaluations.length} évaluation(s)</div>
        </div>
      </div>

      <div style={{ padding: '16px 20px', maxWidth: 900, margin: '0 auto' }}>
        {message && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16,
            background: message.startsWith('Erreur') ? '#fee2e2' : '#d1fae5',
            color: message.startsWith('Erreur') ? colors.danger : colors.success,
            fontSize: 14,
          }}>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {(isAdmin ? ['classement', 'historique'] as const : ['noter', 'classement', 'historique'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                background: activeTab === tab ? colors.primary : colors.surface,
                color: activeTab === tab ? '#fff' : colors.text,
              }}
            >
              {tab === 'noter' ? 'Évaluer un technicien' : tab === 'classement' ? 'Classement' : 'Historique'}
            </button>
          ))}
          {isClient && (
            <button
              onClick={() => { setActiveTab('noter'); setShowFormModal(true); }}
              style={{ marginLeft: 'auto', padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: colors.gold, color: '#fff' }}
            >
              + Évaluer
            </button>
          )}
        </div>

        {/* CLASSEMENT TAB */}
        {activeTab === 'classement' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {techStats.length === 0 ? (
              <div style={{ textAlign: 'center', color: colors.textSub, padding: 40 }}>Aucune évaluation disponible</div>
            ) : (
              techStats.map((stat, idx) => (
                <div key={stat.id} style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16,
                      background: idx === 0 ? '#fef3c7' : idx === 1 ? '#f1f5f9' : idx === 2 ? '#fef3c7' : colors.border,
                      color: idx === 0 ? '#d97706' : idx === 1 ? '#475569' : idx === 2 ? '#92400e' : colors.textSub,
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: colors.text, fontSize: 16 }}>{stat.name}</div>
                      <div style={{ color: colors.textSub, fontSize: 13 }}>{stat.totalEvals} évaluation(s)</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: noteColor(stat.avgNote) }}>
                        {stat.totalEvals > 0 ? stat.avgNote.toFixed(1) : '—'}
                      </div>
                      {stat.totalEvals > 0 && renderStars(Math.round(stat.avgNote))}
                    </div>
                  </div>

                  {stat.totalEvals > 0 && (
                    <div style={{ marginTop: 12 }}>
                      {STARS.slice().reverse().map((s) => {
                        const count = stat.distribution[s] || 0;
                        const pct = stat.totalEvals > 0 ? (count / stat.totalEvals) * 100 : 0;
                        return (
                          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ color: colors.gold, fontSize: 13, width: 16 }}>{s}★</span>
                            <div style={{ flex: 1, height: 6, background: darkMode ? '#334155' : '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: colors.gold, borderRadius: 3, transition: 'width 0.4s' }} />
                            </div>
                            <span style={{ color: colors.textSub, fontSize: 12, width: 20, textAlign: 'right' }}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* HISTORIQUE TAB */}
        {activeTab === 'historique' && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 14 }}
              >
                <option value="">Tous les techniciens</option>
                {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredEvals.length === 0 ? (
                <div style={{ textAlign: 'center', color: colors.textSub, padding: 40 }}>Aucune évaluation</div>
              ) : (
                filteredEvals.map((eval_) => (
                  <div key={eval_.id} style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: colors.text, fontSize: 15 }}>
                          {eval_.technicien?.name || 'Technicien inconnu'}
                        </div>
                        <div style={{ color: colors.textSub, fontSize: 13 }}>
                          Par {eval_.client?.name || 'Client'} • {new Date(eval_.date).toLocaleDateString('fr-FR')}
                        </div>
                        {eval_.commentaire && (
                          <div style={{ color: colors.text, fontSize: 14, marginTop: 6, fontStyle: 'italic' }}>
                            "{eval_.commentaire}"
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: noteColor(eval_.note) }}>{eval_.note}/5</div>
                        {renderStars(eval_.note)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* NOTER TAB (clients only) */}
        {activeTab === 'noter' && isClient && (
          <div style={{ background: colors.card, borderRadius: 16, border: `1px solid ${colors.border}`, padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: colors.text, marginBottom: 20 }}>Évaluer un technicien</div>
            <EvaluationForm
              technicians={technicians}
              darkMode={darkMode}
              onSubmit={handleSubmitEvaluation}
            />
          </div>
        )}
      </div>

      {/* QUICK EVAL MODAL */}
      {showFormModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: colors.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: colors.text }}>Évaluer un technicien</div>
              <button onClick={() => setShowFormModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: colors.textSub }}>×</button>
            </div>
            <EvaluationForm
              key={showFormModal ? 'modal-open' : 'modal-closed'}
              technicians={technicians}
              darkMode={darkMode}
              onSubmit={handleSubmitEvaluation}
              onCancel={handleCloseModal}
              showCancel
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianEvaluation;
