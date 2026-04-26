import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface RevenueManagerProps {
  lang: string;
  darkMode: boolean;
  onClose: () => void;
}

type Period = 'day' | 'week' | 'month' | 'quarter' | 'semester' | 'year';

interface RevenueStats {
  period: Period;
  amount: number;
  invoiceCount: number;
}

const RevenueManager = ({ lang, darkMode, onClose }: RevenueManagerProps) => {
  const [stats, setStats] = useState<RevenueStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');

  const t = lang === 'fr' ? {
    title: 'Chiffre d\'Affaire',
    close: 'Fermer',
    loading: 'Chargement...',
    day: 'Aujourd\'hui',
    week: 'Cette Semaine',
    month: 'Ce Mois',
    quarter: 'Ce Trimestre',
    semester: 'Ce Semestre',
    year: 'Cette Annee',
    totalRevenue: 'Revenu Total',
    invoices: 'Paiements',
    noData: 'Aucune donnee disponible',
    currency: 'GNF'
  } : {
    title: 'Revenue',
    close: 'Close',
    loading: 'Loading...',
    day: 'Today',
    week: 'This Week',
    month: 'This Month',
    quarter: 'This Quarter',
    semester: 'This Semester',
    year: 'This Year',
    totalRevenue: 'Total Revenue',
    invoices: 'Payments',
    noData: 'No data available',
    currency: 'GNF'
  };

  const colors = {
    background: darkMode ? '#0F172A' : '#F8F9FA',
    card: darkMode ? '#1E293B' : '#FFFFFF',
    text: darkMode ? '#E2E8F0' : '#2C3E50',
    textSecondary: darkMode ? '#94A3B8' : '#64748B',
    border: darkMode ? '#334155' : '#E2E8F0',
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
  };

  useEffect(() => {
    fetchRevenue();

    const channel = supabase
      .channel('revenue-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        fetchRevenue();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getDateRange = (period: Period): { start: Date; end: Date } => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const dayOfWeek = start.getDay();
        const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(start.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'quarter':
        const quarter = Math.floor(start.getMonth() / 3);
        start.setMonth(quarter * 3);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(start.getMonth() + 3);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'semester':
        const semester = Math.floor(start.getMonth() / 6);
        start.setMonth(semester * 6);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(start.getMonth() + 6);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'year':
        start.setMonth(0);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(11);
        end.setDate(31);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { start, end };
  };

  const fetchRevenue = async () => {
    try {
      const periods: Period[] = ['day', 'week', 'month', 'quarter', 'semester', 'year'];
      const results: RevenueStats[] = [];

      for (const period of periods) {
        const { start, end } = getDateRange(period);

        const { data: invoices, error } = await supabase
          .from('invoices')
          .select('*')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        if (error) throw error;

        let total = 0;
        let count = 0;

        invoices?.forEach(invoice => {
          if (invoice.tranche_signature_paid && invoice.tranche_signature_date) {
            const trancheDate = new Date(invoice.tranche_signature_date);
            if (trancheDate >= start && trancheDate <= end) {
              total += invoice.tranche_signature_amount || 0;
              count++;
            }
          }
          if (invoice.tranche_moitier_paid && invoice.tranche_moitier_date) {
            const trancheDate = new Date(invoice.tranche_moitier_date);
            if (trancheDate >= start && trancheDate <= end) {
              total += invoice.tranche_moitier_amount || 0;
              count++;
            }
          }
          if (invoice.tranche_fin_paid && invoice.tranche_fin_date) {
            const trancheDate = new Date(invoice.tranche_fin_date);
            if (trancheDate >= start && trancheDate <= end) {
              total += invoice.tranche_fin_amount || 0;
              count++;
            }
          }
          if (invoice.status === 'Payee' && invoice.payment_date) {
            const paymentDate = new Date(invoice.payment_date);
            if (paymentDate >= start && paymentDate <= end) {
              const paidTranches = (invoice.tranche_signature_paid ? invoice.tranche_signature_amount : 0) +
                                   (invoice.tranche_moitier_paid ? invoice.tranche_moitier_amount : 0) +
                                   (invoice.tranche_fin_paid ? invoice.tranche_fin_amount : 0);
              if (paidTranches === 0) {
                total += invoice.amount || 0;
                count++;
              }
            }
          }
        });

        results.push({
          period,
          amount: total,
          invoiceCount: count
        });
      }

      setStats(results);
    } catch (error) {
      console.error('Error fetching revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPeriodLabel = (period: Period): string => {
    const labels = {
      day: t.day,
      week: t.week,
      month: t.month,
      quarter: t.quarter,
      semester: t.semester,
      year: t.year
    };
    return labels[period];
  };

  const getPeriodIcon = (period: Period): string => {
    const icons = {
      day: '📅',
      week: '📆',
      month: '🗓️',
      quarter: '📊',
      semester: '📈',
      year: '🎯'
    };
    return icons[period];
  };

  const getPeriodColor = (period: Period): string => {
    const colors = {
      day: '#3B82F6',
      week: '#8B5CF6',
      month: '#10B981',
      quarter: '#F59E0B',
      semester: '#EF4444',
      year: '#EC4899'
    };
    return colors[period];
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: colors.background,
      zIndex: 1000,
      overflow: 'auto'
    }}>
      <div style={{
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ color: colors.text, margin: 0 }}>{t.title}</h2>
          <button
            onClick={onClose}
            style={{
              background: colors.primary,
              color: '#FFF',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {t.close}
          </button>
        </div>

        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: colors.textSecondary
          }}>
            {t.loading}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px'
          }}>
            {stats.map((stat) => (
              <div
                key={stat.period}
                onClick={() => setSelectedPeriod(stat.period)}
                style={{
                  background: colors.card,
                  borderRadius: '12px',
                  padding: '20px',
                  border: `2px solid ${selectedPeriod === stat.period ? getPeriodColor(stat.period) : colors.border}`,
                  boxShadow: selectedPeriod === stat.period
                    ? `0 4px 12px ${getPeriodColor(stat.period)}33`
                    : '0 2px 8px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: selectedPeriod === stat.period ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <h3 style={{
                    margin: 0,
                    color: colors.text,
                    fontSize: '16px',
                    fontWeight: '600'
                  }}>
                    {getPeriodLabel(stat.period)}
                  </h3>
                  <span style={{ fontSize: '28px' }}>{getPeriodIcon(stat.period)}</span>
                </div>

                <div style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: getPeriodColor(stat.period),
                  marginBottom: '8px'
                }}>
                  {formatAmount(stat.amount)} {t.currency}
                </div>

                <div style={{
                  fontSize: '13px',
                  color: colors.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>📋</span>
                  <span>{stat.invoiceCount} {t.invoices}</span>
                </div>

                <div style={{
                  marginTop: '12px',
                  height: '4px',
                  background: darkMode ? '#334155' : '#F1F5F9',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    background: getPeriodColor(stat.period),
                    width: `${Math.min((stat.amount / Math.max(...stats.map(s => s.amount))) * 100, 100)}%`,
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueManager;
