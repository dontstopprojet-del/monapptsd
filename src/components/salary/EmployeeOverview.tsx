import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { safeFixed } from '../../utils/safeFormat';

interface Props {
  darkMode: boolean;
  lang: string;
  onBack: () => void;
}

interface AppUser {
  id: string;
  name: string;
  role: string;
  echelon: string | null;
  office_position: string | null;
}

interface HeureTravail {
  employe_id: string;
  nombre_heures: number;
  tarif_horaire_gnf: number;
  total_gnf: number;
}

interface Chantier {
  id: string;
  technician_id: string | null;
  status: string;
  montant_facture_client: number;
}

interface TarifHoraire {
  categorie: string;
  role: string;
  salaire_horaire_gnf: number;
  tarif_client_gnf: number;
}

interface TechRow {
  id: string;
  name: string;
  echelon: string;
  hoursWorked: number;
  hourlyRate: number;
  totalSalary: number;
  completedInterventions: number;
  totalRevenue: number;
  profitability: number;
}

interface OfficeRow {
  id: string;
  name: string;
  position: string;
  hoursWorked: number;
  hourlyRate: number;
  totalSalary: number;
}

type ViewTab = 'technicians' | 'office' | 'summary';

const fmtGNF = (n: number) =>
  new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF', maximumFractionDigits: 0 }).format(n);

