import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { safeLocale, safeDate } from '../utils/safeFormat';
import RealtimeUserMonitor from './RealtimeUserMonitor';
import SiteDetailView from './SiteDetailView';
import { useRealtimeUsers, useRealtimeQuotes, useRealtimeProjects, useRealtimeInvoices } from '../hooks/useRealtimeSync';

interface CEODashboardProps {
  currentUser: any;
  darkMode: boolean;
  lang: string;
  onBack: () => void;
  onNavigate?: (module: string) => void;
  embedded?: boolean;
}

interface Stats {
  pendingQuotes: number;
  ongoingProjects: number;
  completedProjects: number;
  unpaidInvoices: number;
  totalTechnicians: number;
  totalRevenue: number;
  totalClients: number;
  totalOfficeMembers: number;
}

interface DetailViewData {
  type: 'quotes' | 'projects' | 'completed_projects' | 'invoices' | 'technicians' | 'clients' | 'office' | null;
  items: any[];
}

const CEODashboard = ({ currentUser, darkMode, lang, onBack, onNavigate, embedded }: CEODashboardProps) => {
  const [stats, setStats] = useState<Stats>({
    pendingQuotes: 0,
    ongoingProjects: 0,
    completedProjects: 0,
    unpaidInvoices: 0,
    totalTechnicians: 0,
    totalRevenue: 0,
    totalClients: 0,
    totalOfficeMembers: 0,
  });

  const [detailView, setDetailView] = useState<DetailViewData>({ type: null, items: [] });
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [selectedChantier, setSelectedChantier] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);

  const C = {
    primary: '#0891b2',
    primaryDark: '#0e7490',
    primaryLight: '#06b6d4',
    secondary: '#22d3ee',
    accent: '#67e8f9',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    card: darkMode ? '#1e293b' : '#FFFFFF',
    bg: darkMode ? '#0f172a' : '#f8fafc',
    gray: darkMode ? '#1e293b' : '#f1f5f9',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#334155' : '#cbd5e1',
    hover: darkMode ? '#334155' : '#e2e8f0',
  };

  const t = lang === 'fr' ? {
    title: 'Tableau de Bord CEO',
    pendingQuotes: 'Devis en attente',
    ongoingProjects: 'Chantiers en cours',
    unpaidInvoices: 'Factures impayées',
    technicians: 'Techniciens',
    totalRevenue: 'Chiffre d\'affaires',
    clients: 'Clients',
    officeMembers: 'Employés de bureau',
    viewDetails: 'Voir détails',
    noData: 'Aucune donnée disponible',
    status: 'Statut',
    location: 'Localisation',
    satisfaction: 'Satisfaction',
    revenue: 'Revenu',
    jobs: 'Interventions',
    name: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    role: 'Rôle',
    contractDate: 'Date de contrat',
    available: 'Disponible',
    onMission: 'En mission',
    onLeave: 'En congé',
    clickForDetails: 'Cliquer pour plus de détails',
  } : {
    title: 'CEO Dashboard',
    pendingQuotes: 'Pending Quotes',
    ongoingProjects: 'Ongoing Projects',
    unpaidInvoices: 'Unpaid Invoices',
    technicians: 'Technicians',
    totalRevenue: 'Total Revenue',
    clients: 'Clients',
    officeMembers: 'Office Employees',
    viewDetails: 'View Details',
    noData: 'No data available',
    status: 'Status',
    location: 'Location',
    satisfaction: 'Satisfaction',
    revenue: 'Revenue',
    jobs: 'Jobs',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    role: 'Role',
    contractDate: 'Contract Date',
    available: 'Available',
    onMission: 'On Mission',
    onLeave: 'On Leave',
    clickForDetails: 'Click for more details',
  };

  const loadStats = useCallback(async () => {
    try {
      const [usersRes, quotesRes, projectsRes, invoicesRes] = await Promise.all([
        supabase.from('app_users').select('*'),
        supabase.from('quote_requests').select('*'),
        supabase.from('chantiers').select('*'),
        supabase.from('invoices').select('*')
      ]);

      const techniciansData = usersRes.data?.filter(u => u.role === 'tech') || [];
      const clientsData = usersRes.data?.filter(u => u.role === 'client') || [];
      const officeData = usersRes.data?.filter(u => u.role === 'office_employee') || [];

      const totalTechnicians = techniciansData.length;
      const totalClients = clientsData.length;
      const totalOfficeMembers = officeData.length;

      const pendingQuotes = quotesRes.data?.filter(q => q.status === 'pending' && !q.archived_at).length || 0;
      const ongoingProjects = projectsRes.data?.filter(p => p.status !== 'completed').length || 0;
      const completedProjects = projectsRes.data?.filter(p => p.status === 'completed').length || 0;
      const unpaidInvoices = invoicesRes.data?.filter(i => i.status === 'En attente' || i.status === 'En retard').length || 0;

      const totalRevenue = invoicesRes.data?.filter(i => i.status === 'Payee')
        .reduce((sum, i) => sum + Number(i.amount || 0), 0) || 0;

      setStats({
        pendingQuotes,
        ongoingProjects,
        completedProjects,
        unpaidInvoices,
        totalTechnicians,
        totalRevenue,
        totalClients,
        totalOfficeMembers,
      });

      const allStaff = [
        ...techniciansData.map(tech => ({
          id: tech.id,
          name: tech.name,
          profiles: { full_name: tech.name, phone: tech.phone },
          role_level: 'Tech',
          role: 'tech',
          status: 'Dispo',
          email: tech.email,
        })),
        ...officeData.map(office => ({
          id: office.id,
          name: office.name,
          profiles: { full_name: office.name, phone: office.phone },
          role_level: 'Office',
          role: 'office_employee',
          status: 'Dispo',
          email: office.email,
        }))
      ];
      setTechnicians(allStaff);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  const loadUserStats = useCallback(async () => {
    try {
      const { data } = await supabase.from('app_users').select('*');
      const techniciansData = data?.filter(u => u.role === 'tech') || [];
      const clientsData = data?.filter(u => u.role === 'client') || [];
      const officeData = data?.filter(u => u.role === 'office_employee') || [];

      setStats(prev => ({
        ...prev,
        totalTechnicians: techniciansData.length,
        totalClients: clientsData.length,
        totalOfficeMembers: officeData.length,
      }));

      const allStaff = [
        ...techniciansData.map(tech => ({
          id: tech.id,
          name: tech.name,
          profiles: { full_name: tech.name, phone: tech.phone },
          role_level: 'Tech',
          role: 'tech',
          status: 'Dispo',
          email: tech.email,
        })),
        ...officeData.map(office => ({
          id: office.id,
          name: office.name,
          profiles: { full_name: office.name, phone: office.phone },
          role_level: 'Office',
          role: 'office_employee',
          status: 'Dispo',
          email: office.email,
        }))
      ];
      setTechnicians(allStaff);
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }, []);

  const loadQuotesStats = useCallback(async () => {
    try {
      const { data } = await supabase.from('quote_requests').select('*');
      const pendingQuotes = data?.filter(q => q.status === 'pending' && !q.archived_at).length || 0;
      setStats(prev => ({ ...prev, pendingQuotes }));
    } catch (error) {
      console.error('Error loading quotes stats:', error);
    }
  }, []);

  const loadProjectsStats = useCallback(async () => {
    try {
      const { data } = await supabase.from('chantiers').select('*');
      const ongoingProjects = data?.filter(p => p.status !== 'completed').length || 0;
      const completedProjects = data?.filter(p => p.status === 'completed').length || 0;
      setStats(prev => ({ ...prev, ongoingProjects, completedProjects }));
    } catch (error) {
      console.error('Error loading projects stats:', error);
    }
  }, []);

  const loadInvoicesStats = useCallback(async () => {
    try {
      const { data } = await supabase.from('invoices').select('*');
      const unpaidInvoices = data?.filter(i => i.status === 'En attente' || i.status === 'En retard').length || 0;
      const totalRevenue = data?.filter(i => i.status === 'Payee')
        .reduce((sum, i) => sum + Number(i.amount || 0), 0) || 0;
      setStats(prev => ({ ...prev, unpaidInvoices, totalRevenue }));
    } catch (error) {
      console.error('Error loading invoices stats:', error);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useRealtimeUsers(loadUserStats);
  useRealtimeQuotes(loadQuotesStats);
  useRealtimeProjects(loadProjectsStats);
  useRealtimeInvoices(loadInvoicesStats);

  const markChantierCompleted = async (chantierId: string) => {
    try {
      const { error } = await supabase
        .from('chantiers')
        .update({ status: 'completed', progress: 100 })
        .eq('id', chantierId);
      if (error) throw error;
      setDetailView(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === chantierId ? { ...item, status: 'completed', progress: 100 } : item
        ),
      }));
      loadProjectsStats();
    } catch (error) {
      console.error('Error marking chantier completed:', error);
    }
  };

  const handleStatClick = async (type: 'quotes' | 'projects' | 'completed_projects' | 'invoices' | 'technicians' | 'clients' | 'office') => {
    try {
      let items: any[] = [];

      if (type === 'quotes') {
        const { data } = await supabase
          .from('quote_requests')
          .select('*')
          .eq('status', 'pending')
          .is('archived_at', null);
        items = data || [];
      } else if (type === 'projects' || type === 'completed_projects') {
        const [chantiersRes, techsRes] = await Promise.all([
          supabase.from('chantiers').select('*').order('created_at', { ascending: false }),
          supabase.from('app_users').select('id, name').eq('role', 'tech'),
        ]);
        const techMap = new Map((techsRes.data || []).map(t => [t.id, t.name]));
        const allChantiers = (chantiersRes.data || []).map(c => ({
          ...c,
          technician_name: techMap.get(c.technician_id) || null,
        }));
        items = type === 'completed_projects'
          ? allChantiers.filter(c => c.status === 'completed')
          : allChantiers;
      } else if (type === 'invoices') {
        const { data } = await supabase
          .from('invoices')
          .select('*')
          .in('status', ['En attente', 'En retard']);
        items = data || [];
      } else if (type === 'technicians') {
        const { data } = await supabase
          .from('app_users')
          .select('*')
          .eq('role', 'tech');
        items = (data || []).map(tech => ({
          id: tech.id,
          name: tech.name,
          profiles: { full_name: tech.name, phone: tech.phone },
          role_level: 'Tech',
          role: 'tech',
          status: 'Dispo',
          email: tech.email,
        }));
      } else if (type === 'clients') {
        const { data } = await supabase
          .from('app_users')
          .select('*')
          .eq('role', 'client');
        items = (data || []).map(client => ({
          id: client.id,
          name: client.name,
          profiles: { full_name: client.name, phone: client.phone },
          role: 'client',
          email: client.email,
        }));
      } else if (type === 'office') {
        const { data } = await supabase
          .from('app_users')
          .select('*')
          .eq('role', 'office_employee');
        items = (data || []).map(office => ({
          id: office.id,
          name: office.name,
          profiles: { full_name: office.name, phone: office.phone },
          role_level: 'Office',
          role: 'office_employee',
          status: 'Dispo',
          email: office.email,
        }));
      }

      setDetailView({ type, items });
    } catch (error) {
      console.error('Error loading details:', error);
    }
  };

  const StatCard = ({ icon, label, value, color, gradientFrom, gradientTo, onClick }: any) => (
    <div
      onClick={onClick}
      style={{
        background: `linear-gradient(135deg, ${gradientFrom || C.card}, ${gradientTo || C.card})`,
        borderRadius: '20px',
        padding: '24px',
        boxShadow: `0 8px 24px ${color}20`,
        border: `2px solid ${C.border}`,
        cursor: 'pointer',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
        e.currentTarget.style.boxShadow = `0 16px 40px ${color}30`;
        e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`;
        e.currentTarget.style.borderColor = C.border;
      }}
    >
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: `${color}10`,
        filter: 'blur(30px)',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${color}, ${color}DD)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            boxShadow: `0 4px 16px ${color}40`,
          }}>
            {icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', color: C.textSecondary, fontWeight: '600', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '32px', color: C.text, fontWeight: '900', lineHeight: '1' }}>{value}</div>
          </div>
        </div>
        <div style={{
          fontSize: '12px',
          color: color,
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: `${color}15`,
          padding: '8px 12px',
          borderRadius: '8px',
        }}>
          {t.clickForDetails}
          <span style={{ fontSize: '14px' }}>→</span>
        </div>
      </div>
    </div>
  );

  if (selectedChantier) {
    return (
      <SiteDetailView
        siteId={selectedChantier.id}
        siteName={selectedChantier.title || (lang === 'fr' ? 'Chantier sans titre' : 'Untitled project')}
        siteLocation={selectedChantier.location}
        userId={currentUser?.id}
        colors={C}
        onBack={() => setSelectedChantier(null)}
        lang={lang}
      />
    );
  }

  if (selectedPerson) {
    return (
      <div style={{ height: '100vh', background: C.bg, overflow: 'auto' }}>
        <div style={{
          background: `linear-gradient(135deg, ${C.primaryDark}, ${C.primary}, ${C.primaryLight})`,
          padding: '24px',
          color: '#FFF',
          boxShadow: '0 4px 20px rgba(8,145,178,0.3)',
        }}>
          <button
            onClick={() => setSelectedPerson(null)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              color: '#FFF',
              cursor: 'pointer',
              marginBottom: '16px',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(10px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.transform = 'translateX(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            ← Retour
          </button>
          <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '900', letterSpacing: '-0.5px' }}>
            {selectedPerson.profiles?.full_name || selectedPerson.name || 'Détails'}
          </h2>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{
            background: C.card,
            borderRadius: '24px',
            padding: '28px',
            boxShadow: `0 8px 32px ${C.primary}15`,
            border: `2px solid ${C.border}`,
          }}>
            {selectedPerson.tracking_number ? (
              <>
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: C.gray,
                  borderRadius: '16px',
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Numéro de suivi</div>
                  <div style={{ fontSize: '18px', color: C.text, fontWeight: '800' }}>{selectedPerson.tracking_number}</div>
                </div>
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: C.gray,
                  borderRadius: '16px',
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Client</div>
                  <div style={{ fontSize: '18px', color: C.text, fontWeight: '800' }}>{selectedPerson.name}</div>
                </div>
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: C.gray,
                  borderRadius: '16px',
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Email</div>
                  <div style={{ fontSize: '18px', color: C.text, fontWeight: '800' }}>{selectedPerson.email}</div>
                </div>
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: C.gray,
                  borderRadius: '16px',
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Téléphone</div>
                  <div style={{ fontSize: '18px', color: C.text, fontWeight: '800' }}>{selectedPerson.phone}</div>
                </div>
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: C.gray,
                  borderRadius: '16px',
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Type de service</div>
                  <div style={{ fontSize: '18px', color: C.text, fontWeight: '800' }}>{selectedPerson.service_type}</div>
                </div>
                {selectedPerson.address && (
                  <div style={{
                    marginBottom: '20px',
                    padding: '16px',
                    background: C.gray,
                    borderRadius: '16px',
                    border: `1px solid ${C.border}`,
                  }}>
                    <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Adresse</div>
                    <div style={{ fontSize: '18px', color: C.text, fontWeight: '800' }}>{selectedPerson.address}</div>
                  </div>
                )}
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: C.gray,
                  borderRadius: '16px',
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Description</div>
                  <div style={{ fontSize: '18px', color: C.text, fontWeight: '800' }}>{selectedPerson.description}</div>
                </div>
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: C.gray,
                  borderRadius: '16px',
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Urgence</div>
                  <div style={{ fontSize: '18px', color: C.text, fontWeight: '800' }}>{selectedPerson.urgency === 'urgent' ? '🔴 Urgent' : selectedPerson.urgency === 'normal' ? '🟡 Normal' : '🟢 Faible'}</div>
                </div>
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: `${C.warning}15`,
                  borderRadius: '16px',
                  border: `2px solid ${C.warning}`,
                }}>
                  <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Statut</div>
                  <div style={{ fontSize: '18px', color: C.warning, fontWeight: '900' }}>En attente de traitement</div>
                </div>
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: C.gray,
                  borderRadius: '16px',
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Date de demande</div>
                  <div style={{ fontSize: '18px', color: C.text, fontWeight: '800' }}>{safeDate(selectedPerson.created_at)}</div>
                </div>
              </>
            ) : selectedPerson.profiles ? (
              <>
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: C.gray,
                  borderRadius: '16px',
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>{t.name}</div>
                  <div style={{ fontSize: '18px', color: C.text, fontWeight: '800' }}>{selectedPerson?.profiles?.full_name ?? 'N/A'}</div>
                </div>
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: C.gray,
                  borderRadius: '16px',
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>{t.phone}</div>
                  <div style={{ fontSize: '18px', color: C.text, fontWeight: '800' }}>{selectedPerson?.profiles?.phone || '-'}</div>
                </div>
              </>
            ) : null}
            {selectedPerson.role_level && (
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                background: C.gray,
                borderRadius: '16px',
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>{t.role}</div>
                <div style={{ fontSize: '18px', color: C.text, fontWeight: '800' }}>{selectedPerson.role_level}</div>
              </div>
            )}
            {selectedPerson.status && (
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                background: `${selectedPerson.status === 'Dispo' ? C.success : selectedPerson.status === 'Mission' ? C.warning : C.danger}15`,
                borderRadius: '16px',
                border: `2px solid ${selectedPerson.status === 'Dispo' ? C.success : selectedPerson.status === 'Mission' ? C.warning : C.danger}`,
              }}>
                <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>{t.status}</div>
                <div style={{ fontSize: '18px', color: selectedPerson.status === 'Dispo' ? C.success : selectedPerson.status === 'Mission' ? C.warning : C.danger, fontWeight: '900' }}>
                  {selectedPerson.status === 'Dispo' ? '🟢 ' + t.available : selectedPerson.status === 'Mission' ? '🟡 ' + t.onMission : '🔴 ' + t.onLeave}
                </div>
              </div>
            )}
            {selectedPerson.current_site && (
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                background: C.gray,
                borderRadius: '16px',
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>{t.location}</div>
                <div style={{ fontSize: '18px', color: C.text, fontWeight: '800' }}>📍 {selectedPerson.current_site}</div>
              </div>
            )}
            {selectedPerson.satisfaction_rate !== undefined && (
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                background: `${C.success}15`,
                borderRadius: '16px',
                border: `2px solid ${C.success}`,
              }}>
                <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>{t.satisfaction}</div>
                <div style={{ fontSize: '18px', color: C.success, fontWeight: '900' }}>⭐ {selectedPerson.satisfaction_rate}%</div>
              </div>
            )}
            {selectedPerson.total_revenue !== undefined && (
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                background: `${C.primary}15`,
                borderRadius: '16px',
                border: `2px solid ${C.primary}`,
              }}>
                <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>{t.revenue}</div>
                <div style={{ fontSize: '18px', color: C.primary, fontWeight: '900' }}>💰 {safeLocale(selectedPerson.total_revenue)} GNF</div>
              </div>
            )}
            {selectedPerson.completed_jobs !== undefined && (
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                background: C.gray,
                borderRadius: '16px',
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', fontWeight: '600' }}>{t.jobs}</div>
                <div style={{ fontSize: '18px', color: C.text, fontWeight: '800' }}>🔧 {selectedPerson.completed_jobs}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (detailView.type) {
    return (
      <div style={{ height: '100vh', background: C.bg, overflow: 'auto' }}>
        <div style={{
          background: `linear-gradient(135deg, ${C.primaryDark}, ${C.primary}, ${C.primaryLight})`,
          padding: '24px',
          color: '#FFF',
          boxShadow: '0 4px 20px rgba(8,145,178,0.3)',
        }}>
          <button
            onClick={() => setDetailView({ type: null, items: [] })}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              color: '#FFF',
              cursor: 'pointer',
              marginBottom: '16px',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(10px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.transform = 'translateX(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            ← Retour
          </button>
          <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '900', letterSpacing: '-0.5px' }}>
            {detailView.type === 'projects' && (lang === 'fr' ? 'Tous les chantiers' : 'All Projects')}
            {detailView.type === 'completed_projects' && (lang === 'fr' ? 'Projets realises' : 'Completed Projects')}
            {detailView.type === 'technicians' && (lang === 'fr' ? 'Personnel' : 'Staff')}
            {detailView.type === 'clients' && t.clients}
            {detailView.type === 'office' && t.officeMembers}
          </h2>
        </div>

        <div style={{ padding: '24px' }}>
          {detailView.items.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: C.textSecondary,
              background: C.card,
              borderRadius: '20px',
              border: `2px dashed ${C.border}`,
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📋</div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>{t.noData}</div>
            </div>
          ) : (detailView.type === 'projects' || detailView.type === 'completed_projects') ? (
            detailView.items.map((item, idx) => {
              const statusColor = item.status === 'completed' ? C.success : item.status === 'inProgress' ? C.warning : C.primary;
              const statusLabel = item.status === 'completed' ? (lang === 'fr' ? 'Termine' : 'Completed')
                : item.status === 'inProgress' ? (lang === 'fr' ? 'En cours' : 'In Progress')
                : item.status === 'planned' ? (lang === 'fr' ? 'Planifie' : 'Planned')
                : (lang === 'fr' ? 'En attente' : 'Pending');
              const progress = item.progress || 0;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedChantier(item)}
                  style={{
                    background: C.card,
                    borderRadius: '20px',
                    padding: '20px',
                    marginBottom: '16px',
                    boxShadow: `0 4px 16px ${C.primary}10`,
                    border: `2px solid ${C.border}`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 8px 32px ${C.primary}25`;
                    e.currentTarget.style.borderColor = statusColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = `0 4px 16px ${C.primary}10`;
                    e.currentTarget.style.borderColor = C.border;
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', color: C.text, fontWeight: '800', marginBottom: '6px' }}>
                        {item.title || (lang === 'fr' ? 'Chantier sans titre' : 'Untitled project')}
                      </div>
                      {item.location && (
                        <div style={{ fontSize: '13px', color: C.textSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>📍</span> {item.location}
                        </div>
                      )}
                    </div>
                    <span style={{
                      background: `${statusColor}18`,
                      color: statusColor,
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      {statusLabel}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', color: C.textSecondary }}>
                    <span>{lang === 'fr' ? 'Progression' : 'Progress'}</span>
                    <span style={{ fontWeight: '700', color: C.text }}>{progress}%</span>
                  </div>
                  <div style={{ height: '8px', background: C.gray, borderRadius: '4px', marginBottom: '14px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${C.primary}, ${statusColor})`, borderRadius: '4px', transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: C.textSecondary, marginBottom: '14px' }}>
                    {item.technician_name && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>👷 {item.technician_name}</span>
                    )}
                    {item.client_name && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>👤 {item.client_name}</span>
                    )}
                    {item.created_at && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📅 {safeDate(item.created_at)}</span>
                    )}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    background: `${C.primary}10`,
                    borderRadius: '12px',
                    color: C.primary,
                    fontSize: '13px',
                    fontWeight: '700',
                    marginBottom: (item.status === 'inProgress' || item.status === 'completed') ? '10px' : '0',
                  }}>
                    {lang === 'fr' ? 'Voir les details' : 'View details'} <span>→</span>
                  </div>
                  {item.status === 'inProgress' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markChantierCompleted(item.id); }}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: `linear-gradient(135deg, ${C.success}, #34d399)`,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    >
                      {lang === 'fr' ? 'Marquer comme termine' : 'Mark as completed'}
                    </button>
                  )}
                  {item.status === 'completed' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      borderRadius: '12px',
                      background: item.is_validated ? `${C.success}12` : `${C.warning}12`,
                      border: `1px solid ${item.is_validated ? C.success : C.warning}30`,
                      fontSize: '12px',
                      fontWeight: '600',
                      color: item.is_validated ? C.success : C.warning,
                    }}>
                      <span>{item.is_validated ? '🎯' : '⏳'}</span>
                      {item.is_validated
                        ? (item.is_public
                          ? (lang === 'fr' ? 'Valide & Public' : 'Validated & Public')
                          : (lang === 'fr' ? 'Valide (Prive)' : 'Validated (Private)'))
                        : (lang === 'fr' ? 'En attente de validation' : 'Pending validation')}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            detailView.items.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedPerson(item)}
                style={{
                  background: C.card,
                  borderRadius: '20px',
                  padding: '20px',
                  marginBottom: '16px',
                  boxShadow: `0 4px 16px ${C.primary}10`,
                  border: `2px solid ${C.border}`,
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(8px) scale(1.02)';
                  e.currentTarget.style.boxShadow = `0 8px 32px ${C.primary}25`;
                  e.currentTarget.style.borderColor = C.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0) scale(1)';
                  e.currentTarget.style.boxShadow = `0 4px 16px ${C.primary}10`;
                  e.currentTarget.style.borderColor = C.border;
                }}
              >
                <div style={{ fontSize: '18px', color: C.text, fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{item.profiles?.full_name || item.title || item.name || '-'}</span>
                  {item.role === 'office_employee' && <span style={{ fontSize: '20px' }} title={lang === 'fr' ? 'Employe de Bureau' : 'Office Employee'}>💼</span>}
                  {item.role === 'tech' && <span style={{ fontSize: '20px' }} title={lang === 'fr' ? 'Technicien' : 'Technician'}>🔧</span>}
                  {item.role === 'admin' && <span style={{ fontSize: '20px' }} title={lang === 'fr' ? 'Administrateur' : 'Administrator'}>👑</span>}
                </div>
                {item.location && (
                  <div style={{
                    fontSize: '14px',
                    color: C.textSecondary,
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <span style={{ fontSize: '16px' }}>📍</span> {item.location}
                  </div>
                )}
                {item.status && (
                  <div style={{
                    fontSize: '14px',
                    color: item.status === 'Dispo' ? C.success : item.status === 'Mission' ? C.warning : C.danger,
                    fontWeight: '700',
                    display: 'inline-block',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: `${item.status === 'Dispo' ? C.success : item.status === 'Mission' ? C.warning : C.danger}15`,
                  }}>
                    {item.status === 'Dispo' ? '🟢' : item.status === 'Mission' ? '🟡' : '🔴'} {item.status}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  const quickModules = [
    { id: 'planning', icon: '📅', label: 'Planning', gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)' },
    { id: 'stock', icon: '📦', label: 'Stock', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
    { id: 'invoices', icon: '💰', label: lang === 'fr' ? 'Factures' : 'Invoices', gradient: 'linear-gradient(135deg, #10b981, #34d399)' },
    { id: 'expenses', icon: '💳', label: lang === 'fr' ? 'Depenses' : 'Expenses', gradient: 'linear-gradient(135deg, #0891b2, #22d3ee)' },
    { id: 'devis', icon: '📝', label: 'Devis', gradient: 'linear-gradient(135deg, #e11d48, #fb7185)' },
    { id: 'validation', icon: '🎯', label: 'Validation', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
    { id: 'incidents', icon: '⚠️', label: 'Incidents', gradient: 'linear-gradient(135deg, #dc2626, #f87171)' },
    { id: 'shifts', icon: '⏱️', label: 'Pointage', gradient: 'linear-gradient(135deg, #059669, #6ee7b7)' },
    { id: 'teams', icon: '👥', label: lang === 'fr' ? 'Equipes' : 'Teams', gradient: 'linear-gradient(135deg, #2563eb, #93c5fd)' },
    { id: 'notes', icon: '📝', label: 'Notes', gradient: 'linear-gradient(135deg, #4f46e5, #818cf8)' },
    { id: 'alerts', icon: '🔔', label: lang === 'fr' ? 'Alertes' : 'Alerts', gradient: 'linear-gradient(135deg, #ea580c, #fb923c)' },
    { id: 'birthdays', icon: '🎂', label: lang === 'fr' ? 'Anniversaires' : 'Birthdays', gradient: 'linear-gradient(135deg, #db2777, #f472b6)' },
  ];

  return (
    <div style={{ background: C.bg, overflow: embedded ? 'visible' : 'auto', minHeight: embedded ? 'auto' : '100vh', paddingBottom: embedded ? '0' : '0' }}>
      <div style={{
        background: `linear-gradient(135deg, ${C.primaryDark}, ${C.primary}, ${C.primaryLight})`,
        padding: '20px 24px',
        color: '#FFF',
        boxShadow: '0 4px 20px rgba(8,145,178,0.3)',
      }}>
        {!embedded && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <button
              onClick={onBack}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 16px',
                color: '#FFF',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s',
                backdropFilter: 'blur(10px)',
              }}
            >
              ← Retour
            </button>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', letterSpacing: '-0.5px' }}>{t.title}</h1>
            <p style={{ margin: '6px 0 0', fontSize: '14px', opacity: 0.9, fontWeight: '500' }}>
              {currentUser?.name}
            </p>
          </div>
          <button
            onClick={async () => {
              setRefreshing(true);
              try {
                await loadStats();
              } finally {
                setTimeout(() => setRefreshing(false), 600);
              }
            }}
            disabled={refreshing}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              color: '#FFF',
              cursor: refreshing ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              transition: 'all 0.3s',
              backdropFilter: 'blur(10px)',
              animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
              opacity: refreshing ? 0.7 : 1,
            }}
          >
            🔄
          </button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
          <StatCard
            icon="📋"
            label={t.pendingQuotes}
            value={stats.pendingQuotes}
            color={C.warning}
            gradientFrom={C.card}
            gradientTo={`${C.warning}05`}
            onClick={() => handleStatClick('quotes')}
          />
          <StatCard
            icon="🏗️"
            label={t.ongoingProjects}
            value={stats.ongoingProjects}
            color={C.primary}
            gradientFrom={C.card}
            gradientTo={`${C.primary}05`}
            onClick={() => handleStatClick('projects')}
          />
          <StatCard
            icon="✅"
            label={lang === 'fr' ? 'Projets realises' : 'Completed'}
            value={stats.completedProjects}
            color={C.success}
            gradientFrom={C.card}
            gradientTo={`${C.success}05`}
            onClick={() => handleStatClick('completed_projects')}
          />
          <StatCard
            icon="👷"
            label={t.technicians}
            value={stats.totalTechnicians}
            color="#0891b2"
            gradientFrom={C.card}
            gradientTo="rgba(8, 145, 178, 0.05)"
            onClick={() => handleStatClick('technicians')}
          />
          <StatCard
            icon="👥"
            label={t.clients}
            value={stats.totalClients}
            color="#3b82f6"
            gradientFrom={C.card}
            gradientTo="rgba(59, 130, 246, 0.05)"
            onClick={() => handleStatClick('clients')}
          />
          <StatCard
            icon="🗺️"
            label={lang === 'fr' ? 'Cartographie GPS' : 'GPS Mapping'}
            value={lang === 'fr' ? 'Carte' : 'Map'}
            color="#8b5cf6"
            gradientFrom={C.card}
            gradientTo="rgba(139, 92, 246, 0.05)"
            onClick={() => onNavigate && onNavigate('gps')}
          />
          <StatCard
            icon="💼"
            label={t.officeMembers}
            value={stats.totalOfficeMembers}
            color="#f59e0b"
            gradientFrom={C.card}
            gradientTo="rgba(245, 158, 11, 0.05)"
            onClick={() => handleStatClick('office')}
          />
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${C.card}, ${C.primary}05)`,
          borderRadius: '20px',
          padding: '24px',
          boxShadow: `0 4px 20px ${C.primary}10`,
          border: `1px solid ${C.border}`,
          marginBottom: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: `${C.primary}10`,
            filter: 'blur(40px)',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '14px', color: C.textSecondary, marginBottom: '10px', fontWeight: '600' }}>
              {t.totalRevenue}
            </div>
            <div style={{ fontSize: '32px', color: C.primary, fontWeight: '900', lineHeight: '1' }}>
              {safeLocale(stats.totalRevenue)} <span style={{ fontSize: '20px' }}>GNF</span>
            </div>
          </div>
        </div>

        {onNavigate && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '16px', color: C.text, fontWeight: '700' }}>
              {lang === 'fr' ? 'Acces rapide' : 'Quick access'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {quickModules.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => onNavigate(mod.id)}
                  style={{
                    background: mod.gradient,
                    border: 'none',
                    borderRadius: '16px',
                    padding: '14px 6px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{mod.icon}</span>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#fff', textAlign: 'center', lineHeight: '1.2' }}>
                    {mod.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <RealtimeUserMonitor darkMode={darkMode} />
        </div>

        <div style={{
          background: C.card,
          borderRadius: '20px',
          padding: '24px',
          boxShadow: `0 4px 20px ${C.primary}10`,
          border: `1px solid ${C.border}`,
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: C.text, fontWeight: '700' }}>
            {t.technicians} ({technicians.length})
          </h3>
          {technicians.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '32px 20px',
              color: C.textSecondary,
              background: C.gray,
              borderRadius: '14px',
              border: `2px dashed ${C.border}`,
            }}>
              <div style={{ fontSize: '40px', marginBottom: '10px', opacity: 0.3 }}>👷</div>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>{t.noData}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {technicians.map((tech, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPerson(tech)}
                  style={{
                    background: C.gray,
                    borderRadius: '16px',
                    padding: '16px',
                    border: `1px solid ${C.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.borderColor = C.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.borderColor = C.border;
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', color: C.text, fontWeight: '700', marginBottom: '4px' }}>
                        {tech.profiles?.full_name || '-'}
                      </div>
                      <div style={{ fontSize: '12px', color: C.textSecondary }}>
                        {tech.current_site || t.noData}
                      </div>
                    </div>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: tech.status === 'Dispo' ? C.success : tech.status === 'Mission' ? C.warning : C.danger,
                      boxShadow: `0 0 8px ${tech.status === 'Dispo' ? C.success : tech.status === 'Mission' ? C.warning : C.danger}`,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CEODashboard;
