import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { safeFixed, safeDate } from '../../utils/safeFormat';

interface Props {
  darkMode: boolean;
  lang: string;
}

interface TarifHoraire {
  id: string;
  categorie: 'technicien' | 'employe_bureau';
  role: string;
  tarif_client_gnf: number;
  tarif_client_eur: number;
  salaire_horaire_gnf: number;
  date_creation: string;
}

interface HeureTravail {
  id: string;
  employe_id: string;
  intervention_id: string | null;
  date: string;
  nombre_heures: number;
  tarif_horaire_gnf: number;
  total_gnf: number;
  employe?: { name: string; role: string } | null;
  intervention?: { titre: string } | null;
}

interface FichePaie {
  id: string;
  employe_id: string;
  mois: number;
  annee: number;
  total_heures: number;
  salaire_brut: number;
  primes: number;
  avances: number;
  salaire_net: number;
  nombre_absences: number;
  motifs_absences: string;
  salaire_horaire_brut: number;
  echelon: string;
  retenue_18_pourcent: number;
  employe?: { name: string; role: string } | null;
}

interface Absence {
  id: string;
  employe_id: string;
  date_debut: string;
  date_fin: string;
  nombre_jours: number;
  motif: string;
  justifie: boolean;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  echelon: string | null;
  office_position: string | null;
}

type Tab = 'tarifs' | 'heures' | 'paie';


const ROLE_LABELS: Record<string, string> = {
  apprenti: 'Apprenti',
  manoeuvre: 'Manoeuvre',
  manoeuvre_specialise: 'Manoeuvre Spécialisé',
  manoeuvre_specialise_elite: 'Manoeuvre Spécialisé Elite',
  qualifie_niveau_1: 'Qualifié Niveau 1',
  qualifie_niveau_2: 'Qualifié Niveau 2',
  chef_equipe_A: 'Chef d\'Équipe A',
  chef_equipe_B: 'Chef d\'Équipe B',
  contremaitre: 'Contremaître',
  directeur: 'Directeur',
  responsable_RH: 'Responsable RH',
  responsable_administratif_financier: 'Responsable Administratif & Financier',
  secretaire_assistante_administrative: 'Secrétaire / Assistante Administrative',
  comptable: 'Comptable',
};

const MOIS_LABELS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const fmtGNF = (n: number) => new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF', maximumFractionDigits: 0 }).format(n);
const fmtEUR = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