export default function EmployeeOverview({ darkMode, onBack }: Props) {
  const [tab, setTab] = useState<ViewTab>('technicians');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [heures, setHeures] = useState<HeureTravail[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [tarifs, setTarifs] = useState<TarifHoraire[]>([]);

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());

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
    headerBg: darkMode ? '#0f172a' : '#f8fafc',
  }), [darkMode]);

  useEffect(() => { loadAll(); }, [filterMonth, filterYear]);

  const loadAll = async () => {
    setLoading(true);
    const startDate = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
    const endMonth = filterMonth === 12 ? 1 : filterMonth + 1;
    const endYear = filterMonth === 12 ? filterYear + 1 : filterYear;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const [usersRes, heuresRes, chantiersRes, tarifsRes] = await Promise.all([
      supabase.from('app_users').select('id, name, role, echelon, office_position').in('role', ['tech', 'office']).order('name'),
      supabase.from('heures_travail').select('employe_id, nombre_heures, tarif_horaire_gnf, total_gnf').gte('date', startDate).lt('date', endDate),
      supabase.from('chantiers').select('id, technician_id, status, montant_facture_client'),
      supabase.from('tarifs_horaires').select('categorie, role, salaire_horaire_gnf, tarif_client_gnf'),
    ]);

    if (usersRes.data) setUsers(usersRes.data);
    if (heuresRes.data) setHeures(heuresRes.data as HeureTravail[]);
    if (chantiersRes.data) setChantiers(chantiersRes.data as Chantier[]);
    if (tarifsRes.data) setTarifs(tarifsRes.data as TarifHoraire[]);
    setLoading(false);
  };

  const techUsers = useMemo(() => users.filter(u => u.role === 'tech'), [users]);
  const officeUsers = useMemo(() => users.filter(u => u.role === 'office'), [users]);

  const techRows: TechRow[] = useMemo(() => {
    return techUsers.map(u => {
      const empHeures = heures.filter(h => h.employe_id === u.id);
      const hoursWorked = empHeures.reduce((s, h) => s + h.nombre_heures, 0);
      const totalSalary = empHeures.reduce((s, h) => s + h.total_gnf, 0);
      const avgRate = hoursWorked > 0 ? totalSalary / hoursWorked : 0;

      const hourlyRate = avgRate > 0 ? avgRate : (tarifs.find(t => t.categorie === 'technicien')?.salaire_horaire_gnf || 0);

      const techChantiers = chantiers.filter(c => c.technician_id === u.id);
      const completedInterventions = techChantiers.filter(c => c.status === 'completed').length;
      const totalRevenue = techChantiers.reduce((s, c) => s + Number(c.montant_facture_client || 0), 0);
      const profitability = totalRevenue - totalSalary;

      return {
        id: u.id,
        name: u.name,
        echelon: u.echelon || '—',
        hoursWorked,
        hourlyRate,
        totalSalary,
        completedInterventions,
        totalRevenue,
        profitability,
      };
    }).sort((a, b) => b.profitability - a.profitability);
  }, [techUsers, heures, chantiers, tarifs]);

  const officeRows: OfficeRow[] = useMemo(() => {
    return officeUsers.map(u => {
      const empHeures = heures.filter(h => h.employe_id === u.id);
      const hoursWorked = empHeures.reduce((s, h) => s + h.nombre_heures, 0);
      const totalSalary = empHeures.reduce((s, h) => s + h.total_gnf, 0);
      const avgRate = hoursWorked > 0 ? totalSalary / hoursWorked : 0;
      const hourlyRate = avgRate > 0 ? avgRate : (tarifs.find(t => t.categorie === 'employe_bureau')?.salaire_horaire_gnf || 0);

      return {
        id: u.id,
        name: u.name,
        position: u.office_position || '—',
        hoursWorked,
        hourlyRate,
        totalSalary,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [officeUsers, heures, tarifs]);

  const summaryStats = useMemo(() => {
    const totalTechSalary = techRows.reduce((s, r) => s + r.totalSalary, 0);
    const totalOfficeSalary = officeRows.reduce((s, r) => s + r.totalSalary, 0);
    const totalSalary = totalTechSalary + totalOfficeSalary;
    const totalRevenue = techRows.reduce((s, r) => s + r.totalRevenue, 0);
    const totalProfit = totalRevenue - totalTechSalary;
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const totalInterventions = techRows.reduce((s, r) => s + r.completedInterventions, 0);
    const totalHours = [...techRows, ...officeRows].reduce((s, r) => s + r.hoursWorked, 0);
    return { totalTechSalary, totalOfficeSalary, totalSalary, totalRevenue, totalProfit, margin, totalInterventions, totalHours };
  }, [techRows, officeRows]);

  const profitColor = (v: number) => v > 0 ? colors.success : v < 0 ? colors.danger : colors.textSub;

  const MOIS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  const selectStyle = {
    padding: '7px 12px', borderRadius: 8, border: `1px solid ${colors.border}`,
    background: colors.surface, color: colors.text, fontSize: 13,
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.bg }}>
        <div style={{ color: colors.primary, fontSize: 16 }}>Chargement...</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', overflow: 'auto', display: 'flex', flexDirection: 'column', background: colors.bg, fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0e7490, #0891b2, #06b6d4)',
        padding: '20px 24px', color: '#fff', flexShrink: 0,
        boxShadow: '0 4px 20px rgba(8,145,178,0.3)',
      }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10,
          padding: '8px 16px', color: '#fff', cursor: 'pointer', fontSize: 14,
          fontWeight: 600, marginBottom: 12, backdropFilter: 'blur(10px)',
        }}>
          ← Retour au tableau de bord
        </button>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Vue d'ensemble Employés</div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>
          Salaires, heures, rentabilité — {MOIS[filterMonth]} {filterYear}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 20px 40px', maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Filters + tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {([['technicians', 'Techniciens'], ['office', 'Bureau'], ['summary', 'Résumé']] as [ViewTab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600,
                background: tab === id ? colors.primary : colors.surface,
                color: tab === id ? '#fff' : colors.text,
              }}>{label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))} style={selectStyle}>
              {MOIS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))} style={selectStyle}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* ===== TECHNICIANS TABLE ===== */}
        {tab === 'technicians' && (
          <div>
            <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${colors.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
                <thead>
                  <tr style={{ background: colors.headerBg }}>
                    {['Nom', 'Échelon', 'Heures', 'Taux/h', 'Salaire total', 'Interventions', 'CA Généré', 'Rentabilité'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: h === 'Nom' || h === 'Échelon' ? 'left' : 'right', color: colors.textSub, fontWeight: 600, borderBottom: `2px solid ${colors.border}`, whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {techRows.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: colors.textSub, padding: 40 }}>Aucun technicien trouvé</td></tr>
                  ) : techRows.map(r => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}`, transition: 'background 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = darkMode ? 'rgba(8,145,178,0.06)' : 'rgba(8,145,178,0.03)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: colors.text }}>{r.name}</td>
                      <td style={{ padding: '12px 14px', color: colors.textSub }}>{r.echelon}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: colors.text }}>{r.hoursWorked > 0 ? `${safeFixed(r.hoursWorked, 1)} h` : '—'}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: colors.textSub, fontSize: 12 }}>{r.hourlyRate > 0 ? fmtGNF(r.hourlyRate) : '—'}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: colors.text }}>{r.totalSalary > 0 ? fmtGNF(r.totalSalary) : '—'}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: colors.text }}>
                        {r.completedInterventions > 0 ? (
                          <span style={{ background: darkMode ? '#064e3b' : '#d1fae5', color: colors.success, padding: '3px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>
                            {r.completedInterventions}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: r.totalRevenue > 0 ? colors.primary : colors.textSub }}>
                        {r.totalRevenue > 0 ? fmtGNF(r.totalRevenue) : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>
                        {r.totalRevenue > 0 || r.totalSalary > 0 ? (
                          <span style={{ color: profitColor(r.profitability) }}>
                            {r.profitability >= 0 ? '+' : ''}{fmtGNF(r.profitability)}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {techRows.length > 0 && (
                  <tfoot>
                    <tr style={{ background: colors.headerBg, borderTop: `2px solid ${colors.border}` }}>
                      <td colSpan={2} style={{ padding: '12px 14px', fontWeight: 700, color: colors.text }}>TOTAL</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: colors.text }}>{safeFixed(techRows.reduce((s, r) => s + r.hoursWorked, 0), 1)} h</td>
                      <td></td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: colors.text }}>{fmtGNF(summaryStats.totalTechSalary)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: colors.success }}>
                        <span style={{ background: darkMode ? '#064e3b' : '#d1fae5', color: colors.success, padding: '3px 10px', borderRadius: 12, fontSize: 12 }}>
                          {summaryStats.totalInterventions}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: colors.primary }}>{fmtGNF(summaryStats.totalRevenue)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: profitColor(summaryStats.totalProfit) }}>
                        {summaryStats.totalProfit >= 0 ? '+' : ''}{fmtGNF(summaryStats.totalProfit)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ===== OFFICE EMPLOYEES TABLE ===== */}
        {tab === 'office' && (
          <div>
            <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${colors.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
                <thead>
                  <tr style={{ background: colors.headerBg }}>
                    {['Nom', 'Poste', 'Heures', 'Taux/h', 'Salaire total'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: h === 'Nom' || h === 'Poste' ? 'left' : 'right', color: colors.textSub, fontWeight: 600, borderBottom: `2px solid ${colors.border}`, whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {officeRows.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: colors.textSub, padding: 40 }}>Aucun employé de bureau trouvé</td></tr>
                  ) : officeRows.map(r => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}`, transition: 'background 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = darkMode ? 'rgba(8,145,178,0.06)' : 'rgba(8,145,178,0.03)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: colors.text }}>{r.name}</td>
                      <td style={{ padding: '12px 14px', color: colors.textSub }}>{r.position}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: colors.text }}>{r.hoursWorked > 0 ? `${safeFixed(r.hoursWorked, 1)} h` : '—'}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: colors.textSub, fontSize: 12 }}>{r.hourlyRate > 0 ? fmtGNF(r.hourlyRate) : '—'}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: colors.text }}>{r.totalSalary > 0 ? fmtGNF(r.totalSalary) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                {officeRows.length > 0 && (
                  <tfoot>
                    <tr style={{ background: colors.headerBg, borderTop: `2px solid ${colors.border}` }}>
                      <td colSpan={2} style={{ padding: '12px 14px', fontWeight: 700, color: colors.text }}>TOTAL</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: colors.text }}>{safeFixed(officeRows.reduce((s, r) => s + r.hoursWorked, 0), 1)} h</td>
                      <td></td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: colors.text }}>{fmtGNF(summaryStats.totalOfficeSalary)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ===== SUMMARY TAB ===== */}
        {tab === 'summary' && (
          <div>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
              {[
                { label: 'Masse salariale totale', value: fmtGNF(summaryStats.totalSalary), sub: `Tech: ${fmtGNF(summaryStats.totalTechSalary)} | Bureau: ${fmtGNF(summaryStats.totalOfficeSalary)}`, color: colors.text },
                { label: 'CA Généré (Techniciens)', value: fmtGNF(summaryStats.totalRevenue), sub: `${summaryStats.totalInterventions} intervention(s) terminée(s)`, color: colors.primary },
                { label: 'Profit brut', value: `${summaryStats.totalProfit >= 0 ? '+' : ''}${fmtGNF(summaryStats.totalProfit)}`, sub: `Marge: ${safeFixed(summaryStats.margin, 1)}%`, color: profitColor(summaryStats.totalProfit) },
                { label: 'Heures travaillées', value: `${safeFixed(summaryStats.totalHours, 1)} h`, sub: `${techUsers.length} tech + ${officeUsers.length} bureau`, color: colors.warning },
              ].map(card => (
                <div key={card.label} style={{ background: colors.card, borderRadius: 14, border: `1px solid ${colors.border}`, padding: '18px 20px' }}>
                  <div style={{ color: colors.textSub, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{card.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: card.color, marginTop: 6 }}>{card.value}</div>
                  <div style={{ fontSize: 12, color: colors.textSub, marginTop: 4 }}>{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Top performers */}
            {techRows.filter(r => r.completedInterventions > 0).length > 0 && (
              <div style={{ background: colors.card, borderRadius: 14, border: `1px solid ${colors.border}`, padding: '20px 22px', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: colors.text, marginBottom: 14 }}>Rentabilité par technicien</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {techRows.filter(r => r.completedInterventions > 0 || r.totalSalary > 0).map((r, i) => {
                    const maxRevenue = Math.max(...techRows.map(t => t.totalRevenue), 1);
                    const barWidth = maxRevenue > 0 ? (r.totalRevenue / maxRevenue) * 100 : 0;
                    return (
                      <div key={r.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : i === 2 ? '#fef3c7' : colors.border,
                              color: i === 0 ? '#d97706' : i === 1 ? '#475569' : i === 2 ? '#92400e' : colors.textSub,
                              fontWeight: 700, fontSize: 11,
                            }}>{i + 1}</span>
                            <span style={{ fontWeight: 600, color: colors.text, fontSize: 14 }}>{r.name}</span>
                            <span style={{ color: colors.textSub, fontSize: 12 }}>{r.echelon}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 700, color: profitColor(r.profitability), fontSize: 14 }}>
                              {r.profitability >= 0 ? '+' : ''}{fmtGNF(r.profitability)}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <div style={{ flex: 1, height: 6, background: darkMode ? '#334155' : '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${barWidth}%`, height: '100%', background: `linear-gradient(90deg, ${colors.primary}, #06b6d4)`, borderRadius: 3, transition: 'width 0.5s' }} />
                          </div>
                          <span style={{ color: colors.textSub, fontSize: 11, minWidth: 60, textAlign: 'right' }}>CA: {fmtGNF(r.totalRevenue)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Salary breakdown */}
            <div style={{ background: colors.card, borderRadius: 14, border: `1px solid ${colors.border}`, padding: '20px 22px' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: colors.text, marginBottom: 14 }}>Répartition des salaires</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Techniciens', value: summaryStats.totalTechSalary, count: techUsers.length },
                  { label: 'Employés de bureau', value: summaryStats.totalOfficeSalary, count: officeUsers.length },
                ].map(row => {
                  const pct = summaryStats.totalSalary > 0 ? (row.value / summaryStats.totalSalary) * 100 : 0;
                  return (
                    <div key={row.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: colors.text, fontSize: 14 }}>{row.label} ({row.count})</span>
                        <span style={{ fontWeight: 600, color: colors.text, fontSize: 14 }}>{fmtGNF(row.value)} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div style={{ height: 8, background: darkMode ? '#334155' : '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: row.label === 'Techniciens' ? colors.primary : colors.warning, borderRadius: 4, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
