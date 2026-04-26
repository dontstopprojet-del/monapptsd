import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ProfilePhotoManager, { type PhotoType } from './ProfilePhotoManager';
import CEODashboard from './CEODashboard';
import ExpenseTracker from './ExpenseTracker';
import EnhancedPlanning from './EnhancedPlanning';
import EnhancedInvoiceManager from './EnhancedInvoiceManager';
import StockManager from './StockManager';
import ProjectValidationManager from './ProjectValidationManager';
import AccountManager from './AccountManager';
import AdminSettings from './AdminSettings';
import BirthdayManager from './BirthdayManager';
import AlertsManager from './AlertsManager';
import DailyNotes from './DailyNotes';
import LegalTermsScreen from './LegalTermsScreen';
import QuoteManagement from './QuoteManagement';
import IncidentForm from './IncidentForm';
import WorkShiftManager from './WorkShiftManager';
import GPSCartography from './GPSCartography';
import RevenueManager from './RevenueManager';
import AppointmentManager from './AppointmentManager';
import TechnicianAssigner from './TechnicianAssigner';
import UnpaidInvoicesManager from './UnpaidInvoicesManager';
import ProfitabilityDashboard from './ProfitabilityDashboard';
import MaintenanceContractManager from './MaintenanceContractManager';
import SalaryModule from './salary/SalaryModule';
import EmployeeOverview from './salary/EmployeeOverview';
import MessagingSystem from './EnhancedMessagingSystem';
import IntelligentChatbot from './IntelligentChatbot';
import InstallationHistory from './InstallationHistory';
import TechnicianEvaluation from './TechnicianEvaluation';
import UrgenceManager from './UrgenceManager';
import BroadcastManager from './BroadcastManager';

interface AdminDashboardEnhancedProps {
  currentUser: any;
  darkMode: boolean;
  lang: string;
  onBack: () => void;
  onToggleDarkMode?: () => void;
}

type ActiveModule =
  | 'dashboard'
  | 'stock'
  | 'teams'
  | 'invoices'
  | 'unpaid'
  | 'planning'
  | 'expenses'
  | 'validation'
  | 'settings'
  | 'profile'
  | 'legal'
  | 'notes'
  | 'alerts'
  | 'birthdays'
  | 'devis'
  | 'incidents'
  | 'shifts'
  | 'gps'
  | 'revenue'
  | 'appointments'
  | 'tech-assign'
  | 'profitability'
  | 'maintenance'
  | 'salary'
  | 'employee-overview'
  | 'messaging'
  | 'chatbot'
  | 'installations'
  | 'evaluations'
  | 'urgences'
  | 'broadcast';