export default function SalaryAdminPanel({ darkMode }: Props) {
  const [tab, setTab] = useState<Tab>('tarifs');
  const [tarifs, setTarifs] = useState<TarifHoraire[]>([]);
  const [heures, setHeures] = useState<HeureTravail[]>([]);
  const [fiches, setFiches] = useState<FichePaie[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingTarif, setEditingTarif] = useState<TarifHoraire | null>(null);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchEdits, setBatchEdits] = useState<Record<string, { tarif_client_gnf: number; tarif_client_eur: number; salaire_horaire_gnf: number }>>({});
  const [batchSaving, setBatchSaving] = useState(false);
  const [showHeureModal, setShowHeureModal] = useState(false);
  const [showPaieModal, setShowPaieModal] = useState(false);
  const [showPaieDetail, setShowPaieDetail] = useState<FichePaie | null>(null);
  const [filterEmploye, setFilterEmploye] = useState('');
  const [filterMois, setFilterMois] = useState('');
  const [filterAnnee, setFilterAnnee] = useState(String(new Date().getFullYear()));
  const [paieLoading, setPaieLoading] = useState(false);

  const [heureForm, setHeureForm] = useState({
    employe_id: '', date: new Date().toISOString().split('T')[0],
    nombre_heures: '', tarif_horaire_gnf: '',
  });
  const [paieForm, setPaieForm] = useState({
    employe_id: '', mois: String(new Date().getMonth() + 1),
    annee: String(new Date().getFullYear()),
    total_heures: '', salaire_brut: '', primes: '0', avances: '0',
    echelon: '', nombre_absences: '0', motifs_absences: '', salaire_horaire_brut: '',
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

  const input = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${colors.border}`, background: colors.surface,
    color: colors.text, fontSize: 14, boxSizing: 'border-box' as const,
  };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadTarifs(), loadHeures(), loadFiches(), loadEmployees(), loadAbsences()]);
    setLoading(false);
  };

  const loadTarifs = async () => {
    const { data } = await supabase.from('tarifs_horaires').select('*').order('categorie').order('role');
    if (data) setTarifs(data as TarifHoraire[]);
  };

  const loadHeures = async () => {
    const { data } = await supabase
      .from('heures_travail')
      .select('*, employe:employe_id(name, role), intervention:intervention_id(titre)')
      .order('date', { ascending: false })
      .limit(200);
    if (data) setHeures(data as HeureTravail[]);
  };

  const loadFiches = async () => {
    const { data } = await supabase
      .from('fiches_paie')
      .select('*, employe:employe_id(name, role)')
      .order('annee', { ascending: false })
      .order('mois', { ascending: false });
    if (data) setFiches(data as FichePaie[]);
  };

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('app_users')
      .select('id, name, role, echelon, office_position')
      .in('role', ['admin', 'tech', 'office', 'office_employee', 'technician'])
      .order('name');
    if (data) setEmployees(data);
  };

  const loadAbsences = async () => {
    const { data } = await supabase
      .from('absences')
      .select('*')
      .order('date_debut', { ascending: false });
    if (data) setAbsences(data as Absence[]);
  };

  const saveTarif = useCallback(async () => {
    if (!editingTarif) return;
    const { error } = await supabase
      .from('tarifs_horaires')
      .update({
        tarif_client_gnf: editingTarif.tarif_client_gnf,
        tarif_client_eur: editingTarif.tarif_client_eur,
        salaire_horaire_gnf: editingTarif.salaire_horaire_gnf,
      })
      .eq('id', editingTarif.id);
    if (error) { setMessage('Erreur: ' + error.message); return; }
    setMessage('Tarif mis à jour avec succès');
    setEditingTarif(null);
    await loadTarifs();
  }, [editingTarif]);

  const enterBatchEdit = useCallback(() => {
    const initial: Record<string, { tarif_client_gnf: number; tarif_client_eur: number; salaire_horaire_gnf: number }> = {};
    tarifs.forEach(t => {
      initial[t.id] = {
        tarif_client_gnf: t.tarif_client_gnf,
        tarif_client_eur: t.tarif_client_eur,
        salaire_horaire_gnf: t.salaire_horaire_gnf,
      };
    });
    setBatchEdits(initial);
    setBatchEditMode(true);
  }, [tarifs]);

  const cancelBatchEdit = useCallback(() => {
    setBatchEditMode(false);
    setBatchEdits({});
  }, []);

  const saveBatchEdits = useCallback(async () => {
    setBatchSaving(true);
    setMessage('');
    const ids = Object.keys(batchEdits);
    let hasError = false;
    for (const id of ids) {
      const vals = batchEdits[id];
      const { error } = await supabase
        .from('tarifs_horaires')
        .update({
          tarif_client_gnf: vals.tarif_client_gnf,
          tarif_client_eur: vals.tarif_client_eur,
          salaire_horaire_gnf: vals.salaire_horaire_gnf,
        })
        .eq('id', id);
      if (error) { hasError = true; setMessage('Erreur sur ID ' + id + ': ' + error.message); break; }
    }
    setBatchSaving(false);
    if (!hasError) {
      setMessage(`${ids.length} tarif(s) mis à jour avec succès`);
      setBatchEditMode(false);
      setBatchEdits({});
      await loadTarifs();
    }
  }, [batchEdits]);

  const saveHeure = useCallback(async () => {
    if (!heureForm.employe_id || !heureForm.nombre_heures || !heureForm.tarif_horaire_gnf) {
      setMessage('Veuillez remplir tous les champs obligatoires'); return;
    }
    const { error } = await supabase.from('heures_travail').insert({
      employe_id: heureForm.employe_id,
      date: heureForm.date,
      nombre_heures: parseFloat(heureForm.nombre_heures),
      tarif_horaire_gnf: parseFloat(heureForm.tarif_horaire_gnf),
    });
    if (error) { setMessage('Erreur: ' + error.message); return; }
    setMessage('Heures enregistrées avec succès');
    setShowHeureModal(false);
    setHeureForm({ employe_id: '', date: new Date().toISOString().split('T')[0], nombre_heures: '', tarif_horaire_gnf: '' });
    await loadHeures();
  }, [heureForm]);

  const savePaie = useCallback(async () => {
    if (!paieForm.employe_id || !paieForm.salaire_brut) {
      setMessage('Veuillez remplir tous les champs obligatoires'); return;
    }
    const brut = parseFloat(paieForm.salaire_brut);
    const retenue = brut * 0.18;
    const primes = parseFloat(paieForm.primes || '0');
    const avances = parseFloat(paieForm.avances || '0');
    const netCalc = brut - retenue + primes - avances;
    const { error } = await supabase.from('fiches_paie').upsert({
      employe_id: paieForm.employe_id,
      mois: parseInt(paieForm.mois),
      annee: parseInt(paieForm.annee),
      total_heures: parseFloat(paieForm.total_heures || '0'),
      salaire_brut: brut,
      retenue_18_pourcent: retenue,
      primes: primes,
      avances: avances,
      salaire_net: netCalc,
      nombre_absences: parseFloat(paieForm.nombre_absences || '0'),
      motifs_absences: paieForm.motifs_absences,
      salaire_horaire_brut: parseFloat(paieForm.salaire_horaire_brut || '0'),
      echelon: paieForm.echelon,
    }, { onConflict: 'employe_id,mois,annee' });
    if (error) { setMessage('Erreur: ' + error.message); return; }
    setMessage('Fiche de paie generee avec succes');
    setShowPaieModal(false);
    setPaieForm({ employe_id: '', mois: String(new Date().getMonth() + 1), annee: String(new Date().getFullYear()), total_heures: '', salaire_brut: '', primes: '0', avances: '0', echelon: '', nombre_absences: '0', motifs_absences: '', salaire_horaire_brut: '' });
    await loadFiches();
  }, [paieForm]);

  const findTarifForEmployee = useCallback((emp: Employee): TarifHoraire | null => {
    const echelon = emp.echelon || emp.office_position || '';
    const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    let match = tarifs.find(t => normalizeStr(t.role) === normalizeStr(echelon));
    if (match) return match;

    match = tarifs.find(t => {
      const tNorm = normalizeStr(t.role);
      const eNorm = normalizeStr(echelon);
      return tNorm.includes(eNorm) || eNorm.includes(tNorm);
    });
    if (match) return match;

    const roleMap: Record<string, string> = {
      tech: 'technicien',
      technician: 'technicien',
      office: 'employe_bureau',
      office_employee: 'employe_bureau',
    };
    const categorie = roleMap[emp.role] || 'technicien';
    match = tarifs.find(t => t.categorie === categorie);
    return match || null;
  }, [tarifs]);

  const autofillSalaire = useCallback(async (employeId: string, mois?: string, annee?: string) => {
    const emp = employees.find(e => e.id === employeId);
    if (!emp) return;

    setPaieLoading(true);
    const currentMois = mois || paieForm.mois;
    const currentAnnee = annee || paieForm.annee;
    const moisNum = parseInt(currentMois);
    const anneeNum = parseInt(currentAnnee);

    const heuresEmp = heures.filter(h => {
      const d = new Date(h.date);
      return h.employe_id === employeId
        && d.getMonth() + 1 === moisNum
        && d.getFullYear() === anneeNum;
    });
    const totalH = heuresEmp.reduce((s, h) => s + h.nombre_heures, 0);

    const tarif = findTarifForEmployee(emp);
    const salaireHoraire = tarif ? tarif.salaire_horaire_gnf : 0;

    const startOfMonth = `${currentAnnee}-${currentMois.padStart(2, '0')}-01`;
    const endMonth = moisNum === 12 ? `${anneeNum + 1}-01-01` : `${currentAnnee}-${String(moisNum + 1).padStart(2, '0')}-01`;

    const absEmp = absences.filter(a => {
      return a.employe_id === employeId
        && a.date_debut < endMonth
        && a.date_fin >= startOfMonth;
    });

    const totalAbsences = absEmp.reduce((s, a) => s + a.nombre_jours, 0);
    const motifs = [...new Set(absEmp.map(a => a.motif).filter(Boolean))].join(', ');

    const salaireBrut = totalH > 0 ? totalH * salaireHoraire : 0;

    const echelonLabel = emp.echelon
      ? (ROLE_LABELS[emp.echelon] || emp.echelon)
      : (emp.office_position || emp.role);

    setPaieForm(f => ({
      ...f,
      employe_id: employeId,
      mois: currentMois,
      annee: currentAnnee,
      total_heures: String(totalH),
      salaire_brut: String(salaireBrut),
      primes: '0',
      avances: '0',
      echelon: echelonLabel,
      nombre_absences: String(totalAbsences),
      motifs_absences: motifs,
      salaire_horaire_brut: String(salaireHoraire),
    }));
    setPaieLoading(false);
  }, [employees, heures, absences, tarifs, paieForm.mois, paieForm.annee, findTarifForEmployee]);

  const autoFillTarifFromRole = useCallback((employeId: string) => {
    const emp = employees.find(e => e.id === employeId);
    if (!emp) return;
    setHeureForm(f => ({ ...f, employe_id: employeId }));
  }, [employees]);

  const filteredHeures = useMemo(() => heures.filter(h => {
    if (filterEmploye && h.employe_id !== filterEmploye) return false;
    if (filterMois) {
      const d = new Date(h.date);
      if (d.getMonth() + 1 !== parseInt(filterMois)) return false;
    }
    if (filterAnnee) {
      const d = new Date(h.date);
      if (d.getFullYear() !== parseInt(filterAnnee)) return false;
    }
    return true;
  }), [heures, filterEmploye, filterMois, filterAnnee]);

  const filteredFiches = useMemo(() => fiches.filter(f => {
    if (filterEmploye && f.employe_id !== filterEmploye) return false;
    if (filterMois && f.mois !== parseInt(filterMois)) return false;
    if (filterAnnee && f.annee !== parseInt(filterAnnee)) return false;
    return true;
  }), [fiches, filterEmploye, filterMois, filterAnnee]);

  const exportPayslipPDF = (fiche: FichePaie) => {
    const emp = fiche.employe;
    const retenue = fiche.retenue_18_pourcent || fiche.salaire_brut * 0.18;
    const content = `
FICHE DE PAIE - TSD & Fils
===========================
Employe        : ${emp?.name || 'N/A'}
Poste          : ${emp?.role || 'N/A'}
Echelon        : ${fiche.echelon || 'N/A'}
Periode        : ${MOIS_LABELS[fiche.mois]} ${fiche.annee}
---
Salaire horaire: ${fiche.salaire_horaire_brut ? fmtGNF(fiche.salaire_horaire_brut) + '/h' : 'N/A'}
Total heures   : ${fiche.total_heures} h
Absences       : ${fiche.nombre_absences || 0} jour(s)${fiche.motifs_absences ? ' - ' + fiche.motifs_absences : ''}
Salaire brut   : ${fmtGNF(fiche.salaire_brut)}
Retenue 18%    : - ${fmtGNF(retenue)}
Primes         : + ${fmtGNF(fiche.primes)}
Avances salaire: - ${fmtGNF(fiche.avances)}
---
SALAIRE NET    : ${fmtGNF(fiche.salaire_net)}
===========================
Genere le ${new Date().toLocaleDateString('fr-FR')}
    `;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fiche_paie_${(emp?.name || 'employe').replace(/\s+/g, '_')}_${fiche.mois}_${fiche.annee}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const techTarifs = tarifs.filter(t => t.categorie === 'technicien');
  const officeTarifs = tarifs.filter(t => t.categorie === 'employe_bureau');

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: colors.primary }}>
        Chargement...
      </div>
    );
  }

  return (
    <div style={{ background: colors.bg, minHeight: '100%', fontFamily: 'system-ui, sans-serif', paddingBottom: 40 }}>
      {message && (
        <div style={{
          margin: '0 20px 16px', padding: '10px 14px', borderRadius: 8,
          background: message.startsWith('Erreur') ? '#fee2e2' : '#d1fae5',
          color: message.startsWith('Erreur') ? colors.danger : colors.success, fontSize: 14,
        }}>
          {message}
          <button onClick={() => setMessage('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 20px 0', flexWrap: 'wrap' }}>
        {([['tarifs', 'Tarifs Horaires'], ['heures', 'Heures Travaillées'], ['paie', 'Fiches de Paie']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            background: tab === id ? colors.primary : colors.surface,
            color: tab === id ? '#fff' : colors.text,
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: '16px 20px' }}>

        {/* ===== TARIFS TAB ===== */}
        {tab === 'tarifs' && (
          <div>
            {/* Batch edit toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <p style={{ color: colors.textSub, fontSize: 13, margin: 0 }}>
                {batchEditMode
                  ? 'Mode édition : modifiez les valeurs directement dans le tableau, puis cliquez sur Enregistrer tout.'
                  : 'Cliquez sur "Modifier tout" pour éditer plusieurs tarifs en même temps, ou "Modifier" pour éditer ligne par ligne.'}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {batchEditMode ? (
                  <>
                    <button onClick={cancelBatchEdit} style={{ background: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      Annuler
                    </button>
                    <button onClick={saveBatchEdits} disabled={batchSaving} style={{ background: colors.success, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: batchSaving ? 0.7 : 1 }}>
                      {batchSaving ? 'Enregistrement...' : 'Enregistrer tout'}
                    </button>
                  </>
                ) : (
                  <button onClick={enterBatchEdit} style={{ background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    Modifier tout
                  </button>
                )}
              </div>
            </div>

            {[['technicien', 'Techniciens', techTarifs], ['employe_bureau', 'Employés de Bureau', officeTarifs]].map(([cat, catLabel, list]) => (
              <div key={cat as string} style={{ marginBottom: 28 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: colors.text, marginBottom: 12, borderBottom: `2px solid ${colors.primary}`, paddingBottom: 6 }}>
                  {catLabel as string}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: darkMode ? '#0f172a' : '#f8fafc' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: colors.textSub, fontWeight: 600, borderBottom: `1px solid ${colors.border}` }}>Rôle</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', color: colors.textSub, fontWeight: 600, borderBottom: `1px solid ${colors.border}` }}>Tarif Client (GNF/h)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', color: colors.textSub, fontWeight: 600, borderBottom: `1px solid ${colors.border}` }}>Tarif Client (EUR/h)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', color: colors.textSub, fontWeight: 600, borderBottom: `1px solid ${colors.border}` }}>Salaire (GNF/h)</th>
                        {!batchEditMode && <th style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(list as TarifHoraire[]).map(t => {
                        const draft = batchEdits[t.id];
                        return (
                          <tr key={t.id} style={{ borderBottom: `1px solid ${colors.border}`, background: batchEditMode ? (darkMode ? 'rgba(8,145,178,0.07)' : 'rgba(8,145,178,0.04)') : 'transparent' }}>
                            <td style={{ padding: '10px 12px', color: colors.text, fontWeight: 600 }}>{ROLE_LABELS[t.role] || t.role}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              {batchEditMode && draft ? (
                                <input
                                  type="number" min="0" step="1000"
                                  value={draft.tarif_client_gnf}
                                  onChange={e => setBatchEdits(prev => ({ ...prev, [t.id]: { ...prev[t.id], tarif_client_gnf: parseFloat(e.target.value) || 0 } }))}
                                  style={{ width: 110, padding: '6px 8px', borderRadius: 6, border: `1px solid ${colors.primary}`, background: colors.surface, color: colors.text, fontSize: 13, textAlign: 'right' }}
                                />
                              ) : (
                                <span style={{ color: colors.text }}>{fmtGNF(t.tarif_client_gnf)}</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              {batchEditMode && draft ? (
                                <input
                                  type="number" min="0" step="0.5"
                                  value={draft.tarif_client_eur}
                                  onChange={e => setBatchEdits(prev => ({ ...prev, [t.id]: { ...prev[t.id], tarif_client_eur: parseFloat(e.target.value) || 0 } }))}
                                  style={{ width: 80, padding: '6px 8px', borderRadius: 6, border: `1px solid ${colors.primary}`, background: colors.surface, color: colors.text, fontSize: 13, textAlign: 'right' }}
                                />
                              ) : (
                                <span style={{ color: colors.text }}>{fmtEUR(t.tarif_client_eur)}</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              {batchEditMode && draft ? (
                                <input
                                  type="number" min="0" step="1000"
                                  value={draft.salaire_horaire_gnf}
                                  onChange={e => setBatchEdits(prev => ({ ...prev, [t.id]: { ...prev[t.id], salaire_horaire_gnf: parseFloat(e.target.value) || 0 } }))}
                                  style={{ width: 110, padding: '6px 8px', borderRadius: 6, border: `2px solid ${colors.success}`, background: colors.surface, color: colors.success, fontSize: 13, fontWeight: 700, textAlign: 'right' }}
                                />
                              ) : (
                                <span style={{ color: colors.success, fontWeight: 600 }}>{fmtGNF(t.salaire_horaire_gnf)}</span>
                              )}
                            </td>
                            {!batchEditMode && (
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <button onClick={() => setEditingTarif({ ...t })} style={{ background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>
                                  Modifier
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== HEURES TAB ===== */}
        {tab === 'heures' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={filterEmploye} onChange={e => setFilterEmploye(e.target.value)} style={{ ...input, width: 180 }}>
                  <option value="">Tous les employés</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <select value={filterMois} onChange={e => setFilterMois(e.target.value)} style={{ ...input, width: 130 }}>
                  <option value="">Tous les mois</option>
                  {MOIS_LABELS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
                <select value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)} style={{ ...input, width: 100 }}>
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button onClick={() => setShowHeureModal(true)} style={{ background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                + Saisir heures
              </button>
            </div>

            {filteredHeures.length === 0 ? (
              <div style={{ textAlign: 'center', color: colors.textSub, padding: 40 }}>Aucune heure enregistrée</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: darkMode ? '#0f172a' : '#f8fafc' }}>
                      {['Employé', 'Date', 'Heures', 'Tarif/h (GNF)', 'Total (GNF)', 'Intervention'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: colors.textSub, fontWeight: 600, borderBottom: `1px solid ${colors.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHeures.map(h => (
                      <tr key={h.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td style={{ padding: '10px 12px', color: colors.text, fontWeight: 600 }}>{h.employe?.name || '—'}</td>
                        <td style={{ padding: '10px 12px', color: colors.text }}>{safeDate(h.date)}</td>
                        <td style={{ padding: '10px 12px', color: colors.text }}>{h.nombre_heures} h</td>
                        <td style={{ padding: '10px 12px', color: colors.text }}>{fmtGNF(h.tarif_horaire_gnf)}</td>
                        <td style={{ padding: '10px 12px', color: colors.success, fontWeight: 600 }}>{fmtGNF(h.total_gnf)}</td>
                        <td style={{ padding: '10px 12px', color: colors.textSub }}>{h.intervention?.titre || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: darkMode ? '#0f172a' : '#f8fafc' }}>
                      <td colSpan={2} style={{ padding: '10px 12px', fontWeight: 700, color: colors.text }}>TOTAL</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: colors.text }}>{safeFixed(filteredHeures.reduce((s, h) => s + h.nombre_heures, 0), 2)} h</td>
                      <td></td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: colors.success }}>{fmtGNF(filteredHeures.reduce((s, h) => s + h.total_gnf, 0))}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== FICHES DE PAIE TAB ===== */}
        {tab === 'paie' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={filterEmploye} onChange={e => setFilterEmploye(e.target.value)} style={{ ...input, width: 180 }}>
                  <option value="">Tous les employés</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <select value={filterMois} onChange={e => setFilterMois(e.target.value)} style={{ ...input, width: 130 }}>
                  <option value="">Tous les mois</option>
                  {MOIS_LABELS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
                <select value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)} style={{ ...input, width: 100 }}>
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button onClick={() => setShowPaieModal(true)} style={{ background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                + Générer fiche
              </button>
            </div>

            {filteredFiches.length === 0 ? (
              <div style={{ textAlign: 'center', color: colors.textSub, padding: 40 }}>Aucune fiche de paie</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredFiches.map(f => (
                  <div key={f.id} style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: colors.text, fontSize: 15 }}>{f.employe?.name || '—'}</div>
                        <div style={{ color: colors.textSub, fontSize: 13 }}>{MOIS_LABELS[f.mois]} {f.annee} • {f.total_heures}h</div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
                          <span style={{ color: colors.textSub }}>Brut: <strong style={{ color: colors.text }}>{fmtGNF(f.salaire_brut)}</strong></span>
                          <span style={{ color: colors.textSub }}>Primes: <strong style={{ color: colors.success }}>{fmtGNF(f.primes)}</strong></span>
                          <span style={{ color: colors.textSub }}>Avances: <strong style={{ color: colors.danger }}>{fmtGNF(f.avances)}</strong></span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: colors.success }}>{fmtGNF(f.salaire_net)}</div>
                        <div style={{ color: colors.textSub, fontSize: 12 }}>Salaire Net</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => setShowPaieDetail(f)} style={{ background: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                            Détail
                          </button>
                          <button onClick={() => exportPayslipPDF(f)} style={{ background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                            Exporter
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== MODAL: Edit Tarif ===== */}
      {editingTarif && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: colors.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: colors.text }}>Modifier le tarif</div>
              <button onClick={() => setEditingTarif(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: colors.textSub }}>×</button>
            </div>
            <div style={{ fontWeight: 600, color: colors.primary, marginBottom: 16 }}>{ROLE_LABELS[editingTarif.role] || editingTarif.role}</div>
            {[
              ['Tarif client (GNF/h)', 'tarif_client_gnf'],
              ['Tarif client (EUR/h)', 'tarif_client_eur'],
              ['Salaire horaire (GNF/h)', 'salaire_horaire_gnf'],
            ].map(([label, field]) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 5 }}>{label}</label>
                <input
                  type="number" min="0" step="0.01"
                  value={(editingTarif as any)[field]}
                  onChange={e => setEditingTarif(t => t ? { ...t, [field]: parseFloat(e.target.value) || 0 } : t)}
                  style={input}
                />
              </div>
            ))}
            <button onClick={saveTarif} style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: colors.primary, color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700, marginTop: 4 }}>
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* ===== MODAL: Saisir Heures ===== */}
      {showHeureModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: colors.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: colors.text }}>Saisir les heures</div>
              <button onClick={() => setShowHeureModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: colors.textSub }}>×</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 5 }}>Employé *</label>
              <select value={heureForm.employe_id} onChange={e => autoFillTarifFromRole(e.target.value)} style={input}>
                <option value="">Sélectionner</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 5 }}>Date *</label>
              <input type="date" value={heureForm.date} onChange={e => setHeureForm(f => ({ ...f, date: e.target.value }))} style={input} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 5 }}>Nombre d'heures *</label>
              <input type="number" min="0" step="0.5" value={heureForm.nombre_heures} onChange={e => setHeureForm(f => ({ ...f, nombre_heures: e.target.value }))} placeholder="ex: 8" style={input} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 5 }}>Tarif horaire GNF *</label>
              <input type="number" min="0" value={heureForm.tarif_horaire_gnf} onChange={e => setHeureForm(f => ({ ...f, tarif_horaire_gnf: e.target.value }))} placeholder="ex: 75000" style={input} />
            </div>
            {heureForm.nombre_heures && heureForm.tarif_horaire_gnf && (
              <div style={{ background: darkMode ? '#0f172a' : '#f0fdf4', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 14, color: colors.success, fontWeight: 600 }}>
                Total: {fmtGNF(parseFloat(heureForm.nombre_heures) * parseFloat(heureForm.tarif_horaire_gnf))}
              </div>
            )}
            <button onClick={saveHeure} style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: colors.primary, color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* ===== MODAL: Générer Fiche de Paie ===== */}
      {showPaieModal && (() => {
        const selectedEmp = employees.find(e => e.id === paieForm.employe_id);
        const brut = parseFloat(paieForm.salaire_brut) || 0;
        const retenue = brut * 0.18;
        const primes = parseFloat(paieForm.primes) || 0;
        const avances = parseFloat(paieForm.avances) || 0;
        const netEstime = brut - retenue + primes - avances;
        const salaireH = parseFloat(paieForm.salaire_horaire_brut) || 0;
        const nbAbsences = parseFloat(paieForm.nombre_absences) || 0;
        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: colors.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: colors.text }}>Generer une fiche de paie</div>
              <button onClick={() => setShowPaieModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: colors.textSub }}>x</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 5 }}>Employe *</label>
              <select value={paieForm.employe_id} onChange={e => autofillSalaire(e.target.value)} style={input}>
                <option value="">Selectionner un employe</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 5 }}>Mois *</label>
                <select value={paieForm.mois} onChange={e => { const newMois = e.target.value; setPaieForm(f => ({ ...f, mois: newMois })); if (paieForm.employe_id) autofillSalaire(paieForm.employe_id, newMois, paieForm.annee); }} style={input}>
                  {MOIS_LABELS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 5 }}>Annee *</label>
                <select value={paieForm.annee} onChange={e => { const newAnnee = e.target.value; setPaieForm(f => ({ ...f, annee: newAnnee })); if (paieForm.employe_id) autofillSalaire(paieForm.employe_id, paieForm.mois, newAnnee); }} style={input}>
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {paieLoading && (
              <div style={{ textAlign: 'center', padding: '12px', color: colors.primary, fontSize: 13 }}>
                Chargement des donnees...
              </div>
            )}

            {selectedEmp && !paieLoading && (
              <div style={{ background: darkMode ? '#0f172a' : '#f0f9ff', borderRadius: 10, padding: '14px 16px', marginBottom: 14, border: `1px solid ${colors.primary}30` }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: colors.text, marginBottom: 8 }}>{selectedEmp.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13 }}>
                  <div style={{ color: colors.textSub }}>Echelon:</div>
                  <div style={{ color: colors.primary, fontWeight: 600 }}>{paieForm.echelon || '---'}</div>
                  <div style={{ color: colors.textSub }}>Salaire horaire brut:</div>
                  <div style={{ color: colors.success, fontWeight: 600 }}>{salaireH > 0 ? fmtGNF(salaireH) + '/h' : '---'}</div>
                  <div style={{ color: colors.textSub }}>Heures prestees:</div>
                  <div style={{ color: colors.text, fontWeight: 600 }}>{paieForm.total_heures || '0'} h</div>
                  <div style={{ color: colors.textSub }}>Absences:</div>
                  <div style={{ color: nbAbsences > 0 ? colors.danger : colors.text, fontWeight: 600 }}>{nbAbsences} jour{nbAbsences > 1 ? 's' : ''}</div>
                  {paieForm.motifs_absences && (
                    <>
                      <div style={{ color: colors.textSub }}>Motifs:</div>
                      <div style={{ color: colors.warning, fontWeight: 500, fontSize: 12 }}>{paieForm.motifs_absences}</div>
                    </>
                  )}
                  <div style={{ color: colors.textSub }}>Salaire brut:</div>
                  <div style={{ color: colors.text, fontWeight: 700 }}>{brut > 0 ? fmtGNF(brut) : '---'}</div>
                </div>
              </div>
            )}

            {selectedEmp && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 5 }}>Total heures</label>
                    <input type="number" min="0" step="0.5" value={paieForm.total_heures} onChange={e => {
                      const newH = e.target.value;
                      setPaieForm(f => ({
                        ...f,
                        total_heures: newH,
                        salaire_brut: String((parseFloat(newH) || 0) * salaireH),
                      }));
                    }} style={input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 5 }}>Salaire horaire (GNF)</label>
                    <input type="number" min="0" value={paieForm.salaire_horaire_brut} onChange={e => {
                      const newTarif = e.target.value;
                      setPaieForm(f => ({
                        ...f,
                        salaire_horaire_brut: newTarif,
                        salaire_brut: String((parseFloat(f.total_heures) || 0) * (parseFloat(newTarif) || 0)),
                      }));
                    }} style={input} />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 5 }}>Salaire brut (GNF) *</label>
                  <input type="number" min="0" value={paieForm.salaire_brut} onChange={e => setPaieForm(f => ({ ...f, salaire_brut: e.target.value }))} style={{ ...input, fontWeight: 700 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 5 }}>Primes (GNF)</label>
                    <input type="number" min="0" value={paieForm.primes} onChange={e => setPaieForm(f => ({ ...f, primes: e.target.value }))} style={input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: colors.textSub, fontSize: 13, marginBottom: 5 }}>Avances sur salaire (GNF)</label>
                    <input type="number" min="0" value={paieForm.avances} onChange={e => setPaieForm(f => ({ ...f, avances: e.target.value }))} style={input} />
                  </div>
                </div>
              </>
            )}

            {brut > 0 && (
              <div style={{ background: darkMode ? '#0f172a' : '#f8fafc', borderRadius: 10, padding: '14px', marginBottom: 14, border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: colors.textSub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recapitulatif</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: colors.text }}>
                  <span>Heures prestees</span>
                  <span style={{ fontWeight: 600 }}>{paieForm.total_heures || 0} h x {salaireH > 0 ? fmtGNF(salaireH) : '---'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: colors.text }}>
                  <span>Salaire brut</span>
                  <span style={{ fontWeight: 600 }}>{fmtGNF(brut)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: colors.danger }}>
                  <span>Retenue 18%</span>
                  <span style={{ fontWeight: 600 }}>- {fmtGNF(retenue)}</span>
                </div>
                {nbAbsences > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: colors.warning }}>
                    <span>Absences ({nbAbsences} j{nbAbsences > 1 ? 'ours' : 'our'})</span>
                    <span style={{ fontWeight: 500, fontSize: 12 }}>{paieForm.motifs_absences || 'Non justifie'}</span>
                  </div>
                )}
                {primes > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: colors.success }}>
                    <span>Primes</span>
                    <span style={{ fontWeight: 600 }}>+ {fmtGNF(primes)}</span>
                  </div>
                )}
                {avances > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: colors.danger }}>
                    <span>Avances sur salaire</span>
                    <span style={{ fontWeight: 600 }}>- {fmtGNF(avances)}</span>
                  </div>
                )}
                <div style={{ borderTop: `2px solid ${colors.border}`, paddingTop: 10, marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 700, color: colors.success }}>
                  <span>Salaire net</span>
                  <span>{fmtGNF(netEstime)}</span>
                </div>
              </div>
            )}
            <button onClick={savePaie} disabled={!paieForm.employe_id} style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: paieForm.employe_id ? colors.primary : colors.border, color: '#fff', cursor: paieForm.employe_id ? 'pointer' : 'not-allowed', fontSize: 15, fontWeight: 700 }}>
              Generer la fiche de paie
            </button>
          </div>
        </div>
        );
      })()}

      {/* ===== MODAL: Détail Fiche de Paie ===== */}
      {showPaieDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: colors.surface, borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: colors.text }}>Fiche de Paie</div>
              <button onClick={() => setShowPaieDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: colors.textSub }}>x</button>
            </div>
            <div style={{ background: darkMode ? '#0f172a' : '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: colors.text, marginBottom: 4 }}>{showPaieDetail.employe?.name || '---'}</div>
              <div style={{ color: colors.textSub, fontSize: 13 }}>
                {showPaieDetail.echelon || showPaieDetail.employe?.role || '---'} -- {MOIS_LABELS[showPaieDetail.mois]} {showPaieDetail.annee}
              </div>
            </div>
            {[
              ['Echelon', showPaieDetail.echelon || '---', colors.primary],
              ['Salaire horaire brut', showPaieDetail.salaire_horaire_brut ? fmtGNF(showPaieDetail.salaire_horaire_brut) + '/h' : '---', colors.success],
              ['Total heures prestees', `${showPaieDetail.total_heures} h`, colors.text],
              ['Absences', `${showPaieDetail.nombre_absences || 0} jour(s)`, (showPaieDetail.nombre_absences || 0) > 0 ? colors.danger : colors.text],
              ...(showPaieDetail.motifs_absences ? [['Motifs absences', showPaieDetail.motifs_absences, colors.warning]] : []),
              ['Salaire brut', fmtGNF(showPaieDetail.salaire_brut), colors.text],
              ['Retenue 18%', `- ${fmtGNF(showPaieDetail.retenue_18_pourcent || showPaieDetail.salaire_brut * 0.18)}`, colors.danger],
              ['Primes', `+ ${fmtGNF(showPaieDetail.primes)}`, colors.success],
              ['Avances sur salaire', `- ${fmtGNF(showPaieDetail.avances)}`, colors.danger],
            ].map(([label, val, col]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 14 }}>
                <span style={{ color: colors.textSub }}>{label}</span>
                <span style={{ fontWeight: 600, color: col as string }}>{val}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 4px', fontSize: 16, fontWeight: 700 }}>
              <span style={{ color: colors.text }}>Salaire Net</span>
              <span style={{ color: colors.success }}>{fmtGNF(showPaieDetail.salaire_net)}</span>
            </div>
            <button onClick={() => exportPayslipPDF(showPaieDetail)} style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: colors.primary, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, marginTop: 16 }}>
              Exporter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
