import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { safeDate } from '../utils/safeFormat';

interface Props {
  currentUser: any;
  darkMode: boolean;
  lang: string;
  onBack: () => void;
}

interface Contrat {
  id: string;
  client_id: string;
  client_name: string;
  type_contrat: 'basique' | 'standard' | 'premium';
  date_debut: string;
  date_fin: string;
  prix_gnf: number;
  frequence_visite: string;
  statut: string;
  notes: string;
  created_at: string;
}

interface Visite {
  id: string;
  contrat_id: string;
  technicien_id: string | null;
  date_visite: string;
  rapport_intervention: string;
  statut: string;
  created_at: string;
  technicien?: { name: string } | null;
  contrat?: { client_name: string; type_contrat: string } | null;
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

const FREQUENCES = [
  { value: 'mensuelle', label: 'Mensuelle (1×/mois)', months: 1 },
  { value: 'trimestrielle', label: 'Trimestrielle (1×/3 mois)', months: 3 },
  { value: 'semestrielle', label: 'Semestrielle (1×/6 mois)', months: 6 },
  { value: 'annuelle', label: 'Annuelle (1×/an)', months: 12 },
];

const TYPE_COLORS: Record<string, string> = {
  basique: '#64748b',
  standard: '#0891b2',
  premium: '#d97706',
};

const TYPE_PRICES: Record<string, number> = {
  basique: 1500000,
  standard: 3000000,
  premium: 6000000,
};

const formatGNF = (amount: number) =>
  new Intl.NumberFormat('fr-GN').format(amount) + ' GNF';

const addMonths = (dateStr: string, months: number): string => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
};

const generateVisitDates = (dateDebut: string, dateFin: string, frequence: string): string[] => {
  const freq = FREQUENCES.find((f) => f.value === frequence);
  if (!freq) return [];
  const dates: string[] = [];
  let current = addMonths(dateDebut, freq.months);
  const end = new Date(dateFin);
  while (new Date(current) <= end) {
    dates.push(current);
    current = addMonths(current, freq.months);
  }
  return dates;
};