const AdminDashboardEnhanced = ({ currentUser, darkMode, lang, onBack, onToggleDarkMode }: AdminDashboardEnhancedProps) => {
  const [activeModule, setActiveModule] = useState<ActiveModule>('dashboard');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    city: currentUser?.city || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [newQuotesCount, setNewQuotesCount] = useState(0);
  const [adminProfilePhoto, setAdminProfilePhoto] = useState<string | null>(currentUser?.profile_photo || null);
  const [adminCoverPhoto, setAdminCoverPhoto] = useState<string | null>(currentUser?.cover_photo || null);
  const [photoMenu, setPhotoMenu] = useState<PhotoType | null>(null);

  const colors = useMemo(() => ({
    primary: darkMode ? '#3b82f6' : '#2563eb',
    background: darkMode ? '#1e293b' : '#ffffff',
    surface: darkMode ? '#334155' : '#f8fafc',
    card: darkMode ? '#1e293b' : '#ffffff',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#475569' : '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  }), [darkMode]);

  useEffect(() => {
    const fetchNewQuotesCount = async () => {
      try {
        const { count, error } = await supabase
          .from('quote_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .is('viewed_at', null);

        if (error) {
          console.error('RLS Error fetching new quotes count:', error);
        } else if (count !== null) {
          console.log('New quotes count:', count);
          setNewQuotesCount(count);
        }
      } catch (error) {
        console.error('Error fetching new quotes count:', error);
      }
    };

    fetchNewQuotesCount();

    const channel = supabase
      .channel('admin_quote_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quote_requests' },
        () => {
          fetchNewQuotesCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (activeModule === 'devis') {
      setNewQuotesCount(0);
    }
  }, [activeModule]);

  const handleSaveProfile = async () => {
    if (!currentUser?.id) return;
    setProfileSaving(true);
    setProfileMessage('');
    try {
      const { error } = await supabase
        .from('app_users')
        .update({
          name: profileForm.name,
          phone: profileForm.phone,
          city: profileForm.city,
        })
        .eq('id', currentUser.id);

      if (error) throw error;
      setProfileMessage(lang === 'fr' ? 'Profil mis a jour' : 'Profile updated');
      if (currentUser) {
        currentUser.name = profileForm.name;
        currentUser.phone = profileForm.phone;
        currentUser.city = profileForm.city;
      }
    } catch {
      setProfileMessage(lang === 'fr' ? 'Erreur lors de la sauvegarde' : 'Error saving');
    } finally {
      setProfileSaving(false);
    }
  };

  const backButtonHeader = (title: string) => (
    <div style={{
      background: 'linear-gradient(135deg, #0e7490, #0891b2, #06b6d4)',
      padding: '24px',
      color: '#FFF',
      boxShadow: '0 4px 20px rgba(8,145,178,0.3)',
    }}>
      <button
        onClick={() => setActiveModule('dashboard')}
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
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
          e.currentTarget.style.transform = 'translateX(-4px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          e.currentTarget.style.transform = 'translateX(0)';
        }}
      >
        ← Retour au tableau de bord
      </button>
      {title && <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>{title}</h2>}
    </div>
  );

  const moduleWrapper = (title: string, children: React.ReactNode, bgImage?: string) => (
    <div style={{ height: '100vh', background: colors.background, overflow: 'auto', position: 'relative' }}>
      {bgImage && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.39, zIndex: 0, pointerEvents: 'none',
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {backButtonHeader(title)}
        {children}
      </div>
    </div>
  );

  if (activeModule === 'planning') {
    return moduleWrapper('', <EnhancedPlanning userRole="admin" darkMode={darkMode} />);
  }

  if (activeModule === 'stock') {
    return moduleWrapper('', <StockManager userRole="admin" userId={currentUser?.id} darkMode={darkMode} />, '/tsd.jpeg');
  }

  if (activeModule === 'invoices') {
    return moduleWrapper('', <EnhancedInvoiceManager userRole="admin" darkMode={darkMode} currentUserId={currentUser?.id} />, '/moi_et.jpeg');
  }

  if (activeModule === 'expenses') {
    return moduleWrapper('', <ExpenseTracker userId={currentUser?.id} userRole="admin" darkMode={darkMode} />);
  }

  if (activeModule === 'validation') {
    return (
      <ProjectValidationManager
        darkMode={darkMode}
        currentUser={currentUser}
        onBack={() => setActiveModule('dashboard')}
      />
    );
  }

  if (activeModule === 'teams') {
    return (
      <AccountManager
        lang={lang}
        darkMode={darkMode}
        onClose={() => setActiveModule('dashboard')}
      />
    );
  }

  if (activeModule === 'settings') {
    return (
      <AdminSettings
        darkMode={darkMode}
        lang={lang}
        onBack={() => setActiveModule('dashboard')}
        currentUser={currentUser}
        onToggleDarkMode={onToggleDarkMode}
      />
    );
  }

  if (activeModule === 'legal') {
    return moduleWrapper(
      lang === 'fr' ? 'Mentions Legales' : 'Legal Terms',
      <LegalTermsScreen
        userId={currentUser?.id}
        onAccepted={() => setActiveModule('dashboard')}
        colors={colors}
        lang={lang}
      />
    );
  }

  if (activeModule === 'birthdays') {
    return moduleWrapper(
      '',
      <BirthdayManager
        userId={currentUser?.id}
        colors={colors}
        onBack={() => setActiveModule('dashboard')}
      />
    );
  }

  if (activeModule === 'alerts') {
    return moduleWrapper(
      '',
      <AlertsManager
        userId={currentUser?.id}
        userRole="admin"
        colors={colors}
        onBack={() => setActiveModule('dashboard')}
      />
    );
  }

  if (activeModule === 'notes') {
    return moduleWrapper(
      '',
      <DailyNotes
        userId={currentUser?.id}
        colors={colors}
        onBack={() => setActiveModule('dashboard')}
      />
    );
  }

  if (activeModule === 'devis') {
    return moduleWrapper(
      'Gestion des Devis',
      <QuoteManagement
        darkMode={darkMode}
        userRole={currentUser?.role || 'admin'}
      />
    );
  }

  if (activeModule === 'incidents') {
    return moduleWrapper(
      '',
      <IncidentForm
        userId={currentUser?.id}
        colors={colors}
        onBack={() => setActiveModule('dashboard')}
        lang={lang}
      />
    );
  }

  if (activeModule === 'shifts') {
    return moduleWrapper(
      lang === 'fr' ? 'Pointage' : 'Work Shifts',
      <WorkShiftManager
        userId={currentUser?.id}
        colors={colors}
      />,
      '/tsd.jpeg'
    );
  }

  if (activeModule === 'gps') {
    return (
      <GPSCartography
        lang={lang}
        darkMode={darkMode}
        onClose={() => setActiveModule('dashboard')}
      />
    );
  }

  if (activeModule === 'revenue') {
    return (
      <div style={{ position: 'relative', height: '100vh' }}>
        <div style={{
          position: 'fixed', inset: 0,
          backgroundImage: 'url(/moi_et.jpeg)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.39, zIndex: 0, pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
          <RevenueManager
            lang={lang}
            darkMode={darkMode}
            onClose={() => setActiveModule('dashboard')}
          />
        </div>
      </div>
    );
  }

  if (activeModule === 'appointments') {
    return moduleWrapper(
      lang === 'fr' ? 'Rendez-vous' : 'Appointments',
      <AppointmentManager
        darkMode={darkMode}
        currentUser={currentUser}
      />
    );
  }

  if (activeModule === 'tech-assign') {
    return moduleWrapper(
      lang === 'fr' ? 'Assigner des Techniciens' : 'Assign Technicians',
      <TechnicianAssigner darkMode={darkMode} />
    );
  }

  if (activeModule === 'unpaid') {
    return moduleWrapper(
      lang === 'fr' ? 'Factures Impayees' : 'Unpaid Invoices',
      <UnpaidInvoicesManager darkMode={darkMode} />,
      '/tsd.jpeg'
    );
  }

  if (activeModule === 'profitability') {
    return (
      <ProfitabilityDashboard
        darkMode={darkMode}
        lang={lang}
        onClose={() => setActiveModule('dashboard')}
      />
    );
  }

  if (activeModule === 'maintenance') {
    return (
      <MaintenanceContractManager
        currentUser={currentUser}
        darkMode={darkMode}
        lang={lang}
        onBack={() => setActiveModule('dashboard')}
      />
    );
  }

  if (activeModule === 'salary') {
    return (
      <SalaryModule
        currentUser={currentUser}
        darkMode={darkMode}
        lang={lang}
        onBack={() => setActiveModule('dashboard')}
      />
    );
  }

  if (activeModule === 'employee-overview') {
    return (
      <EmployeeOverview
        darkMode={darkMode}
        lang={lang}
        onBack={() => setActiveModule('dashboard')}
      />
    );
  }

  if (activeModule === 'messaging') {
    return (
      <MessagingSystem
        currentUser={currentUser}
        darkMode={darkMode}
        lang={lang}
        onBack={() => setActiveModule('dashboard')}
      />
    );
  }

  if (activeModule === 'chatbot') {
    return (
      <div style={{ height: '100vh', background: colors.background }}>
        {backButtonHeader(lang === 'fr' ? 'Assistant IA' : 'AI Assistant')}
        <IntelligentChatbot
          darkMode={darkMode}
          lang={lang}
          onClose={() => setActiveModule('dashboard')}
          currentUser={currentUser}
        />
      </div>
    );
  }

  if (activeModule === 'installations') {
    return (
      <InstallationHistory
        currentUser={currentUser}
        darkMode={darkMode}
        lang={lang}
        onBack={() => setActiveModule('dashboard')}
      />
    );
  }

  if (activeModule === 'evaluations') {
    return (
      <TechnicianEvaluation
        currentUser={currentUser}
        darkMode={darkMode}
        lang={lang}
        onBack={() => setActiveModule('dashboard')}
      />
    );
  }

  if (activeModule === 'urgences') {
    return (
      <UrgenceManager
        currentUser={currentUser}
        darkMode={darkMode}
        lang={lang}
        onBack={() => setActiveModule('dashboard')}
      />
    );
  }

  if (activeModule === 'broadcast') {
    return (
      <BroadcastManager
        currentUser={currentUser}
        darkMode={darkMode}
        lang={lang}
        onBack={() => setActiveModule('dashboard')}
      />
    );
  }

  const navItems = [
    { id: 'dashboard' as ActiveModule, icon: '🏠', label: lang === 'fr' ? 'Accueil' : 'Home', gradient: `linear-gradient(135deg, ${colors.primary}, #60a5fa)` },
    { id: 'broadcast' as ActiveModule, icon: '📢', label: lang === 'fr' ? 'Diffusion' : 'Broadcast', gradient: `linear-gradient(135deg, #0891b2, #22d3ee)` },
    { id: 'stock' as ActiveModule, icon: '📦', label: 'Stock', gradient: `linear-gradient(135deg, ${colors.warning}, #fbbf24)` },
    { id: 'teams' as ActiveModule, icon: '👥', label: lang === 'fr' ? 'Equipe' : 'Team', gradient: `linear-gradient(135deg, #0e7490, #06b6d4)` },
    { id: 'invoices' as ActiveModule, icon: '💰', label: lang === 'fr' ? 'Facture' : 'Invoice', gradient: `linear-gradient(135deg, ${colors.success}, #34d399)` },
    { id: 'unpaid' as ActiveModule, icon: '⚠️', label: lang === 'fr' ? 'Impayées' : 'Unpaid', gradient: `linear-gradient(135deg, ${colors.danger}, #f87171)` },
    { id: 'gps' as ActiveModule, icon: '📍', label: 'GPS', gradient: `linear-gradient(135deg, #ef4444, #f87171)` },
    { id: 'revenue' as ActiveModule, icon: '📊', label: 'CA', gradient: `linear-gradient(135deg, #ec4899, #f472b6)` },
  ];

  const plusMenuItems = [
    { id: 'messaging' as ActiveModule, icon: '💬', label: 'Messages' },
    { id: 'salary' as ActiveModule, icon: '💵', label: lang === 'fr' ? 'Salaires' : 'Salaries' },
    { id: 'employee-overview' as ActiveModule, icon: '📋', label: lang === 'fr' ? 'Vue Employes' : 'Employee Overview' },
    { id: 'planning' as ActiveModule, icon: '📅', label: 'Planning' },
    { id: 'shifts' as ActiveModule, icon: '⏱️', label: lang === 'fr' ? 'Pointage' : 'Work Shifts' },
    { id: 'tech-assign' as ActiveModule, icon: '👷', label: lang === 'fr' ? 'Assigner Techniciens' : 'Assign Technicians' },
    { id: 'appointments' as ActiveModule, icon: '🗓️', label: lang === 'fr' ? 'Rendez-vous' : 'Appointments' },
    { id: 'urgences' as ActiveModule, icon: '🚨', label: lang === 'fr' ? 'Urgences' : 'Emergencies' },
    { id: 'installations' as ActiveModule, icon: '🏗️', label: lang === 'fr' ? 'Installations' : 'Installations' },
    { id: 'evaluations' as ActiveModule, icon: '⭐', label: lang === 'fr' ? 'Evaluations' : 'Evaluations' },
    { id: 'chatbot' as ActiveModule, icon: '🤖', label: lang === 'fr' ? 'Assistant IA' : 'AI Assistant' },
    { id: 'profitability' as ActiveModule, icon: '💹', label: lang === 'fr' ? 'Rentabilite' : 'Profitability' },
    { id: 'maintenance' as ActiveModule, icon: '🔧', label: lang === 'fr' ? 'Maintenance' : 'Maintenance' },
    { id: 'expenses' as ActiveModule, icon: '💳', label: lang === 'fr' ? 'Depenses' : 'Expenses' },
    { id: 'devis' as ActiveModule, icon: '📝', label: 'Devis' },
    { id: 'validation' as ActiveModule, icon: '🎯', label: 'Validation' },
    { id: 'incidents' as ActiveModule, icon: '⚠️', label: 'Incidents' },
    { id: 'notes' as ActiveModule, icon: '📝', label: lang === 'fr' ? 'Notes du Jour' : 'Daily Notes' },
    { id: 'alerts' as ActiveModule, icon: '🔔', label: lang === 'fr' ? 'Alertes' : 'Alerts' },
    { id: 'birthdays' as ActiveModule, icon: '🎂', label: lang === 'fr' ? 'Anniversaires' : 'Birthdays' },
    { id: 'settings' as ActiveModule, icon: '⚙️', label: lang === 'fr' ? 'Parametres' : 'Settings' },
    { id: 'profile' as ActiveModule, icon: '👤', label: lang === 'fr' ? 'Mon Profil' : 'My Profile' },
    { id: 'legal' as ActiveModule, icon: '📜', label: lang === 'fr' ? 'Mentions Legales' : 'Legal Terms' },
  ];

  return (
    <div style={{ height: '100vh', background: colors.background, overflow: 'auto', paddingBottom: '100px', position: 'relative' }}>
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'url(/moi_et.jpeg)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.39, zIndex: 0, pointerEvents: 'none',
      }} />
      <CEODashboard
        currentUser={currentUser}
        darkMode={darkMode}
        lang={lang}
        onBack={onBack}
        embedded
        onNavigate={(module) => setActiveModule(module as ActiveModule)}
      />

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: darkMode ? '#1e293b' : '#ffffff',
        padding: '4px 2px',
        paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        display: 'grid',
        gridTemplateColumns: 'repeat(9, 1fr)',
        gap: '1px',
        zIndex: 100,
        borderTop: `1px solid ${colors.border}`,
      }}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveModule(item.id);
              setShowPlusMenu(false);
            }}
            style={{
              padding: '5px 1px',
              background: activeModule === item.id ? item.gradient : 'transparent',
              color: activeModule === item.id ? '#fff' : colors.textSecondary,
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1px',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: '16px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        <button
          onClick={() => setShowPlusMenu(!showPlusMenu)}
          style={{
            padding: '5px 1px',
            background: showPlusMenu ? 'linear-gradient(135deg, #0891b2, #22d3ee)' : 'transparent',
            color: showPlusMenu ? '#fff' : colors.textSecondary,
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1px',
            transition: 'all 0.2s',
          }}
        >
          <span style={{ fontSize: '16px' }}>⚙️</span>
          <span>Plus</span>
        </button>
      </div>

      {showPlusMenu && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 200,
            }}
            onClick={() => setShowPlusMenu(false)}
          />
          <div style={{
            position: 'fixed',
            bottom: '80px',
            left: '12px',
            right: '12px',
            background: darkMode ? '#1e293b' : '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
            zIndex: 201,
            padding: '20px',
            maxHeight: '60vh',
            overflow: 'auto',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: colors.text }}>
                {lang === 'fr' ? 'Menu' : 'Menu'}
              </h3>
              <button
                onClick={() => setShowPlusMenu(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: colors.textSecondary,
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              {plusMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setShowPlusMenu(false);
                    if (item.id === 'profile') {
                      setProfileForm({
                        name: currentUser?.name || '',
                        phone: currentUser?.phone || '',
                        city: currentUser?.city || '',
                      });
                      setProfileMessage('');
                      setShowProfileModal(true);
                    } else {
                      setActiveModule(item.id);
                    }
                  }}
                  style={{
                    padding: '16px 8px',
                    background: darkMode ? '#334155' : '#f8fafc',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {item.id === 'devis' && newQuotesCount > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: '#ef4444',
                      color: '#fff',
                      borderRadius: '12px',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: '700',
                      minWidth: '20px',
                      textAlign: 'center',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)',
                      animation: 'pulse 2s infinite',
                    }}>
                      {newQuotesCount > 99 ? '99+' : newQuotesCount}
                    </div>
                  )}
                  <span style={{ fontSize: '28px' }}>{item.icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: colors.text, textAlign: 'center' }}>
                    {item.label}
                  </span>
                </button>
              ))}

              <button
                onClick={() => {
                  setShowPlusMenu(false);
                  onBack();
                }}
                style={{
                  padding: '16px 8px',
                  background: darkMode ? '#7f1d1d' : '#fef2f2',
                  border: `1px solid ${colors.danger}33`,
                  borderRadius: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(239,68,68,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span style={{ fontSize: '28px' }}>🚪</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: colors.danger, textAlign: 'center' }}>
                  {lang === 'fr' ? 'Deconnexion' : 'Logout'}
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {showProfileModal && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 300,
            }}
            onClick={() => setShowProfileModal(false)}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: darkMode ? '#1e293b' : '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            zIndex: 301,
            padding: '32px',
            width: '90%',
            maxWidth: '480px',
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: colors.text }}>
                👤 {lang === 'fr' ? 'Mon Profil' : 'My Profile'}
              </h2>
              <button
                onClick={() => setShowProfileModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: colors.textSecondary,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div
                onClick={() => setPhotoMenu('cover')}
                style={{
                  width: '100%', height: '80px', borderRadius: '12px',
                  background: adminCoverPhoto ? undefined : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                  overflow: 'hidden', cursor: 'pointer', position: 'relative',
                }}
              >
                {adminCoverPhoto && (
                  <img src={adminCoverPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <div style={{
                  position: 'absolute', top: '6px', right: '6px',
                  background: 'rgba(0,0,0,0.4)', borderRadius: '8px',
                  padding: '4px 8px', color: '#fff', fontSize: '12px',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  &#x1F4F7;
                </div>
              </div>
              <div style={{ marginTop: '-30px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'inline-block', position: 'relative' }}>
                  <div
                    onClick={() => setPhotoMenu('profile')}
                    style={{
                      width: '64px', height: '64px', borderRadius: '50%',
                      background: adminProfilePhoto ? undefined : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '28px', color: '#fff', fontWeight: '700',
                      border: `3px solid ${darkMode ? '#1e293b' : '#ffffff'}`,
                      overflow: 'hidden', cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                    }}
                  >
                    {adminProfilePhoto
                      ? <img src={adminProfilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (currentUser?.name || 'A').charAt(0).toUpperCase()
                    }
                  </div>
                  <button
                    onClick={() => setPhotoMenu('profile')}
                    style={{
                      position: 'absolute', bottom: '-2px', right: '-2px',
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: colors.primary, border: `2px solid ${darkMode ? '#1e293b' : '#ffffff'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', fontSize: '11px', color: '#fff', padding: 0,
                    }}
                  >
                    &#x1F4F7;
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.textSecondary, marginBottom: '6px' }}>
                  {lang === 'fr' ? 'Nom complet' : 'Full name'}
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: `1px solid ${colors.border}`,
                    background: darkMode ? '#0f172a' : '#f8fafc',
                    color: colors.text,
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.textSecondary, marginBottom: '6px' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={currentUser?.email || ''}
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: `1px solid ${colors.border}`,
                    background: darkMode ? '#0f172a' : '#e2e8f0',
                    color: colors.textSecondary,
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: 0.7,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.textSecondary, marginBottom: '6px' }}>
                  {lang === 'fr' ? 'Telephone' : 'Phone'}
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: `1px solid ${colors.border}`,
                    background: darkMode ? '#0f172a' : '#f8fafc',
                    color: colors.text,
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.textSecondary, marginBottom: '6px' }}>
                  {lang === 'fr' ? 'Ville' : 'City'}
                </label>
                <input
                  type="text"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, city: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: `1px solid ${colors.border}`,
                    background: darkMode ? '#0f172a' : '#f8fafc',
                    color: colors.text,
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: darkMode ? '#0f172a' : '#f0fdf4',
                border: `1px solid ${colors.success}33`,
              }}>
                <div style={{ fontSize: '13px', color: colors.textSecondary }}>
                  {lang === 'fr' ? 'Role' : 'Role'}
                </div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: colors.success, textTransform: 'capitalize' }}>
                  {currentUser?.role || 'admin'}
                </div>
              </div>
            </div>

            {profileMessage && (
              <div style={{
                marginTop: '12px',
                padding: '10px',
                borderRadius: '8px',
                background: profileMessage.includes('Erreur') || profileMessage.includes('Error')
                  ? `${colors.danger}22` : `${colors.success}22`,
                color: profileMessage.includes('Erreur') || profileMessage.includes('Error')
                  ? colors.danger : colors.success,
                fontSize: '14px',
                textAlign: 'center',
              }}>
                {profileMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setShowProfileModal(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.text,
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {lang === 'fr' ? 'Fermer' : 'Close'}
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: profileSaving ? 'not-allowed' : 'pointer',
                  opacity: profileSaving ? 0.7 : 1,
                }}
              >
                {profileSaving
                  ? (lang === 'fr' ? 'Sauvegarde...' : 'Saving...')
                  : (lang === 'fr' ? 'Enregistrer' : 'Save')}
              </button>
            </div>
          </div>
        </>
      )}

      <ProfilePhotoManager
        userId={currentUser?.id || ''}
        currentProfilePhoto={adminProfilePhoto}
        currentCoverPhoto={adminCoverPhoto}
        onProfilePhotoChange={(url) => setAdminProfilePhoto(url)}
        onCoverPhotoChange={(url) => setAdminCoverPhoto(url)}
        darkMode={darkMode}
        lang={lang}
        activeMenu={photoMenu}
        onCloseMenu={() => setPhotoMenu(null)}
      />
    </div>
  );
};

export default AdminDashboardEnhanced;
