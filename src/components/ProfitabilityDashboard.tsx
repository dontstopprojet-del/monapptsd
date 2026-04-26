import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { safeFixed } from '../utils/safeFormat';

interface ProfitabilityDashboardProps {
  darkMode: boolean;
  lang: string;
  onClose: () => void;
}

interface Chantier {
  id: string;
  title: string;
  client_name: string | null;
  technician_id: string | null;
  status: string;
  scheduled_date: string | null;
  completed_at: string | null;
  created_at: string;
  montant_facture_client: number;
  cout_main_oeuvre: number;
  cout_materiel: number;
  autres_depenses: number;
  cout_total: number;
  benefice_intervention: number;
}

interface Technician {
  id: string;
  name: string;
}

type ViewMode = 'interventions' | 'technicians' | 'monthly';
type EditingField = {
  chantierId: string;
  field: 'montant_facture_client' | 'cout_main_oeuvre' | 'cout_materiel' | 'autres_depenses';
} | null;

const ProfitabilityDashboard = ({ darkMode, lang, onClose }: ProfitabilityDashboardProps) => {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('interventions');
  const [editing, setEditing] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const t = useMemo(() => {
    if (lang === 'fr') return {
      title: 'Rentabilite des Interventions',
      interventions: 'Par Intervention',
      byTechnician: 'Par Technicien',
      byMonth: 'Par Mois',
      intervention: 'Intervention',
      client: 'Client',
      technician: 'Technicien',
      invoiceAmount: 'Facture Client',
      laborCost: 'Main d\'oeuvre',
      materialCost: 'Materiel',
      otherExpenses: 'Autres',
      totalCost: 'Cout Total',
      profit: 'Benefice',
      status: 'Statut',
      date: 'Date',
      month: 'Mois',
      totalInterventions: 'Interventions',
      totalRevenue: 'CA Total',
      totalExpenses: 'Depenses Totales',
      totalProfit: 'Benefice Total',
      margin: 'Marge',
      noData: 'Aucune donnee disponible',
      loading: 'Chargement...',
      save: 'OK',
      cancel: 'Annuler',
      allMonths: 'Tous les mois',
      search: 'Rechercher...',
      currency: 'GNF',
      avgProfit: 'Benefice Moyen',
      profitMargin: 'Marge Beneficiaire',
      positive: 'Rentable',
      negative: 'Non rentable',
      planned: 'Planifie',
      inProgress: 'En cours',
      completed: 'Termine',
      clickToEdit: 'Cliquer pour modifier',
    };
    return {
      title: 'Intervention Profitability',
      interventions: 'By Intervention',
      byTechnician: 'By Technician',
      byMonth: 'By Month',
      intervention: 'Intervention',
      client: 'Client',
      technician: 'Technician',
      invoiceAmount: 'Client Invoice',
      laborCost: 'Labor',
      materialCost: 'Material',
      otherExpenses: 'Other',
      totalCost: 'Total Cost',
      profit: 'Profit',
      status: 'Status',
      date: 'Date',
      month: 'Month',
      totalInterventions: 'Interventions',
      totalRevenue: 'Total Revenue',
      totalExpenses: 'Total Expenses',
      totalProfit: 'Total Profit',
      margin: 'Margin',
      noData: 'No data available',
      loading: 'Loading...',
      save: 'OK',
      cancel: 'Cancel',
      allMonths: 'All months',
      search: 'Search...',
      currency: 'GNF',
      avgProfit: 'Avg Profit',
      profitMargin: 'Profit Margin',
      positive: 'Profitable',
      negative: 'Not profitable',
      planned: 'Planned',
      inProgress: 'In Progress',
      completed: 'Completed',
      clickToEdit: 'Click to edit',
    };
  }, [lang]);

  const C = useMemo(() => ({
    bg: darkMode ? '#0F172A' : '#F8FAFC',
    card: darkMode ? '#1E293B' : '#FFFFFF',
    cardHover: darkMode ? '#253349' : '#F1F5F9',
    text: darkMode ? '#E2E8F0' : '#1E293B',
    textSecondary: darkMode ? '#94A3B8' : '#64748B',
    border: darkMode ? '#334155' : '#E2E8F0',
    primary: '#0891b2',
    primaryLight: '#06b6d4',
    success: '#10B981',
    successBg: darkMode ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
    danger: '#EF4444',
    dangerBg: darkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
    warning: '#F59E0B',
    warningBg: darkMode ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)',
    headerGradient: 'linear-gradient(135deg, #0e7490, #0891b2, #06b6d4)',
    inputBg: darkMode ? '#0F172A' : '#F1F5F9',
  }), [darkMode]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [chantiersRes, techRes] = await Promise.all([
        supabase.from('chantiers').select('id, title, client_name, technician_id, status, scheduled_date, completed_at, created_at, montant_facture_client, cout_main_oeuvre, cout_materiel, autres_depenses, cout_total, benefice_intervention').order('created_at', { ascending: false }),
        supabase.from('app_users').select('id, name').eq('role', 'tech'),
      ]);
      if (chantiersRes.data) setChantiers(chantiersRes.data);
      if (techRes.data) setTechnicians(techRes.data);
    } catch (err) {
      console.error('Error fetching profitability data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('profitability-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chantiers' }, () => { fetchData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const getTechName = useCallback((techId: string | null) => {
    if (!techId) return '-';
    return technicians.find(tc => tc.id === techId)?.name || '-';
  }, [technicians]);

  const getChantierDate = (ch: Chantier) => {
    return ch.scheduled_date || ch.created_at?.split('T')[0] || '';
  };

  const filteredChantiers = useMemo(() => {
    return chantiers.filter(ch => {
      const d = getChantierDate(ch);
      const year = d ? new Date(d).getFullYear() : null;
      if (year !== filterYear) return false;
      if (filterMonth !== null) {
        const month = d ? new Date(d).getMonth() : null;
        if (month !== filterMonth) return false;
      }
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const techName = getTechName(ch.technician_id).toLowerCase();
        return (
          ch.title.toLowerCase().includes(s) ||
          (ch.client_name || '').toLowerCase().includes(s) ||
          techName.includes(s)
        );
      }
      return true;
    });
  }, [chantiers, filterYear, filterMonth, searchTerm, getTechName]);

  const summaryStats = useMemo(() => {
    const totalRevenue = filteredChantiers.reduce((s, c) => s + Number(c.montant_facture_client || 0), 0);
    const totalCost = filteredChantiers.reduce((s, c) => s + Number(c.cout_total || 0), 0);
    const totalProfit = filteredChantiers.reduce((s, c) => s + Number(c.benefice_intervention || 0), 0);
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const profitable = filteredChantiers.filter(c => Number(c.benefice_intervention || 0) > 0).length;
    return { totalRevenue, totalCost, totalProfit, margin, count: filteredChantiers.length, profitable };
  }, [filteredChantiers]);

  const technicianStats = useMemo(() => {
    const map: Record<string, { name: string; count: number; revenue: number; cost: number; profit: number }> = {};
    filteredChantiers.forEach(ch => {
      const tid = ch.technician_id || 'unassigned';
      const name = ch.technician_id ? getTechName(ch.technician_id) : (lang === 'fr' ? 'Non assigne' : 'Unassigned');
      if (!map[tid]) map[tid] = { name, count: 0, revenue: 0, cost: 0, profit: 0 };
      map[tid].count++;
      map[tid].revenue += Number(ch.montant_facture_client || 0);
      map[tid].cost += Number(ch.cout_total || 0);
      map[tid].profit += Number(ch.benefice_intervention || 0);
    });
    return Object.values(map).sort((a, b) => b.profit - a.profit);
  }, [filteredChantiers, getTechName, lang]);

  const monthlyStats = useMemo(() => {
    const map: Record<string, { month: string; sortKey: string; count: number; revenue: number; cost: number; profit: number }> = {};
    const monthNames = lang === 'fr'
      ? ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    filteredChantiers.forEach(ch => {
      const d = getChantierDate(ch);
      if (!d) return;
      const dt = new Date(d);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[dt.getMonth()]} ${dt.getFullYear()}`;
      if (!map[key]) map[key] = { month: label, sortKey: key, count: 0, revenue: 0, cost: 0, profit: 0 };
      map[key].count++;
      map[key].revenue += Number(ch.montant_facture_client || 0);
      map[key].cost += Number(ch.cout_total || 0);
      map[key].profit += Number(ch.benefice_intervention || 0);
    });
    return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredChantiers, lang]);

  const handleStartEdit = (chantierId: string, field: EditingField extends null ? never : NonNullable<EditingField>['field'], currentValue: number) => {
    setEditing({ chantierId, field });
    setEditValue(String(currentValue || 0));
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const numValue = parseFloat(editValue) || 0;
      const { error } = await supabase
        .from('chantiers')
        .update({ [editing.field]: numValue })
        .eq('id', editing.chantierId);
      if (error) throw error;
      setChantiers(prev => prev.map(ch =>
        ch.id === editing.chantierId ? { ...ch, [editing.field]: numValue } : ch
      ));
      setEditing(null);
      fetchData();
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setEditing(null);
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('fr-GN', { maximumFractionDigits: 0 }).format(val);
  };

  const getStatusLabel = (status: string) => {
    if (status === 'completed') return t.completed;
    if (status === 'in_progress' || status === 'started') return t.inProgress;
    return t.planned;
  };

  const getStatusColor = (status: string) => {
    if (status === 'completed') return C.success;
    if (status === 'in_progress' || status === 'started') return C.warning;
    return C.textSecondary;
  };

  const getProfitColor = (profit: number) => profit >= 0 ? C.success : C.danger;
  const getProfitBg = (profit: number) => profit >= 0 ? C.successBg : C.dangerBg;

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    chantiers.forEach(ch => {
      const d = getChantierDate(ch);
      if (d) years.add(new Date(d).getFullYear());
    });
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [chantiers]);

  const monthOptions = lang === 'fr'
    ? ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const editableCell = (chantierId: string, field: NonNullable<EditingField>['field'], value: number) => {
    const isEditing = editing?.chantierId === chantierId && editing?.field === field;
    if (isEditing) {
      return (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <input
            type="number"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: '100px',
              padding: '4px 8px',
              borderRadius: '6px',
              border: `1px solid ${C.primary}`,
              background: C.inputBg,
              color: C.text,
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: 'none',
              background: C.primary,
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {t.save}
          </button>
          <button
            onClick={() => setEditing(null)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: `1px solid ${C.border}`,
              background: 'transparent',
              color: C.textSecondary,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {t.cancel}
          </button>
        </div>
      );
    }
    return (
      <span
        onClick={() => handleStartEdit(chantierId, field, value)}
        title={t.clickToEdit}
        style={{
          cursor: 'pointer',
          padding: '2px 6px',
          borderRadius: '4px',
          transition: 'background 0.2s',
          borderBottom: `1px dashed ${C.border}`,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = C.cardHover; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {formatMoney(value)}
      </span>
    );
  };

  const summaryCard = (label: string, value: string, color: string, bgColor: string, icon: string) => (
    <div style={{
      background: C.card,
      borderRadius: '16px',
      padding: '20px',
      border: `1px solid ${C.border}`,
      flex: '1 1 160px',
      minWidth: '160px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
        }}>
          {icon}
        </div>
        <span style={{ color: C.textSecondary, fontSize: '13px', fontWeight: '500' }}>{label}</span>
      </div>
      <div style={{ fontSize: '22px', fontWeight: '700', color }}>{value}</div>
    </div>
  );

  const maxProfit = useMemo(() => {
    if (viewMode === 'technicians') {
      return Math.max(...technicianStats.map(s => Math.abs(s.profit)), 1);
    }
    if (viewMode === 'monthly') {
      return Math.max(...monthlyStats.map(s => Math.abs(s.profit)), 1);
    }
    return 1;
  }, [viewMode, technicianStats, monthlyStats]);

  if (loading) {
    return (
      <div style={{ height: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.textSecondary, fontSize: '16px' }}>{t.loading}</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', background: C.bg, overflow: 'auto' }}>
      <div style={{
        background: C.headerGradient,
        padding: '24px',
        color: '#FFF',
        boxShadow: '0 4px 20px rgba(8,145,178,0.3)',
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 20px',
            color: '#FFF',
            cursor: 'pointer',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.3s',
            backdropFilter: 'blur(10px)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            e.currentTarget.style.transform = 'translateX(-4px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          {lang === 'fr' ? '← Retour au tableau de bord' : '← Back to dashboard'}
        </button>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>{t.title}</h2>
      </div>

      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          {summaryCard(t.totalInterventions, String(summaryStats.count), C.primary, darkMode ? 'rgba(8,145,178,0.15)' : 'rgba(8,145,178,0.1)', '🔧')}
          {summaryCard(t.totalRevenue, `${formatMoney(summaryStats.totalRevenue)} ${t.currency}`, C.primary, darkMode ? 'rgba(8,145,178,0.15)' : 'rgba(8,145,178,0.1)', '💰')}
          {summaryCard(t.totalExpenses, `${formatMoney(summaryStats.totalCost)} ${t.currency}`, C.warning, C.warningBg, '📉')}
          {summaryCard(t.totalProfit, `${formatMoney(summaryStats.totalProfit)} ${t.currency}`, getProfitColor(summaryStats.totalProfit), getProfitBg(summaryStats.totalProfit), '📊')}
          {summaryCard(t.profitMargin, `${safeFixed(summaryStats.margin, 1)}%`, summaryStats.margin >= 0 ? C.success : C.danger, summaryStats.margin >= 0 ? C.successBg : C.dangerBg, '📈')}
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          {(['interventions', 'technicians', 'monthly'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: viewMode === mode ? 'none' : `1px solid ${C.border}`,
                background: viewMode === mode ? C.headerGradient : C.card,
                color: viewMode === mode ? '#fff' : C.text,
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {mode === 'interventions' ? t.interventions : mode === 'technicians' ? t.byTechnician : t.byMonth}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <select
            value={filterYear}
            onChange={e => setFilterYear(Number(e.target.value))}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: `1px solid ${C.border}`,
              background: C.card,
              color: C.text,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            value={filterMonth === null ? '' : filterMonth}
            onChange={e => setFilterMonth(e.target.value === '' ? null : Number(e.target.value))}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: `1px solid ${C.border}`,
              background: C.card,
              color: C.text,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="">{t.allMonths}</option>
            {monthOptions.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
        </div>

        {viewMode === 'interventions' && (
          <input
            type="text"
            placeholder={t.search}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: `1px solid ${C.border}`,
              background: C.card,
              color: C.text,
              fontSize: '14px',
              marginBottom: '16px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        )}

        {viewMode === 'interventions' && (
          <div style={{
            background: C.card,
            borderRadius: '16px',
            border: `1px solid ${C.border}`,
            overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: darkMode ? '#253349' : '#F1F5F9' }}>
                    {[t.intervention, t.client, t.technician, t.invoiceAmount, t.laborCost, t.materialCost, t.otherExpenses, t.totalCost, t.profit, t.status].map((h, i) => (
                      <th key={i} style={{
                        padding: '14px 12px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: C.textSecondary,
                        borderBottom: `1px solid ${C.border}`,
                        whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredChantiers.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: C.textSecondary }}>
                        {t.noData}
                      </td>
                    </tr>
                  ) : filteredChantiers.map(ch => (
                    <tr
                      key={ch.id}
                      style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.cardHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px', fontWeight: '600', color: C.text, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ch.title}
                      </td>
                      <td style={{ padding: '12px', color: C.textSecondary }}>{ch.client_name || '-'}</td>
                      <td style={{ padding: '12px', color: C.textSecondary }}>{getTechName(ch.technician_id)}</td>
                      <td style={{ padding: '12px', color: C.primary, fontWeight: '600' }}>
                        {editableCell(ch.id, 'montant_facture_client', ch.montant_facture_client)}
                      </td>
                      <td style={{ padding: '12px' }}>{editableCell(ch.id, 'cout_main_oeuvre', ch.cout_main_oeuvre)}</td>
                      <td style={{ padding: '12px' }}>{editableCell(ch.id, 'cout_materiel', ch.cout_materiel)}</td>
                      <td style={{ padding: '12px' }}>{editableCell(ch.id, 'autres_depenses', ch.autres_depenses)}</td>
                      <td style={{ padding: '12px', fontWeight: '600', color: C.warning }}>
                        {formatMoney(ch.cout_total || 0)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '13px',
                          color: getProfitColor(ch.benefice_intervention || 0),
                          background: getProfitBg(ch.benefice_intervention || 0),
                        }}>
                          {formatMoney(ch.benefice_intervention || 0)}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: getStatusColor(ch.status),
                          background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        }}>
                          {getStatusLabel(ch.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'technicians' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {technicianStats.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: C.textSecondary, background: C.card, borderRadius: '16px', border: `1px solid ${C.border}` }}>
                {t.noData}
              </div>
            ) : technicianStats.map((ts, i) => {
              const margin = ts.revenue > 0 ? (ts.profit / ts.revenue) * 100 : 0;
              const barWidth = (Math.abs(ts.profit) / maxProfit) * 100;
              return (
                <div key={i} style={{
                  background: C.card,
                  borderRadius: '16px',
                  padding: '20px',
                  border: `1px solid ${C.border}`,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '16px', color: C.text }}>{ts.name}</div>
                      <div style={{ color: C.textSecondary, fontSize: '13px' }}>{ts.count} {t.totalInterventions.toLowerCase()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontWeight: '700',
                        fontSize: '18px',
                        color: getProfitColor(ts.profit),
                      }}>
                        {formatMoney(ts.profit)} {t.currency}
                      </div>
                      <div style={{ color: C.textSecondary, fontSize: '12px' }}>{t.margin}: {safeFixed(margin, 1)}%</div>
                    </div>
                  </div>
                  <div style={{
                    height: '8px',
                    background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginBottom: '12px',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${barWidth}%`,
                      background: ts.profit >= 0
                        ? 'linear-gradient(90deg, #10B981, #34D399)'
                        : 'linear-gradient(90deg, #EF4444, #F87171)',
                      borderRadius: '4px',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                    <span style={{ color: C.textSecondary }}>{t.totalRevenue}: <strong style={{ color: C.primary }}>{formatMoney(ts.revenue)}</strong></span>
                    <span style={{ color: C.textSecondary }}>{t.totalExpenses}: <strong style={{ color: C.warning }}>{formatMoney(ts.cost)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'monthly' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {monthlyStats.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: C.textSecondary, background: C.card, borderRadius: '16px', border: `1px solid ${C.border}` }}>
                {t.noData}
              </div>
            ) : monthlyStats.map((ms, i) => {
              const margin = ms.revenue > 0 ? (ms.profit / ms.revenue) * 100 : 0;
              const barWidth = (Math.abs(ms.profit) / maxProfit) * 100;
              return (
                <div key={i} style={{
                  background: C.card,
                  borderRadius: '16px',
                  padding: '20px',
                  border: `1px solid ${C.border}`,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '16px', color: C.text }}>{ms.month}</div>
                      <div style={{ color: C.textSecondary, fontSize: '13px' }}>{ms.count} {t.totalInterventions.toLowerCase()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontWeight: '700',
                        fontSize: '18px',
                        color: getProfitColor(ms.profit),
                      }}>
                        {formatMoney(ms.profit)} {t.currency}
                      </div>
                      <div style={{ color: C.textSecondary, fontSize: '12px' }}>{t.margin}: {safeFixed(margin, 1)}%</div>
                    </div>
                  </div>
                  <div style={{
                    height: '8px',
                    background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginBottom: '12px',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${barWidth}%`,
                      background: ms.profit >= 0
                        ? 'linear-gradient(90deg, #10B981, #34D399)'
                        : 'linear-gradient(90deg, #EF4444, #F87171)',
                      borderRadius: '4px',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                    <span style={{ color: C.textSecondary }}>{t.totalRevenue}: <strong style={{ color: C.primary }}>{formatMoney(ms.revenue)}</strong></span>
                    <span style={{ color: C.textSecondary }}>{t.totalExpenses}: <strong style={{ color: C.warning }}>{formatMoney(ms.cost)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height: '40px' }} />
    </div>
  );
};

export default ProfitabilityDashboard;
