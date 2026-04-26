import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { safeFixed, safeDate } from '../../utils/safeFormat';

interface Props {
  currentUser: any;
  darkMode: boolean;
  lang: string;
}

interface HeureTravail {
  id: string;
  date: string;
  nombre_heures: number;
  tarif_horaire_gnf: number;
  total_gnf: number;
  intervention?: { titre: string } | null;
}

interface FichePaie {
  id: string;
  mois: number;
  annee: number;
  total_heures: number;
  salaire_brut: number;
  primes: number;
  avances: number;
  salaire_net: number;
}

type Tab = 'heures' | 'paie';

const MOIS_LABELS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const fmtGNF = (n: number) =>
  new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF', maximumFractionDigits: 0 }).format(n);

export default function SalaryEmployeePanel({ currentUser, darkMode }: Props) {
  const [tab, setTab] = useState<Tab>('heures');
  const [heures, setHeures] = useState<HeureTravail[]>([]);
  const [fiches, setFiches] = useState<FichePaie[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMois, setFilterMois] = useState(String(new Date().getMonth() + 1));
  const [filterAnnee, setFilterAnnee] = useState(String(new Date().getFullYear()));
  const [selectedFiche, setSelectedFiche] = useState<FichePaie | null>(null);

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

  const input = {
    padding: '8px 12px', borderRadius: 8, border: `1px solid ${colors.border}`,
    background: colors.surface, color: colors.text, fontSize: 13,
  };

  useEffect(() => {
    if (currentUser?.id) {
      setLoading(true);
      Promise.all([loadHeures(), loadFiches()]).then(() => setLoading(false));
    }
  }, [currentUser?.id]);

  const loadHeures = async () => {
    const { data } = await supabase
      .from('heures_travail')
      .select('*, intervention:intervention_id(titre)')
      .eq('employe_id', currentUser.id)
      .order('date', { ascending: false });
    if (data) setHeures(data as HeureTravail[]);
  };

  const loadFiches = async () => {
    const { data } = await supabase
      .from('fiches_paie')
      .select('*')
      .eq('employe_id', currentUser.id)
      .order('annee', { ascending: false })
      .order('mois', { ascending: false });
    if (data) setFiches(data as FichePaie[]);
  };

  const filteredHeures = useMemo(() => heures.filter(h => {
    const d = new Date(h.date);
    if (filterMois && d.getMonth() + 1 !== parseInt(filterMois)) return false;
    if (filterAnnee && d.getFullYear() !== parseInt(filterAnnee)) return false;
    return true;
  }), [heures, filterMois, filterAnnee]);

  const filteredFiches = useMemo(() => fiches.filter(f => {
    if (filterMois && f.mois !== parseInt(filterMois)) return false;
    if (filterAnnee && f.annee !== parseInt(filterAnnee)) return false;
    return true;
  }), [fiches, filterMois, filterAnnee]);

  const totalHeuresMois = filteredHeures.reduce((s, h) => s + h.nombre_heures, 0);
  const totalGNFMois = filteredHeures.reduce((s, h) => s + h.total_gnf, 0);

  const exportPayslip = (fiche: FichePaie) => {
    const content = `
FICHE DE PAIE - TSD & Fils
===========================
Employé : ${currentUser?.name || 'N/A'}
Poste   : ${currentUser?.role || 'N/A'}
Période : ${MOIS_LABELS[fiche.mois]} ${fiche.annee}
---
Total heures  : ${fiche.total_heures} h
Salaire brut  : ${fmtGNF(fiche.salaire_brut)}
Primes        : ${fmtGNF(fiche.primes)}
Avances       : ${fmtGNF(fiche.avances)}
---
SALAIRE NET   : ${fmtGNF(fiche.salaire_net)}
===========================
Généré le ${new Date().toLocaleDateString('fr-FR')}
    `;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ma_fiche_paie_${fiche.mois}_${fiche.annee}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: colors.primary }}>
        Chargement...
      </div>
    );
  }

  return (
    <div style={{ background: colors.bg, minHeight: '100%', fontFamily: 'system-ui, sans-serif', paddingBottom: 40 }}>

      {/* Summary card */}
      <div style={{ margin: '0 20px 20px', background: `linear-gradient(135deg, #0e7490, #0891b2)`, borderRadius: 16, padding: '20px 24px', color: '#fff' }}>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>Bonjour, {currentUser?.name}</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>{fmtGNF(totalGNFMois)}</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>Gagné ce mois ({safeFixed(totalHeuresMois, 1)} heures)</div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px', flexWrap: 'wrap' }}>
        <select value={filterMois} onChange={e => setFilterMois(e.target.value)} style={input}>
          {MOIS_LABELS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)} style={input}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px' }}>
        {([['heures', 'Mes Heures'], ['paie', 'Mes Fiches de Paie']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            background: tab === id ? colors.primary : colors.surface,
            color: tab === id ? '#fff' : colors.text,
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: '0 20px' }}>

        {/* ===== MES HEURES ===== */}
        {tab === 'heures' && (
          <div>
            {filteredHeures.length === 0 ? (
              <div style={{ textAlign: 'center', color: colors.textSub, padding: 40 }}>
                Aucune heure enregistrée pour cette période
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredHeures.map(h => (
                  <div key={h.id} style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: colors.text, fontSize: 14 }}>
                          {safeDate(h.date)}
                        </div>
                        <div style={{ color: colors.textSub, fontSize: 13, marginTop: 2 }}>
                          {h.nombre_heures} h • {fmtGNF(h.tarif_horaire_gnf)}/h
                        </div>
                        {h.intervention?.titre && (
                          <div style={{ color: colors.primary, fontSize: 12, marginTop: 2 }}>{h.intervention.titre}</div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: colors.success }}>{fmtGNF(h.total_gnf)}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total row */}
                <div style={{ background: darkMode ? '#0f172a' : '#f0fdf4', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 4 }}>
                  <span style={{ color: colors.text }}>Total ({safeFixed(totalHeuresMois, 1)} h)</span>
                  <span style={{ color: colors.success }}>{fmtGNF(totalGNFMois)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== MES FICHES DE PAIE ===== */}
        {tab === 'paie' && (
          <div>
            {filteredFiches.length === 0 ? (
              <div style={{ textAlign: 'center', color: colors.textSub, padding: 40 }}>
                Aucune fiche de paie pour cette période
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredFiches.map(f => (
                  <div key={f.id} style={{ background: colors.card, borderRadius: 14, border: `1px solid ${colors.border}`, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: colors.text, fontSize: 16 }}>
                          {MOIS_LABELS[f.mois]} {f.annee}
                        </div>
                        <div style={{ color: colors.textSub, fontSize: 13, marginTop: 2 }}>{f.total_heures} heures travaillées</div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap', fontSize: 13 }}>
                          <span style={{ color: colors.textSub }}>Brut: <strong style={{ color: colors.text }}>{fmtGNF(f.salaire_brut)}</strong></span>
                          {f.primes > 0 && <span style={{ color: colors.textSub }}>Primes: <strong style={{ color: colors.success }}>+{fmtGNF(f.primes)}</strong></span>}
                          {f.avances > 0 && <span style={{ color: colors.textSub }}>Avances: <strong style={{ color: colors.danger }}>-{fmtGNF(f.avances)}</strong></span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: colors.success }}>{fmtGNF(f.salaire_net)}</div>
                        <div style={{ color: colors.textSub, fontSize: 11, marginTop: 2 }}>Net</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button
                        onClick={() => setSelectedFiche(f)}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.text, cursor: 'pointer', fontSize: 13 }}
                      >
                        Voir détail
                      </button>
                      <button
                        onClick={() => exportPayslip(f)}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: colors.primary, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        Télécharger
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== MODAL: Détail Fiche ===== */}
      {selectedFiche && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: colors.surface, borderRadius: 16, padding: 28, width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: colors.text }}>Fiche de Paie</div>
              <button onClick={() => setSelectedFiche(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: colors.textSub }}>×</button>
            </div>
            <div style={{ background: `linear-gradient(135deg, #0e7490, #0891b2)`, borderRadius: 10, padding: '14px 18px', marginBottom: 16, color: '#fff' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{currentUser?.name}</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{MOIS_LABELS[selectedFiche.mois]} {selectedFiche.annee}</div>
            </div>
            {[
              ['Total heures', `${selectedFiche.total_heures} h`, colors.text],
              ['Salaire brut', fmtGNF(selectedFiche.salaire_brut), colors.text],
              ['Primes', `+ ${fmtGNF(selectedFiche.primes)}`, colors.success],
              ['Avances', `- ${fmtGNF(selectedFiche.avances)}`, colors.danger],
            ].map(([label, val, col]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 14 }}>
                <span style={{ color: colors.textSub }}>{label}</span>
                <span style={{ fontWeight: 600, color: col as string }}>{val}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 4px', fontSize: 18, fontWeight: 700 }}>
              <span style={{ color: colors.text }}>Salaire Net</span>
              <span style={{ color: colors.success }}>{fmtGNF(selectedFiche.salaire_net)}</span>
            </div>
            <button
              onClick={() => exportPayslip(selectedFiche)}
              style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: colors.primary, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, marginTop: 16 }}
            >
              Télécharger ma fiche
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