const MaintenanceContractManager = ({ currentUser, darkMode, onBack }: Props) => {
  const [activeTab, setActiveTab] = useState<'contrats' | 'visites' | 'revenus'>('contrats');
  const [contrats, setContrats] = useState<Contrat[]>([]);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVisiteModal, setShowVisiteModal] = useState(false);
  const [_selectedContrat, _setSelectedContrat] = useState<Contrat | null>(null);
  const [selectedVisite, setSelectedVisite] = useState<Visite | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');

  const [form, setForm] = useState({
    client_id: '',
    type_contrat: 'basique' as 'basique' | 'standard' | 'premium',
    date_debut: new Date().toISOString().split('T')[0],
    date_fin: addMonths(new Date().toISOString().split('T')[0], 12),
    prix_gnf: TYPE_PRICES.basique,
    frequence_visite: 'trimestrielle',
    notes: '',
  });

  const [visiteForm, setVisiteForm] = useState({
    technicien_id: '',
    rapport_intervention: '',
    statut: 'planifiee',
  });

  const colors = useMemo(() => ({
    primary: '#0891b2',
    background: darkMode ? '#1e293b' : '#f8fafc',
    surface: darkMode ? '#334155' : '#ffffff',
    card: darkMode ? '#1e293b' : '#ffffff',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#475569' : '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  }), [darkMode]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadContrats(), loadVisites(), loadClients(), loadTechnicians()]);
    setLoading(false);
  };

  const loadContrats = async () => {
    const { data, error } = await supabase
      .from('contrats_maintenance')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setContrats(data);
  };

  const loadVisites = async () => {
    const { data, error } = await supabase
      .from('visites_contrat')
      .select('*, contrat:contrat_id(client_name, type_contrat)')
      .order('date_visite', { ascending: true });
    if (!error && data) {
      const withTechs = await Promise.all(
        data.map(async (v: any) => {
          if (!v.technicien_id) return { ...v, technicien: null };
          const { data: tech } = await supabase
            .from('app_users')
            .select('name')
            .eq('id', v.technicien_id)
            .maybeSingle();
          return { ...v, technicien: tech };
        })
      );
      setVisites(withTechs);
    }
  };

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('app_users')
      .select('id, name, phone')
      .eq('role', 'client')
      .order('name');
    if (!error && data) setClients(data);
  };

  const loadTechnicians = async () => {
    const { data, error } = await supabase
      .from('app_users')
      .select('id, name')
      .eq('role', 'tech')
      .order('name');
    if (!error && data) setTechnicians(data);
  };

  const handleCreateContrat = async () => {
    if (!form.client_id) {
      setMessage('Veuillez sélectionner un client');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const selectedClient = clients.find((c) => c.id === form.client_id);
      const { data: contratData, error } = await supabase
        .from('contrats_maintenance')
        .insert({
          client_id: form.client_id,
          client_name: selectedClient?.name || '',
          type_contrat: form.type_contrat,
          date_debut: form.date_debut,
          date_fin: form.date_fin,
          prix_gnf: form.prix_gnf,
          frequence_visite: form.frequence_visite,
          statut: 'actif',
          notes: form.notes,
          created_by: currentUser?.id,
        })
        .select()
        .single();

      if (error) throw error;

      const visitDates = generateVisitDates(form.date_debut, form.date_fin, form.frequence_visite);
      if (visitDates.length > 0) {
        const visitInserts = visitDates.map((date) => ({
          contrat_id: contratData.id,
          date_visite: date,
          statut: 'planifiee',
          rapport_intervention: '',
        }));
        await supabase.from('visites_contrat').insert(visitInserts);
      }

      await sendNotificationToClient(form.client_id, contratData.id);

      setMessage(`Contrat créé avec ${visitDates.length} visite(s) planifiée(s)`);
      setShowCreateModal(false);
      setForm({
        client_id: '',
        type_contrat: 'basique',
        date_debut: new Date().toISOString().split('T')[0],
        date_fin: addMonths(new Date().toISOString().split('T')[0], 12),
        prix_gnf: TYPE_PRICES.basique,
        frequence_visite: 'trimestrielle',
        notes: '',
      });
      await loadData();
    } catch (err: any) {
      setMessage('Erreur: ' + (err.message || 'Impossible de créer le contrat'));
    } finally {
      setSaving(false);
    }
  };

  const sendNotificationToClient = async (clientId: string, contratId: string) => {
    try {
      await supabase.from('notifications').insert({
        user_id: clientId,
        title: 'Contrat de maintenance activé',
        message: `Votre contrat de maintenance a été créé. Réf: ${contratId.slice(0, 8).toUpperCase()}`,
        type: 'info',
        read: false,
      });
    } catch {
    }
  };

  const notifyTechnicien = async (technicienId: string, dateVisite: string, clientName: string) => {
    try {
      await supabase.from('notifications').insert({
        user_id: technicienId,
        title: 'Visite de maintenance planifiée',
        message: `Vous avez une visite de maintenance chez ${clientName} le ${safeDate(dateVisite)}`,
        type: 'info',
        read: false,
      });
    } catch {
    }
  };

  const handleUpdateVisite = async () => {
    if (!selectedVisite) return;
    setSaving(true);
    setMessage('');
    try {
      const { error } = await supabase
        .from('visites_contrat')
        .update({
          technicien_id: visiteForm.technicien_id || null,
          rapport_intervention: visiteForm.rapport_intervention,
          statut: visiteForm.statut,
        })
        .eq('id', selectedVisite.id);

      if (error) throw error;

      if (visiteForm.technicien_id && visiteForm.technicien_id !== selectedVisite.technicien_id) {
        const contrat = contrats.find((c) => c.id === selectedVisite.contrat_id);
        if (contrat) {
          await notifyTechnicien(visiteForm.technicien_id, selectedVisite.date_visite, contrat.client_name);
        }
      }

      setMessage('Visite mise à jour');
      setShowVisiteModal(false);
      await loadVisites();
    } catch (err: any) {
      setMessage('Erreur: ' + (err.message || 'Impossible de mettre à jour'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatutContrat = async (contratId: string, newStatut: string) => {
    const { error } = await supabase
      .from('contrats_maintenance')
      .update({ statut: newStatut })
      .eq('id', contratId);
    if (!error) await loadContrats();
  };

  const contratsFiltres = useMemo(() => {
    if (filterStatut === 'tous') return contrats;
    return contrats.filter((c) => c.statut === filterStatut);
  }, [contrats, filterStatut]);

  const revenusStats = useMemo(() => {
    const actifs = contrats.filter((c) => c.statut === 'actif');
    const totalActif = actifs.reduce((s, c) => s + Number(c.prix_gnf), 0);
    const byType = { basique: 0, standard: 0, premium: 0 };
    actifs.forEach((c) => {
      if (c.type_contrat in byType) byType[c.type_contrat as keyof typeof byType] += Number(c.prix_gnf);
    });
    const visitesEffectuees = visites.filter((v) => v.statut === 'terminee').length;
    const visitesAVenir = visites.filter((v) => v.statut === 'planifiee' && new Date(v.date_visite) >= new Date()).length;
    return { totalActif, byType, totalContrats: actifs.length, visitesEffectuees, visitesAVenir };
  }, [contrats, visites]);

  const statutColor = (s: string) => {
    if (s === 'actif') return colors.success;
    if (s === 'suspendu') return colors.warning;
    if (s === 'expire' || s === 'annule') return colors.danger;
    return colors.textSecondary;
  };

  const visiteStatutColor = (s: string) => {
    if (s === 'terminee') return colors.success;
    if (s === 'planifiee') return colors.primary;
    if (s === 'annulee') return colors.danger;
    return colors.warning;
  };

  const upcomingVisites = useMemo(() =>
    visites
      .filter((v) => v.statut === 'planifiee' && new Date(v.date_visite) >= new Date())
      .slice(0, 10),
    [visites]
  );

  return (
    <div style={{ minHeight: '100vh', background: colors.background }}>
      <div style={{
        background: 'linear-gradient(135deg, #0e7490, #0891b2, #06b6d4)',
        padding: '24px 20px 16px',
        color: '#fff',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 18px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '12px',
          }}
        >
          ← Retour
        </button>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>
          Contrats de Maintenance
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.85 }}>
          {revenusStats.totalContrats} contrat(s) actif(s) · {formatGNF(revenusStats.totalActif)}/an
        </p>
      </div>

      {message && (
        <div style={{
          margin: '12px 16px',
          padding: '12px 16px',
          background: message.startsWith('Erreur') ? '#fef2f2' : '#f0fdf4',
          color: message.startsWith('Erreur') ? colors.danger : colors.success,
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: '600',
          border: `1px solid ${message.startsWith('Erreur') ? '#fecaca' : '#bbf7d0'}`,
        }}>
          {message}
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '2px',
        padding: '12px 16px',
        background: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
      }}>
        {(['contrats', 'visites', 'revenus'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px 4px',
              background: activeTab === tab
                ? 'linear-gradient(135deg, #0891b2, #06b6d4)'
                : 'transparent',
              color: activeTab === tab ? '#fff' : colors.textSecondary,
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s',
            }}
          >
            {tab === 'contrats' ? 'Contrats' : tab === 'visites' ? 'Visites' : 'Revenus'}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px', paddingBottom: '100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: colors.textSecondary }}>
            Chargement...
          </div>
        ) : (
          <>
            {activeTab === 'contrats' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <select
                    value={filterStatut}
                    onChange={(e) => setFilterStatut(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: colors.surface,
                      color: colors.text,
                      fontSize: '13px',
                    }}
                  >
                    <option value="tous">Tous les statuts</option>
                    <option value="actif">Actifs</option>
                    <option value="suspendu">Suspendus</option>
                    <option value="expire">Expirés</option>
                    <option value="annule">Annulés</option>
                  </select>

                  <button
                    onClick={() => setShowCreateModal(true)}
                    style={{
                      background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 20px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    + Nouveau contrat
                  </button>
                </div>

                {contratsFiltres.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: colors.textSecondary,
                    background: colors.surface,
                    borderRadius: '16px',
                  }}>
                    Aucun contrat trouvé
                  </div>
                ) : (
                  contratsFiltres.map((contrat) => (
                    <div
                      key={contrat.id}
                      style={{
                        background: colors.card,
                        borderRadius: '16px',
                        padding: '16px',
                        marginBottom: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        border: `1px solid ${colors.border}`,
                        borderLeft: `4px solid ${TYPE_COLORS[contrat.type_contrat]}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                              background: TYPE_COLORS[contrat.type_contrat],
                              color: '#fff',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                            }}>
                              {contrat.type_contrat}
                            </span>
                            <span style={{
                              color: statutColor(contrat.statut),
                              fontSize: '12px',
                              fontWeight: '600',
                            }}>
                              ● {contrat.statut}
                            </span>
                          </div>
                          <p style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '700', color: colors.text }}>
                            {contrat.client_name}
                          </p>
                          <p style={{ margin: '0 0 4px', fontSize: '13px', color: colors.textSecondary }}>
                            {safeDate(contrat.date_debut)} → {safeDate(contrat.date_fin)}
                          </p>
                          <p style={{ margin: '0 0 4px', fontSize: '13px', color: colors.textSecondary }}>
                            Fréquence: {FREQUENCES.find((f) => f.value === contrat.frequence_visite)?.label || contrat.frequence_visite}
                          </p>
                          <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: colors.primary }}>
                            {formatGNF(contrat.prix_gnf)}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: '8px' }}>
                          {contrat.statut === 'actif' && (
                            <button
                              onClick={() => handleUpdateStatutContrat(contrat.id, 'suspendu')}
                              style={{
                                background: colors.warning,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              Suspendre
                            </button>
                          )}
                          {contrat.statut === 'suspendu' && (
                            <button
                              onClick={() => handleUpdateStatutContrat(contrat.id, 'actif')}
                              style={{
                                background: colors.success,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              Réactiver
                            </button>
                          )}
                          {contrat.statut !== 'annule' && contrat.statut !== 'expire' && (
                            <button
                              onClick={() => handleUpdateStatutContrat(contrat.id, 'annule')}
                              style={{
                                background: colors.danger,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              Annuler
                            </button>
                          )}
                        </div>
                      </div>
                      {contrat.notes && (
                        <p style={{
                          margin: '8px 0 0',
                          padding: '8px',
                          background: colors.background,
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: colors.textSecondary,
                        }}>
                          {contrat.notes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === 'visites' && (
              <>
                <h3 style={{ margin: '0 0 12px', color: colors.text, fontSize: '16px', fontWeight: '700' }}>
                  Prochaines visites
                </h3>
                {upcomingVisites.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: colors.textSecondary,
                    background: colors.surface,
                    borderRadius: '16px',
                    marginBottom: '20px',
                  }}>
                    Aucune visite planifiée
                  </div>
                ) : (
                  upcomingVisites.map((visite) => (
                    <div
                      key={visite.id}
                      style={{
                        background: colors.card,
                        borderRadius: '14px',
                        padding: '14px',
                        marginBottom: '10px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        border: `1px solid ${colors.border}`,
                        borderLeft: `4px solid ${visiteStatutColor(visite.statut)}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ margin: '0 0 2px', fontWeight: '700', fontSize: '15px', color: colors.text }}>
                            {visite.contrat?.client_name || 'Client inconnu'}
                          </p>
                          <p style={{ margin: '0 0 2px', fontSize: '13px', color: colors.textSecondary }}>
                            {safeDate(visite.date_visite)}
                          </p>
                          <p style={{ margin: 0, fontSize: '12px', color: visite.technicien ? colors.success : colors.warning }}>
                            {visite.technicien ? `Technicien: ${visite.technicien.name}` : 'Aucun technicien assigné'}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedVisite(visite);
                            setVisiteForm({
                              technicien_id: visite.technicien_id || '',
                              rapport_intervention: visite.rapport_intervention || '',
                              statut: visite.statut,
                            });
                            setShowVisiteModal(true);
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Gérer
                        </button>
                      </div>
                    </div>
                  ))
                )}

                <h3 style={{ margin: '20px 0 12px', color: colors.text, fontSize: '16px', fontWeight: '700' }}>
                  Toutes les visites
                </h3>
                {visites.map((visite) => (
                  <div
                    key={visite.id}
                    style={{
                      background: colors.card,
                      borderRadius: '12px',
                      padding: '12px 14px',
                      marginBottom: '8px',
                      border: `1px solid ${colors.border}`,
                      borderLeft: `3px solid ${visiteStatutColor(visite.statut)}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                          {visite.contrat?.client_name || 'Client'}
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: colors.textSecondary }}>
                          {safeDate(visite.date_visite)} · {visite.statut}
                          {visite.technicien ? ` · ${visite.technicien.name}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedVisite(visite);
                          setVisiteForm({
                            technicien_id: visite.technicien_id || '',
                            rapport_intervention: visite.rapport_intervention || '',
                            statut: visite.statut,
                          });
                          setShowVisiteModal(true);
                        }}
                        style={{
                          background: 'transparent',
                          color: colors.primary,
                          border: `1px solid ${colors.primary}`,
                          borderRadius: '6px',
                          padding: '5px 10px',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        Modifier
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'revenus' && (
              <>
                <div style={{
                  background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                  borderRadius: '16px',
                  padding: '20px',
                  color: '#fff',
                  marginBottom: '16px',
                }}>
                  <p style={{ margin: '0 0 4px', fontSize: '13px', opacity: 0.9 }}>Revenus annuels (contrats actifs)</p>
                  <p style={{ margin: 0, fontSize: '28px', fontWeight: '800' }}>{formatGNF(revenusStats.totalActif)}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    background: colors.card,
                    borderRadius: '12px',
                    padding: '16px',
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                  }}>
                    <p style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: '800', color: colors.text }}>{revenusStats.totalContrats}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: colors.textSecondary }}>Contrats actifs</p>
                  </div>
                  <div style={{
                    background: colors.card,
                    borderRadius: '12px',
                    padding: '16px',
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                  }}>
                    <p style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: '800', color: colors.success }}>{revenusStats.visitesEffectuees}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: colors.textSecondary }}>Visites effectuées</p>
                  </div>
                  <div style={{
                    background: colors.card,
                    borderRadius: '12px',
                    padding: '16px',
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                  }}>
                    <p style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: '800', color: colors.warning }}>{revenusStats.visitesAVenir}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: colors.textSecondary }}>Visites à venir</p>
                  </div>
                  <div style={{
                    background: colors.card,
                    borderRadius: '12px',
                    padding: '16px',
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                  }}>
                    <p style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: '800', color: colors.primary }}>
                      {revenusStats.totalActif > 0 ? formatGNF(Math.round(revenusStats.totalActif / 12)) : '0 GNF'}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: colors.textSecondary }}>Revenus/mois</p>
                  </div>
                </div>

                <h3 style={{ margin: '0 0 12px', color: colors.text, fontSize: '15px', fontWeight: '700' }}>
                  Revenus par type
                </h3>
                {(['basique', 'standard', 'premium'] as const).map((type) => (
                  <div
                    key={type}
                    style={{
                      background: colors.card,
                      borderRadius: '12px',
                      padding: '14px 16px',
                      marginBottom: '10px',
                      border: `1px solid ${colors.border}`,
                      borderLeft: `4px solid ${TYPE_COLORS[type]}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: colors.text, textTransform: 'capitalize' }}>
                        {type}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: colors.textSecondary }}>
                        {contrats.filter((c) => c.type_contrat === type && c.statut === 'actif').length} contrat(s)
                      </p>
                    </div>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: TYPE_COLORS[type] }}>
                      {formatGNF(revenusStats.byType[type])}
                    </p>
                  </div>
                ))}

                <h3 style={{ margin: '16px 0 12px', color: colors.text, fontSize: '15px', fontWeight: '700' }}>
                  Tous les contrats
                </h3>
                {contrats.map((contrat) => (
                  <div
                    key={contrat.id}
                    style={{
                      background: colors.card,
                      borderRadius: '10px',
                      padding: '12px 14px',
                      marginBottom: '8px',
                      border: `1px solid ${colors.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '600', color: colors.text }}>
                        {contrat.client_name}
                      </p>
                      <p style={{ margin: 0, fontSize: '11px', color: colors.textSecondary }}>
                        {contrat.type_contrat} · {contrat.statut}
                      </p>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: contrat.statut === 'actif' ? colors.success : colors.textSecondary }}>
                      {formatGNF(contrat.prix_gnf)}
                    </p>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-end',
        }}>
          <div style={{
            background: colors.card,
            borderRadius: '20px 20px 0 0',
            padding: '24px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: colors.text, fontSize: '18px', fontWeight: '800' }}>
                Nouveau contrat de maintenance
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: colors.textSecondary }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: colors.textSecondary }}>
                  Client *
                </label>
                <select
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: colors.surface,
                    color: colors.text,
                    fontSize: '14px',
                  }}
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: colors.textSecondary }}>
                  Type de contrat
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {(['basique', 'standard', 'premium'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setForm({ ...form, type_contrat: type, prix_gnf: TYPE_PRICES[type] })}
                      style={{
                        padding: '12px 8px',
                        background: form.type_contrat === type ? TYPE_COLORS[type] : colors.surface,
                        color: form.type_contrat === type ? '#fff' : colors.text,
                        border: `2px solid ${form.type_contrat === type ? TYPE_COLORS[type] : colors.border}`,
                        borderRadius: '10px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        fontSize: '12px',
                        textTransform: 'capitalize',
                        transition: 'all 0.2s',
                      }}
                    >
                      {type}
                      <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.8 }}>
                        {formatGNF(TYPE_PRICES[type])}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: colors.textSecondary }}>
                  Prix (GNF)
                </label>
                <input
                  type="number"
                  value={form.prix_gnf}
                  onChange={(e) => setForm({ ...form, prix_gnf: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: colors.surface,
                    color: colors.text,
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: colors.textSecondary }}>
                    Date début
                  </label>
                  <input
                    type="date"
                    value={form.date_debut}
                    onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: `1px solid ${colors.border}`,
                      background: colors.surface,
                      color: colors.text,
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: colors.textSecondary }}>
                    Date fin
                  </label>
                  <input
                    type="date"
                    value={form.date_fin}
                    onChange={(e) => setForm({ ...form, date_fin: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: `1px solid ${colors.border}`,
                      background: colors.surface,
                      color: colors.text,
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: colors.textSecondary }}>
                  Fréquence des visites
                </label>
                <select
                  value={form.frequence_visite}
                  onChange={(e) => setForm({ ...form, frequence_visite: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: colors.surface,
                    color: colors.text,
                    fontSize: '14px',
                  }}
                >
                  {FREQUENCES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.textSecondary }}>
                  {generateVisitDates(form.date_debut, form.date_fin, form.frequence_visite).length} visite(s) seront planifiées automatiquement
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: colors.textSecondary }}>
                  Notes (optionnel)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: colors.surface,
                    color: colors.text,
                    fontSize: '14px',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                onClick={handleCreateContrat}
                disabled={saving}
                style={{
                  background: saving ? colors.textSecondary : 'linear-gradient(135deg, #0891b2, #06b6d4)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  fontWeight: '800',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  marginTop: '4px',
                }}
              >
                {saving ? 'Création en cours...' : 'Créer le contrat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVisiteModal && selectedVisite && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-end',
        }}>
          <div style={{
            background: colors.card,
            borderRadius: '20px 20px 0 0',
            padding: '24px',
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: '0 0 2px', color: colors.text, fontSize: '17px', fontWeight: '800' }}>
                  Gérer la visite
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: colors.textSecondary }}>
                  {selectedVisite.contrat?.client_name} · {safeDate(selectedVisite.date_visite)}
                </p>
              </div>
              <button
                onClick={() => setShowVisiteModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: colors.textSecondary }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: colors.textSecondary }}>
                  Technicien assigné
                </label>
                <select
                  value={visiteForm.technicien_id}
                  onChange={(e) => setVisiteForm({ ...visiteForm, technicien_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: colors.surface,
                    color: colors.text,
                    fontSize: '14px',
                  }}
                >
                  <option value="">Aucun technicien</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: colors.textSecondary }}>
                  Statut
                </label>
                <select
                  value={visiteForm.statut}
                  onChange={(e) => setVisiteForm({ ...visiteForm, statut: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: colors.surface,
                    color: colors.text,
                    fontSize: '14px',
                  }}
                >
                  <option value="planifiee">Planifiée</option>
                  <option value="terminee">Terminée</option>
                  <option value="annulee">Annulée</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: colors.textSecondary }}>
                  Rapport d'intervention
                </label>
                <textarea
                  value={visiteForm.rapport_intervention}
                  onChange={(e) => setVisiteForm({ ...visiteForm, rapport_intervention: e.target.value })}
                  rows={4}
                  placeholder="Décrire les travaux effectués..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: colors.surface,
                    color: colors.text,
                    fontSize: '14px',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                onClick={handleUpdateVisite}
                disabled={saving}
                style={{
                  background: saving ? colors.textSecondary : 'linear-gradient(135deg, #0891b2, #06b6d4)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  fontWeight: '800',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                }}
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceContractManager;
