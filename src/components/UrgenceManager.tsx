import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  currentUser: any;
  darkMode: boolean;
  lang: string;
  onBack: () => void;
}

interface Urgence {
  id: string;
  client_id: string;
  client_name: string;
  description_probleme: string;
  niveau_urgence: 'faible' | 'moyen' | 'eleve' | 'critique';
  date_creation: string;
  statut: 'nouveau' | 'en_cours' | 'resolu' | 'annule';
  technicien_id: string | null;
  adresse: string;
  contact_phone: string;
  technicien?: { name: string } | null;
}

interface Technician {
  id: string;
  name: string;
}

const NIVEAUX = [
  { value: 'faible', label: 'Faible', color: '#10b981', bg: '#d1fae5' },
  { value: 'moyen', label: 'Moyen', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'eleve', label: 'Élevé', color: '#f97316', bg: '#ffedd5' },
  { value: 'critique', label: 'CRITIQUE', color: '#ef4444', bg: '#fee2e2' },
];

const STATUTS = [
  { value: 'nouveau', label: 'Nouveau', color: '#0891b2', bg: '#e0f2fe' },
  { value: 'en_cours', label: 'En cours', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'resolu', label: 'Résolu', color: '#10b981', bg: '#d1fae5' },
  { value: 'annule', label: 'Annulé', color: '#94a3b8', bg: '#f1f5f9' },
];

const getNiveau = (value: string) => NIVEAUX.find((n) => n.value === value) || NIVEAUX[1];
const getStatut = (value: string) => STATUTS.find((s) => s.value === value) || STATUTS[0];

