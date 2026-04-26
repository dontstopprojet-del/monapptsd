import { useState } from 'react';
import BirthdayManager from './BirthdayManager';
import IncidentForm from './IncidentForm';
import DailyNotes from './DailyNotes';
import AlertsManager from './AlertsManager';
import LegalTermsScreen from './LegalTermsScreen';
import AdminSettings from './AdminSettings';
import CEODashboard from './CEODashboard';
import WorkShiftTracker from './WorkShiftTracker';
import { getOfficePermissions, PermissionsConfig, OfficePosition } from '../utils/permissions';
import ProfileHeader from './ProfileHeader';
import BroadcastBanner from './BroadcastBanner';

interface OfficeAppProps {
  currentUser: any;
  darkMode: boolean;
  lang: string;
  t: any;
  legalTermsAccepted: boolean;
  setLegalTermsAccepted: (value: boolean) => void;
  setIsLoggedIn: (value: boolean) => void;
  setUserRole: (value: string | null) => void;
  handleLogout: () => void;
  setLang: (value: string) => void;
  setDarkMode: (value: boolean) => void;
  weekDays: any[];
  planning: any[];
  expandedFaq: number | null;
  setExpandedFaq: (value: number | null) => void;
  profilePhoto: string;
  setProfilePhoto: (value: string) => void;
  coverPhoto: string;
  setCoverPhoto: (value: string) => void;
}

