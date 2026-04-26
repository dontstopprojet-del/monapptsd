import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  currentUser: any;
  darkMode: boolean;
  lang: string;
  onBack: () => void;
}

interface Installation {
  id: string;
  client_id: string;
  client_name?: string;
  type_installation: string;
  marque_equipement: string;
  date_installation: string;
  duree_garantie: number;
  notes: string;
  photos: string[];
  created_at: string;
}

interface Intervention {
  id: string;
  intervention_id: string | null;
  installation_id: string;
  technicien_id: string | null;
  rapport_technique: string;
  photos: string[];
  date_intervention: string;
  technicien?: { name: string } | null;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface Technician {
  id: string;
  name: string;
}

const isAdmin = (user: any) => user?.role === 'admin' || user?.role === 'office';
const isTech = (user: any) => user?.role === 'tech';

const InstallationHistory = ({ currentUser, darkMode, onBack }: Props) => {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'installations' | 'interventions'>('installations');
  const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    client_id: '',
    type_installation: '',
    marque_equipement: '',
    date_installation: new Date().toISOString().split('T')[0],
    duree_garantie: 12,
    notes: '',
    photos: [] as string[],
  });

  const [interventionForm, setInterventionForm] = useState({
    technicien_id: '',
    rapport_technique: '',
    photos_avant: [] as string[],
    photos_apres: [] as string[],
    date_intervention: new Date().toISOString().split('T')[0],
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
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadInstallations(), loadInterventions(), loadClients(), loadTechnicians()]);
    setLoading(false);
  };

  const loadInstallations = async () => {
    let query = supabase
      .from('installations_client')
      .select('*, client:client_id(name)')
      .order('date_installation', { ascending: false });

    if (isTech(currentUser) || currentUser?.role === 'client') {
      query = supabase
        .from('installations_client')
        .select('*, client:client_id(name)')
        .order('date_installation', { ascending: false });
    }

    const { data, error } = await query;
    if (!error && data) {
      setInstallations(
        data.map((i: any) => ({
          ...i,
          client_name: i.client?.name || '',
          photos: Array.isArray(i.photos) ? i.photos : [],
        }))
      );
    }
  };

  const loadInterventions = async () => {
    const { data, error } = await supabase
      .from('historique_interventions_installation')
      .select('*, technicien:technicien_id(name)')
      .order('date_intervention', { ascending: false });
    if (!error && data) {
      setInterventions(
        data.map((i: any) => ({
          ...i,
          photos: Array.isArray(i.photos) ? i.photos : [],
          technicien: i.technicien || null,
        }))
      );
    }
  };

  const loadClients = async () => {
    const { data } = await supabase
      .from('app_users')
      .select('id, name, phone')
      .eq('role', 'client')
      .order('name');
    if (data) setClients(data);
  };

  const loadTechnicians = async () => {
    const { data } = await supabase
      .from('app_users')
      .select('id, name')
      .eq('role', 'tech')
      .order('name');
    if (data) setTechnicians(data);
  };

  const handleCreateInstallation = async () => {
    if (!form.client_id || !form.type_installation || !form.marque_equipement) {
      setMessage('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const client = clients.find((c) => c.id === form.client_id);
      const { error } = await supabase.from('installations_client').insert({
        client_id: form.client_id,
        type_installation: form.type_installation,
        marque_equipement: form.marque_equipement,
        date_installation: form.date_installation,
        duree_garantie: form.duree_garantie,
        notes: form.notes,
        photos: form.photos,
      });
      if (error) throw error;
      setMessage(`Installation enregistrée pour ${client?.name}`);
      setShowCreateModal(false);
      resetForm();
      await loadInstallations();
    } catch (err: any) {
      setMessage('Erreur: ' + (err.message || 'Impossible de créer'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddIntervention = async () => {
    if (!selectedInstallation) return;
    setSaving(true);
    setMessage('');
    try {
      const allPhotos = [...interventionForm.photos_avant, ...interventionForm.photos_apres];
      const { error } = await supabase.from('historique_interventions_installation').insert({
        installation_id: selectedInstallation.id,
        technicien_id: interventionForm.technicien_id || currentUser?.id,
        rapport_technique: interventionForm.rapport_technique,
        photos: allPhotos,
        date_intervention: interventionForm.date_intervention,
      });
      if (error) throw error;
      setMessage('Intervention ajoutée avec succès');
      setShowInterventionModal(false);
      setInterventionForm({
        technicien_id: '',
        rapport_technique: '',
        photos_avant: [],
        photos_apres: [],
        date_intervention: new Date().toISOString().split('T')[0],
      });
      await loadInterventions();
    } catch (err: any) {
      setMessage('Erreur: ' + (err.message || 'Impossible d\'ajouter'));
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      client_id: '',
      type_installation: '',
      marque_equipement: '',
      date_installation: new Date().toISOString().split('T')[0],
      duree_garantie: 12,
      notes: '',
      photos: [],
    });
  };

  const filteredInstallations = installations.filter((i) =>
    i.type_installation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.marque_equipement.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInterventionsForInstallation = (installationId: string) =>
    interventions.filter((i) => i.installation_id === installationId);

  const isGarantieActive = (dateInstallation: string, dureeGarantie: number) => {
    const end = new Date(dateInstallation);
    end.setMonth(end.getMonth() + dureeGarantie);
    return new Date() <= end;
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
        <button
          onClick={onBack}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', width: 36, height: 36, cursor: 'pointer', fontSize: 18 }}
        >
          ←
        </button>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Historique Installations</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{installations.length} installation(s) enregistrée(s)</div>
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
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['installations', 'interventions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                background: activeTab === tab ? colors.primary : colors.surface,
                color: activeTab === tab ? '#fff' : colors.text,
                boxShadow: activeTab === tab ? '0 2px 8px rgba(8,145,178,0.3)' : 'none',
              }}
            >
              {tab === 'installations' ? 'Installations' : 'Historique Interventions'}
            </button>
          ))}
          {isAdmin(currentUser) && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{ marginLeft: 'auto', padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: colors.success, color: '#fff' }}
            >
              + Nouvelle installation
            </button>
          )}
        </div>

        {/* Search */}
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par client, type ou marque..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
        />

        {/* INSTALLATIONS TAB */}
        {activeTab === 'installations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredInstallations.length === 0 ? (
              <div style={{ textAlign: 'center', color: colors.textSub, padding: 40 }}>Aucune installation trouvée</div>
            ) : (
              filteredInstallations.map((inst) => {
                const intvsCount = getInterventionsForInstallation(inst.id).length;
                const garantieActive = isGarantieActive(inst.date_installation, inst.duree_garantie);
                return (
                  <div
                    key={inst.id}
                    style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}
                  >
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: colors.text, fontSize: 16 }}>
                            {inst.type_installation}
                          </div>
                          <div style={{ color: colors.textSub, fontSize: 13, marginTop: 2 }}>
                            {inst.marque_equipement} — {inst.client_name}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: garantieActive ? '#d1fae5' : '#fee2e2',
                            color: garantieActive ? colors.success : colors.danger,
                          }}>
                            {garantieActive ? 'Garantie active' : 'Garantie expirée'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                        <span style={{ color: colors.textSub, fontSize: 13 }}>
                          Installé le {new Date(inst.date_installation).toLocaleDateString('fr-FR')}
                        </span>
                        <span style={{ color: colors.textSub, fontSize: 13 }}>
                          Garantie {inst.duree_garantie} mois
                        </span>
                        <span style={{ color: colors.primary, fontSize: 13, fontWeight: 600 }}>
                          {intvsCount} intervention(s)
                        </span>
                      </div>
                      {inst.notes && (
                        <div style={{ color: colors.textSub, fontSize: 13, marginTop: 6, fontStyle: 'italic' }}>
                          {inst.notes}
                        </div>
                      )}
                      {inst.photos.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          {inst.photos.map((url, idx) => (
                            <img key={idx} src={url} alt="photo" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: `1px solid ${colors.border}` }} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Interventions for this installation */}
                    {intvsCount > 0 && (
                      <div style={{ borderTop: `1px solid ${colors.border}`, background: darkMode ? '#0f172a' : '#f8fafc' }}>
                        {getInterventionsForInstallation(inst.id).map((intv) => (
                          <div key={intv.id} style={{ padding: '10px 16px', borderBottom: `1px solid ${colors.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ color: colors.text, fontSize: 14, fontWeight: 600 }}>
                                  Intervention du {new Date(intv.date_intervention).toLocaleDateString('fr-FR')}
                                </div>
                                {intv.technicien && (
                                  <div style={{ color: colors.textSub, fontSize: 13 }}>Technicien: {intv.technicien.name}</div>
                                )}
                                {intv.rapport_technique && (
                                  <div style={{ color: colors.textSub, fontSize: 13, marginTop: 4 }}>{intv.rapport_technique}</div>
                                )}
                              </div>
                            </div>
                            {intv.photos.length > 0 && (
                              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                                {intv.photos.map((url, idx) => (
                                  <img key={idx} src={url} alt="photo" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6, border: `1px solid ${colors.border}` }} />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {(isAdmin(currentUser) || isTech(currentUser)) && (
                      <div style={{ padding: '10px 16px', borderTop: `1px solid ${colors.border}` }}>
                        <button
                          onClick={() => { setSelectedInstallation(inst); setShowInterventionModal(true); }}
                          style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${colors.primary}`, background: 'transparent', color: colors.primary, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                        >
                          + Ajouter une intervention
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* INTERVENTIONS TAB */}
        {activeTab === 'interventions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {interventions.length === 0 ? (
              <div style={{ textAlign: 'center', color: colors.textSub, padding: 40 }}>Aucune intervention enregistrée</div>
            ) : (
              interventions.map((intv) => {
                const inst = installations.find((i) => i.id === intv.installation_id);
                return (
                  <div key={intv.id} style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: colors.text, fontSize: 15 }}>
                          {inst ? `${inst.type_installation} — ${inst.marque_equipement}` : 'Installation inconnue'}
                        </div>
                        <div style={{ color: colors.textSub, fontSize: 13, marginTop: 2 }}>
                          {inst?.client_name} • {new Date(intv.date_intervention).toLocaleDateString('fr-FR')}
                        </div>
                        {intv.technicien && (
                          <div style={{ color: colors.textSub, fontSize: 13 }}>Tech: {intv.technicien.name}</div>
                        )}
                        {intv.rapport_technique && (
                          <div style={{ color: colors.text, fontSize: 14, marginTop: 6 }}>{intv.rapport_technique}</div>
                        )}
                      </div>
                    </div>
                    {intv.photos.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                        {intv.photos.map((url, idx) => (
                          <img key={idx} src={url} alt="photo" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: `1px solid ${colors.border}` }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* CREATE INSTALLATION MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: colors.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: colors.text }}>Nouvelle installation</div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: colors.textSub }}>×</button>
            </div>

            {[
              { label: 'Client *', type: 'select', key: 'client_id', options: clients.map((c) => ({ value: c.id, label: c.name })) },
              { label: 'Type d\'installation *', type: 'text', key: 'type_installation', placeholder: 'Ex: Climatiseur, Groupe électrogène...' },
              { label: 'Marque / Modèle *', type: 'text', key: 'marque_equipement', placeholder: 'Ex: Samsung, Daikin...' },
              { label: 'Date d\'installation', type: 'date', key: 'date_installation' },
              { label: 'Durée de garantie (mois)', type: 'number', key: 'duree_garantie' },
              { label: 'Notes', type: 'textarea', key: 'notes', placeholder: 'Informations complémentaires...' },
            ].map(({ label, type, key, placeholder, options }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 4 }}>{label}</label>
                {type === 'select' ? (
                  <select
                    value={(form as any)[key]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 14 }}
                  >
                    <option value="">Sélectionner un client</option>
                    {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : type === 'textarea' ? (
                  <textarea
                    value={(form as any)[key]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    rows={3}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                ) : (
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 14, boxSizing: 'border-box' }}
                  />
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.text, cursor: 'pointer', fontSize: 14 }}>
                Annuler
              </button>
              <button onClick={handleCreateInstallation} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: colors.primary, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD INTERVENTION MODAL */}
      {showInterventionModal && selectedInstallation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: colors.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: colors.text }}>Ajouter une intervention</div>
              <button onClick={() => setShowInterventionModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: colors.textSub }}>×</button>
            </div>
            <div style={{ background: darkMode ? '#0f172a' : '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: colors.textSub }}>
              {selectedInstallation.type_installation} — {selectedInstallation.marque_equipement} ({selectedInstallation.client_name})
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 4 }}>Date d'intervention</label>
              <input type="date" value={interventionForm.date_intervention} onChange={(e) => setInterventionForm((p) => ({ ...p, date_intervention: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 14, boxSizing: 'border-box' }} />
            </div>

            {isAdmin(currentUser) && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 4 }}>Technicien</label>
                <select value={interventionForm.technicien_id} onChange={(e) => setInterventionForm((p) => ({ ...p, technicien_id: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 14 }}>
                  <option value="">Moi-même</option>
                  {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 4 }}>Rapport technique</label>
              <textarea value={interventionForm.rapport_technique} onChange={(e) => setInterventionForm((p) => ({ ...p, rapport_technique: e.target.value }))} placeholder="Décrivez les travaux effectués, problèmes constatés..." rows={4} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowInterventionModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.text, cursor: 'pointer', fontSize: 14 }}>
                Annuler
              </button>
              <button onClick={handleAddIntervention} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: colors.primary, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Enregistrement...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallationHistory;