const UrgenceManager = ({ currentUser, darkMode, onBack }: Props) => {
  const [urgences, setUrgences] = useState<Urgence[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterNiveau, setFilterNiveau] = useState('tous');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUrgence, setSelectedUrgence] = useState<Urgence | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const realtimeRef = useRef<any>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'office';
  const isClient = currentUser?.role === 'client';
  const isTech = currentUser?.role === 'tech';

  const [form, setForm] = useState({
    description_probleme: '',
    niveau_urgence: 'moyen' as Urgence['niveau_urgence'],
    adresse: '',
    contact_phone: currentUser?.phone || '',
  });

  const [assignForm, setAssignForm] = useState({
    technicien_id: '',
    statut: 'en_cours' as Urgence['statut'],
  });

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
  }), [darkMode]);

  useEffect(() => {
    loadAll();
    setupRealtime();
    return () => { if (realtimeRef.current) supabase.removeChannel(realtimeRef.current); };
  }, []);

  const setupRealtime = () => {
    realtimeRef.current = supabase
      .channel('urgences-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'urgences' }, () => {
        loadUrgences();
      })
      .subscribe();
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadUrgences(), loadTechnicians()]);
    setLoading(false);
  };

  const loadUrgences = async () => {
    let query = supabase
      .from('urgences')
      .select('*, technicien:technicien_id(name)')
      .order('date_creation', { ascending: false });

    if (isTech) {
      query = supabase
        .from('urgences')
        .select('*, technicien:technicien_id(name)')
        .eq('technicien_id', currentUser.id)
        .order('date_creation', { ascending: false });
    } else if (isClient) {
      query = supabase
        .from('urgences')
        .select('*, technicien:technicien_id(name)')
        .eq('client_id', currentUser.id)
        .order('date_creation', { ascending: false });
    }

    const { data, error } = await query;
    if (!error && data) {
      setUrgences(
        data.map((u: any) => ({
          ...u,
          technicien: u.technicien || null,
        }))
      );
    }
  };

  const loadTechnicians = async () => {
    const { data } = await supabase.from('app_users').select('id, name').eq('role', 'tech').order('name');
    if (data) setTechnicians(data);
  };

  const handleCreateUrgence = async () => {
    if (!form.description_probleme.trim()) {
      setMessage('Veuillez décrire le problème');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const { error } = await supabase.from('urgences').insert({
        client_id: currentUser.id,
        client_name: currentUser.name || '',
        description_probleme: form.description_probleme,
        niveau_urgence: form.niveau_urgence,
        adresse: form.adresse,
        contact_phone: form.contact_phone,
        statut: 'nouveau',
      });
      if (error) throw error;
      setMessage('Demande d\'urgence envoyée. Notre équipe vous contactera rapidement.');
      setShowCreateModal(false);
      setForm({ description_probleme: '', niveau_urgence: 'moyen', adresse: '', contact_phone: currentUser?.phone || '' });
      await loadUrgences();
    } catch (err: any) {
      setMessage('Erreur: ' + (err.message || 'Impossible d\'envoyer'));
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUrgence) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('urgences')
        .update({
          technicien_id: assignForm.technicien_id || null,
          statut: assignForm.statut,
        })
        .eq('id', selectedUrgence.id);
      if (error) throw error;

      if (assignForm.technicien_id) {
        await supabase.from('notifications').insert({
          user_id: assignForm.technicien_id,
          title: 'Urgence assignée',
          message: `Urgence ${getNiveau(selectedUrgence.niveau_urgence).label}: ${selectedUrgence.description_probleme.slice(0, 80)}`,
          type: 'warning',
          read: false,
        }).then(() => {});
      }

      setMessage('Assignation mise à jour');
      setShowAssignModal(false);
      await loadUrgences();
    } catch (err: any) {
      setMessage('Erreur: ' + (err.message || 'Impossible de mettre à jour'));
    } finally {
      setSaving(false);
    }
  };

  const handleTechUpdateStatus = async (urgenceId: string, newStatut: Urgence['statut']) => {
    const { error } = await supabase.from('urgences').update({ statut: newStatut }).eq('id', urgenceId);
    if (!error) await loadUrgences();
  };

  const filtered = urgences
    .filter((u) => filterStatut === 'tous' || u.statut === filterStatut)
    .filter((u) => filterNiveau === 'tous' || u.niveau_urgence === filterNiveau);

  const urgentCount = urgences.filter((u) => (u.niveau_urgence === 'critique' || u.niveau_urgence === 'eleve') && u.statut !== 'resolu' && u.statut !== 'annule').length;

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
      <div style={{ background: '#dc2626', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', width: 36, height: 36, cursor: 'pointer', fontSize: 18 }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Gestion des Urgences</div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
            {urgences.filter((u) => u.statut === 'nouveau').length} nouvelle(s)
            {urgentCount > 0 && ` • ${urgentCount} critique(s)/élevée(s)`}
          </div>
        </div>
        {(isClient || isAdmin) && (
          <button
            onClick={() => setShowCreateModal(true)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            + Signaler
          </button>
        )}
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

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {STATUTS.map((s) => {
            const count = urgences.filter((u) => u.statut === s.value).length;
            return (
              <div key={s.value} style={{ background: colors.card, borderRadius: 10, border: `1px solid ${colors.border}`, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{count}</div>
                <div style={{ fontSize: 12, color: colors.textSub, marginTop: 2 }}>{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 14 }}
          >
            <option value="tous">Tous statuts</option>
            {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            value={filterNiveau}
            onChange={(e) => setFilterNiveau(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 14 }}
          >
            <option value="tous">Tous niveaux</option>
            {NIVEAUX.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>

        {/* Urgence list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: colors.textSub, padding: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: 16 }}>Aucune urgence dans cette catégorie</div>
            </div>
          ) : (
            filtered.map((urg) => {
              const niveau = getNiveau(urg.niveau_urgence);
              const statut = getStatut(urg.statut);
              return (
                <div
                  key={urg.id}
                  style={{
                    background: colors.card,
                    borderRadius: 12,
                    border: `1px solid ${colors.border}`,
                    borderLeft: `4px solid ${niveau.color}`,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: niveau.bg, color: niveau.color }}>
                            {niveau.label}
                          </span>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: statut.bg, color: statut.color }}>
                            {statut.label}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, color: colors.text, fontSize: 15 }}>
                          {urg.description_probleme}
                        </div>
                        <div style={{ color: colors.textSub, fontSize: 13, marginTop: 4 }}>
                          {urg.client_name}
                          {urg.adresse && ` • ${urg.adresse}`}
                          {urg.contact_phone && ` • Tél: ${urg.contact_phone}`}
                        </div>
                        <div style={{ color: colors.textSub, fontSize: 12, marginTop: 4 }}>
                          {new Date(urg.date_creation).toLocaleString('fr-FR')}
                          {urg.technicien && ` • Assigné à: ${urg.technicien.name}`}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        {isAdmin && urg.statut !== 'resolu' && urg.statut !== 'annule' && (
                          <button
                            onClick={() => { setSelectedUrgence(urg); setAssignForm({ technicien_id: urg.technicien_id || '', statut: urg.statut }); setShowAssignModal(true); }}
                            style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${colors.primary}`, background: 'transparent', color: colors.primary, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                          >
                            Assigner
                          </button>
                        )}
                        {isTech && urg.technicien_id === currentUser.id && urg.statut === 'en_cours' && (
                          <button
                            onClick={() => handleTechUpdateStatus(urg.id, 'resolu')}
                            style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: colors.success, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                          >
                            Marquer résolu
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CREATE URGENCE MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: colors.surface, borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, background: colors.border, borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 20, color: colors.danger }}>Signaler une urgence</div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: colors.textSub }}>×</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 6 }}>Niveau d'urgence *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {NIVEAUX.map((n) => (
                  <button
                    key={n.value}
                    onClick={() => setForm((p) => ({ ...p, niveau_urgence: n.value as Urgence['niveau_urgence'] }))}
                    style={{
                      padding: '10px 6px', borderRadius: 8, border: `2px solid ${form.niveau_urgence === n.value ? n.color : colors.border}`,
                      background: form.niveau_urgence === n.value ? n.bg : 'transparent',
                      color: form.niveau_urgence === n.value ? n.color : colors.textSub,
                      cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                    }}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 6 }}>Description du problème *</label>
              <textarea
                value={form.description_probleme}
                onChange={(e) => setForm((p) => ({ ...p, description_probleme: e.target.value }))}
                placeholder="Décrivez précisément le problème rencontré..."
                rows={4}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 6 }}>Adresse / Localisation</label>
              <input
                value={form.adresse}
                onChange={(e) => setForm((p) => ({ ...p, adresse: e.target.value }))}
                placeholder="Adresse ou point de repère..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 6 }}>Téléphone de contact</label>
              <input
                value={form.contact_phone}
                onChange={(e) => setForm((p) => ({ ...p, contact_phone: e.target.value }))}
                placeholder="Numéro de téléphone..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>

            <button
              onClick={handleCreateUrgence}
              disabled={saving}
              style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Envoi en cours...' : 'Envoyer la demande d\'urgence'}
            </button>
          </div>
        </div>
      )}

      {/* ASSIGN MODAL */}
      {showAssignModal && selectedUrgence && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: colors.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: colors.text }}>Assigner l'urgence</div>
              <button onClick={() => setShowAssignModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: colors.textSub }}>×</button>
            </div>

            <div style={{ background: darkMode ? '#0f172a' : '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ color: colors.text, fontSize: 14 }}>{selectedUrgence.description_probleme}</div>
              <div style={{ color: colors.textSub, fontSize: 13 }}>{selectedUrgence.client_name}</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 6 }}>Technicien</label>
              <select
                value={assignForm.technicien_id}
                onChange={(e) => setAssignForm((p) => ({ ...p, technicien_id: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 14 }}
              >
                <option value="">Non assigné</option>
                {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 6 }}>Statut</label>
              <select
                value={assignForm.statut}
                onChange={(e) => setAssignForm((p) => ({ ...p, statut: e.target.value as Urgence['statut'] }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 14 }}
              >
                {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAssignModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.text, cursor: 'pointer', fontSize: 14 }}>
                Annuler
              </button>
              <button onClick={handleAssign} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: colors.primary, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Mise à jour...' : 'Confirmer l\'assignation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UrgenceManager;