const OfficeApp = (props: OfficeAppProps) => {
  const {
    currentUser,
    darkMode,
    lang,
    t,
    legalTermsAccepted,
    setLegalTermsAccepted,
    handleLogout,
    setLang,
    setDarkMode,
    weekDays,
    expandedFaq,
    setExpandedFaq,
    profilePhoto,
    setProfilePhoto,
    coverPhoto,
    setCoverPhoto,
  } = props;

  const [screen, setScreen] = useState('home');
  const [periodFilter, setPeriodFilter] = useState('month');
  const [selectedDay, setSelectedDay] = useState(0);
  const [showBirthdays, setShowBirthdays] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [showDailyNotes, setShowDailyNotes] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showCEODashboard, setShowCEODashboard] = useState(false);
  const [selectedPlanning, setSelectedPlanning] = useState<any>(null);
  const [selectedFacture, setSelectedFacture] = useState<any>(null);
  const [caDetailView, setCaDetailView] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);

  const rawPosition = (currentUser?.office_position || currentUser?.status || '').toLowerCase();
  const positionMap: { [key: string]: OfficePosition } = {
    'rh': 'RH',
    'magasinier': 'Magasinier',
    'secrétariat': 'Secrétariat',
    'secretariat': 'Secrétariat',
    'assistant': 'Assistant',
    'finance': 'Finance',
    'comptable': 'Comptable',
    'directeur': 'Directeur Général',
    'directeur général': 'Directeur Général',
    'directeur general': 'Directeur Général',
    'directeur administratif': 'Directeur Administratif',
    'coordinateur': 'Coordinateur',
  };
  const officePosition = positionMap[rawPosition] || (rawPosition.charAt(0).toUpperCase() + rawPosition.slice(1)) as OfficePosition;
  const perms: PermissionsConfig = getOfficePermissions(officePosition, currentUser?.role || 'office');

  const C = {
    primary: '#1e40af',
    secondary: '#3b82f6',
    accent: '#60a5fa',
    light2: '#93c5fd',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    card: darkMode ? '#1e293b' : '#FFFFFF',
    bg: darkMode ? '#0f172a' : '#f8fafc',
    gray: darkMode ? '#0f172a' : '#f1f5f9',
    light: darkMode ? '#334155' : '#e2e8f0',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#334155' : '#cbd5e1',
    headerGradient: 'linear-gradient(135deg, #1e3a8a, #1e40af, #2563eb)',
    cardHover: darkMode ? '#1e3a5f' : '#f0f7ff',
  };

  const translations = lang === 'fr' ? {
    // Navigation
    home: 'Accueil',
    planning: 'Planning',
    gps: 'GPS',
    invoices: 'Factures',
    profile: 'Profil',

    // Welcome & Greetings
    welcome: 'Bienvenue',
    officeEmployee: 'Employe de Bureau',
    directorCard: 'Fiche',

    // Quick Access
    quickAccess: 'Acces rapide',
    tools: 'Outils',
    yourPermissions: 'Vos permissions',

    // Actions
    view: 'Consultation',
    viewOnly: 'Consultation',
    edit: 'Modifier',
    add: 'Ajouter',
    manage: 'Gestion',

    // Planning & Tasks
    taskDetail: 'Detail intervention',
    assignedTechnicians: 'Techniciens assignes',
    requiredMaterials: 'Materiel requis',
    notes: 'Notes',
    noTaskScheduled: 'Aucune tache prevue',
    enjoyYourDay: 'Profitez de votre journee',

    // Status
    confirmed: 'Confirme',
    inProgress: 'En cours',
    planned: 'Planifie',
    done: 'Termine',
    active: 'Actif',
    inactive: 'Inactif',
    pause: 'Pause',

    // Priority
    high: 'Haute',
    medium: 'Moyenne',
    low: 'Basse',

    // Invoices
    invoice: 'Facture',
    totalInvoices: 'Total factures',
    paid: 'Payee',
    pending: 'En attente',
    overdue: 'En retard',
    information: 'Informations',
    technician: 'Technicien',
    dueDate: 'Echeance',
    payment: 'Paiement',
    description: 'Description',

    // Revenue
    revenue: 'Chiffre d\'affaires',
    revenueWeek: 'Chiffre d\'affaires - Semaine',
    revenueMonth: 'Chiffre d\'affaires - Mois',
    revenueQuarter: 'Chiffre d\'affaires - Trimestre',
    revenueYear: 'Chiffre d\'affaires - Annee',
    totalRevenueMonth: 'CA Total (Mois)',
    periodBreakdown: 'Repartition par periode',
    byServiceType: 'Par type de service',
    topClients: 'Top clients',

    // Time Periods
    week: 'Semaine',
    month: 'Mois',
    quarter: 'Trimestre',
    semester: 'Semestre',
    year: 'Annee',
    january: 'Janvier',
    february: 'Fevrier',
    march: 'Mars',

    // Services
    installation: 'Installation',
    repair: 'Reparation',
    renovation: 'Renovation',
    maintenance: 'Entretien',

    // GPS & Workers
    location: 'Localisation',
    workerDetails: 'Fiche ouvrier',
    currentLocation: 'Localisation actuelle',
    lastSignal: 'Dernier signal',
    distanceTraveled: 'Distance parcourue',
    startTime: 'Heure de debut',
    currentTask: 'Tache en cours',
    personalInfo: 'Informations personnelles',
    team: 'Equipe',
    specialty: 'Specialite',
    seniority: 'Anciennete',
    statistics: 'Statistiques',
    jobs: 'Interventions',
    satisfaction: 'Satisfaction',
    kmToday: 'Km aujourd\'hui',
    workers: 'Ouvriers',
    actives: 'Actifs',
    inactives: 'Inactifs',

    // Stocks
    stocks: 'Stocks',
    threshold: 'Seuil',
    lowStock: 'Stock bas',

    // Profile
    contract: 'Contrat',
    position: 'Poste',
    phone: 'Telephone',
    adminSettings: 'Parametres Admin',
    alerts: 'Alertes',

    // Common
    time: 'Heure',
    duration: 'Duree',
    date: 'Date',
    site: 'Site',
    service: 'Service',
    status: 'Statut',
    total: 'Total',
    ongoing: 'en cours',
    appointments: 'Rendez-vous',
    incidents: 'Incidents',
    birthdays: 'Anniversaires',
    screenUnderConstruction: 'Ecran en construction',

    // FAQ
    faqEditProfile: 'Comment modifier mon profil ?',
    faqEditProfileAnswer: 'Allez dans Profil > Parametres',
    faqContactSupport: 'Comment contacter le support ?',
    faqContactSupportAnswer: 'Utilisez le chatbot ou appelez le support',
    faqPermissions: 'Quelles sont mes permissions ?',
    faqPermissionsAnswer: 'Consultez la section "Vos permissions" dans votre profil',

    // Legal
    legalDocuments: 'Documents legaux disponibles ici',
  } : {
    // Navigation
    home: 'Home',
    planning: 'Schedule',
    gps: 'GPS',
    invoices: 'Invoices',
    profile: 'Profile',

    // Welcome & Greetings
    welcome: 'Welcome',
    officeEmployee: 'Office Employee',
    directorCard: 'Director Card',

    // Quick Access
    quickAccess: 'Quick Access',
    tools: 'Tools',
    yourPermissions: 'Your permissions',

    // Actions
    view: 'View',
    viewOnly: 'View only',
    edit: 'Edit',
    add: 'Add',
    manage: 'Manage',

    // Planning & Tasks
    taskDetail: 'Task Detail',
    assignedTechnicians: 'Assigned Technicians',
    requiredMaterials: 'Required Materials',
    notes: 'Notes',
    noTaskScheduled: 'No task scheduled',
    enjoyYourDay: 'Enjoy your day',

    // Status
    confirmed: 'Confirmed',
    inProgress: 'In progress',
    planned: 'Planned',
    done: 'Done',
    active: 'Active',
    inactive: 'Inactive',
    pause: 'Pause',

    // Priority
    high: 'High',
    medium: 'Medium',
    low: 'Low',

    // Invoices
    invoice: 'Invoice',
    totalInvoices: 'Total invoices',
    paid: 'Paid',
    pending: 'Pending',
    overdue: 'Overdue',
    information: 'Information',
    technician: 'Technician',
    dueDate: 'Due date',
    payment: 'Payment',
    description: 'Description',

    // Revenue
    revenue: 'Revenue',
    revenueWeek: 'Revenue - Week',
    revenueMonth: 'Revenue - Month',
    revenueQuarter: 'Revenue - Quarter',
    revenueYear: 'Revenue - Year',
    totalRevenueMonth: 'Total Revenue (Month)',
    periodBreakdown: 'Period breakdown',
    byServiceType: 'By service type',
    topClients: 'Top Clients',

    // Time Periods
    week: 'Week',
    month: 'Month',
    quarter: 'Quarter',
    semester: 'Semester',
    year: 'Year',
    january: 'January',
    february: 'February',
    march: 'March',

    // Services
    installation: 'Installation',
    repair: 'Repair',
    renovation: 'Renovation',
    maintenance: 'Maintenance',

    // GPS & Workers
    location: 'Location',
    workerDetails: 'Worker Details',
    currentLocation: 'Current Location',
    lastSignal: 'Last signal',
    distanceTraveled: 'Distance traveled',
    startTime: 'Start time',
    currentTask: 'Current Task',
    personalInfo: 'Personal Information',
    team: 'Team',
    specialty: 'Specialty',
    seniority: 'Seniority',
    statistics: 'Statistics',
    jobs: 'Jobs',
    satisfaction: 'Satisfaction',
    kmToday: 'Km today',
    workers: 'Workers',
    actives: 'Active',
    inactives: 'Inactive',

    // Stocks
    stocks: 'Stocks',
    threshold: 'Threshold',
    lowStock: 'Low stock',

    // Profile
    contract: 'Contract',
    position: 'Position',
    phone: 'Phone',
    adminSettings: 'Admin Settings',
    alerts: 'Alerts',

    // Common
    time: 'Time',
    duration: 'Duration',
    date: 'Date',
    site: 'Site',
    service: 'Service',
    status: 'Status',
    total: 'Total',
    ongoing: 'ongoing',
    appointments: 'Appointments',
    incidents: 'Incidents',
    birthdays: 'Birthdays',
    screenUnderConstruction: 'Screen under construction',

    // FAQ
    faqEditProfile: 'How to edit my profile?',
    faqEditProfileAnswer: 'Go to Profile > Settings',
    faqContactSupport: 'How to contact support?',
    faqContactSupportAnswer: 'Use the chatbot or call support',
    faqPermissions: 'What are my permissions?',
    faqPermissionsAnswer: 'Check the "Your permissions" section in your profile',

    // Legal
    legalDocuments: 'Legal documents available here',
  };

  const positionLabels: { [key: string]: { fr: string; en: string } } = {
    'RH': { fr: 'Ressources Humaines', en: 'Human Resources' },
    'Magasinier': { fr: 'Magasinier', en: 'Storekeeper' },
    'Secrétariat': { fr: 'Secrétariat', en: 'Secretary' },
    'Assistant': { fr: 'Assistant(e)', en: 'Assistant' },
    'Finance': { fr: 'Finance', en: 'Finance' },
    'Comptable': { fr: 'Comptable', en: 'Accountant' },
    'Directeur Général': { fr: 'Directeur Général', en: 'General Director' },
    'Directeur Administratif': { fr: 'Directeur Administratif', en: 'Administrative Director' },
    'Coordinateur': { fr: 'Coordinateur', en: 'Coordinator' },
  };

  const getPositionLabel = () => {
    const pos = officePosition;
    const label = positionLabels[pos];
    if (label) return lang === 'fr' ? label.fr : label.en;
    return lang === 'fr' ? 'Employé de Bureau' : 'Office Employee';
  };

  const facturesData = [
    { id: 'FAC-001', client: 'Mamadou Diallo', amount: '2 500 000 GNF', amountNum: 2500000, date: '2024-01-15', status: 'payee', service: 'Installation plomberie', technicien: 'Ibrahim Sow', site: 'Kaloum - Villa Rosso', paiement: 'Virement bancaire', echeance: '2024-01-30', description: 'Installation complete du systeme de plomberie pour villa neuve, incluant tuyauterie, sanitaires et chauffe-eau.' },
    { id: 'FAC-002', client: 'Alpha Barry', amount: '1 800 000 GNF', amountNum: 1800000, date: '2024-01-12', status: 'attente', service: 'Reparation fuite', technicien: 'Mamadou Diallo', site: 'Ratoma - Immeuble Baraka', paiement: 'Especes', echeance: '2024-01-27', description: 'Reparation de fuite majeure au 3eme etage, remplacement de 15m de canalisation et joints.' },
    { id: 'FAC-003', client: 'Fatoumata Bah', amount: '3 200 000 GNF', amountNum: 3200000, date: '2024-01-10', status: 'payee', service: 'Renovation salle de bain', technicien: 'Alpha Camara', site: 'Matam - Residence Soleil', paiement: 'Cheque', echeance: '2024-01-25', description: 'Renovation complete de la salle de bain: demolition, carrelage, plomberie, pose sanitaires.' },
    { id: 'FAC-004', client: 'Ibrahim Sow', amount: '950 000 GNF', amountNum: 950000, date: '2024-01-08', status: 'retard', service: 'Debouchage canalisation', technicien: 'Sekou Toure', site: 'Dixinn - Bureau Central', paiement: 'En attente', echeance: '2024-01-20', description: 'Debouchage complet des canalisations du sous-sol et nettoyage haute pression.' },
  ];

  const planningData = [
    { id: 1, jour: 0, client: 'Mamadou Diallo', heure: '08:00', type: 'Installation', lieu: 'Kaloum', duree: '4h', techniciens: ['Ibrahim Sow', 'Alpha Camara'], priorite: 'haute', notes: 'Apporter materiel supplementaire pour installation chauffe-eau. Client VIP - premiere intervention.', materiel: ['Tuyaux PVC 50mm x20', 'Coudes 90 x10', 'Joints silicone x5', 'Chauffe-eau 80L x1'], statut: 'confirme' },
    { id: 2, jour: 0, client: 'Alpha Barry', heure: '14:00', type: 'Reparation', lieu: 'Ratoma', duree: '2h', techniciens: ['Mamadou Diallo'], priorite: 'moyenne', notes: 'Fuite detectee au 3eme etage. Prevoir protection sol.', materiel: ['Tuyaux PVC 25mm x5', 'Joints x10', 'Colle PVC x2'], statut: 'confirme' },
    { id: 3, jour: 1, client: 'Fatoumata Bah', heure: '09:00', type: 'Renovation', lieu: 'Matam', duree: '8h', techniciens: ['Alpha Camara', 'Sekou Toure', 'Ibrahim Sow'], priorite: 'haute', notes: 'Renovation complete salle de bain. Chantier sur 3 jours.', materiel: ['Carrelage x25m2', 'Colle carrelage x3 sacs', 'Sanitaires complets', 'Robinetterie'], statut: 'en_cours' },
    { id: 4, jour: 2, client: 'Ousmane Camara', heure: '10:00', type: 'Diagnostic', lieu: 'Dixinn', duree: '1h30', techniciens: ['Ibrahim Sow'], priorite: 'basse', notes: 'Diagnostic fuites dans les murs. Besoin camera inspection.', materiel: ['Camera inspection', 'Detecteur humidite'], statut: 'planifie' },
    { id: 5, jour: 3, client: 'Aissatou Diallo', heure: '08:30', type: 'Entretien', lieu: 'Kaloum', duree: '3h', techniciens: ['Mamadou Diallo', 'Alpha Camara'], priorite: 'moyenne', notes: 'Entretien annuel systeme plomberie villa.', materiel: ['Kit entretien standard', 'Joints divers'], statut: 'planifie' },
  ];

  if (!legalTermsAccepted && currentUser?.id) {
    return <LegalTermsScreen userId={currentUser.id} onAccepted={() => setLegalTermsAccepted(true)} colors={C} lang={lang} />;
  }

  if (showCEODashboard) {
    return <CEODashboard currentUser={currentUser} darkMode={darkMode} lang={lang} onBack={() => setShowCEODashboard(false)} />;
  }

  if (showBirthdays) {
    return <BirthdayManager userId={currentUser?.id} colors={C} onBack={() => setShowBirthdays(false)} />;
  }

  if (showIncidentForm) {
    return <IncidentForm userId={currentUser?.id} colors={C} onBack={() => setShowIncidentForm(false)} lang={lang} />;
  }

  if (showDailyNotes) {
    return <DailyNotes userId={currentUser?.id} colors={C} onBack={() => setShowDailyNotes(false)} />;
  }

  if (showAlerts) {
    return <AlertsManager userId={currentUser?.id} userRole="office" colors={C} onBack={() => setShowAlerts(false)} />;
  }

  if (showAdminSettings) {
    return <AdminSettings darkMode={darkMode} lang={lang} onBack={() => setShowAdminSettings(false)} currentUser={currentUser} onToggleDarkMode={() => setDarkMode(!darkMode)} />;
  }

  const getNavItems = () => {
    const items: { i: string; l: string; s: string }[] = [
      { i: '🏠', l: translations.home, s: 'home' },
    ];
    if (perms.planning.view || perms.rdv.view) {
      items.push({ i: '📅', l: translations.planning, s: 'planning' });
    }
    if (perms.gpsLive.view) {
      items.push({ i: '📍', l: translations.gps, s: 'gps' });
    }
    if (perms.factures.view || perms.factures.add) {
      items.push({ i: '🧾', l: translations.invoices, s: 'factures' });
    }
    items.push({ i: '👤', l: translations.profile, s: 'profil' });
    return items;
  };

  const Nav = () => (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: C.card,
      padding: '10px 8px 14px',
      display: 'flex', justifyContent: 'space-around',
      boxShadow: `0 -2px 20px ${darkMode ? 'rgba(0,0,0,0.6)' : 'rgba(30,64,175,0.08)'}`,
      borderRadius: '22px 22px 0 0',
      zIndex: 100,
      borderTop: `1px solid ${C.light}`,
    }}>
      {getNavItems().map(x => (
        <button key={x.s} onClick={() => setScreen(x.s)} style={{
          background: screen === x.s ? `${C.primary}12` : 'transparent',
          border: 'none', cursor: 'pointer',
          padding: '8px 14px', borderRadius: '14px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
          transition: 'all 0.2s',
        }}>
          <span style={{ fontSize: '20px' }}>{x.i}</span>
          <span style={{
            fontSize: '10px',
            fontWeight: screen === x.s ? '700' : '500',
            color: screen === x.s ? C.primary : C.textSecondary,
            letterSpacing: '0.3px',
          }}>{x.l}</span>
          {screen === x.s && <div style={{ width: '20px', height: '3px', borderRadius: '2px', background: C.primary, marginTop: '2px' }} />}
        </button>
      ))}
    </div>
  );

  const Header = ({ title, icon, showBack, backTo }: { title: string; icon: string; showBack?: boolean; backTo?: string }) => (
    <div style={{
      background: C.headerGradient,
      padding: showBack ? '18px 20px' : '28px 20px 22px',
      borderRadius: '0 0 28px 28px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '-30px', right: '-20px',
        width: '120px', height: '120px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-40px', left: '-30px',
        width: '100px', height: '100px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 1 }}>
        {showBack && (
          <button onClick={() => setScreen(backTo || 'home')} style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px', padding: '10px 14px',
            cursor: 'pointer', color: '#FFF', fontSize: '16px',
            transition: 'all 0.2s',
          }}>
            ←
          </button>
        )}
        <div style={{ flex: 1 }}>
          <h2 style={{ color: '#FFF', fontSize: '19px', margin: 0, fontWeight: '700', letterSpacing: '-0.3px' }}>
            {icon} {title}
          </h2>
        </div>
      </div>
    </div>
  );

  const PermBadge = ({ allowed, label }: { allowed: boolean; label: string }) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '600',
      background: allowed ? '#10B98115' : '#EF444415',
      color: allowed ? '#10B981' : '#EF4444',
      border: `1px solid ${allowed ? '#10B98130' : '#EF444430'}`,
    }}>
      {allowed ? '✓' : '✕'} {label}
    </span>
  );

  const InfoRow = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 0',
      borderBottom: `1px solid ${C.border}40`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span style={{ fontSize: '13px', color: C.textSecondary, fontWeight: '500' }}>{label}</span>
      </div>
      <span style={{ fontSize: '13px', color: C.text, fontWeight: '700' }}>{value}</span>
    </div>
  );

  const StatusBadge = ({ status }: { status: string }) => {
    const config: { [k: string]: { bg: string; color: string; label: string } } = {
      confirme: { bg: '#10B98115', color: '#10B981', label: translations.confirmed },
      en_cours: { bg: '#3b82f615', color: '#3b82f6', label: translations.inProgress },
      planifie: { bg: '#F59E0B15', color: '#F59E0B', label: translations.planned },
      termine: { bg: '#6b728015', color: '#6b7280', label: translations.done },
    };
    const c = config[status] || config.planifie;
    return (
      <span style={{
        padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
        background: c.bg, color: c.color, border: `1px solid ${c.color}30`,
      }}>
        {c.label}
      </span>
    );
  };

  const PrioriteBadge = ({ priorite }: { priorite: string }) => {
    const config: { [k: string]: { color: string; label: string } } = {
      haute: { color: '#EF4444', label: translations.high },
      moyenne: { color: '#F59E0B', label: translations.medium },
      basse: { color: '#10B981', label: translations.low },
    };
    const c = config[priorite] || config.moyenne;
    return (
      <span style={{
        padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
        background: `${c.color}12`, color: c.color, border: `1px solid ${c.color}30`,
      }}>
        {c.label}
      </span>
    );
  };

  // ====== PLANNING DETAIL VIEW ======
  if (selectedPlanning) {
    const p = selectedPlanning;
    return (
      <div style={{ height: '100%', background: C.gray, overflow: 'auto', paddingBottom: '90px' }}>
        <div style={{
          background: C.headerGradient,
          padding: '18px 20px',
          borderRadius: '0 0 28px 28px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 1 }}>
            <button onClick={() => setSelectedPlanning(null)} style={{
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px',
              padding: '10px 14px', cursor: 'pointer', color: '#FFF', fontSize: '16px',
            }}>←</button>
            <h2 style={{ color: '#FFF', fontSize: '19px', margin: 0, fontWeight: '700' }}>📅 {translations.taskDetail}</h2>
          </div>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{
            background: C.card, borderRadius: '18px', padding: '22px',
            boxShadow: '0 4px 16px rgba(30,64,175,0.08)',
            border: `1px solid ${C.border}`, marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: C.text, fontWeight: '800' }}>{p.client}</h3>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: C.textSecondary, fontWeight: '500' }}>{p.type}</p>
              </div>
              <StatusBadge status={p.statut} />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <PrioriteBadge priorite={p.priorite} />
              <span style={{
                padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                background: `${C.secondary}12`, color: C.secondary, border: `1px solid ${C.secondary}30`,
              }}>
                {p.duree}
              </span>
            </div>

            <InfoRow icon="⏰" label={translations.time} value={p.heure} />
            <InfoRow icon="📍" label={translations.location} value={p.lieu} />
            <InfoRow icon="⏳" label={translations.duration} value={p.duree} />
          </div>

          <div style={{
            background: C.card, borderRadius: '18px', padding: '22px',
            boxShadow: '0 4px 16px rgba(30,64,175,0.08)',
            border: `1px solid ${C.border}`, marginBottom: '16px',
          }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px', color: C.text, fontWeight: '700' }}>
              👷 {translations.assignedTechnicians} ({p.techniciens.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {p.techniciens.map((tech: string, idx: number) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px', background: C.gray, borderRadius: '12px',
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', color: '#FFF', fontWeight: '700',
                  }}>
                    {tech.charAt(0)}
                  </div>
                  <span style={{ fontSize: '14px', color: C.text, fontWeight: '600' }}>{tech}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: C.card, borderRadius: '18px', padding: '22px',
            boxShadow: '0 4px 16px rgba(30,64,175,0.08)',
            border: `1px solid ${C.border}`, marginBottom: '16px',
          }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px', color: C.text, fontWeight: '700' }}>
              🔧 {translations.requiredMaterials}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {p.materiel.map((m: string, idx: number) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', background: C.gray, borderRadius: '10px',
                  border: `1px solid ${C.border}`,
                }}>
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: C.secondary, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: '13px', color: C.text, fontWeight: '500' }}>{m}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: C.card, borderRadius: '18px', padding: '22px',
            boxShadow: '0 4px 16px rgba(30,64,175,0.08)',
            border: `1px solid ${C.border}`,
          }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '15px', color: C.text, fontWeight: '700' }}>
              📝 {translations.notes}
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: C.textSecondary, lineHeight: '1.7', fontWeight: '500' }}>
              {p.notes}
            </p>
          </div>
        </div>
        <Nav />
      </div>
    );
  }

  // ====== FACTURE DETAIL VIEW ======
  if (selectedFacture) {
    const f = selectedFacture;
    const statusColor = f.status === 'payee' ? '#10B981' : f.status === 'attente' ? '#F59E0B' : '#EF4444';
    const statusLabel = f.status === 'payee' ? translations.paid : f.status === 'attente' ? translations.pending : translations.overdue;
    return (
      <div style={{ height: '100%', background: C.gray, overflow: 'auto', paddingBottom: '90px' }}>
        <div style={{
          background: C.headerGradient,
          padding: '18px 20px',
          borderRadius: '0 0 28px 28px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 1 }}>
            <button onClick={() => setSelectedFacture(null)} style={{
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px',
              padding: '10px 14px', cursor: 'pointer', color: '#FFF', fontSize: '16px',
            }}>←</button>
            <h2 style={{ color: '#FFF', fontSize: '19px', margin: 0, fontWeight: '700' }}>🧾 {translations.invoice} {f.id}</h2>
          </div>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{
            background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
            borderRadius: '20px', padding: '24px', marginBottom: '16px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', margin: 0, fontWeight: '500' }}>{f.id}</p>
                <h3 style={{ color: '#FFF', fontSize: '20px', margin: '6px 0 0', fontWeight: '800' }}>{f.client}</h3>
              </div>
              <span style={{
                padding: '5px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '700',
                background: 'rgba(255,255,255,0.2)', color: '#FFF',
                border: '1px solid rgba(255,255,255,0.3)',
              }}>
                {statusLabel}
              </span>
            </div>
            <p style={{ color: '#FFF', fontSize: '28px', fontWeight: '800', margin: '16px 0 0', letterSpacing: '-0.5px' }}>
              {f.amount}
            </p>
          </div>

          <div style={{
            background: C.card, borderRadius: '18px', padding: '22px',
            boxShadow: '0 4px 16px rgba(30,64,175,0.08)',
            border: `1px solid ${C.border}`, marginBottom: '16px',
          }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px', color: C.text, fontWeight: '700' }}>
              {translations.information}
            </h4>
            <InfoRow icon="🔧" label={translations.service} value={f.service} />
            <InfoRow icon="👷" label={translations.technician} value={f.technicien} />
            <InfoRow icon="📍" label={translations.site} value={f.site} />
            <InfoRow icon="📅" label={translations.date} value={f.date} />
            <InfoRow icon="⏰" label={translations.dueDate} value={f.echeance} />
            <InfoRow icon="💳" label={translations.payment} value={f.paiement} />
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>📊</span>
                <span style={{ fontSize: '13px', color: C.textSecondary, fontWeight: '500' }}>Statut</span>
              </div>
              <span style={{
                padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30`,
              }}>
                {statusLabel}
              </span>
            </div>
          </div>

          <div style={{
            background: C.card, borderRadius: '18px', padding: '22px',
            boxShadow: '0 4px 16px rgba(30,64,175,0.08)',
            border: `1px solid ${C.border}`,
          }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '15px', color: C.text, fontWeight: '700' }}>
              📝 {translations.description}
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: C.textSecondary, lineHeight: '1.7', fontWeight: '500' }}>
              {f.description}
            </p>
          </div>
        </div>
        <Nav />
      </div>
    );
  }

  // ====== CA DETAIL VIEW ======
  if (caDetailView) {
    const caDetails: { [k: string]: { title: string; total: string; items: { label: string; value: string; percent: number }[] } } = {
      semaine: {
        title: translations.revenueWeek,
        total: '45 000 000 GNF',
        items: [
          { label: 'Lundi', value: '8 500 000 GNF', percent: 19 },
          { label: 'Mardi', value: '12 000 000 GNF', percent: 27 },
          { label: 'Mercredi', value: '6 500 000 GNF', percent: 14 },
          { label: 'Jeudi', value: '9 800 000 GNF', percent: 22 },
          { label: 'Vendredi', value: '8 200 000 GNF', percent: 18 },
        ],
      },
      mois: {
        title: translations.revenueMonth,
        total: '125 000 000 GNF',
        items: [
          { label: 'Semaine 1', value: '28 000 000 GNF', percent: 22 },
          { label: 'Semaine 2', value: '35 000 000 GNF', percent: 28 },
          { label: 'Semaine 3', value: '32 000 000 GNF', percent: 26 },
          { label: 'Semaine 4', value: '30 000 000 GNF', percent: 24 },
        ],
      },
      trimestre: {
        title: translations.revenueQuarter,
        total: '380 000 000 GNF',
        items: [
          { label: translations.january, value: '125 000 000 GNF', percent: 33 },
          { label: translations.february, value: '130 000 000 GNF', percent: 34 },
          { label: translations.march, value: '125 000 000 GNF', percent: 33 },
        ],
      },
      annee: {
        title: translations.revenueYear,
        total: '847 000 000 GNF',
        items: [
          { label: 'T1', value: '380 000 000 GNF', percent: 45 },
          { label: 'T2', value: '250 000 000 GNF', percent: 30 },
          { label: 'T3 (' + translations.ongoing + ')', value: '217 000 000 GNF', percent: 25 },
        ],
      },
    };
    const detail = caDetails[caDetailView] || caDetails.mois;
    const serviceBreakdown = [
      { service: translations.installation, amount: '45 000 000 GNF', percent: 36, color: C.primary },
      { service: translations.repair, amount: '32 000 000 GNF', percent: 26, color: C.secondary },
      { service: translations.renovation, amount: '28 000 000 GNF', percent: 22, color: C.success },
      { service: translations.maintenance, amount: '20 000 000 GNF', percent: 16, color: C.warning },
    ];

    return (
      <div style={{ height: '100%', background: C.gray, overflow: 'auto', paddingBottom: '90px' }}>
        <div style={{
          background: C.headerGradient,
          padding: '18px 20px',
          borderRadius: '0 0 28px 28px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 1 }}>
            <button onClick={() => setCaDetailView(null)} style={{
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px',
              padding: '10px 14px', cursor: 'pointer', color: '#FFF', fontSize: '16px',
            }}>←</button>
            <h2 style={{ color: '#FFF', fontSize: '17px', margin: 0, fontWeight: '700' }}>📊 {detail.title}</h2>
          </div>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{
            background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
            borderRadius: '20px', padding: '24px', marginBottom: '16px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', margin: 0, fontWeight: '500' }}>Total</p>
            <p style={{ color: '#FFF', fontSize: '28px', fontWeight: '800', margin: '10px 0 0', letterSpacing: '-0.5px' }}>{detail.total}</p>
          </div>

          <div style={{
            background: C.card, borderRadius: '18px', padding: '22px',
            boxShadow: '0 4px 16px rgba(30,64,175,0.08)',
            border: `1px solid ${C.border}`, marginBottom: '16px',
          }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '15px', color: C.text, fontWeight: '700' }}>
              {translations.periodBreakdown}
            </h4>
            {detail.items.map((item, idx) => (
              <div key={idx} style={{ marginBottom: idx < detail.items.length - 1 ? '14px' : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: C.text, fontWeight: '600' }}>{item.label}</span>
                  <span style={{ fontSize: '13px', color: C.text, fontWeight: '700' }}>{item.value}</span>
                </div>
                <div style={{ height: '8px', background: `${C.primary}12`, borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${item.percent}%`,
                    background: `linear-gradient(90deg, ${C.primary}, ${C.secondary})`,
                    borderRadius: '4px', transition: 'width 0.5s ease',
                  }} />
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: C.textSecondary, fontWeight: '500', textAlign: 'right' }}>{item.percent}%</p>
              </div>
            ))}
          </div>

          <div style={{
            background: C.card, borderRadius: '18px', padding: '22px',
            boxShadow: '0 4px 16px rgba(30,64,175,0.08)',
            border: `1px solid ${C.border}`, marginBottom: '16px',
          }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '15px', color: C.text, fontWeight: '700' }}>
              {translations.byServiceType}
            </h4>
            {serviceBreakdown.map((s, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '12px', background: C.gray, borderRadius: '12px',
                border: `1px solid ${C.border}`,
                marginBottom: idx < serviceBreakdown.length - 1 ? '10px' : 0,
              }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: `${s.color}15`, border: `1px solid ${s.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: '800', color: s.color,
                }}>
                  {s.percent}%
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', color: C.text, fontWeight: '700' }}>{s.service}</div>
                  <div style={{ fontSize: '12px', color: C.textSecondary, fontWeight: '500', marginTop: '2px' }}>{s.amount}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            background: C.card, borderRadius: '18px', padding: '22px',
            boxShadow: '0 4px 16px rgba(30,64,175,0.08)',
            border: `1px solid ${C.border}`,
          }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px', color: C.text, fontWeight: '700' }}>
              {translations.topClients}
            </h4>
            {[
              { name: 'Mamadou Diallo', total: '12 500 000 GNF', count: 5 },
              { name: 'Fatoumata Bah', total: '8 200 000 GNF', count: 3 },
              { name: 'Alpha Barry', total: '6 800 000 GNF', count: 4 },
            ].map((client, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px', background: C.gray, borderRadius: '12px',
                border: `1px solid ${C.border}`,
                marginBottom: idx < 2 ? '10px' : 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', color: '#FFF', fontWeight: '800',
                  }}>
                    {idx + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: C.text, fontWeight: '700' }}>{client.name}</div>
                    <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '2px' }}>
                      {client.count} {translations.jobs}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '13px', color: C.secondary, fontWeight: '700' }}>{client.total}</span>
              </div>
            ))}
          </div>
        </div>
        <Nav />
      </div>
    );
  }

  // ====== HOME SCREEN ======
  if (screen === 'home') return (
    <div style={{ height: '100%', background: C.gray, overflow: 'auto', paddingBottom: '90px', position: 'relative' }}>
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'url(/moi_et.jpeg)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.39, zIndex: 0, pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{
        background: C.headerGradient,
        padding: '28px 20px 30px',
        borderRadius: '0 0 32px 32px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-40px', right: '-30px',
          width: '150px', height: '150px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-50px', left: '-40px',
          width: '130px', height: '130px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', margin: 0, fontWeight: '500' }}>
              {translations.welcome} 👋
            </p>
            <h2 style={{ color: '#FFF', fontSize: '22px', margin: '6px 0 0', fontWeight: '800', letterSpacing: '-0.5px' }}>
              {currentUser?.name}
            </h2>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '6px 14px', borderRadius: '20px', marginTop: '10px',
            }}>
              <span style={{ fontSize: '14px' }}>🏢</span>
              <span style={{ color: '#FFF', fontSize: '12px', fontWeight: '600' }}>
                {translations.officeEmployee} - {getPositionLabel()}
              </span>
            </div>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '10px', borderRadius: '12px',
            color: '#FFF', cursor: 'pointer', fontSize: '18px',
          }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <BroadcastBanner userRole="office" darkMode={darkMode} />
      <div style={{ padding: '20px' }}>
        <WorkShiftTracker userId={currentUser?.id} userRole="office_employee" darkMode={darkMode} />

        {(officePosition === 'Directeur Général' || officePosition === 'Directeur Administratif') && (
          <div style={{
            background: C.card, borderRadius: '18px', padding: '20px',
            boxShadow: '0 4px 16px rgba(30,64,175,0.08)',
            border: `1px solid ${C.border}`, marginBottom: '20px',
          }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '15px', color: C.text, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>👤</span> {translations.directorCard} {officePosition}
            </h4>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '16px', background: C.gray, borderRadius: '14px',
              border: `1px solid ${C.border}`, marginBottom: '14px',
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', color: '#FFF', fontWeight: '800',
                boxShadow: '0 4px 12px rgba(30,64,175,0.25)',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {profilePhoto ? <img src={profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (currentUser?.name?.charAt(0) || 'D')}
              </div>
              <div>
                <div style={{ fontSize: '16px', color: C.text, fontWeight: '800' }}>{currentUser?.name}</div>
                <div style={{ fontSize: '12px', color: C.secondary, fontWeight: '600', marginTop: '2px' }}>
                  {getPositionLabel()}
                </div>
                {currentUser?.email && (
                  <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '4px' }}>{currentUser.email}</div>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { icon: '📋', label: translations.contract, value: currentUser?.contractNumber || 'TSD-001' },
                { icon: '🏢', label: translations.position, value: getPositionLabel() },
                { icon: '📧', label: 'Email', value: currentUser?.email || '-' },
                { icon: '📱', label: translations.phone, value: currentUser?.phone || '-' },
              ].map((item, idx) => (
                <div key={idx} style={{
                  padding: '12px', background: C.gray, borderRadius: '12px',
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: '11px', color: C.textSecondary, fontWeight: '500', marginBottom: '4px' }}>
                    {item.icon} {item.label}
                  </div>
                  <div style={{ fontSize: '12px', color: C.text, fontWeight: '700', wordBreak: 'break-all' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: C.text, fontWeight: '700' }}>
          {translations.quickAccess}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
          {(officePosition === 'Directeur Général' || officePosition === 'Directeur Administratif' || rawPosition.includes('directeur') || currentUser?.role === 'admin') && (
            <QuickAccessCard
              icon="📊" label="Dashboard CEO"
              subtitle={lang === 'fr' ? 'Vue d\'ensemble' : 'Overview'}
              color="#8b5cf6" C={C}
              onClick={() => setShowCEODashboard(true)}
            />
          )}
          {(perms.planning.view || perms.planning.add || perms.planning.edit) && (
            <QuickAccessCard
              icon="📅" label={translations.planning}
              subtitle={perms.planning.edit ? translations.edit : translations.viewOnly}
              color={C.primary} C={C}
              onClick={() => setScreen('planning')}
            />
          )}
          {(perms.rdv.view || perms.rdv.add || perms.rdv.edit) && (
            <QuickAccessCard
              icon="📋" label={translations.appointments}
              subtitle={perms.rdv.edit ? translations.edit : translations.viewOnly}
              color={C.secondary} C={C}
              onClick={() => setScreen('planning')}
            />
          )}
          {perms.gpsLive.view && (
            <QuickAccessCard
              icon="📍" label="GPS Live"
              subtitle={translations.location}
              color="#059669" C={C}
              onClick={() => setScreen('gps')}
            />
          )}
          {(perms.factures.view || perms.factures.add) && (
            <QuickAccessCard
              icon="🧾" label={translations.invoices}
              subtitle={perms.factures.add ? translations.add : translations.viewOnly}
              color="#0891b2" C={C}
              onClick={() => setScreen('factures')}
            />
          )}
          {perms.stocks.view && (
            <QuickAccessCard
              icon="📦" label={translations.stocks}
              subtitle={perms.stocks.edit ? translations.manage : translations.viewOnly}
              color="#d97706" C={C}
              onClick={() => setScreen('stocks')}
            />
          )}
          {perms.chiffreAffaire.view && (
            <QuickAccessCard
              icon="📊" label={translations.revenue}
              subtitle={translations.viewOnly}
              color="#059669" C={C}
              onClick={() => setScreen('ca')}
            />
          )}
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '16px', color: C.text, fontWeight: '700' }}>
            {translations.tools}
          </h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[
              { icon: '⚠️', label: translations.incidents, action: () => setShowIncidentForm(true) },
              { icon: '📝', label: translations.notes, action: () => setShowDailyNotes(true) },
              { icon: '🎂', label: translations.birthdays, action: () => setShowBirthdays(true) },
              { icon: '🔔', label: translations.alerts, action: () => setShowAlerts(true) },
            ].map((item, idx) => (
              <button key={idx} onClick={item.action} style={{
                flex: '1 1 calc(50% - 5px)', padding: '14px',
                background: C.card, borderRadius: '14px',
                border: `1px solid ${C.border}`, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px',
                boxShadow: '0 1px 4px rgba(30,64,175,0.06)',
                transition: 'all 0.2s',
              }}>
                <span style={{ fontSize: '22px' }}>{item.icon}</span>
                <span style={{ fontSize: '13px', color: C.text, fontWeight: '600' }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{
          marginTop: '20px',
          background: C.card, borderRadius: '16px',
          padding: '18px',
          boxShadow: '0 2px 8px rgba(30,64,175,0.06)',
          border: `1px solid ${C.primary}20`,
        }}>
          <h4 style={{ margin: '0 0 14px', fontSize: '15px', color: C.text, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔐</span>
            {translations.yourPermissions}
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <PermBadge allowed={perms.planning.view} label={translations.planning} />
            <PermBadge allowed={perms.rdv.view} label="RDV" />
            <PermBadge allowed={perms.factures.view || perms.factures.add} label={translations.invoices} />
            <PermBadge allowed={perms.stocks.view} label={translations.stocks} />
            <PermBadge allowed={perms.chiffreAffaire.view} label="CA" />
            <PermBadge allowed={perms.gpsLive.view} label="GPS" />
            <PermBadge allowed={perms.label.view || perms.label.add} label="Label" />
            <PermBadge allowed={perms.statuts.view} label="Statuts" />
          </div>
        </div>
      </div>
      <Nav />
      </div>
    </div>
  );

  // ====== PLANNING SCREEN ======
  if (screen === 'planning') return (
    <div style={{ height: '100%', background: C.gray, overflow: 'auto', paddingBottom: '90px' }}>
      <div style={{
        background: C.headerGradient,
        padding: '20px 20px 24px',
        borderRadius: '0 0 28px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
          <button onClick={() => setScreen('home')} style={{
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px',
            padding: '10px 14px', cursor: 'pointer', color: '#FFF', fontSize: '16px',
          }}>←</button>
          <h2 style={{ color: '#FFF', fontSize: '19px', margin: 0, fontWeight: '700' }}>
            📅 Planning
            {!perms.planning.edit && (
              <span style={{
                marginLeft: '10px', fontSize: '11px', fontWeight: '600',
                background: 'rgba(255,255,255,0.2)', padding: '4px 10px',
                borderRadius: '8px', verticalAlign: 'middle',
              }}>
                {translations.viewOnly}
              </span>
            )}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', position: 'relative', zIndex: 1 }}>
          {weekDays.map((d, i) => (
            <button key={i} onClick={() => setSelectedDay(i)} style={{
              flex: '0 0 auto', minWidth: '68px',
              background: selectedDay === i ? '#FFF' : 'rgba(255,255,255,0.15)',
              border: selectedDay === i ? 'none' : '1px solid rgba(255,255,255,0.2)',
              borderRadius: '14px', padding: '12px 8px',
              cursor: 'pointer', textAlign: 'center',
              transition: 'all 0.2s',
              backdropFilter: selectedDay !== i ? 'blur(10px)' : undefined,
            }}>
              <div style={{ fontSize: '11px', color: selectedDay === i ? C.secondary : 'rgba(255,255,255,0.85)', fontWeight: '600' }}>{d.day}</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: selectedDay === i ? C.primary : '#FFF', marginTop: '4px' }}>{d.date}</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: '20px' }}>
        {planningData.filter(p => p.jour === selectedDay).map(p => (
          <div key={p.id} onClick={() => setSelectedPlanning(p)} style={{
            background: C.card, borderRadius: '16px',
            padding: '18px', marginBottom: '12px',
            borderLeft: `4px solid ${p.priorite === 'haute' ? C.danger : p.priorite === 'moyenne' ? C.warning : C.success}`,
            boxShadow: '0 2px 8px rgba(30,64,175,0.06)',
            border: `1px solid ${C.border}`,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', color: C.text, fontWeight: '700' }}>{p.client}</h4>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.textSecondary, fontWeight: '500' }}>
                  {p.type} • 📍 {p.lieu}
                </p>
              </div>
              <span style={{ color: C.secondary, fontSize: '13px', fontWeight: '700', background: `${C.secondary}12`, padding: '4px 10px', borderRadius: '8px' }}>
                ⏰ {p.heure}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <PrioriteBadge priorite={p.priorite} />
                <StatusBadge status={p.statut} />
                <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: '500' }}>{p.duree}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: C.textSecondary }}>👷 {p.techniciens.length}</span>
                <span style={{ fontSize: '14px', color: C.primary }}>→</span>
              </div>
            </div>
          </div>
        ))}
        {planningData.filter(p => p.jour === selectedDay).length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textSecondary }}>
            <span style={{ fontSize: '64px', display: 'block', marginBottom: '18px' }}>📅</span>
            <div style={{ fontSize: '17px', fontWeight: '700', marginBottom: '10px', color: C.text }}>
              {translations.noTaskScheduled}
            </div>
            <div style={{ fontSize: '14px' }}>{translations.enjoyYourDay}</div>
          </div>
        )}
      </div>
      <Nav />
    </div>
  );

  const gpsWorkers = [
    { name: 'Mamadou Diallo', location: 'Kaloum - Rue KA-020', coords: '9.5092, -13.7122', status: 'actif', role: 'Chef d\'equipe', phone: '+224 622 11 22 33', email: 'mamadou.diallo@tsd.gn', equipe: 'Equipe A', specialite: 'Installation', anciennete: '5 ans', tacheEnCours: 'Installation plomberie - Villa Rosso', heureDebut: '08:00', dernierSignal: '14:32', km: '12.5 km', interventions: 156, satisfaction: 96 },
    { name: 'Ibrahim Sow', location: 'Ratoma - Av. de la Republique', coords: '9.5553, -13.6531', status: 'actif', role: 'Technicien Senior', phone: '+224 622 44 55 66', email: 'ibrahim.sow@tsd.gn', equipe: 'Equipe B', specialite: 'Reparation', anciennete: '3 ans', tacheEnCours: 'Reparation fuite - Immeuble Baraka', heureDebut: '09:00', dernierSignal: '14:28', km: '8.3 km', interventions: 98, satisfaction: 92 },
    { name: 'Alpha Camara', location: 'Matam - Quartier Bonfi', coords: '9.5167, -13.6833', status: 'pause', role: 'Technicien', phone: '+224 622 77 88 99', email: 'alpha.camara@tsd.gn', equipe: 'Equipe A', specialite: 'Renovation', anciennete: '2 ans', tacheEnCours: 'Pause dejeuner', heureDebut: '08:30', dernierSignal: '13:15', km: '5.7 km', interventions: 64, satisfaction: 89 },
    { name: 'Sekou Toure', location: 'Dixinn - Centre-ville', coords: '9.5350, -13.6800', status: 'actif', role: 'Technicien Junior', phone: '+224 622 00 11 22', email: 'sekou.toure@tsd.gn', equipe: 'Equipe C', specialite: 'Debouchage', anciennete: '1 an', tacheEnCours: 'Debouchage - Bureau Central', heureDebut: '10:00', dernierSignal: '14:30', km: '3.2 km', interventions: 32, satisfaction: 85 },
    { name: 'Ousmane Barry', location: 'Kaloum - Port', coords: '9.5050, -13.7200', status: 'inactif', role: 'Apprenti', phone: '+224 622 33 44 55', email: 'ousmane.barry@tsd.gn', equipe: 'Equipe B', specialite: 'Entretien', anciennete: '6 mois', tacheEnCours: 'Non assigne', heureDebut: '-', dernierSignal: '09:45', km: '0 km', interventions: 12, satisfaction: 80 },
  ];

  // ====== WORKER DETAIL VIEW ======
  if (selectedWorker) {
    const w = selectedWorker;
    const statusColor = w.status === 'actif' ? '#10B981' : w.status === 'pause' ? '#F59E0B' : '#6b7280';
    const statusLabel = w.status === 'actif' ? translations.active : w.status === 'pause' ? translations.pause : translations.inactive;
    return (
      <div style={{ height: '100%', background: C.gray, overflow: 'auto', paddingBottom: '90px' }}>
        <div style={{
          background: C.headerGradient,
          padding: '18px 20px 60px',
          borderRadius: '0 0 28px 28px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 1 }}>
            <button onClick={() => setSelectedWorker(null)} style={{
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px',
              padding: '10px 14px', cursor: 'pointer', color: '#FFF', fontSize: '16px',
            }}>←</button>
            <h2 style={{ color: '#FFF', fontSize: '17px', margin: 0, fontWeight: '700' }}>👷 {translations.workerDetails}</h2>
          </div>
        </div>

        <div style={{ marginTop: '-40px', padding: '0 20px', position: 'relative', zIndex: 2 }}>
          <div style={{
            background: C.card, borderRadius: '20px', padding: '24px',
            boxShadow: '0 8px 24px rgba(30,64,175,0.1)',
            border: `1px solid ${C.border}`, marginBottom: '16px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '30px', color: '#FFF', fontWeight: '800',
              margin: '0 auto 14px',
              boxShadow: '0 4px 16px rgba(30,64,175,0.25)',
            }}>
              {w.name.charAt(0)}
            </div>
            <h3 style={{ margin: 0, fontSize: '20px', color: C.text, fontWeight: '800' }}>{w.name}</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.secondary, fontWeight: '600' }}>{w.role}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
              <span style={{
                padding: '5px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '700',
                background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30`,
              }}>
                {statusLabel}
              </span>
              <span style={{
                padding: '5px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '700',
                background: `${C.primary}12`, color: C.primary, border: `1px solid ${C.primary}25`,
              }}>
                {w.equipe}
              </span>
            </div>
          </div>

          <div style={{
            background: C.card, borderRadius: '18px', padding: '20px',
            boxShadow: '0 4px 16px rgba(30,64,175,0.08)',
            border: `1px solid ${C.border}`, marginBottom: '16px',
          }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px', color: C.text, fontWeight: '700' }}>
              📍 {translations.currentLocation}
            </h4>
            <div style={{
              background: `linear-gradient(135deg, ${C.primary}06, ${C.secondary}06)`,
              borderRadius: '14px', padding: '16px',
              border: `1px solid ${C.border}`, marginBottom: '12px',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '32px', opacity: 0.15 }}>🗺️</div>
              <div style={{ fontSize: '14px', color: C.text, fontWeight: '700', marginBottom: '6px' }}>{w.location}</div>
              <div style={{ fontSize: '12px', color: C.textSecondary, fontWeight: '500' }}>GPS: {w.coords}</div>
            </div>
            <InfoRow icon="📡" label={translations.lastSignal} value={w.dernierSignal} />
            <InfoRow icon="🚗" label={translations.distanceTraveled} value={w.km} />
            <InfoRow icon="⏰" label={translations.startTime} value={w.heureDebut} />
          </div>

          <div style={{
            background: C.card, borderRadius: '18px', padding: '20px',
            boxShadow: '0 4px 16px rgba(30,64,175,0.08)',
            border: `1px solid ${C.border}`, marginBottom: '16px',
          }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px', color: C.text, fontWeight: '700' }}>
              🔧 {translations.currentTask}
            </h4>
            <div style={{
              padding: '14px', background: w.status === 'actif' ? `${C.success}08` : C.gray,
              borderRadius: '12px', border: `1px solid ${w.status === 'actif' ? `${C.success}20` : C.border}`,
            }}>
              <div style={{ fontSize: '14px', color: C.text, fontWeight: '700' }}>{w.tacheEnCours}</div>
            </div>
          </div>

          <div style={{
            background: C.card, borderRadius: '18px', padding: '20px',
            boxShadow: '0 4px 16px rgba(30,64,175,0.08)',
            border: `1px solid ${C.border}`, marginBottom: '16px',
          }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px', color: C.text, fontWeight: '700' }}>
              👤 {translations.personalInfo}
            </h4>
            <InfoRow icon="📱" label={translations.phone} value={w.phone} />
            <InfoRow icon="📧" label="Email" value={w.email} />
            <InfoRow icon="🏢" label={translations.team} value={w.equipe} />
            <InfoRow icon="🔧" label={translations.specialty} value={w.specialite} />
            <InfoRow icon="📅" label={translations.seniority} value={w.anciennete} />
          </div>

          <div style={{
            background: C.card, borderRadius: '18px', padding: '20px',
            boxShadow: '0 4px 16px rgba(30,64,175,0.08)',
            border: `1px solid ${C.border}`,
          }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px', color: C.text, fontWeight: '700' }}>
              📊 {translations.statistics}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{
                padding: '14px', background: C.gray, borderRadius: '12px',
                border: `1px solid ${C.border}`, textAlign: 'center',
              }}>
                <div style={{ fontSize: '22px', color: C.primary, fontWeight: '800' }}>{w.interventions}</div>
                <div style={{ fontSize: '11px', color: C.textSecondary, fontWeight: '500', marginTop: '4px' }}>
                  {translations.jobs}
                </div>
              </div>
              <div style={{
                padding: '14px', background: C.gray, borderRadius: '12px',
                border: `1px solid ${C.border}`, textAlign: 'center',
              }}>
                <div style={{ fontSize: '22px', color: C.success, fontWeight: '800' }}>{w.satisfaction}%</div>
                <div style={{ fontSize: '11px', color: C.textSecondary, fontWeight: '500', marginTop: '4px' }}>
                  {translations.satisfaction}
                </div>
              </div>
              <div style={{
                padding: '14px', background: C.gray, borderRadius: '12px',
                border: `1px solid ${C.border}`, textAlign: 'center',
              }}>
                <div style={{ fontSize: '22px', color: C.secondary, fontWeight: '800' }}>{w.km}</div>
                <div style={{ fontSize: '11px', color: C.textSecondary, fontWeight: '500', marginTop: '4px' }}>
                  {translations.kmToday}
                </div>
              </div>
              <div style={{
                padding: '14px', background: C.gray, borderRadius: '12px',
                border: `1px solid ${C.border}`, textAlign: 'center',
              }}>
                <div style={{ fontSize: '22px', color: C.warning, fontWeight: '800' }}>{w.anciennete}</div>
                <div style={{ fontSize: '11px', color: C.textSecondary, fontWeight: '500', marginTop: '4px' }}>
                  {translations.seniority}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Nav />
      </div>
    );
  }

  // ====== GPS SCREEN ======
  if (screen === 'gps' && perms.gpsLive.view) return (
    <div style={{ height: '100%', background: C.gray, overflow: 'auto', paddingBottom: '90px' }}>
      <Header title={`GPS - ${translations.location}`} icon="📍" showBack backTo="home" />
      <div style={{ padding: '20px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px',
        }}>
          <div style={{
            background: C.card, borderRadius: '14px', padding: '14px',
            border: `1px solid ${C.border}`, textAlign: 'center',
            boxShadow: '0 2px 8px rgba(30,64,175,0.06)',
          }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: C.success }}>
              {gpsWorkers.filter(w => w.status === 'actif').length}
            </div>
            <div style={{ fontSize: '10px', color: C.textSecondary, fontWeight: '600', marginTop: '2px' }}>
              {translations.actives}
            </div>
          </div>
          <div style={{
            background: C.card, borderRadius: '14px', padding: '14px',
            border: `1px solid ${C.border}`, textAlign: 'center',
            boxShadow: '0 2px 8px rgba(30,64,175,0.06)',
          }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: C.warning }}>
              {gpsWorkers.filter(w => w.status === 'pause').length}
            </div>
            <div style={{ fontSize: '10px', color: C.textSecondary, fontWeight: '600', marginTop: '2px' }}>
              Pause
            </div>
          </div>
          <div style={{
            background: C.card, borderRadius: '14px', padding: '14px',
            border: `1px solid ${C.border}`, textAlign: 'center',
            boxShadow: '0 2px 8px rgba(30,64,175,0.06)',
          }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#6b7280' }}>
              {gpsWorkers.filter(w => w.status === 'inactif').length}
            </div>
            <div style={{ fontSize: '10px', color: C.textSecondary, fontWeight: '600', marginTop: '2px' }}>
              {translations.inactives}
            </div>
          </div>
        </div>

        <div style={{
          background: C.card, borderRadius: '18px',
          overflow: 'hidden', marginBottom: '16px',
          boxShadow: '0 4px 16px rgba(30,64,175,0.08)',
          border: `1px solid ${C.border}`,
        }}>
          <div style={{
            background: `linear-gradient(135deg, #1a365d, #1e40af)`,
            height: '200px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: `
                radial-gradient(circle at 25% 40%, rgba(59,130,246,0.3) 0%, transparent 50%),
                radial-gradient(circle at 75% 60%, rgba(16,185,129,0.2) 0%, transparent 40%),
                radial-gradient(circle at 50% 80%, rgba(245,158,11,0.15) 0%, transparent 35%)
              `,
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: '30px 30px',
            }} />

            {gpsWorkers.map((w, idx) => {
              const positions = [
                { left: '22%', top: '35%' },
                { left: '68%', top: '55%' },
                { left: '45%', top: '70%' },
                { left: '52%', top: '25%' },
                { left: '18%', top: '65%' },
              ];
              const pos = positions[idx];
              const pinColor = w.status === 'actif' ? '#10B981' : w.status === 'pause' ? '#F59E0B' : '#6b7280';
              return (
                <div key={idx} onClick={() => setSelectedWorker(w)} style={{
                  position: 'absolute', ...pos, cursor: 'pointer',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                }}>
                  {w.status === 'actif' && (
                    <div style={{
                      position: 'absolute', width: '36px', height: '36px',
                      borderRadius: '50%', background: `${pinColor}30`,
                      top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                      animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
                    }} />
                  )}
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: pinColor, border: '3px solid #FFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', color: '#FFF', fontWeight: '800',
                    boxShadow: `0 2px 8px ${pinColor}60`,
                    position: 'relative',
                  }}>
                    {w.name.charAt(0)}
                  </div>
                  <div style={{
                    position: 'absolute', top: '100%', left: '50%',
                    transform: 'translateX(-50%)', marginTop: '4px',
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    padding: '2px 8px', borderRadius: '6px',
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{ fontSize: '9px', color: '#FFF', fontWeight: '600' }}>{w.name.split(' ')[0]}</span>
                  </div>
                </div>
              );
            })}

            <div style={{
              position: 'absolute', bottom: '10px', left: '10px',
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
              padding: '6px 12px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <span style={{ fontSize: '10px', color: '#FFF', fontWeight: '600' }}>Conakry, Guinee</span>
            </div>
            <div style={{
              position: 'absolute', top: '10px', right: '10px',
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
              padding: '6px 10px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: '10px', color: '#FFF', fontWeight: '600' }}>Live</span>
            </div>
          </div>

          <div style={{ padding: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: '500' }}>{translations.active}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }} />
              <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: '500' }}>{translations.pause}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#6b7280' }} />
              <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: '500' }}>{translations.inactive}</span>
            </div>
          </div>
        </div>

        <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: C.text, fontWeight: '700' }}>
          👷 {translations.workers} ({gpsWorkers.length})
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {gpsWorkers.map((w, idx) => {
            const statusColor = w.status === 'actif' ? '#10B981' : w.status === 'pause' ? '#F59E0B' : '#6b7280';
            const statusLabel = w.status === 'actif' ? translations.active : w.status === 'pause' ? translations.pause : translations.inactive;
            return (
              <div key={idx} onClick={() => setSelectedWorker(w)} style={{
                background: C.card, borderRadius: '16px',
                padding: '16px', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(30,64,175,0.06)',
                border: `1px solid ${C.border}`,
                borderLeft: `4px solid ${statusColor}`,
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', color: '#FFF', fontWeight: '700',
                      position: 'relative',
                    }}>
                      {w.name.charAt(0)}
                      <div style={{
                        position: 'absolute', bottom: '-1px', right: '-1px',
                        width: '14px', height: '14px', borderRadius: '50%',
                        background: statusColor, border: `2px solid ${C.card}`,
                      }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: C.text, fontSize: '14px' }}>{w.name}</div>
                      <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '2px', fontWeight: '500' }}>
                        {w.role} • {w.equipe}
                      </div>
                      <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '2px', fontWeight: '500' }}>
                        📍 {w.location.split(' - ')[0]}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '8px',
                      fontSize: '10px', fontWeight: '700',
                      background: `${statusColor}12`, color: statusColor,
                      border: `1px solid ${statusColor}30`,
                    }}>
                      {statusLabel}
                    </span>
                    <span style={{ fontSize: '10px', color: C.textSecondary, fontWeight: '500' }}>
                      {w.dernierSignal}
                    </span>
                    <span style={{ fontSize: '14px', color: C.primary }}>→</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Nav />
    </div>
  );

  // ====== FACTURES SCREEN ======
  if (screen === 'factures' && (perms.factures.view || perms.factures.add)) return (
    <div style={{ height: '100%', background: C.gray, overflow: 'auto', paddingBottom: '90px' }}>
      <Header title={translations.invoices} icon="🧾" showBack backTo="home" />
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <PermBadge allowed={perms.factures.view} label={translations.view} />
          <PermBadge allowed={perms.factures.add} label={translations.add} />
          <PermBadge allowed={perms.factures.edit} label={translations.edit} />
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
          borderRadius: '18px', padding: '20px', marginBottom: '16px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', margin: 0, fontWeight: '500' }}>
            {translations.totalInvoices}
          </p>
          <p style={{ color: '#FFF', fontSize: '24px', fontWeight: '800', margin: '8px 0 4px', letterSpacing: '-0.5px' }}>
            8 450 000 GNF
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <span style={{ color: '#86efac', fontSize: '12px', fontWeight: '600' }}>2 {translations.paid}</span>
            <span style={{ color: '#fde68a', fontSize: '12px', fontWeight: '600' }}>1 {translations.pending}</span>
            <span style={{ color: '#fca5a5', fontSize: '12px', fontWeight: '600' }}>1 {translations.overdue}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {['semaine', 'mois', 'annee'].map(p => (
            <button key={p} onClick={() => setPeriodFilter(p)} style={{
              flex: 1, padding: '11px', borderRadius: '12px', border: 'none',
              background: periodFilter === p ? C.primary : C.card,
              color: periodFilter === p ? '#FFF' : C.text,
              cursor: 'pointer', fontWeight: '700', fontSize: '12px',
              boxShadow: periodFilter === p ? '0 4px 12px rgba(30,64,175,0.25)' : `0 1px 4px rgba(0,0,0,0.04)`,
              transition: 'all 0.2s',
              ...(periodFilter !== p ? { border: `1px solid ${C.border}` } : {}),
            }}>
              {p === 'semaine' ? translations.week : p === 'mois' ? translations.month : translations.year}
            </button>
          ))}
        </div>
        {facturesData.map((facture, idx) => (
          <div key={idx} onClick={() => setSelectedFacture(facture)} style={{
            background: C.card, borderRadius: '16px',
            padding: '18px', marginBottom: '12px',
            borderLeft: `4px solid ${facture.status === 'payee' ? '#10B981' : facture.status === 'attente' ? '#F59E0B' : '#EF4444'}`,
            boxShadow: '0 2px 8px rgba(30,64,175,0.06)',
            border: `1px solid ${C.border}`,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', color: C.text, fontWeight: '700' }}>{facture.client}</h4>
                <p style={{ margin: '5px 0 0', fontSize: '12px', color: C.textSecondary, fontWeight: '500' }}>{facture.id} • {facture.date}</p>
              </div>
              <span style={{
                padding: '5px 12px', borderRadius: '10px',
                fontSize: '11px', fontWeight: '700',
                background: facture.status === 'payee' ? '#10B98112' : facture.status === 'attente' ? '#F59E0B12' : '#EF444412',
                color: facture.status === 'payee' ? '#10B981' : facture.status === 'attente' ? '#F59E0B' : '#EF4444',
                border: `1px solid ${facture.status === 'payee' ? '#10B98130' : facture.status === 'attente' ? '#F59E0B30' : '#EF444430'}`,
              }}>
                {facture.status === 'payee' ? translations.paid : facture.status === 'attente' ? translations.pending : translations.overdue}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: C.secondary }}>{facture.amount}</div>
              <span style={{ fontSize: '14px', color: C.primary }}>→</span>
            </div>
          </div>
        ))}
      </div>
      <Nav />
    </div>
  );

  // ====== STOCKS SCREEN ======
  if (screen === 'stocks' && perms.stocks.view) return (
    <div style={{ height: '100%', background: C.gray, overflow: 'auto', paddingBottom: '90px' }}>
      <Header title={translations.stocks} icon="📦" showBack backTo="home" />
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <PermBadge allowed={perms.stocks.view} label={translations.view} />
          <PermBadge allowed={perms.stocks.add} label={translations.add} />
          <PermBadge allowed={perms.stocks.edit} label={translations.edit} />
        </div>
        {[
          { nom: 'Tuyaux PVC 50mm', qte: 145, seuil: 50, prix: 25000 },
          { nom: 'Coudes 90', qte: 320, seuil: 100, prix: 5000 },
          { nom: 'Joints silicone', qte: 28, seuil: 30, prix: 15000 },
          { nom: 'Vannes 20mm', qte: 85, seuil: 40, prix: 35000 },
        ].map((stock, idx) => (
          <div key={idx} style={{
            background: C.card, borderRadius: '16px',
            padding: '18px', marginBottom: '12px',
            boxShadow: '0 2px 8px rgba(30,64,175,0.06)',
            border: `1px solid ${C.border}`,
            borderLeft: `4px solid ${stock.qte <= stock.seuil ? C.danger : C.success}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', color: C.text, fontWeight: '700' }}>{stock.nom}</h4>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.textSecondary }}>
                  {translations.threshold}: {stock.seuil} | {stock.prix.toLocaleString()} GNF
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: '20px', fontWeight: '800',
                  color: stock.qte <= stock.seuil ? C.danger : C.success,
                }}>{stock.qte}</span>
                {stock.qte <= stock.seuil && (
                  <p style={{ margin: '2px 0 0', fontSize: '10px', color: C.danger, fontWeight: '600' }}>
                    {translations.lowStock}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Nav />
    </div>
  );

  // ====== CA SCREEN ======
  if (screen === 'ca' && perms.chiffreAffaire.view) return (
    <div style={{ height: '100%', background: C.gray, overflow: 'auto', paddingBottom: '90px' }}>
      <Header title={translations.revenue} icon="📊" showBack backTo="home" />
      <div style={{ padding: '20px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
          borderRadius: '20px', padding: '24px', marginBottom: '16px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', margin: 0, fontWeight: '500' }}>
            {translations.totalRevenueMonth}
          </p>
          <p style={{ color: '#FFF', fontSize: '28px', fontWeight: '800', margin: '10px 0 6px', letterSpacing: '-0.5px' }}>
            125 000 000 GNF
          </p>
          <p style={{ color: '#86efac', fontSize: '13px', margin: 0, fontWeight: '600' }}>↑ +18%</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { key: 'semaine', label: translations.week, value: '45M GNF', trend: '+12%' },
            { key: 'trimestre', label: translations.quarter, value: '380M GNF', trend: '+22%' },
            { key: 'mois', label: translations.semester, value: '720M GNF', trend: '+15%' },
            { key: 'annee', label: translations.year, value: '847M GNF', trend: '+28%' },
          ].map((item, idx) => (
            <div key={idx} onClick={() => setCaDetailView(item.key)} style={{
              background: C.card, borderRadius: '14px', padding: '16px',
              border: `1px solid ${C.border}`,
              boxShadow: '0 2px 8px rgba(30,64,175,0.06)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}>
              <p style={{ margin: 0, fontSize: '12px', color: C.textSecondary, fontWeight: '500' }}>{item.label}</p>
              <p style={{ margin: '6px 0 4px', fontSize: '17px', color: C.text, fontWeight: '800' }}>{item.value}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: '12px', color: C.success, fontWeight: '600' }}>{item.trend}</p>
                <span style={{ fontSize: '14px', color: C.primary }}>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Nav />
    </div>
  );

  if (screen === 'profil') return (
    <div style={{ height: '100%', background: C.gray, overflow: 'auto', paddingBottom: '120px' }}>
      <ProfileHeader
        userId={currentUser?.id || ''}
        userName={currentUser?.name || ''}
        userEmail={currentUser?.email}
        subtitle={translations.officeEmployee}
        infoLines={[
          { label: lang === 'fr' ? 'Poste' : 'Position', value: getPositionLabel() },
        ]}
        badge={{ icon: '\u{1F3E2}', label: getPositionLabel() }}
        profilePhoto={profilePhoto || null}
        coverPhoto={coverPhoto || null}
        onProfilePhotoChange={(url) => setProfilePhoto(url || '')}
        onCoverPhotoChange={(url) => setCoverPhoto(url || '')}
        onBack={() => setScreen('home')}
        darkMode={darkMode}
        lang={lang}
        primaryColor={C.primary}
        secondaryColor={C.secondary}
        langToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        langLabel={lang === 'fr' ? 'EN' : 'FR'}
      />

      <div style={{ padding: '0 20px' }}>
        {[
          ...(currentUser?.role === 'admin' ? [{ icon: '🔧', label: translations.adminSettings, action: () => setShowAdminSettings(true) }] : []),
          { icon: '⚙️', label: t.settings, action: () => setScreen('settings') },
          { icon: '📋', label: t.legalTerms, action: () => setScreen('legal') },
          { icon: '❓', label: 'FAQ', action: () => setScreen('faq') },
          { icon: '🔔', label: translations.alerts, action: () => setShowAlerts(true) },
        ].map((item, idx) => (
          <div key={idx} onClick={item.action} style={{
            background: C.card, borderRadius: '14px',
            padding: '16px 18px', marginBottom: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(30,64,175,0.06)',
            border: `1px solid ${C.border}`,
            transition: 'all 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '22px' }}>{item.icon}</span>
              <span style={{ fontSize: '14px', color: C.text, fontWeight: '600' }}>{item.label}</span>
            </div>
            <span style={{ color: C.textSecondary, fontSize: '16px' }}>→</span>
          </div>
        ))}

        <div style={{
          background: C.card, borderRadius: '16px',
          padding: '18px', marginTop: '16px',
          boxShadow: '0 2px 8px rgba(30,64,175,0.06)',
          border: `1px solid ${C.primary}20`,
        }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: C.text, fontWeight: '700' }}>
            {translations.yourPermissions}
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <PermBadge allowed={perms.planning.view} label={translations.planning} />
            <PermBadge allowed={perms.rdv.view} label="RDV" />
            <PermBadge allowed={perms.factures.view || perms.factures.add} label={translations.invoices} />
            <PermBadge allowed={perms.stocks.view} label={translations.stocks} />
            <PermBadge allowed={perms.chiffreAffaire.view} label="CA" />
            <PermBadge allowed={perms.gpsLive.view} label="GPS" />
            <PermBadge allowed={perms.label.view || perms.label.add} label="Label" />
            <PermBadge allowed={perms.statuts.view} label="Statuts" />
          </div>
        </div>

        <button onClick={handleLogout} style={{
          width: '100%', marginTop: '20px',
          background: '#FEE2E2', color: C.danger,
          border: `2px solid ${C.danger}30`,
          padding: '16px', borderRadius: '14px',
          fontWeight: '700', cursor: 'pointer', fontSize: '15px',
          transition: 'all 0.2s',
        }}>
          🚪 {t.logout}
        </button>
      </div>
      <Nav />
    </div>
  );

  // ====== SETTINGS SCREEN ======
  if (screen === 'settings') return (
    <div style={{ height: '100%', background: C.gray, overflow: 'auto', paddingBottom: '90px' }}>
      <Header title={t.settings} icon="⚙️" showBack backTo="profil" />
      <div style={{ padding: '20px' }}>
        <div style={{
          background: C.card, borderRadius: '14px',
          padding: '18px', marginBottom: '12px',
          boxShadow: '0 1px 4px rgba(30,64,175,0.06)',
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>{darkMode ? '🌙' : '☀️'}</span>
              <span style={{ fontSize: '14px', color: C.text, fontWeight: '600' }}>{darkMode ? t.darkMode : t.lightMode}</span>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} style={{
              width: '52px', height: '28px', borderRadius: '14px',
              background: darkMode ? C.secondary : C.light,
              border: 'none', cursor: 'pointer', position: 'relative',
              transition: 'all 0.3s',
            }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: '#FFF', position: 'absolute', top: '3px',
                left: darkMode ? '27px' : '3px',
                transition: 'left 0.3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        </div>
        <div style={{
          background: C.card, borderRadius: '14px',
          padding: '18px', marginBottom: '12px',
          boxShadow: '0 1px 4px rgba(30,64,175,0.06)',
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>🌍</span>
              <span style={{ fontSize: '14px', color: C.text, fontWeight: '600' }}>{t.language}</span>
            </div>
            <button onClick={() => {
              if (lang === 'fr') setLang('en');
              else if (lang === 'en') setLang('ar');
              else setLang('fr');
            }} style={{
              background: `${C.primary}12`, border: `1px solid ${C.primary}25`,
              padding: '8px 16px', borderRadius: '10px',
              cursor: 'pointer', fontWeight: '700', color: C.primary, fontSize: '13px',
            }}>
              {lang === 'fr' ? 'FR 🇫🇷' : lang === 'en' ? 'EN 🇬🇧' : 'AR 🇸🇦'}
            </button>
          </div>
        </div>
      </div>
      <Nav />
    </div>
  );

  // ====== LEGAL SCREEN ======
  if (screen === 'legal') return (
    <div style={{ height: '100%', background: C.gray, overflow: 'auto', paddingBottom: '90px' }}>
      <Header title={t.legalTerms} icon="📋" showBack backTo="profil" />
      <div style={{ padding: '20px' }}>
        <p style={{ color: C.textSecondary, textAlign: 'center', padding: '50px', fontSize: '14px', fontWeight: '500' }}>
          {translations.legalDocuments}
        </p>
      </div>
      <Nav />
    </div>
  );

  // ====== FAQ SCREEN ======
  if (screen === 'faq') return (
    <div style={{ height: '100%', background: C.gray, overflow: 'auto', paddingBottom: '90px' }}>
      <Header title="FAQ" icon="❓" showBack backTo="profil" />
      <div style={{ padding: '20px' }}>
        {[
          { q: translations.faqEditProfile, a: translations.faqEditProfileAnswer },
          { q: translations.faqContactSupport, a: translations.faqContactSupportAnswer },
          { q: translations.faqPermissions, a: translations.faqPermissionsAnswer },
        ].map((faq, idx) => (
          <div key={idx} onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)} style={{
            background: C.card, borderRadius: '14px',
            padding: '16px 18px', marginBottom: '10px',
            cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(30,64,175,0.06)',
            border: `1px solid ${C.border}`,
            transition: 'all 0.2s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', color: C.text, fontSize: '14px' }}>{faq.q}</span>
              <span style={{ fontSize: '14px', color: C.primary, fontWeight: '700' }}>{expandedFaq === idx ? '▲' : '▼'}</span>
            </div>
            {expandedFaq === idx && (
              <p style={{ margin: '12px 0 0', color: C.textSecondary, fontSize: '13px', fontWeight: '500', lineHeight: '1.5' }}>{faq.a}</p>
            )}
          </div>
        ))}
      </div>
      <Nav />
    </div>
  );

  return (
    <div style={{ height: '100%', background: C.gray, overflow: 'auto', paddingBottom: '90px' }}>
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: C.textSecondary }}>{translations.screenUnderConstruction}</p>
      </div>
      <Nav />
    </div>
  );
};

const QuickAccessCard = ({ icon, label, subtitle, color, C, onClick }: {
  icon: string; label: string; subtitle: string; color: string; C: any; onClick: () => void;
}) => (
  <div onClick={onClick} style={{
    background: C.card, borderRadius: '16px',
    padding: '22px 16px', textAlign: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(30,64,175,0.06)',
    border: `1px solid ${C.border}`,
    transition: 'all 0.25s ease',
    position: 'relative', overflow: 'hidden',
  }}
    onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(30,64,175,0.12)'; }}
    onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(30,64,175,0.06)'; }}
  >
    <div style={{
      position: 'absolute', top: '-15px', right: '-15px',
      width: '50px', height: '50px', borderRadius: '50%',
      background: `${color}08`,
    }} />
    <div style={{
      width: '48px', height: '48px', borderRadius: '14px',
      background: `${color}10`, border: `1px solid ${color}20`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 10px', fontSize: '24px',
    }}>
      {icon}
    </div>
    <span style={{ fontSize: '14px', color: C.text, fontWeight: '700', display: 'block' }}>{label}</span>
    <p style={{ margin: '5px 0 0', fontSize: '11px', color: C.textSecondary, fontWeight: '500' }}>{subtitle}</p>
  </div>
);

export default OfficeApp;
