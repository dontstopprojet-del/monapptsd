import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import LegalTermsScreen from './LegalTermsScreen';
import WorkShiftTracker from './WorkShiftTracker';
import SiteDetailView from './SiteDetailView';
import BirthdayManager from './BirthdayManager';
import IncidentForm from './IncidentForm';
import DailyNotes from './DailyNotes';
import AlertsManager from './AlertsManager';
import AccountManager from './AccountManager';
import { getClientText } from '../utils/clientTexts';
import { safeFixed, safeDate } from '../utils/safeFormat';
import AdminSettings from './AdminSettings';
import LoginScreen from './LoginScreen';
import OfficeApp from './OfficeApp';
import WelcomeIntroPage from '../pages/WelcomeIntroPage';
import MessagingSystem from './EnhancedMessagingSystem';
import IntelligentChatbot from './IntelligentChatbot';
import RealtimeNotifications from './RealtimeNotifications';
import AdminDashboardEnhanced from './AdminDashboardEnhanced';
import AuthenticatedQuoteForm from './AuthenticatedQuoteForm';
import ClientInvoicesScreen from './ClientInvoicesScreen';
import AuthenticatedQuoteTracker from './AuthenticatedQuoteTracker';
import { useRealtimeProjects, useRealtimePlanning, useRealtimePlanningTechnicians, useRealtimeNotifications } from '../hooks/useRealtimeSync';
import ProfileHeader from './ProfileHeader';
import { NotificationProvider, useNotifications } from '../contexts/NotificationContext';
import { incomingRingtone } from '../utils/ringtones';
import BroadcastBanner from './BroadcastBanner';

const Stars = ({ rating, setRating, size=28, readonly=false, goldColor='#FFD700' }: { rating: number; setRating?: (r: number) => void; size?: number; readonly?: boolean; goldColor?: string }) => (
  <div style={{display:'flex',gap:'3px',justifyContent:'center'}}>
    {[1,2,3,4,5].map(s=><span key={s} onClick={()=>!readonly&&setRating&&setRating(s)} style={{fontSize:size,cursor:readonly?'default':'pointer',color:s<=rating?goldColor:'#ddd'}}>★</span>)}
  </div>
);

const ClientChantierDetail = ({ chantier, onClose, colors: C, lang }: { chantier: any; onClose: () => void; colors: any; lang: string }) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [sitePhotos, setSitePhotos] = useState<{before: any[], during: any[], after: any[]}>({ before: [], during: [], after: [] });
  const [siteNotes, setSiteNotes] = useState<any[]>([]);
  const [detailTab, setDetailTab] = useState<'timeline'|'photos'|'notes'>('timeline');
  const [liveStatus, setLiveStatus] = useState(chantier.statut);
  const [liveProgress, setLiveProgress] = useState(chantier.prog);

  const getClientStatusLabel = (s: string) => {
    const labels: Record<string, string> = lang === 'fr'
      ? { planned: 'Planifie', inProgress: 'En cours', interrupted: 'Interrompu', abandoned: 'Abandonne', completed: 'Termine' }
      : { planned: 'Planned', inProgress: 'In Progress', interrupted: 'Interrupted', abandoned: 'Abandoned', completed: 'Completed' };
    return labels[s] || s;
  };
  const getClientStatusIcon = (s: string) => {
    const icons: Record<string, string> = { planned: '📋', inProgress: '🔨', interrupted: '⏸️', abandoned: '🚫', completed: '✅' };
    return icons[s] || '📌';
  };
  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = { started: '🚀', interrupted: '⏸️', resumed: '▶️', abandoned: '🚫', team_changed: '🔄', completed: '✅', photo_added: '📸', note_added: '📝', progress_updated: '📊' };
    return icons[type] || '📌';
  };

  useEffect(() => {
    const loadDetail = async () => {
      const { data: actData } = await supabase
        .from('chantier_activities')
        .select('*, app_users:user_id(name, role)')
        .eq('chantier_id', chantier.id)
        .order('created_at', { ascending: false });
      setActivities(actData || []);

      const { data: imgData } = await supabase
        .from('site_images')
        .select('*')
        .eq('site_id', String(chantier.id))
        .order('uploaded_at', { ascending: true });
      if (imgData) {
        setSitePhotos({
          before: imgData.filter(i => i.image_type === 'before'),
          during: imgData.filter(i => i.image_type === 'during'),
          after: imgData.filter(i => i.image_type === 'after'),
        });
      }

      const { data: notesData } = await supabase
        .from('site_notes')
        .select('*')
        .eq('site_id', String(chantier.id))
        .order('created_at', { ascending: false });
      setSiteNotes(notesData || []);
    };

    const loadChantierStatus = async () => {
      const { data } = await supabase
        .from('chantiers')
        .select('status, progress')
        .eq('id', chantier.id)
        .maybeSingle();
      if (data) {
        setLiveStatus(data.status);
        setLiveProgress(data.progress);
      }
    };

    loadDetail();
    loadChantierStatus();

    const actChannel = supabase.channel(`client_activities_${chantier.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chantier_activities', filter: `chantier_id=eq.${chantier.id}` }, () => loadDetail())
      .subscribe();
    const imgChannel = supabase.channel(`client_images_${chantier.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_images' }, () => loadDetail())
      .subscribe();
    const noteChannel = supabase.channel(`client_notes_${chantier.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_notes' }, () => loadDetail())
      .subscribe();
    const statusChannel = supabase.channel(`client_chantier_status_${chantier.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chantiers', filter: `id=eq.${chantier.id}` }, (payload) => {
        if (payload.new) {
          setLiveStatus((payload.new as any).status);
          setLiveProgress((payload.new as any).progress);
        }
        loadDetail();
      })
      .subscribe();

    return () => { actChannel.unsubscribe(); imgChannel.unsubscribe(); noteChannel.unsubscribe(); statusChannel.unsubscribe(); };
  }, [chantier.id]);

  const totalPhotos = sitePhotos.before.length + sitePhotos.during.length + sitePhotos.after.length;
  const isLive = liveStatus === 'inProgress';

  return (
    <div onClick={onClose} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:200,padding:'10px'}}>
      <div onClick={(e)=>e.stopPropagation()} style={{background:C.card,borderRadius:'24px',width:'100%',maxWidth:'700px',maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column'}}>
        {isLive && (
          <div style={{background:'linear-gradient(135deg, #10B981, #059669)',padding:'8px 20px',display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
            <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#FFF',animation:'livePulse 1.5s ease-in-out infinite'}}/>
            <span style={{color:'#FFF',fontSize:'12px',fontWeight:'700',letterSpacing:'0.5px'}}>{lang==='fr'?'SUIVI EN DIRECT':'LIVE TRACKING'}</span>
          </div>
        )}
        <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div style={{flex:1}}>
              <h3 style={{margin:0,fontSize:'18px',color:'#FFF'}}>{chantier.titre}</h3>
              <p style={{margin:'5px 0 0',fontSize:'13px',color:'rgba(255,255,255,0.8)'}}>📍 {chantier.lieu}</p>
            </div>
            <button onClick={onClose} style={{background:'rgba(255,255,255,0.2)',border:'none',width:'32px',height:'32px',borderRadius:'50%',color:'#FFF',fontSize:'16px',cursor:'pointer',flexShrink:0}}>x</button>
          </div>
          <div style={{marginTop:'16px',display:'flex',gap:'12px',alignItems:'center'}}>
            <span style={{background:'rgba(255,255,255,0.2)',color:'#FFF',padding:'6px 14px',borderRadius:'20px',fontSize:'12px',fontWeight:'700',display:'flex',alignItems:'center',gap:'6px'}}>
              {getClientStatusIcon(liveStatus)} {getClientStatusLabel(liveStatus)}
            </span>
            <div style={{flex:1,height:'8px',background:'rgba(255,255,255,0.2)',borderRadius:'4px'}}>
              <div style={{height:'100%',width:`${liveProgress}%`,background:'#FFF',borderRadius:'4px',transition:'width 0.8s ease'}}/>
            </div>
            <span style={{color:'#FFF',fontSize:'14px',fontWeight:'700'}}>{liveProgress}%</span>
          </div>
        </div>

        <div style={{display:'flex',borderBottom:`1px solid ${C.light}`,flexShrink:0}}>
          {(['timeline','photos','notes'] as const).map(tab => (
            <button key={tab} onClick={()=>setDetailTab(tab)} style={{
              flex:1,padding:'12px',border:'none',background:detailTab===tab?C.card:C.light,
              color:detailTab===tab?C.secondary:C.textSecondary,fontSize:'13px',fontWeight:'700',cursor:'pointer',
              borderBottom:detailTab===tab?`3px solid ${C.secondary}`:'3px solid transparent',transition:'all 0.2s'
            }}>
              {tab==='timeline' ? (lang==='fr'?`📅 Activite (${activities.length})`:`📅 Activity (${activities.length})`)
                : tab==='photos' ? (lang==='fr'?`📸 Photos (${totalPhotos})`:`📸 Photos (${totalPhotos})`)
                : (lang==='fr'?`📝 Notes (${siteNotes.length})`:`📝 Notes (${siteNotes.length})`)}
            </button>
          ))}
        </div>

        <div style={{flex:1,overflow:'auto',padding:'16px'}}>
          {detailTab === 'timeline' && (
            activities.length === 0 ? (
              <div style={{textAlign:'center',padding:'40px 20px',color:C.textSecondary}}>
                <div style={{fontSize:'40px',marginBottom:'12px'}}>📅</div>
                <p style={{fontSize:'14px'}}>{lang==='fr'?'Aucune activite pour le moment':'No activity yet'}</p>
              </div>
            ) : (
              <div style={{position:'relative',paddingLeft:'24px'}}>
                <div style={{position:'absolute',left:'10px',top:0,bottom:0,width:'2px',background:`linear-gradient(180deg, ${C.secondary}, ${C.light})`}}/>
                {activities.map((act: any, i: number) => (
                  <div key={act.id} style={{marginBottom:'16px',position:'relative'}}>
                    <div style={{position:'absolute',left:'-20px',width:'22px',height:'22px',borderRadius:'50%',background:i===0?C.secondary:C.light,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',border:`2px solid ${C.card}`}}>
                      {getActivityIcon(act.activity_type)}
                    </div>
                    <div style={{background:C.light,borderRadius:'12px',padding:'14px',marginLeft:'12px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                        <span style={{fontSize:'13px',fontWeight:'700',color:C.text}}>{act.description}</span>
                        <span style={{fontSize:'10px',color:C.textSecondary,whiteSpace:'nowrap',marginLeft:'8px'}}>
                          {safeDate(act.created_at, lang==='fr'?'fr':'en')}
                        </span>
                      </div>
                      {act.app_users?.name && <p style={{margin:0,fontSize:'12px',color:C.textSecondary}}>👷 {act.app_users.name}</p>}
                      {act.metadata?.reason && <p style={{margin:'6px 0 0',fontSize:'12px',color:'#f97316',fontStyle:'italic'}}>{lang==='fr'?'Raison':'Reason'}: {act.metadata.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {detailTab === 'photos' && (
            totalPhotos === 0 ? (
              <div style={{textAlign:'center',padding:'40px 20px',color:C.textSecondary}}>
                <div style={{fontSize:'40px',marginBottom:'12px'}}>📸</div>
                <p style={{fontSize:'14px'}}>{lang==='fr'?'Aucune photo pour le moment':'No photos yet'}</p>
              </div>
            ) : (
              <div>
                {([{key:'before' as const,label:lang==='fr'?'📷 Avant':'📷 Before'},{key:'during' as const,label:lang==='fr'?'🔨 Pendant':'🔨 During'},{key:'after' as const,label:lang==='fr'?'✨ Apres':'✨ After'}]).map(cat => (
                  sitePhotos[cat.key].length > 0 && (
                    <div key={cat.key} style={{marginBottom:'20px'}}>
                      <h4 style={{margin:'0 0 10px',fontSize:'14px',color:C.text,fontWeight:'700'}}>{cat.label} ({sitePhotos[cat.key].length})</h4>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'8px'}}>
                        {sitePhotos[cat.key].map((img: any) => (
                          <div key={img.id} style={{paddingBottom:'75%',position:'relative',borderRadius:'12px',overflow:'hidden',boxShadow:`0 2px 8px ${C.text}10`}}>
                            <img src={img.image_url} alt="" style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',objectFit:'cover'}}/>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )
          )}

          {detailTab === 'notes' && (
            siteNotes.length === 0 ? (
              <div style={{textAlign:'center',padding:'40px 20px',color:C.textSecondary}}>
                <div style={{fontSize:'40px',marginBottom:'12px'}}>📝</div>
                <p style={{fontSize:'14px'}}>{lang==='fr'?'Aucune note pour le moment':'No notes yet'}</p>
              </div>
            ) : (
              siteNotes.map((note: any) => (
                <div key={note.id} style={{background:C.light,borderRadius:'12px',padding:'14px',marginBottom:'10px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                    <span style={{fontSize:'11px',color:C.textSecondary}}>
                      {safeDate(note.created_at, lang==='fr'?'fr':'en')}
                    </span>
                    <span style={{background:`${C.secondary}20`,color:C.secondary,padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:'700'}}>{note.progress_percentage}%</span>
                  </div>
                  <p style={{margin:0,fontSize:'13px',color:C.text,lineHeight:'1.5'}}>{note.note_content}</p>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};

const TSDApp = ({ onBackToVisitor, isPasswordRecovery }: { onBackToVisitor?: () => void; isPasswordRecovery?: boolean }) => {
  const [lang, setLang] = useState('fr');
  const [darkMode, setDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [coverPhoto, setCoverPhoto] = useState<string>('');
  const [screen, setScreen] = useState('home');
  const [showSuccess, setShowSuccess] = useState(false);
  const [_selectedTech, _setSelectedTech] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [_selectedTime, _setSelectedTime] = useState<string>('');
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedChantier, setSelectedChantier] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [historyItems] = useState<any[]>([]);
  const [legalScreen, setLegalScreen] = useState('menu');
  const [chatMessages, setChatMessages] = useState<{id:number;text:string;isBot:boolean;time:string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number|null>(null);
  const [selectedHour, setSelectedHour] = useState<string>('');
  const [selectedMinute, setSelectedMinute] = useState<string>('');
  const [rdvName, setRdvName] = useState<string>('');
  const [rdvPhone, setRdvPhone] = useState<string>('');
  const [settingsSubScreen, setSettingsSubScreen] = useState<string>('');
  const [showChatbot, setShowChatbot] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [_globalActiveCall, _setGlobalActiveCall] = useState<any>(null);
  const [legalSignature, setLegalSignature] = useState<{signed:boolean;date:string;accepted:boolean}|null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);
  const [sms2faEnabled, setSms2faEnabled] = useState(false);
  const [legalClauses, setLegalClauses] = useState<{[key:string]:{signed:boolean;date:string}}>({
    noncompete: {signed:false,date:''},
    confidentiality: {signed:false,date:''},
    liability: {signed:false,date:''},
    dataprotection: {signed:false,date:''},
    warranty: {signed:false,date:''},
    termination: {signed:false,date:''}
  });
  const [currentProjectImageIndex, setCurrentProjectImageIndex] = useState(0);
  const [paymentProofOrangeMoney, setPaymentProofOrangeMoney] = useState<string>('');
  const [paymentProofCash, setPaymentProofCash] = useState<string>('');
  const [paymentProofBank, setPaymentProofBank] = useState<string>('');
  const [paymentEngagement, setPaymentEngagement] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [showChantierModal, setShowChantierModal] = useState(false);
  const [showSiteDetail, setShowSiteDetail] = useState(false);
  const [updatingChantierId, setUpdatingChantierId] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [legalTermsAccepted, setLegalTermsAccepted] = useState(false);
  const [showBirthdays, setShowBirthdays] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [showDailyNotes, setShowDailyNotes] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [nonCompeteSigned, setNonCompeteSigned] = useState(false);
  const [selectedPlanning, setSelectedPlanning] = useState<any>(null);
  const [planning, setPlanning] = useState<any[]>([]);
  const [showGpsMap, setShowGpsMap] = useState(false);
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [reasonModalAction, setReasonModalAction] = useState<{chantierId: string, action: 'interrupted' | 'abandoned' | 'completed' | 'team_changed', currentStatus?: string, label: string} | null>(null);
  const [reasonInput, setReasonInput] = useState('');

  const C = darkMode ? {
    primary: '#2E8BC0',
    secondary: '#1B4D7A',
    light: '#1a2332',
    gray: '#0f1419',
    text: '#e4e6eb',
    textSecondary: '#b0b3b8',
    bg: '#18191a',
    card: '#242526',
    success: '#27ae60',
    warning: '#f39c12',
    danger: '#e74c3c',
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32'
  } : {
    primary: '#1B4D7A',
    secondary: '#2E8BC0',
    light: '#E8F4FC',
    gray: '#F5F7FA',
    text: '#1a1a1a',
    textSecondary: '#666',
    bg: '#FFF',
    card: '#FFF',
    success: '#27ae60',
    warning: '#f39c12',
    danger: '#e74c3c',
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32'
  };

  const Logo = ({ size = 120 }) => (
    <svg width={size} height={size * 0.7} viewBox="0 0 200 140">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={C.secondary} />
          <stop offset="100%" stopColor={C.primary} />
        </linearGradient>
        <linearGradient id="pipeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#78909C" />
          <stop offset="50%" stopColor="#B0BEC5" />
          <stop offset="100%" stopColor="#78909C" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="125" rx="85" ry="12" fill={C.light} opacity="0.6" />
      <path d="M20 120 Q35 115 50 120 T80 120 T110 120 T140 120 T170 120 T180 120" stroke={C.secondary} strokeWidth="2" fill="none" opacity="0.4" />
      <path d="M25 125 Q40 120 55 125 T85 125 T115 125 T145 125 T175 125" stroke={C.secondary} strokeWidth="1.5" fill="none" opacity="0.3" />
      <g transform="translate(25, 20) rotate(-30, 40, 40)">
        <rect x="35" y="25" width="12" height="55" rx="2" fill="url(#pipeGrad)" />
        <circle cx="41" cy="20" r="18" fill="none" stroke="url(#pipeGrad)" strokeWidth="8" />
        <rect x="33" y="8" width="16" height="12" fill={C.gray} />
        <rect x="36" y="10" width="4" height="8" fill="#455A64" />
      </g>
      <g transform="translate(75, 15)">
        <rect x="20" y="35" width="12" height="40" rx="2" fill="url(#pipeGrad)" />
        <ellipse cx="26" cy="35" rx="15" ry="6" fill="#90A4AE" />
        <rect x="11" y="28" width="30" height="8" rx="3" fill={C.primary} />
        <rect x="22" y="10" width="8" height="20" rx="2" fill={C.secondary} />
        <circle cx="26" cy="10" r="6" fill={C.primary} />
        <ellipse cx="26" cy="75" rx="10" ry="4" fill={C.secondary} opacity="0.6" />
        <path d="M22 75 Q26 85 30 75" stroke={C.secondary} strokeWidth="2" fill="none" opacity="0.8" />
      </g>
      <g transform="translate(125, 18)">
        <rect x="10" y="10" width="40" height="60" rx="8" fill="url(#logoGrad)" />
        <rect x="15" y="15" width="30" height="35" rx="4" fill={C.light} opacity="0.3" />
        <circle cx="30" cy="58" r="5" fill={C.warning} />
        <rect x="25" y="0" width="10" height="12" rx="2" fill="#78909C" />
        <rect x="15" y="70" width="8" height="10" rx="2" fill="#78909C" />
        <rect x="37" y="70" width="8" height="10" rx="2" fill="#78909C" />
        <text x="30" y="35" textAnchor="middle" fontSize="10" fill={C.primary} fontWeight="bold">°C</text>
      </g>
      <text x="100" y="105" textAnchor="middle" fontSize="26" fontWeight="bold" fill={C.primary} fontFamily="Arial, sans-serif">
        TSD <tspan fill={C.secondary} fontStyle="italic" fontSize="20">et</tspan> Fils
      </text>
      <text x="100" y="118" textAnchor="middle" fontSize="8" fill="#666" fontFamily="Arial, sans-serif">
        Plomberie • Sanitaire • Chauffe-eau
      </text>
    </svg>
  );

  useEffect(() => {
    if (isLoggedIn && userRole === 'tech' && currentUser) {
      checkLegalTermsAcceptance();
      checkNonCompeteSignature();
    }
  }, [isLoggedIn, userRole, currentUser]);

  useEffect(() => {
    if (currentUser) {
      setRdvName(currentUser.name || '');
      setRdvPhone(currentUser.phone || '');
    }
  }, [currentUser]);


  const checkLegalTermsAcceptance = async () => {
    if (!currentUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('legal_terms_acceptance')
        .select('accepted')
        .eq('user_id', currentUser.id)
        .eq('terms_version', '1.0')
        .maybeSingle();

      if (error) {
        console.error('[LegalTerms] Check error:', error.message, error.details, error.hint);
      }

      if (!error && data?.accepted) {
        setLegalTermsAccepted(true);
      } else {
        setLegalTermsAccepted(false);
      }
    } catch (err) {
      console.error('[LegalTerms] Check exception:', err);
    }
  };

  const checkNonCompeteSignature = async () => {
    if (!currentUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('non_compete_signatures')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('terms_version', '1.0')
        .maybeSingle();

      if (!error && data?.signed) {
        setNonCompeteSigned(true);
      } else {
        setNonCompeteSigned(false);
      }
    } catch (err) {
      console.error('Error checking non-compete signature:', err);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: appUser } = await supabase
            .from('app_users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          if (appUser) {
            setCurrentUser(appUser);
            setUserRole(appUser.role);
            setIsLoggedIn(true);
            setShowWelcome(false);
            if (appUser.profile_photo) setProfilePhoto(appUser.profile_photo);
            if (appUser.cover_photo) setCoverPhoto(appUser.cover_photo);
          }
        }
      } catch (err) {
        console.error('Session restore error:', err);
      }
    };
    restoreSession();
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserRole(null);
    setCurrentUser(null);
    setScreen('home');
  }, []);

  const handleLoginSuccess = useCallback((user: any, role: string) => {
    setCurrentUser(user);
    setUserRole(role);
    setIsLoggedIn(true);
    setShowWelcome(true);
    if (user.profile_photo) {
      setProfilePhoto(user.profile_photo);
    }
    if (user.cover_photo) {
      setCoverPhoto(user.cover_photo);
    }
  }, []);

  const translations: any = {
    fr: {
      welcome: 'Bienvenue', login: 'Connexion', register: "S'inscrire", email: 'Email', password: 'Mot de passe', confirmPassword: 'Confirmer le mot de passe', name: 'Nom complet', phone: 'Téléphone', client: 'Client', tech: 'Technicien', office: 'Employé de Bureau', admin: 'Administrateur', role: 'Rôle', contractNumber: 'Numéro de contrat', echelon: 'Échelon', selectEchelon: 'Sélectionner un échelon', selectStatus: 'Sélectionner un statut', qualification: 'Qualification', manoeuvre: 'Manœuvre', apprenti: 'Apprenti', chefEquipeA: 'Chef d\'équipe A', chefEquipeB: 'Chef d\'équipe B', contremaitre: 'Contremaître', directeur: 'Directeur', stagiaire: 'Stagiaire', secretariat: 'Secrétariat', finance: 'Finance', comptable: 'Comptable', notaire: 'Notaire', architecte: 'Architecte', assistant: 'Assistant', coordinateur: 'Coordinateur', createdDate: 'Date de création', mad: 'MAD', creationLocation: 'Lieu de création', district: 'Quartier', postalCode: 'Code postal', home: 'Accueil', quote: 'Devis', rdv: 'RDV', tracking: 'Suivi', profile: 'Profil', services: 'Services', urgentHelp: 'Besoin urgent ?', requestQuote: 'Demander Devis', mySites: 'Mes Chantiers', ourServices: 'Nos Services', viewAll: 'Voir tout', send: 'Envoyer', dashboard: 'Tableau de Bord', stocks: 'Stocks', teams: 'Équipes', invoices: 'Factures', gpsLive: 'GPS en Direct', logout: 'Déconnexion', noAccount: 'Pas de compte ?', createAccount: 'Créer compte', day: 'Jour', week: 'Semaine', month: 'Mois', quarter: 'Trimestre', semester: 'Semestre', year: 'Année', onMission: 'En mission', available: 'Disponible', onLeave: 'Congé', leaveReview: 'Laisser avis', stars: 'étoiles', submitReview: 'Envoyer avis', inProgress: 'En cours', completed: 'Terminé', planned: 'Planifié', progress: 'Progression', clients: 'Clients', planning: 'Planning', sitePhotos: 'Photos', call: 'Appeler', message: 'Message', settings: 'Paramètres', notifications: 'Notifications', history: 'Historique', lowStock: 'Stock bas', ongoingSites: 'Chantiers en cours', pendingQuotes: 'Devis en attente', unpaidInvoices: 'Factures impayées', activeTechs: 'Techniciens actifs', topTechs: 'Top Techniciens', topClients: 'Top Clients', vip: 'VIP', loyal: 'Fidèle', regular: 'Régulier', enterprise: 'Entreprise', interventions: 'Interventions', totalSpent: 'Total dépensé', slogan: "L'Excellence Européenne au Service de la Guinée", selectService: 'Choisir service', description: 'Description', yourDetails: 'Vos coordonnées', plus: 'Plus', alerts: 'Alertes', analytics: 'Analytics', reports: 'Rapports', companyInfo: 'Informations entreprise', pricing: 'Tarifs & Services', security: 'Sécurité', language: 'Langue & Région', backup: 'Sauvegarde données', myInvoices: 'Mes factures', payments: 'Paiements', selectDate: 'Choisir une date', selectTime: 'Choisir une heure', bookAppointment: 'Réserver', changePhoto: 'Changer la photo', darkMode: 'Mode sombre', lightMode: 'Mode clair', orangeMoney: 'Orange Money', cash: 'Espèces', paymentTerms: 'Conditions de paiement', legalTerms: 'Mentions légales', payment1: '65% à la signature du contrat', payment2: '20% à la moitié du chantier', payment3: '15% à la fin du chantier', nonNegotiable: 'Non négociable', markAsRead: 'Marquer comme lu', deleteNotif: 'Supprimer', viewDetails: 'Voir détails', noNotifications: 'Aucune notification', noHistory: 'Aucun historique', privacyPolicy: 'Politique de confidentialité', termsOfService: "Conditions générales d'utilisation", aboutUs: 'À propos', contactUs: 'Nous contacter', paymentMethods: 'Modes de paiement', faq: 'FAQ', chatbot: 'Assistant virtuel', serviceTerms: 'Conditions de service', geoPolicy: 'Politique de géolocalisation', photoPolicy: 'Politique photos & contenus', liabilityClause: 'Clause de responsabilité', refundPolicy: 'Politique de remboursement', complaintPolicy: 'Contact & réclamation', bankTransfer: 'Virement bancaire', sendMessage: 'Envoyer', typeMessage: 'Tapez votre message...', botWelcome: 'Bonjour! Je suis votre assistant TSD et Fils. Comment puis-je vous aider?', helpTopics: 'Sujets populaires', back: 'Retour', nonCompete: 'Clause de non-concurrence', contractAnniversary: 'Anniversaire du contrat', birthDate: 'Date de naissance', memberSince: 'Membre depuis', birthdayToday: 'Anniversaire aujourd\'hui', contractAnniv: 'Anniversaire contrat', shareLocation: 'Partager ma localisation', locationShared: 'Localisation partagée', photo: 'Photo', uploadPhoto: 'Télécharger photo', removePhoto: 'Supprimer photo', hour: 'Heure', minute: 'Minute', minutes: 'Minutes', bankDetails: 'Coordonnées bancaires', bank: 'Banque', iban: 'IBAN/RIB', beneficiary: 'Bénéficiaire', reference: 'Référence', notificationPreferences: 'Préférences de notification', securitySettings: 'Paramètres de sécurité', changePassword: 'Changer mot de passe', twoFactorAuth: 'Authentification 2FA', backupOptions: 'Options de sauvegarde', exportData: 'Exporter données', autoBackup: 'Sauvegarde automatique', readAndAccept: 'J\'ai lu et j\'accepte les conditions', approve: 'Approuver', decline: 'Refuser', signedOn: 'Signé le', markAllRead: 'Tout marquer comme lu', transactionDetails: 'Détails de la transaction', referenceNumber: 'Numéro de référence', download: 'Télécharger', print: 'Imprimer', ourProjects: 'Nos Réalisations', projectDetails: 'Détails du projet', category: 'Catégorie', clientRating: 'Note client', confirmPhoto: 'Confirmer', cancel: 'Annuler', currentPhoto: 'Photo actuelle', newPhoto: 'Nouvelle photo', writeReview: 'Rédiger un avis', minChars: 'caractères minimum', optionalPhoto: 'Photo optionnelle', averageRating: 'Note moyenne', reviews: 'Avis', close: 'Fermer', status: 'Statut', amount: 'Montant', date: 'Date', time: 'Heure', relatedDocuments: 'Documents liés', address: 'Adresse', coordinates: 'Coordonnées GPS', faceId2FA: 'Authentification Face ID', sms2FA: '2FA par SMS', merchantCode: 'Code Marchand', uploadProof: 'Télécharger preuve de paiement', paymentProof: 'Preuve de paiement', cashWarning: 'Ne jamais remettre plus de 1 000 000 GNF en espèces aux techniciens', requestReceipt: 'Toujours demander un reçu', paymentCommitment: 'Je m\'engage à payer mes factures à temps', callNow: 'Appeler maintenant', emergencyHelp: 'Aide d\'urgence', confidentiality: 'Clause de confidentialité', dataProtection: 'Protection des données', warranty: 'Conditions de garantie', termination: 'Clause de résiliation', civilLiability: 'Responsabilité civile', subServices: 'Sous-services', priceRange: 'Fourchette de prix', requestQuoteNow: 'Demander un devis', chantierDetails: 'Détails du chantier', timeline: 'Chronologie', addComment: 'Ajouter un commentaire', comments: 'Commentaires', images: 'Images', number: 'Numéro'
    },
    en: {
      welcome: 'Welcome', login: 'Login', register: 'Register', email: 'Email', password: 'Password', confirmPassword: 'Confirm Password', name: 'Full name', phone: 'Phone', client: 'Client', tech: 'Technician', office: 'Office Employee', admin: 'Administrator', role: 'Role', contractNumber: 'Contract Number', echelon: 'Rank', selectEchelon: 'Select a rank', selectStatus: 'Select a status', qualification: 'Qualification', manoeuvre: 'Laborer', apprenti: 'Apprentice', chefEquipeA: 'Team Leader A', chefEquipeB: 'Team Leader B', contremaitre: 'Foreman', directeur: 'Director', stagiaire: 'Intern', secretariat: 'Secretary', finance: 'Finance', comptable: 'Accountant', notaire: 'Notary', architecte: 'Architect', assistant: 'Assistant', coordinateur: 'Coordinator', createdDate: 'Creation Date', mad: 'MAD', creationLocation: 'Creation Location', district: 'District', postalCode: 'Postal Code', home: 'Home', quote: 'Quote', rdv: 'Booking', tracking: 'Tracking', profile: 'Profile', services: 'Services', urgentHelp: 'Urgent help?', requestQuote: 'Request Quote', mySites: 'My Projects', ourServices: 'Our Services', viewAll: 'View all', send: 'Send', dashboard: 'Dashboard', stocks: 'Inventory', teams: 'Teams', invoices: 'Invoices', gpsLive: 'Live GPS', logout: 'Logout', noAccount: 'No account?', createAccount: 'Create account', day: 'Day', week: 'Week', month: 'Month', quarter: 'Quarter', semester: 'Semester', year: 'Year', onMission: 'On mission', available: 'Available', onLeave: 'Leave', leaveReview: 'Leave review', stars: 'stars', submitReview: 'Submit', inProgress: 'In progress', completed: 'Completed', planned: 'Planned', progress: 'Progress', clients: 'Clients', planning: 'Planning', sitePhotos: 'Photos', call: 'Call', message: 'Message', settings: 'Settings', notifications: 'Notifications', history: 'History', lowStock: 'Low stock', ongoingSites: 'Ongoing sites', pendingQuotes: 'Pending quotes', unpaidInvoices: 'Unpaid invoices', activeTechs: 'Active techs', topTechs: 'Top Technicians', topClients: 'Top Clients', vip: 'VIP', loyal: 'Loyal', regular: 'Regular', enterprise: 'Enterprise', interventions: 'Interventions', totalSpent: 'Total spent', slogan: "European Excellence at Guinea's Service", selectService: 'Select service', description: 'Description', yourDetails: 'Your details', plus: 'More', alerts: 'Alerts', analytics: 'Analytics', reports: 'Reports', companyInfo: 'Company info', pricing: 'Pricing & Services', security: 'Security', language: 'Language & Region', backup: 'Data backup', myInvoices: 'My invoices', payments: 'Payments', selectDate: 'Select date', selectTime: 'Select time', bookAppointment: 'Book', changePhoto: 'Change photo', darkMode: 'Dark mode', lightMode: 'Light mode', orangeMoney: 'Orange Money', cash: 'Cash', paymentTerms: 'Payment terms', legalTerms: 'Legal terms', payment1: '65% upon contract signing', payment2: '20% at project midpoint', payment3: '15% upon project completion', nonNegotiable: 'Non-negotiable', markAsRead: 'Mark as read', deleteNotif: 'Delete', viewDetails: 'View details', noNotifications: 'No notifications', noHistory: 'No history', privacyPolicy: 'Privacy Policy', termsOfService: 'Terms of Service', aboutUs: 'About Us', contactUs: 'Contact Us', paymentMethods: 'Payment Methods', faq: 'FAQ', chatbot: 'Virtual Assistant', serviceTerms: 'Service Terms', geoPolicy: 'Geolocation Policy', photoPolicy: 'Photos & Content Policy', liabilityClause: 'Liability Clause', refundPolicy: 'Refund Policy', complaintPolicy: 'Contact & Complaints', bankTransfer: 'Bank Transfer', sendMessage: 'Send', typeMessage: 'Type your message...', botWelcome: 'Hello! I am your TSD et Fils assistant. How can I help you?', helpTopics: 'Popular topics', back: 'Back', nonCompete: 'Non-Competition Clause', contractAnniversary: 'Contract Anniversary', birthDate: 'Date of birth', memberSince: 'Member since', birthdayToday: 'Birthday today', contractAnniv: 'Contract anniversary', shareLocation: 'Share my location', locationShared: 'Location shared', photo: 'Photo', uploadPhoto: 'Upload photo', removePhoto: 'Remove photo', hour: 'Hour', minute: 'Minute', minutes: 'Minutes', bankDetails: 'Bank details', bank: 'Bank', iban: 'IBAN/Account', beneficiary: 'Beneficiary', reference: 'Reference', notificationPreferences: 'Notification preferences', securitySettings: 'Security settings', changePassword: 'Change password', twoFactorAuth: '2FA Authentication', backupOptions: 'Backup options', exportData: 'Export data', autoBackup: 'Auto backup', readAndAccept: 'I have read and accept the terms', approve: 'Approve', decline: 'Decline', signedOn: 'Signed on', markAllRead: 'Mark all as read', transactionDetails: 'Transaction details', referenceNumber: 'Reference number', download: 'Download', print: 'Print', ourProjects: 'Our Projects', projectDetails: 'Project details', category: 'Category', clientRating: 'Client rating', confirmPhoto: 'Confirm', cancel: 'Cancel', currentPhoto: 'Current photo', newPhoto: 'New photo', writeReview: 'Write a review', minChars: 'characters minimum', optionalPhoto: 'Optional photo', averageRating: 'Average rating', reviews: 'Reviews', close: 'Close', status: 'Status', amount: 'Amount', date: 'Date', time: 'Time', relatedDocuments: 'Related documents', address: 'Address', coordinates: 'GPS Coordinates', faceId2FA: 'Face ID Authentication', sms2FA: 'SMS 2FA', merchantCode: 'Merchant Code', uploadProof: 'Upload payment proof', paymentProof: 'Payment proof', cashWarning: 'Never give more than 1,000,000 GNF in cash to technicians', requestReceipt: 'Always request a receipt', paymentCommitment: 'I commit to paying my bills on time', callNow: 'Call now', emergencyHelp: 'Emergency help', confidentiality: 'Confidentiality clause', dataProtection: 'Data protection', warranty: 'Warranty conditions', termination: 'Termination clause', civilLiability: 'Civil liability', subServices: 'Sub-services', priceRange: 'Price range', requestQuoteNow: 'Request a quote', chantierDetails: 'Site details', timeline: 'Timeline', addComment: 'Add comment', comments: 'Comments', images: 'Images', number: 'Number'
    },
    ar: {
      welcome: 'مرحبا', login: 'تسجيل الدخول', register: 'التسجيل', email: 'البريد الإلكتروني', password: 'كلمة المرور', confirmPassword: 'تأكيد كلمة المرور', name: 'الاسم الكامل', phone: 'الهاتف', client: 'عميل', tech: 'فني', office: 'موظف مكتب', admin: 'مسؤول', role: 'الدور', contractNumber: 'رقم العقد', echelon: 'الرتبة', selectEchelon: 'اختر رتبة', selectStatus: 'اختر حالة', qualification: 'المؤهل', manoeuvre: 'عامل', apprenti: 'متدرب', chefEquipeA: 'رئيس الفريق A', chefEquipeB: 'رئيس الفريق B', contremaitre: 'مشرف', directeur: 'مدير', stagiaire: 'متدرب', secretariat: 'سكرتارية', finance: 'مالية', comptable: 'محاسب', notaire: 'كاتب عدل', architecte: 'مهندس معماري', assistant: 'مساعد', coordinateur: 'منسق', createdDate: 'تاريخ الإنشاء', mad: 'MAD', creationLocation: 'مكان الإنشاء', district: 'الحي', postalCode: 'الرمز البريدي', home: 'الرئيسية', quote: 'عرض سعر', rdv: 'موعد', tracking: 'التتبع', profile: 'الملف الشخصي', services: 'الخدمات', urgentHelp: 'مساعدة عاجلة؟', requestQuote: 'طلب عرض سعر', mySites: 'مشاريعي', ourServices: 'خدماتنا', viewAll: 'عرض الكل', send: 'إرسال', dashboard: 'لوحة التحكم', stocks: 'المخزون', teams: 'الفرق', invoices: 'الفواتير', gpsLive: 'GPS المباشر', logout: 'تسجيل الخروج', noAccount: 'لا يوجد حساب؟', createAccount: 'إنشاء حساب', day: 'يوم', week: 'أسبوع', month: 'شهر', quarter: 'ربع', semester: 'فصل', year: 'سنة', onMission: 'في مهمة', available: 'متاح', onLeave: 'في إجازة', leaveReview: 'ترك تقييم', stars: 'نجوم', submitReview: 'إرسال', inProgress: 'جارٍ التنفيذ', completed: 'مكتمل', planned: 'مخطط', progress: 'التقدم', clients: 'العملاء', planning: 'التخطيط', sitePhotos: 'الصور', call: 'اتصال', message: 'رسالة', settings: 'الإعدادات', notifications: 'الإشعارات', history: 'السجل', lowStock: 'مخزون منخفض', ongoingSites: 'مواقع جارية', pendingQuotes: 'عروض معلقة', unpaidInvoices: 'فواتير غير مدفوعة', activeTechs: 'فنيون نشطون', topTechs: 'أفضل الفنيين', topClients: 'أفضل العملاء', vip: 'VIP', loyal: 'مخلص', regular: 'عادي', enterprise: 'مؤسسة', interventions: 'التدخلات', totalSpent: 'إجمالي الإنفاق', slogan: 'التميز الأوروبي في خدمة غينيا', selectService: 'اختر خدمة', description: 'الوصف', yourDetails: 'تفاصيلك', plus: 'المزيد', alerts: 'التنبيهات', analytics: 'التحليلات', reports: 'التقارير', companyInfo: 'معلومات الشركة', pricing: 'الأسعار والخدمات', security: 'الأمان', language: 'اللغة والمنطقة', backup: 'النسخ الاحتياطي', myInvoices: 'فواتيري', payments: 'المدفوعات', selectDate: 'اختر تاريخًا', selectTime: 'اختر وقتًا', bookAppointment: 'حجز', changePhoto: 'تغيير الصورة', darkMode: 'الوضع الداكن', lightMode: 'الوضع الفاتح', orangeMoney: 'Orange Money', cash: 'نقدًا', paymentTerms: 'شروط الدفع', legalTerms: 'الشروط القانونية', payment1: '65٪ عند توقيع العقد', payment2: '20٪ في منتصف المشروع', payment3: '15٪ عند إتمام المشروع', nonNegotiable: 'غير قابل للتفاوض', markAsRead: 'تحديد كمقروء', deleteNotif: 'حذف', viewDetails: 'عرض التفاصيل', noNotifications: 'لا توجد إشعارات', noHistory: 'لا يوجد سجل', privacyPolicy: 'سياسة الخصوصية', termsOfService: 'شروط الخدمة', aboutUs: 'معلومات عنا', contactUs: 'اتصل بنا', paymentMethods: 'طرق الدفع', faq: 'الأسئلة الشائعة', chatbot: 'المساعد الافتراضي', serviceTerms: 'شروط الخدمة', geoPolicy: 'سياسة الموقع الجغرافي', photoPolicy: 'سياسة الصور والمحتوى', liabilityClause: 'بند المسؤولية', refundPolicy: 'سياسة الاسترداد', complaintPolicy: 'الاتصال والشكاوى', bankTransfer: 'تحويل بنكي', sendMessage: 'إرسال', typeMessage: 'اكتب رسالتك...', botWelcome: 'مرحبًا! أنا مساعد TSD et Fils. كيف يمكنني مساعدتك؟', helpTopics: 'المواضيع الشائعة', back: 'رجوع', nonCompete: 'بند عدم المنافسة', contractAnniversary: 'الذكرى السنوية للعقد', birthDate: 'تاريخ الميلاد', memberSince: 'عضو منذ', birthdayToday: 'عيد ميلاد اليوم', contractAnniv: 'ذكرى العقد', shareLocation: 'مشاركة الموقع', locationShared: 'تمت مشاركة الموقع', photo: 'صورة', uploadPhoto: 'تحميل صورة', removePhoto: 'إزالة الصورة', hour: 'ساعة', minute: 'دقيقة', minutes: 'دقائق', bankDetails: 'التفاصيل البنكية', bank: 'البنك', iban: 'IBAN/الحساب', beneficiary: 'المستفيد', reference: 'المرجع', notificationPreferences: 'تفضيلات الإشعارات', securitySettings: 'إعدادات الأمان', changePassword: 'تغيير كلمة المرور', twoFactorAuth: 'المصادقة الثنائية', backupOptions: 'خيارات النسخ الاحتياطي', exportData: 'تصدير البيانات', autoBackup: 'النسخ الاحتياطي التلقائي', readAndAccept: 'لقد قرأت ووافقت على الشروط', approve: 'موافقة', decline: 'رفض', signedOn: 'تم التوقيع في', markAllRead: 'تحديد الكل كمقروء', transactionDetails: 'تفاصيل المعاملة', referenceNumber: 'رقم المرجع', download: 'تحميل', print: 'طباعة', ourProjects: 'مشاريعنا', projectDetails: 'تفاصيل المشروع', category: 'الفئة', clientRating: 'تقييم العميل', confirmPhoto: 'تأكيد', cancel: 'إلغاء', currentPhoto: 'الصورة الحالية', newPhoto: 'صورة جديدة', writeReview: 'اكتب تقييمًا', minChars: 'حد أدنى من الأحرف', optionalPhoto: 'صورة اختيارية', averageRating: 'متوسط التقييم', reviews: 'التقييمات', close: 'إغلاق', status: 'الحالة', amount: 'المبلغ', date: 'التاريخ', time: 'الوقت', relatedDocuments: 'المستندات ذات الصلة', address: 'العنوان', coordinates: 'إحداثيات GPS', faceId2FA: 'مصادقة Face ID', sms2FA: 'مصادقة ثنائية عبر SMS', merchantCode: 'رمز التاجر', uploadProof: 'تحميل إثبات الدفع', paymentProof: 'إثبات الدفع', cashWarning: 'لا تعطِ أكثر من 1,000,000 GNF نقدًا للفنيين', requestReceipt: 'اطلب دائمًا إيصالًا', paymentCommitment: 'أتعهد بدفع فواتيري في الوقت المحدد', callNow: 'اتصل الآن', emergencyHelp: 'مساعدة طارئة', confidentiality: 'بند السرية', dataProtection: 'حماية البيانات', warranty: 'شروط الضمان', termination: 'بند الإنهاء', civilLiability: 'المسؤولية المدنية', subServices: 'خدمات فرعية', priceRange: 'نطاق السعر', requestQuoteNow: 'اطلب عرض سعر', chantierDetails: 'تفاصيل الموقع', timeline: 'الجدول الزمني', addComment: 'أضف تعليقًا', comments: 'التعليقات', images: 'الصور', number: 'رقم'
    }
  };

  const t = translations[lang] || translations.fr;

  const getText = (fr: string, en: string, ar: string): string => {
    if (lang === 'ar') return ar;
    if (lang === 'en') return en;
    return fr;
  };

  const getServices = () => [
    { id: 1, name: getText('Plomberie Generale','General Plumbing','السباكة العامة'), icon: '🔧', price: '450 000 GNF', color: '#E3F2FD', description: getText('Services de plomberie generale pour tous types d\'interventions','General plumbing services for all types of interventions','خدمات السباكة العامة لجميع أنواع التدخلات'), subServices: [getText('Reparation de fuite','Leak repair','إصلاح التسرب'), getText('Installation de robinet','Faucet installation','تركيب الصنبور'), getText('Debouchage canalisation','Pipe unclogging','تسليك الأنابيب'), getText('Remplacement tuyauterie','Pipe replacement','استبدال الأنابيب'), getText('Maintenance preventive','Preventive maintenance','الصيانة الوقائية')] },
    { id: 2, name: 'Diagnostic', icon: '🔍', price: '250 000 GNF', color: '#FFF8E1', description: getText('Diagnostic complet de votre systeme de plomberie','Complete diagnosis of your plumbing system','تشخيص كامل لنظام السباكة الخاص بك'), subServices: [getText('Inspection visuelle','Visual inspection','فحص بصري'), getText('Detection de fuites','Leak detection','كشف التسرب'), getText('Test de pression','Pressure test','اختبار الضغط'), getText('Camera d\'inspection','Inspection camera','كاميرا الفحص'), getText('Rapport detaille','Detailed report','تقرير مفصل')] },
    { id: 3, name: getText('Installation Sanitaire','Sanitary Installation','التركيبات الصحية'), icon: '🚿', price: '1 200 000 GNF', color: '#E8F5E9', description: getText('Installation complete d\'equipements sanitaires','Complete installation of sanitary equipment','تركيب كامل للمعدات الصحية'), subServices: [getText('Installation WC','Toilet installation','تركيب المرحاض'), getText('Installation lavabo','Sink installation','تركيب الحوض'), getText('Installation douche','Shower installation','تركيب الدش'), getText('Installation baignoire','Bathtub installation','تركيب البانيو'), getText('Raccordement evacuation','Drain connection','توصيل الصرف')] },
    { id: 4, name: getText('Chauffe-eau','Water Heater','سخان المياه'), icon: '🌡️', price: '870 000 GNF', color: '#FFF3E0', description: getText('Installation et reparation de chauffe-eau','Water heater installation and repair','تركيب وإصلاح سخان المياه'), subServices: [getText('Chauffe-eau electrique','Electric water heater','سخان كهربائي'), getText('Chauffe-eau solaire','Solar water heater','سخان شمسي'), getText('Chauffe-eau gaz','Gas water heater','سخان غاز'), getText('Reparation chauffe-eau','Water heater repair','إصلاح السخان'), getText('Entretien annuel','Annual maintenance','صيانة سنوية')] },
    { id: 5, name: getText('Renovation SDB','Bathroom Renovation','تجديد الحمام'), icon: '🛁', price: '9 850 000 GNF', color: '#F3E5F5', description: getText('Renovation complete de salle de bain','Complete bathroom renovation','تجديد كامل للحمام'), subServices: [getText('Demolition existant','Existing demolition','هدم القديم'), getText('Nouvelle plomberie','New plumbing','سباكة جديدة'), getText('Nouveaux sanitaires','New sanitary','أدوات صحية جديدة'), getText('Carrelage','Tiling','بلاط'), getText('Finitions','Finishes','تشطيبات')] },
    { id: 6, name: getText('Maison Neuve','New House','منزل جديد'), icon: '🏠', price: '15 000 000 GNF', color: '#E0F7FA', description: getText('Plomberie complete pour construction neuve','Complete plumbing for new construction','سباكة كاملة للبناء الجديد'), subServices: [getText('Evacuation eaux usees','Wastewater drainage','تصريف المياه العادمة'), getText('Distribution eau potable','Drinking water distribution','توزيع مياه الشرب'), getText('Installation sanitaires','Sanitary installation','تركيب أدوات صحية'), getText('Chauffe-eau','Water heater','سخان المياه'), getText('Systeme filtration','Filtration system','نظام التصفية')] },
  ];

  const [services, setServices] = useState(getServices());

  useEffect(() => {
    setServices(getServices());
  }, [lang]);

  const [chantiers, setChantiers] = useState<any[]>([]);
  const [techs, setTechs] = useState<any[]>([]);

  const loadChantiers = useCallback(async () => {
    console.log('🔍 loadChantiers appelé - Role:', userRole, 'User ID:', currentUser?.id);

    if (userRole === 'tech' && currentUser?.id) {
      console.log('→ Recherche du technicien pour profile_id:', currentUser.id);

      const { data: techData, error: techError } = await supabase
        .from('technicians')
        .select('id')
        .eq('profile_id', currentUser.id)
        .maybeSingle();

      console.log('→ Technicien trouvé:', techData, 'Erreur:', techError);

      if (!techData) {
        console.warn('❌ Technicien non trouvé pour profile_id:', currentUser.id);
        setChantiers([]);
        return;
      }

      console.log('→ Récupération des chantiers directs pour tech_id:', techData.id);
      const { data: directChantiers, error: directError } = await supabase
        .from('chantiers')
        .select('*')
        .eq('technician_id', techData.id);

      console.log('→ Chantiers directs:', directChantiers?.length || 0, 'Erreur:', directError);

      console.log('→ Récupération du planning pour tech_id:', techData.id);
      const { data: planningData, error: planningError } = await supabase
        .from('planning')
        .select('chantier_id')
        .eq('technician_id', techData.id);

      console.log('→ Planning trouvé:', planningData?.length || 0, 'IDs:', planningData?.map(p => p.chantier_id), 'Erreur:', planningError);

      const plannedChantierIds = planningData?.map(p => p.chantier_id).filter(Boolean) || [];

      let plannedChantiers: any[] = [];
      if (plannedChantierIds.length > 0) {
        console.log('→ Récupération des chantiers du planning:', plannedChantierIds);
        const { data, error: plannedError } = await supabase
          .from('chantiers')
          .select('*')
          .in('id', plannedChantierIds);
        plannedChantiers = data || [];
        console.log('→ Chantiers du planning récupérés:', plannedChantiers.length, 'Erreur:', plannedError);
      }

      const allChantiers = [...(directChantiers || []), ...plannedChantiers];
      console.log('→ Total brut:', allChantiers.length);

      const uniqueChantiers = Array.from(
        new Map(allChantiers.map(c => [c.id, c])).values()
      );
      console.log('→ Total unique:', uniqueChantiers.length);

      const formattedData = uniqueChantiers
        .map((c: any) => ({
          id: c.id,
          titre: c.title,
          client: c.client_id,
          lieu: c.location,
          techId: c.technician_id,
          statut: c.status,
          prog: c.progress,
          photos: [...(c.photos_before || []), ...(c.photos_during || []), ...(c.photos_after || [])],
          avis: null,
          timeline: [],
          comments: []
        }))
        .sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime());

      setChantiers(formattedData);
      console.log(`✅ Chantiers chargés pour technicien ${techData.id}:`, formattedData.length);
      if (formattedData.length > 0) {
        console.log('→ Détails des chantiers:', formattedData.map(c => ({ titre: c.titre, lieu: c.lieu, statut: c.statut })));
      }
    } else if (userRole === 'client' && currentUser?.id) {
      const { data, error } = await supabase
        .from('chantiers')
        .select('*')
        .eq('client_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formattedData = data.map((c: any) => ({
          id: c.id,
          titre: c.title,
          client: c.client_id,
          lieu: c.location,
          techId: c.technician_id,
          statut: c.status,
          prog: c.progress,
          photos: [...(c.photos_before || []), ...(c.photos_during || []), ...(c.photos_after || [])],
          avis: null,
          timeline: [],
          comments: [],
          started_at: c.started_at,
          completed_at: c.completed_at,
          interrupted_at: c.interrupted_at,
          interruption_reason: c.interruption_reason,
          description: c.description,
        }));
        setChantiers(formattedData);
      }
    } else {
      const { data, error } = await supabase
        .from('chantiers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formattedData = data.map((c: any) => ({
          id: c.id,
          titre: c.title,
          client: c.client_id,
          lieu: c.location,
          techId: c.technician_id,
          statut: c.status,
          prog: c.progress,
          photos: [...(c.photos_before || []), ...(c.photos_during || []), ...(c.photos_after || [])],
          avis: null,
          timeline: [],
          comments: []
        }));
        setChantiers(formattedData);
      }
    }
  }, [userRole, currentUser?.id]);

  const loadTechs = useCallback(async () => {
    const { data, error } = await supabase
      .from('technicians')
      .select(`
        *,
        profiles:profile_id (
          name,
          phone
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedData = data.map((t: any) => ({
        id: t.id,
        nom: t.profiles?.name || 'Technicien',
        role: t.role_level,
        statut: t.status,
        lat: t.current_lat ? parseFloat(t.current_lat) : null,
        lng: t.current_lng ? parseFloat(t.current_lng) : null,
        chantier: t.current_site || '-',
        sat: t.satisfaction_rate,
        ca: t.total_revenue,
        photo: '👨🏾‍🔧',
        color: t.color
      }));
      setTechs(formattedData);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!currentUser?.id) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedData = data.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        date: safeDate(n.created_at),
        read: n.is_read
      }));
      setNotifications(formattedData);
    }
  }, [currentUser?.id]);

  const loadPlanning = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 4);
    const endStr = endDate.toISOString().split('T')[0];

    let techId: string | null = null;
    if (userRole === 'tech' && currentUser?.id) {
      const { data: techData } = await supabase
        .from('technicians')
        .select('id')
        .eq('profile_id', currentUser.id)
        .maybeSingle();
      techId = techData?.id || null;
    }

    const { data, error } = await supabase
      .from('planning')
      .select(`
        *,
        chantiers:chantier_id (
          id,
          title,
          location,
          status,
          progress
        )
      `)
      .gte('scheduled_date', todayStr)
      .lte('scheduled_date', endStr)
      .order('scheduled_date', { ascending: true });

    if (!error && data) {
      let filteredData = data;

      if (techId) {
        const planningIds = data.map(p => p.id);
        const { data: ptData } = planningIds.length > 0
          ? await supabase
              .from('planning_technicians')
              .select('planning_id')
              .eq('technician_id', techId)
              .in('planning_id', planningIds)
          : { data: [] };

        const ptPlanningIds = new Set((ptData || []).map((pt: any) => pt.planning_id));

        filteredData = data.filter(p =>
          p.technician_id === techId || ptPlanningIds.has(p.id)
        );
      }

      const formattedData = filteredData.map((p: any) => {
        const pDate = new Date(p.scheduled_date + 'T00:00:00');
        const diffDays = Math.round((pDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: p.id,
          client: p.chantiers?.title || 'Client',
          type: p.chantiers?.title || 'Intervention',
          lieu: p.chantiers?.location || 'Lieu',
          heure: `${p.start_time || ''} - ${p.end_time || ''}`,
          jour: diffDays >= 0 && diffDays <= 4 ? diffDays : -1,
          scheduled_date: p.scheduled_date,
          chantier_id: p.chantier_id,
          chantier_status: p.chantiers?.status,
          chantier_progress: p.chantiers?.progress
        };
      });
      setPlanning(formattedData);
    }
  }, [userRole, currentUser?.id]);

  const handlePlanningOrChantierUpdate = useCallback(() => {
    loadPlanning();
    loadChantiers();
  }, [loadPlanning, loadChantiers]);

  const updateChantierStatusFn = useCallback(async (chantierId: string, newStatus: string, activityType: string, description: string, reason?: string) => {
    try {
      setUpdatingChantierId(chantierId);
      const updateData: any = { status: newStatus };
      if (newStatus === 'inProgress') updateData.started_at = new Date().toISOString();
      if (newStatus === 'interrupted') {
        updateData.interrupted_at = new Date().toISOString();
        if (reason) updateData.interruption_reason = reason;
      }
      if (newStatus === 'abandoned') {
        updateData.interrupted_at = new Date().toISOString();
        if (reason) updateData.interruption_reason = reason;
      }
      if (newStatus === 'completed') updateData.completed_at = new Date().toISOString();

      const { error: updateError } = await supabase.from('chantiers').update(updateData).eq('id', chantierId);
      if (updateError) {
        console.error('Chantier status update error:', updateError);
        alert(lang === 'fr' ? 'Erreur lors de la mise a jour du statut. Veuillez reessayer.' : 'Error updating status. Please try again.');
        return;
      }

      const { error: activityError } = await supabase.from('chantier_activities').insert({
        chantier_id: chantierId,
        user_id: currentUser?.id,
        activity_type: activityType,
        description: description,
        metadata: reason ? { reason } : {},
      });
      if (activityError) console.error('Activity insert error:', activityError);

      const { data: chantierData } = await supabase
        .from('chantiers')
        .select('client_id, title')
        .eq('id', chantierId)
        .maybeSingle();

      if (chantierData?.client_id) {
        const statusMessages: Record<string, {title:string, message:string, type:string}> = {
          started: {
            title: lang==='fr' ? 'Chantier demarre !' : 'Work started!',
            message: lang==='fr' ? `Les travaux sur "${chantierData.title}" ont commence. Suivez l'avancement en temps reel.` : `Work on "${chantierData.title}" has started. Follow progress in real-time.`,
            type: 'success'
          },
          interrupted: {
            title: lang==='fr' ? 'Chantier interrompu' : 'Work interrupted',
            message: lang==='fr' ? `Les travaux sur "${chantierData.title}" ont ete temporairement interrompus.${reason ? ' Raison: ' + reason : ''}` : `Work on "${chantierData.title}" has been temporarily interrupted.${reason ? ' Reason: ' + reason : ''}`,
            type: 'warning'
          },
          resumed: {
            title: lang==='fr' ? 'Chantier repris' : 'Work resumed',
            message: lang==='fr' ? `Les travaux sur "${chantierData.title}" ont repris.` : `Work on "${chantierData.title}" has resumed.`,
            type: 'info'
          },
          abandoned: {
            title: lang==='fr' ? 'Chantier abandonne' : 'Work abandoned',
            message: lang==='fr' ? `Le chantier "${chantierData.title}" a ete abandonne.${reason ? ' Raison: ' + reason : ''}` : `The site "${chantierData.title}" has been abandoned.${reason ? ' Reason: ' + reason : ''}`,
            type: 'error'
          },
          team_changed: {
            title: lang==='fr' ? 'Changement d\'equipe' : 'Team change',
            message: lang==='fr' ? `L'equipe assignee au chantier "${chantierData.title}" a ete modifiee.` : `The team assigned to "${chantierData.title}" has been changed.`,
            type: 'info'
          },
          completed: {
            title: lang==='fr' ? 'Chantier termine !' : 'Work completed!',
            message: lang==='fr' ? `Les travaux sur "${chantierData.title}" sont termines. Merci de votre confiance !` : `Work on "${chantierData.title}" is complete. Thank you for your trust!`,
            type: 'success'
          },
        };

        const notif = statusMessages[activityType];
        if (notif) {
          await supabase.from('notifications').insert({
            user_id: chantierData.client_id,
            type: notif.type,
            title: notif.title,
            message: notif.message,
          });
        }
      }

      await Promise.all([loadPlanning(), loadChantiers()]);

      const confirmLabels: Record<string, string> = lang === 'fr'
        ? { started: 'Chantier demarre !', resumed: 'Chantier repris !', interrupted: 'Chantier interrompu', abandoned: 'Chantier abandonne', team_changed: 'Equipe modifiee', completed: 'Chantier termine !' }
        : { started: 'Work started!', resumed: 'Work resumed!', interrupted: 'Work interrupted', abandoned: 'Work abandoned', team_changed: 'Team changed', completed: 'Work completed!' };
      alert(confirmLabels[activityType] || (lang === 'fr' ? 'Statut mis a jour' : 'Status updated'));
    } catch (err) {
      console.error('Error updating chantier status:', err);
      alert(lang === 'fr' ? 'Une erreur est survenue. Veuillez reessayer.' : 'An error occurred. Please try again.');
    } finally {
      setUpdatingChantierId(null);
    }
  }, [lang, currentUser?.id, loadPlanning, loadChantiers]);

  const handleReasonSubmit = useCallback(() => {
    if (!reasonModalAction) return;
    const { chantierId, action, currentStatus } = reasonModalAction;
    const descriptions: Record<string, string> = lang === 'fr'
      ? { interrupted: 'Travaux interrompus', abandoned: 'Chantier abandonne', completed: 'Chantier termine', team_changed: 'Changement d\'equipe' }
      : { interrupted: 'Work interrupted', abandoned: 'Work abandoned', completed: 'Work completed', team_changed: 'Team changed' };
    const newStatus = action === 'team_changed' ? (currentStatus || 'inProgress') : action;
    updateChantierStatusFn(chantierId, newStatus, action, descriptions[action] || action, reasonInput || undefined);
    setReasonModalAction(null);
    setReasonInput('');
  }, [reasonModalAction, reasonInput, lang, updateChantierStatusFn]);

  useEffect(() => {
    if (isLoggedIn) {
      loadChantiers();
      loadTechs();
      loadNotifications();
      loadPlanning();
    }
  }, [isLoggedIn, loadChantiers, loadTechs, loadNotifications, loadPlanning]);

  useRealtimeProjects(loadChantiers);
  useRealtimePlanning(handlePlanningOrChantierUpdate);
  useRealtimePlanningTechnicians(handlePlanningOrChantierUpdate);
  useRealtimeNotifications(loadNotifications, currentUser?.id);

  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    const loadPublicProjects = async () => {
      const { data, error } = await supabase
        .from('chantiers')
        .select('*')
        .eq('is_validated', true)
        .eq('is_public', true)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formattedProjects = data.map((chantier: any) => ({
          id: chantier.id,
          name: chantier.title,
          location: chantier.location,
          category: chantier.title,
          photo: '🏗️',
          rating: chantier.rating || 5,
          client: chantier.client_name || 'Client',
          description: chantier.description || '',
          photos: chantier.photos_after || [],
        }));
        setProjects(formattedProjects);
      }
    };

    if (isLoggedIn) {
      loadPublicProjects();

      const projectsChannel = supabase
        .channel('public_projects_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chantiers',
            filter: 'is_validated=eq.true',
          },
          () => {
            loadPublicProjects();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(projectsChannel);
      };
    }
  }, [isLoggedIn]);

  const handleAppointmentSubmit = async () => {
    if (!selectedDate || !selectedHour || !selectedMinute) {
      return;
    }

    const scheduledTime = `${selectedHour}:${selectedMinute}`;
    const serviceType = selectedService?.name || 'Service non spécifié';

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('appointments')
        .insert({
          user_id: user?.id || null,
          scheduled_date: selectedDate,
          scheduled_time: scheduledTime,
          service_type: serviceType,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating appointment:', error);
        alert(lang === 'fr' ? 'Erreur lors de la création du rendez-vous' : 'Error creating appointment');
        return;
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setScreen('home');
        setSelectedDate(null);
        setSelectedHour('');
        setSelectedMinute('');
        setRdvName('');
        setRdvPhone('');
        setSelectedService(null);
      }, 2000);
    } catch (err) {
      console.error('Exception creating appointment:', err);
      alert(lang === 'fr' ? 'Erreur lors de la création du rendez-vous' : 'Error creating appointment');
    }
  };

  const weekDays = Array.from({length:5},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return{day:d.toLocaleDateString(lang==='fr'?'fr-FR':'en-US',{weekday:'short'}),date:d.getDate()};});

  const handleReviewPhotoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setReviewPhotos([...reviewPhotos, e.target?.result as string]);
    };
    reader.readAsDataURL(file);
  };

  const Calendar = () => {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());

    const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

    const days = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const monthNames = getClientText('monthNames', lang);

    const prevMonth = () => {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    };

    const nextMonth = () => {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    };

    return (
      <div style={{background:C.card,borderRadius:'16px',padding:'15px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'15px'}}>
          <button onClick={prevMonth} style={{background:C.light,border:'none',borderRadius:'8px',padding:'8px 12px',cursor:'pointer',color:C.text}}>←</button>
          <h3 style={{margin:0,fontSize:'16px',color:C.text}}>{monthNames[currentMonth]} {currentYear}</h3>
          <button onClick={nextMonth} style={{background:C.light,border:'none',borderRadius:'8px',padding:'8px 12px',cursor:'pointer',color:C.text}}>→</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'5px',textAlign:'center'}}>
          {getClientText('weekDaysShort', lang).map((d:string,i:number)=><div key={i} style={{fontSize:'11px',fontWeight:'600',color:C.textSecondary,padding:'5px'}}>{d}</div>)}
          {Array.from({length:firstDay}).map((_,i)=><div key={`empty-${i}`}/>)}
          {Array.from({length:days}).map((_,i)=>{
            const day = i+1;
            const date = new Date(currentYear, currentMonth, day);
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
            const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            return (
              <button
                key={day}
                disabled={isPast}
                onClick={()=>setSelectedDate(date)}
                style={{
                  background:isSelected?C.secondary:C.card,
                  color:isSelected?'#FFF':isPast?'#999':C.text,
                  border:`1px solid ${isSelected?C.secondary:C.light}`,
                  borderRadius:'8px',
                  padding:'8px',
                  fontSize:'13px',
                  cursor:isPast?'not-allowed':'pointer',
                  opacity:isPast?0.4:1
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const ClientApp = () => {
    const Nav = () => (
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:C.card,padding:'10px',display:'flex',justifyContent:'space-around',boxShadow:`0 -4px 20px ${darkMode?'rgba(0,0,0,0.5)':'rgba(0,0,0,0.08)'}`,borderRadius:'20px 20px 0 0',zIndex:100}}>
        {[{i:'🏠',l:t.home,s:'home'},{i:'📋',l:t.quote,s:'devis'},{i:'📅',l:t.rdv,s:'rdv'},{i:'📊',l:t.tracking,s:'suivi'},{i:'💰',l:lang==='fr'?'Factures':lang==='en'?'Invoices':'الفواتير',s:'factures'},{i:'👤',l:t.profile,s:'profil'}].map(x=>(
          <button key={x.s} onClick={()=>setScreen(x.s)} style={{background:screen===x.s?C.light:'transparent',border:'none',cursor:'pointer',padding:'6px 8px',borderRadius:'12px',display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
            <span style={{fontSize:'18px'}}>{x.i}</span><span style={{fontSize:'8px',fontWeight:screen===x.s?'600':'400',color:screen===x.s?C.primary:C.textSecondary}}>{x.l}</span>
          </button>
        ))}
      </div>
    );

    if(screen==='home') return (
      <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
        <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',borderRadius:'0 0 25px 25px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'15px'}}>
            <div><p style={{color:'rgba(255,255,255,0.8)',fontSize:'12px',margin:0}}>{t.welcome} 👋</p><h2 style={{color:'#FFF',fontSize:'18px',margin:'5px 0 0'}}>{currentUser?.name}</h2></div>
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={()=>setDarkMode(!darkMode)} style={{background:'rgba(255,255,255,0.2)',border:'none',padding:'6px 10px',borderRadius:'8px',color:'#FFF',cursor:'pointer',fontSize:'16px'}}>{darkMode?'☀️':'🌙'}</button>
              <button onClick={()=>setLang(lang==='fr'?'en':lang==='en'?'ar':'fr')} style={{background:'rgba(255,255,255,0.2)',border:'none',padding:'6px 12px',borderRadius:'8px',color:'#FFF',cursor:'pointer',fontSize:'11px'}}>{lang==='fr'?'FR':lang==='en'?'EN':'AR'}</button>
            </div>
          </div>
        </div>
        <BroadcastBanner userRole="client" darkMode={darkMode} />
        <div style={{padding:'15px'}}>
          <div style={{background:C.danger,borderRadius:'16px',padding:'18px',marginBottom:'15px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <div><p style={{color:'#FFF',fontSize:'14px',fontWeight:'bold',margin:0}}>{t.emergencyHelp}</p></div>
              <a href="tel:+224610553255" style={{background:'#FFF',borderRadius:'50%',width:'45px',height:'45px',display:'flex',justifyContent:'center',alignItems:'center',fontSize:'24px',textDecoration:'none',cursor:'pointer'}}>📞</a>
            </div>
            <p style={{color:'rgba(255,255,255,0.9)',fontSize:'12px',margin:'0 0 10px'}}>{lang==='fr'?'Assistance disponible 24/7':'24/7 assistance available'}</p>
            <a href="tel:+224610553255" style={{display:'block',background:'#FFF',borderRadius:'12px',padding:'12px',marginBottom:'8px',textDecoration:'none',textAlign:'center'}}><span style={{color:C.danger,fontWeight:'bold',fontSize:'16px'}}>📞 +224 610 55 32 55</span></a>
            <a href="mailto:contact@tsdetfils.com" style={{display:'block',background:'rgba(255,255,255,0.2)',borderRadius:'12px',padding:'10px',textDecoration:'none',textAlign:'center'}}><span style={{color:'#FFF',fontSize:'13px'}}>✉️ contact@tsdetfils.com</span></a>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
            <button onClick={()=>setScreen('devis')} style={{background:C.secondary,border:'none',borderRadius:'16px',padding:'25px',cursor:'pointer'}}><div style={{fontSize:'32px',marginBottom:'8px'}}>📋</div><div style={{color:'#FFF',fontWeight:'bold',fontSize:'13px'}}>{t.requestQuote}</div></button>
            <button onClick={()=>setScreen('suivi')} style={{background:C.card,border:'none',borderRadius:'16px',padding:'25px',cursor:'pointer',boxShadow:'0 4px 15px rgba(0,0,0,0.08)'}}><div style={{fontSize:'32px',marginBottom:'8px'}}>🏗️</div><div style={{color:C.primary,fontWeight:'bold',fontSize:'13px'}}>{t.mySites}</div></button>
          </div>
          <div style={{marginBottom:'20px'}}>
            <button onClick={()=>setScreen('quotes-tracking')} style={{width:'100%',background:`linear-gradient(135deg,${C.primary},${C.secondary})`,border:'none',borderRadius:'16px',padding:'20px',cursor:'pointer',boxShadow:'0 4px 15px rgba(0,0,0,0.1)'}}><div style={{fontSize:'28px',marginBottom:'6px'}}>📊</div><div style={{color:'#FFF',fontWeight:'bold',fontSize:'14px'}}>{lang==='fr'?'Suivi de devis':lang==='en'?'Quote tracking':'تتبع عروض الأسعار'}</div></button>
          </div>
          <h3 style={{margin:'0 0 12px',fontSize:'16px',color:C.text}}>{t.ourServices}</h3>
          {services.map(s=>(
            <div key={s.id} onClick={()=>{setSelectedService(s);setShowServiceModal(true)}} style={{background:C.card,borderRadius:'14px',padding:'15px',marginBottom:'10px',display:'flex',alignItems:'center',gap:'15px',cursor:'pointer'}}>
              <div style={{width:'50px',height:'50px',borderRadius:'12px',background:darkMode?C.light:s.color,display:'flex',justifyContent:'center',alignItems:'center',fontSize:'24px'}}>{s.icon}</div>
              <div style={{flex:1}}><div style={{fontWeight:'600',fontSize:'14px',color:C.text}}>{s.name}</div><div style={{color:C.secondary,fontSize:'13px',marginTop:'3px'}}>{lang==='fr'?'À partir de':'From'} {s.price}</div></div>
              <span style={{color:C.textSecondary,fontSize:'18px'}}>→</span>
            </div>
          ))}

          <h3 style={{margin:'25px 0 12px',fontSize:'16px',color:C.text}}>⭐ {t.ourProjects}</h3>
          {projects.length === 0 ? (
            <div style={{background:C.card,borderRadius:'16px',padding:'40px 20px',textAlign:'center'}}>
              <div style={{fontSize:'48px',marginBottom:'12px'}}>🏗️</div>
              <div style={{fontSize:'16px',fontWeight:'600',color:C.text,marginBottom:'8px'}}>
                {lang==='fr'?'Aucune réalisation disponible':lang==='en'?'No projects available':'لا توجد مشاريع متاحة'}
              </div>
              <div style={{fontSize:'13px',color:C.textSecondary}}>
                {lang==='fr'?'Nos projets seront bientôt affichés ici':lang==='en'?'Our projects will be displayed here soon':'ستُعرض مشاريعنا هنا قريبًا'}
              </div>
            </div>
          ) : (
          <div style={{display:'flex',overflowX:'auto',gap:'12px',paddingBottom:'10px'}}>
            {projects.map(p=>(
              <div key={p.id} onClick={()=>{setSelectedProject(p);setShowProjectModal(true)}} style={{minWidth:'200px',background:C.card,borderRadius:'14px',padding:'15px',cursor:'pointer',boxShadow:'0 4px 15px rgba(0,0,0,0.08)'}}>
                <div style={{fontSize:'48px',textAlign:'center',marginBottom:'10px'}}>{p.photo}</div>
                <h4 style={{margin:'0 0 5px',fontSize:'14px',fontWeight:'600',color:C.text}}>{p.name}</h4>
                <p style={{margin:'0 0 8px',fontSize:'12px',color:C.textSecondary}}>📍 {p.location}</p>
                <div style={{background:C.light,borderRadius:'8px',padding:'6px',marginBottom:'8px',textAlign:'center'}}><span style={{fontSize:'11px',color:C.secondary,fontWeight:'600'}}>{p.category}</span></div>
                <Stars rating={p.rating} readonly size={14}/>
                <button style={{width:'100%',marginTop:'10px',background:C.light,border:`1px solid ${C.secondary}`,color:C.secondary,padding:'8px',borderRadius:'8px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>{t.viewDetails}</button>
              </div>
            ))}
          </div>
          )}
        </div>
        {showProjectModal&&selectedProject&&<div onClick={()=>{setShowProjectModal(false);setCurrentProjectImageIndex(0)}} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:200,padding:'20px',overflow:'auto'}}>
          <div onClick={(e)=>e.stopPropagation()} style={{background:C.card,borderRadius:'24px',padding:'25px',width:'100%',maxWidth:'600px',maxHeight:'90vh',overflow:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:'15px'}}>
              <h3 style={{margin:0,fontSize:'18px',color:C.text}}>{t.projectDetails}</h3>
              <button onClick={()=>{setShowProjectModal(false);setCurrentProjectImageIndex(0)}} style={{background:'transparent',border:'none',fontSize:'24px',cursor:'pointer',color:C.textSecondary}}>×</button>
            </div>
            {selectedProject.photos&&selectedProject.photos.length>0&&<div style={{position:'relative',marginBottom:'15px',borderRadius:'12px',overflow:'hidden'}}>
              <img src={selectedProject.photos[currentProjectImageIndex]} alt={selectedProject.name} style={{width:'100%',height:'200px',objectFit:'cover',display:'block'}}/>
              {selectedProject.photos.length>1&&<div style={{position:'absolute',bottom:'10px',left:0,right:0,display:'flex',justifyContent:'center',gap:'6px'}}>
                {selectedProject.photos.map((_:any,i:number)=><div key={i} onClick={(e)=>{e.stopPropagation();setCurrentProjectImageIndex(i)}} style={{width:'8px',height:'8px',borderRadius:'50%',background:i===currentProjectImageIndex?'#FFF':'rgba(255,255,255,0.5)',cursor:'pointer'}}/>)}
              </div>}
              {selectedProject.photos.length>1&&<>
                <button onClick={(e)=>{e.stopPropagation();setCurrentProjectImageIndex((currentProjectImageIndex-1+selectedProject.photos.length)%selectedProject.photos.length)}} style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,0.5)',border:'none',color:'#FFF',width:'32px',height:'32px',borderRadius:'50%',cursor:'pointer',fontSize:'18px'}}>‹</button>
                <button onClick={(e)=>{e.stopPropagation();setCurrentProjectImageIndex((currentProjectImageIndex+1)%selectedProject.photos.length)}} style={{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,0.5)',border:'none',color:'#FFF',width:'32px',height:'32px',borderRadius:'50%',cursor:'pointer',fontSize:'18px'}}>›</button>
              </>}
            </div>}
            <h4 style={{margin:'0 0 10px',fontSize:'16px',fontWeight:'600',color:C.text}}>{selectedProject.name}</h4>
            <div style={{marginBottom:'12px'}}><span style={{fontSize:'13px',color:C.textSecondary}}>📍 {selectedProject.location} • 👤 {selectedProject.client}</span></div>
            <div style={{background:C.light,borderRadius:'10px',padding:'10px',marginBottom:'12px',textAlign:'center'}}><span style={{fontSize:'13px',color:C.secondary,fontWeight:'600'}}>{t.category}: {selectedProject.category}</span></div>
            <div style={{marginBottom:'15px'}}><Stars rating={selectedProject.rating} readonly size={20}/><div style={{textAlign:'center',fontSize:'12px',color:C.textSecondary,marginTop:'5px'}}>{selectedProject.rating}/5 {t.stars}</div></div>
            <p style={{margin:'0 0 15px',fontSize:'13px',lineHeight:'1.6',color:C.textSecondary}}>{selectedProject.description}</p>
            <button onClick={()=>{setShowProjectModal(false);setCurrentProjectImageIndex(0)}} style={{width:'100%',background:`linear-gradient(90deg,${C.primary},${C.secondary})`,color:'#FFF',border:'none',padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:'pointer'}}>{t.close}</button>
          </div>
        </div>}
        {showServiceModal&&selectedService&&<div onClick={()=>setShowServiceModal(false)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:200,padding:'20px',overflow:'auto'}}>
          <div onClick={(e)=>e.stopPropagation()} style={{background:C.card,borderRadius:'24px',padding:'25px',width:'100%',maxWidth:'600px',maxHeight:'90vh',overflow:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:'15px'}}>
              <h3 style={{margin:0,fontSize:'18px',color:C.text}}>{t.services}</h3>
              <button onClick={()=>setShowServiceModal(false)} style={{background:'transparent',border:'none',fontSize:'24px',cursor:'pointer',color:C.textSecondary}}>×</button>
            </div>
            <div style={{textAlign:'center',fontSize:'64px',marginBottom:'15px'}}>{selectedService.icon}</div>
            <h4 style={{margin:'0 0 10px',fontSize:'16px',fontWeight:'600',color:C.text}}>{selectedService.name}</h4>
            <p style={{margin:'0 0 15px',fontSize:'13px',lineHeight:'1.6',color:C.textSecondary}}>{selectedService.description}</p>
            <div style={{background:C.light,borderRadius:'12px',padding:'12px',marginBottom:'15px'}}>
              <div style={{fontSize:'12px',color:C.textSecondary,marginBottom:'5px'}}>{t.priceRange}</div>
              <div style={{fontSize:'18px',fontWeight:'bold',color:C.secondary}}>{lang==='fr'?'À partir de':'From'} {selectedService.price}</div>
            </div>
            <h5 style={{margin:'0 0 10px',fontSize:'14px',fontWeight:'600',color:C.text}}>{t.subServices}</h5>
            <ul style={{margin:'0 0 15px',paddingLeft:'20px'}}>
              {selectedService.subServices.map((sub:string,i:number)=><li key={i} style={{fontSize:'13px',lineHeight:'1.8',color:C.text}}>{sub}</li>)}
            </ul>
            <button onClick={()=>{setShowServiceModal(false);setScreen('devis')}} style={{width:'100%',background:`linear-gradient(90deg,${C.primary},${C.secondary})`,color:'#FFF',border:'none',padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:'pointer',marginBottom:'10px'}}>{t.requestQuoteNow}</button>
            <button onClick={()=>setShowServiceModal(false)} style={{width:'100%',background:C.light,border:`1px solid ${C.secondary}`,color:C.secondary,padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:'pointer'}}>{t.close}</button>
          </div>
        </div>}
        <Nav/>
      </div>
    );

    if(screen==='devis') return (
      <AuthenticatedQuoteForm
        darkMode={darkMode}
        lang={lang as 'fr' | 'en' | 'ar'}
        currentUser={currentUser}
        onSuccess={() => setScreen('suivi')}
        onBack={() => setScreen('home')}
      />
    );

    if(screen==='rdv') return (
      <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
        <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'15px',display:'flex',alignItems:'center',gap:'12px'}}>
          <button onClick={()=>setScreen('home')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
          <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>{t.rdv}</h2>
        </div>
        <div style={{padding:'15px'}}>
          <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
            <label style={{fontWeight:'600',fontSize:'13px',marginBottom:'10px',display:'block',color:C.text}}>{t.selectService} *</label>
            <select style={{width:'100%',padding:'14px',borderRadius:'12px',border:`2px solid ${C.light}`,background:C.light,fontSize:'14px',color:C.text}}><option>{lang==='fr'?'Choisir...':'Choose...'}</option>{services.map(s=><option key={s.id}>{s.icon} {s.name}</option>)}</select>
          </div>

          <div style={{marginBottom:'12px'}}>
            <label style={{fontWeight:'600',fontSize:'13px',marginBottom:'10px',display:'block',color:C.text}}>📅 {t.selectDate} *</label>
            <Calendar />
          </div>

          {selectedDate && (
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <label style={{fontWeight:'600',fontSize:'13px',marginBottom:'10px',display:'block',color:C.text}}>⏰ {t.selectTime} *</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'15px'}}>
                <div>
                  <label style={{fontSize:'12px',color:C.textSecondary,marginBottom:'8px',display:'block'}}>{t.hour}</label>
                  <select
                    value={selectedHour}
                    onChange={(e)=>setSelectedHour(e.target.value)}
                    style={{width:'100%',padding:'12px',borderRadius:'10px',border:`2px solid ${C.light}`,background:C.light,fontSize:'14px',color:C.text,fontWeight:'600'}}
                  >
                    <option value="">{getClientText('dash', lang)}</option>
                    {['08','09','10','11','12','14','15','16','17'].map(h=><option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:'12px',color:C.textSecondary,marginBottom:'8px',display:'block'}}>{t.minutes}</label>
                  <select
                    value={selectedMinute}
                    onChange={(e)=>setSelectedMinute(e.target.value)}
                    style={{width:'100%',padding:'12px',borderRadius:'10px',border:`2px solid ${C.light}`,background:C.light,fontSize:'14px',color:C.text,fontWeight:'600'}}
                  >
                    <option value="">{getClientText('dash', lang)}</option>
                    {['00','15','30','45'].map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              {selectedHour && selectedMinute && (
                <div style={{background:C.light,borderRadius:'10px',padding:'12px',textAlign:'center'}}>
                  <div style={{fontSize:'12px',color:C.textSecondary,marginBottom:'5px'}}>{getClientText('selectedTime', lang)}:</div>
                  <div style={{fontSize:'24px',fontWeight:'bold',color:C.secondary}}>{selectedHour}:{selectedMinute}</div>
                </div>
              )}
            </div>
          )}

          <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'15px'}}>
            <label style={{fontWeight:'600',fontSize:'13px',marginBottom:'10px',display:'block',color:C.text}}>{t.yourDetails} *</label>
            <input value={rdvName} onChange={(e)=>setRdvName(e.target.value)} placeholder={t.name} style={{width:'100%',padding:'14px',borderRadius:'12px',border:`2px solid ${C.light}`,background:C.light,marginBottom:'10px',fontSize:'14px',boxSizing:'border-box',color:C.text}}/>
            <input value={rdvPhone} onChange={(e)=>setRdvPhone(e.target.value)} placeholder={t.phone} style={{width:'100%',padding:'14px',borderRadius:'12px',border:`2px solid ${C.light}`,background:C.light,fontSize:'14px',boxSizing:'border-box',color:C.text}}/>
          </div>

          <button
            disabled={!selectedDate || !selectedHour || !selectedMinute}
            onClick={handleAppointmentSubmit}
            style={{width:'100%',background:selectedDate && selectedHour && selectedMinute?`linear-gradient(90deg,${C.primary},${C.secondary})`:'#ccc',color:'#FFF',border:'none',padding:'16px',borderRadius:'14px',fontWeight:'bold',fontSize:'16px',cursor:selectedDate && selectedHour && selectedMinute?'pointer':'not-allowed'}}
          >
            {t.bookAppointment}
          </button>
        </div>
        <Nav/>
      </div>
    );

    if(screen==='quotes-tracking') return (
      <AuthenticatedQuoteTracker
        darkMode={darkMode}
        lang={lang as 'fr' | 'en' | 'ar'}
        currentUser={currentUser}
        onBack={() => setScreen('home')}
        onNewQuote={() => setScreen('devis')}
      />
    );

    if(screen==='suivi') {
      const getClientStatusLabel = (s: string) => {
        const labels: Record<string, string> = lang === 'fr'
          ? { planned: 'Planifie', inProgress: 'En cours', interrupted: 'Interrompu', abandoned: 'Abandonne', completed: 'Termine' }
          : { planned: 'Planned', inProgress: 'In Progress', interrupted: 'Interrupted', abandoned: 'Abandoned', completed: 'Completed' };
        return labels[s] || s;
      };
      const getClientStatusColor = (s: string) => {
        const colors: Record<string, string> = { planned: C.warning, inProgress: '#10B981', interrupted: '#f97316', abandoned: C.danger, completed: C.success };
        return colors[s] || C.textSecondary;
      };
      const getClientStatusIcon = (s: string) => {
        const icons: Record<string, string> = { planned: '📋', inProgress: '🔨', interrupted: '⏸️', abandoned: '🚫', completed: '✅' };
        return icons[s] || '📌';
      };
      return (
      <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
        <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',borderRadius:'0 0 25px 25px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <button onClick={()=>setScreen('home')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <div>
              <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>🏗️ {t.mySites}</h2>
              {chantiers.filter(c => c.statut === 'inProgress').length > 0 && (
                <p style={{margin:'4px 0 0',fontSize:'12px',color:'rgba(255,255,255,0.8)'}}>
                  {chantiers.filter(c => c.statut === 'inProgress').length} {lang==='fr'?'chantier(s) en cours':'active site(s)'}
                </p>
              )}
            </div>
          </div>
        </div>
        <div style={{padding:'15px'}}>
          {chantiers.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:'48px',marginBottom:'15px'}}>🏗️</div>
              <p style={{fontSize:'16px',color:C.text,fontWeight:'600',marginBottom:'8px'}}>{lang==='fr'?'Aucun chantier en cours':'No active sites'}</p>
              <p style={{fontSize:'13px',color:C.textSecondary}}>{lang==='fr'?'Vos chantiers apparaitront ici une fois planifies':'Your sites will appear here once scheduled'}</p>
            </div>
          ) : null}
          {chantiers.map(c=>{
            const tech=techs.find(x=>x.id===c.techId);
            const sColor = getClientStatusColor(c.statut);
            const isLive = c.statut === 'inProgress';
            return(
              <div key={c.id} onClick={()=>{setSelectedChantier(c);setShowChantierModal(true);}} style={{background:C.card,borderRadius:'16px',padding:'0',marginBottom:'14px',cursor:'pointer',transition:'transform 0.2s, box-shadow 0.2s',borderLeft:`4px solid ${sColor}`,overflow:'hidden',boxShadow: isLive ? `0 4px 20px ${sColor}25` : `0 2px 8px rgba(0,0,0,0.06)`}} onMouseEnter={(e)=>(e.currentTarget.style.transform='translateY(-2px)')} onMouseLeave={(e)=>(e.currentTarget.style.transform='translateY(0)')}>

                {isLive && (
                  <div style={{background:'linear-gradient(135deg, #10B981, #059669)',padding:'8px 18px',display:'flex',alignItems:'center',gap:'8px'}}>
                    <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#FFF',animation:'livePulse 1.5s ease-in-out infinite'}}/>
                    <span style={{color:'#FFF',fontSize:'12px',fontWeight:'700',letterSpacing:'0.5px'}}>{lang==='fr'?'EN COURS - SUIVI EN DIRECT':'IN PROGRESS - LIVE TRACKING'}</span>
                  </div>
                )}
                {c.statut === 'interrupted' && (
                  <div style={{background:'linear-gradient(135deg, #f97316, #ea580c)',padding:'8px 18px',display:'flex',alignItems:'center',gap:'8px'}}>
                    <span style={{fontSize:'12px'}}>⏸️</span>
                    <span style={{color:'#FFF',fontSize:'12px',fontWeight:'700'}}>{lang==='fr'?'CHANTIER INTERROMPU':'WORK PAUSED'}</span>
                  </div>
                )}

                <div style={{padding:'18px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
                    <div style={{flex:1}}>
                      <h4 style={{margin:0,fontSize:'16px',color:C.text,fontWeight:'700'}}>{c.titre}</h4>
                      <p style={{margin:'5px 0 0',fontSize:'13px',color:C.textSecondary}}>📍 {c.lieu}{tech ? ` • 👷 ${tech.nom?.split(' ')[0] || ''}` : ''}</p>
                    </div>
                    {!isLive && c.statut !== 'interrupted' && (
                      <span style={{background:`${sColor}15`,color:sColor,padding:'6px 14px',borderRadius:'20px',fontSize:'11px',fontWeight:'700',display:'flex',alignItems:'center',gap:'4px'}}>
                        {getClientStatusIcon(c.statut)} {getClientStatusLabel(c.statut)}
                      </span>
                    )}
                  </div>

                  {c.started_at && (
                    <p style={{margin:'0 0 10px',fontSize:'11px',color:C.textSecondary}}>
                      {lang==='fr'?'Demarre le':'Started on'} {safeDate(c.started_at, lang==='fr'?'fr':'en')}
                      {c.completed_at && (<> • {lang==='fr'?'Termine le':'Completed on'} {safeDate(c.completed_at, lang==='fr'?'fr':'en')}</>)}
                    </p>
                  )}

                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'8px',color:C.textSecondary}}>
                    <span>{t.progress}</span>
                    <span style={{fontWeight:'700',color: c.prog >= 75 ? C.success : c.prog >= 40 ? C.secondary : C.text}}>{c.prog}%</span>
                  </div>
                  <div style={{height:'10px',background:C.light,borderRadius:'5px',marginBottom:'14px',overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${c.prog}%`,background: c.prog >= 75 ? `linear-gradient(90deg, #10B981, #059669)` : `linear-gradient(90deg,${C.primary},${C.secondary})`,borderRadius:'5px',transition:'width 0.8s ease'}}/>
                  </div>

                  {c.photos.length>0&&(
                    <div style={{marginBottom:'14px'}}>
                      <p style={{fontSize:'12px',fontWeight:'600',marginBottom:'8px',color:C.text}}>{t.sitePhotos} ({c.photos.length}):</p>
                      <div style={{display:'flex',gap:'8px'}}>
                        {c.photos.slice(0,4).map((p: string, i: number)=>(
                          <div key={i} style={{width:'52px',height:'52px',borderRadius:'10px',overflow:'hidden',border:`2px solid ${C.light}`}}>
                            <img src={p} alt={`Site ${i+1}`} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                          </div>
                        ))}
                        {c.photos.length > 4 && (
                          <div style={{width:'52px',height:'52px',borderRadius:'10px',background:C.light,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:'700',color:C.textSecondary}}>
                            +{c.photos.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:'10px',borderTop:`1px solid ${C.light}`}}>
                    <span style={{fontSize:'13px',color:C.secondary,fontWeight:'600',display:'flex',alignItems:'center',gap:'4px'}}>
                      {lang==='fr'?'Voir le detail':'View details'} →
                    </span>
                    {c.statut==='completed'&&!c.avis&&<button onClick={(e)=>{e.stopPropagation();setSelectedChantier(c);setShowReviewModal(true);}} style={{background:C.gold,color:'#333',border:'none',padding:'8px 14px',borderRadius:'10px',fontWeight:'bold',cursor:'pointer',fontSize:'12px'}}>⭐ {t.leaveReview}</button>}
                  </div>
                  {c.avis&&<div style={{background:C.light,borderRadius:'10px',padding:'12px',marginTop:'10px'}}><Stars rating={c.avis.stars} readonly size={16}/>{c.avis.comment&&<p style={{margin:'10px 0 0',fontSize:'12px',color:C.textSecondary,fontStyle:'italic'}}>"{c.avis.comment}"</p>}</div>}
                </div>
              </div>
            );
          })}
        </div>
        {showChantierModal&&selectedChantier&&(
          <ClientChantierDetail chantier={selectedChantier} onClose={()=>{setShowChantierModal(false);loadChantiers();}} colors={C} lang={lang} />
        )}
        {showReviewModal&&<div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:200,padding:'20px',overflow:'auto'}}>
          <div style={{background:C.card,borderRadius:'24px',padding:'25px',width:'100%',maxWidth:'600px',maxHeight:'90vh',overflow:'auto'}}>
            <h3 style={{margin:'0 0 15px',fontSize:'18px',textAlign:'center',color:C.text}}>⭐ {t.writeReview}</h3>
            <p style={{fontSize:'13px',color:C.textSecondary,textAlign:'center',margin:'0 0 20px'}}>{selectedChantier?.titre}</p>
            <div style={{marginBottom:'20px'}}><p style={{fontSize:'12px',fontWeight:'600',textAlign:'center',marginBottom:'10px',color:C.text}}>{reviewStars}/5 {t.stars} *</p><Stars rating={reviewStars} setRating={setReviewStars} size={36}/></div>
            <textarea value={reviewComment} onChange={e=>setReviewComment(e.target.value)} placeholder={getClientText('comment200Chars', lang)} style={{width:'100%',padding:'12px',borderRadius:'10px',border:`2px solid ${C.light}`,background:C.light,minHeight:'80px',resize:'none',marginBottom:'8px',fontSize:'14px',boxSizing:'border-box',color:C.text}}/>
            <div style={{fontSize:'11px',color:C.textSecondary,marginBottom:'15px',textAlign:'right'}}>{reviewComment.length} {t.minChars}</div>
            <div style={{marginBottom:'15px'}}>
              <label style={{fontSize:'12px',fontWeight:'600',color:C.text,marginBottom:'8px',display:'block'}}>{t.optionalPhoto}</label>
              <input type="file" accept="image/*" id="review-photo-input" style={{display:'none'}} onChange={(e)=>{if(e.target.files&&e.target.files[0]&&reviewPhotos.length<3){handleReviewPhotoUpload(e.target.files[0])}}}/>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                {reviewPhotos.map((photo,i)=>(
                  <div key={i} style={{position:'relative',width:'60px',height:'60px',borderRadius:'8px',overflow:'hidden'}}>
                    <img src={photo} alt={`Review ${i+1}`} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    <button onClick={()=>setReviewPhotos(reviewPhotos.filter((_,idx)=>idx!==i))} style={{position:'absolute',top:'2px',right:'2px',background:C.danger,color:'#FFF',border:'none',borderRadius:'50%',width:'18px',height:'18px',fontSize:'10px',cursor:'pointer',fontWeight:'bold'}}>×</button>
                  </div>
                ))}
                {reviewPhotos.length<3&&<label htmlFor="review-photo-input" style={{width:'60px',height:'60px',borderRadius:'8px',background:C.light,border:`2px dashed ${C.secondary}`,display:'flex',justifyContent:'center',alignItems:'center',cursor:'pointer',fontSize:'24px'}}>📷</label>}
              </div>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>{setShowReviewModal(false);setReviewStars(0);setReviewComment('');setReviewPhotos([]);}} style={{flex:1,background:C.light,color:C.textSecondary,border:'none',padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:'pointer'}}>{t.cancel}</button>
              <button disabled={reviewStars===0||reviewComment.length<200} onClick={()=>{setShowReviewModal(false);setShowSuccess(true);setTimeout(()=>setShowSuccess(false),2000);setReviewStars(0);setReviewComment('');setReviewPhotos([]);}} style={{flex:1,background:(reviewStars>0&&reviewComment.length>=200)?`linear-gradient(90deg,${C.primary},${C.secondary})`:'#ccc',color:'#FFF',border:'none',padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:(reviewStars>0&&reviewComment.length>=200)?'pointer':'not-allowed'}}>{t.submitReview}</button>
            </div>
          </div>
        </div>}
        <Nav/>
      </div>
    );
    }

    if(screen==='factures') return (
      <ClientInvoicesScreen
        currentUser={currentUser}
        darkMode={darkMode}
        lang={lang}
        colors={C}
        onBack={()=>setScreen('home')}
        Nav={Nav}
      />
    );

    if(screen==='profil') return (
      <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
        <ProfileHeader
          userId={currentUser?.id || ''}
          userName={currentUser?.name || ''}
          userEmail={currentUser?.email}
          subtitle={lang === 'fr' ? 'Client' : 'Client'}
          profilePhoto={profilePhoto || null}
          coverPhoto={coverPhoto || null}
          onProfilePhotoChange={(url) => setProfilePhoto(url || '')}
          onCoverPhotoChange={(url) => setCoverPhoto(url || '')}
          onBack={() => setScreen('home')}
          darkMode={darkMode}
          lang={lang}
          primaryColor={C.primary}
          secondaryColor={C.secondary}
          langToggle={() => setLang(lang === 'fr' ? 'en' : lang === 'en' ? 'ar' : 'fr')}
          langLabel={lang === 'fr' ? 'FR' : lang === 'en' ? 'EN' : 'AR'}
        />
        <div style={{padding:'0 15px'}}>
          <div onClick={()=>setScreen('notifications')} style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>🔔</span><span style={{fontSize:'15px',color:C.text}}>{t.notifications}</span></div>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}><span style={{background:C.danger,color:'#FFF',padding:'4px 10px',borderRadius:'10px',fontSize:'12px'}}>{notifications.filter(n=>!n.read).length}</span><span style={{color:C.textSecondary}}>→</span></div>
          </div>
          <div onClick={()=>setScreen('history')} style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>🧾</span><span style={{fontSize:'15px',color:C.text}}>{t.history}</span></div>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}><span style={{background:C.secondary,color:'#FFF',padding:'4px 10px',borderRadius:'10px',fontSize:'12px'}}>{historyItems.length}</span><span style={{color:C.textSecondary}}>→</span></div>
          </div>
          <div onClick={()=>setScreen('payments')} style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>💳</span><span style={{fontSize:'15px',color:C.text}}>{t.payments}</span></div>
            <span style={{color:C.textSecondary}}>→</span>
          </div>
          <div onClick={()=>setScreen('settings')} style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>⚙️</span><span style={{fontSize:'15px',color:C.text}}>{t.settings}</span></div>
            <span style={{color:C.textSecondary}}>→</span>
          </div>
          <div onClick={()=>{setLegalScreen('menu');setScreen('legal');}} style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>📋</span><span style={{fontSize:'15px',color:C.text}}>{t.legalTerms}</span></div>
            <span style={{color:C.textSecondary}}>→</span>
          </div>
          <div onClick={()=>setScreen('faq')} style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>❓</span><span style={{fontSize:'15px',color:C.text}}>{t.faq}</span></div>
            <span style={{color:C.textSecondary}}>→</span>
          </div>
          <div onClick={()=>setScreen('chatbot')} style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>🤖</span><span style={{fontSize:'15px',color:C.text}}>{t.chatbot}</span></div>
            <span style={{color:C.textSecondary}}>→</span>
          </div>
          <button onClick={handleLogout} style={{width:'100%',marginTop:'15px',background:'#FEE2E2',color:C.danger,border:`2px solid ${C.danger}`,padding:'16px',borderRadius:'14px',fontWeight:'bold',cursor:'pointer'}}>🚪 {t.logout}</button>
        </div>
        <Nav/>
      </div>
    );

    if(screen==='notifications') return (
      <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
        <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
          <button onClick={()=>setScreen('profil')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
          <h2 style={{color:'#FFF',fontSize:'18px',margin:0,flex:1}}>🔔 {t.notifications}</h2>
          {notifications.some(n=>!n.read)&&<button onClick={()=>setNotifications(notifications.map(n=>({...n,read:true})))} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF',fontSize:'12px'}}>{t.markAllRead}</button>}
        </div>
        <div style={{padding:'15px'}}>
          {notifications.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 20px'}}><span style={{fontSize:'50px'}}>🔔</span><p style={{marginTop:'15px',color:C.textSecondary}}>{t.noNotifications}</p></div>
          ) : (
            notifications.map(n=>(
              <div key={n.id} onClick={()=>setSelectedNotification(n)} style={{background:C.card,borderRadius:'14px',padding:'15px',marginBottom:'10px',borderLeft:`4px solid ${n.type==='success'?C.success:n.type==='warning'?C.warning:C.secondary}`,opacity:n.read?0.6:1,cursor:'pointer'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                  <h4 style={{margin:0,fontSize:'14px',fontWeight:n.read?'400':'600',color:C.text}}>{n.title}</h4>
                  {!n.read&&<span style={{background:C.danger,width:'8px',height:'8px',borderRadius:'50%'}}/>}
                </div>
                <p style={{margin:'0 0 8px',fontSize:'13px',color:C.textSecondary}}>{n.message}</p>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:'11px',color:C.textSecondary}}>{n.date}</span>
                  {!n.read&&<button onClick={(e)=>{e.stopPropagation();setNotifications(notifications.map(x=>x.id===n.id?{...x,read:true}:x))}} style={{background:C.light,border:'none',padding:'6px 12px',borderRadius:'8px',fontSize:'11px',cursor:'pointer',color:C.text}}>{t.markAsRead}</button>}
                </div>
              </div>
            ))
          )}
        </div>
        {selectedNotification&&<div onClick={()=>setSelectedNotification(null)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:200,padding:'20px'}}>
          <div onClick={(e)=>e.stopPropagation()} style={{background:C.card,borderRadius:'24px',padding:'25px',width:'100%',maxWidth:'600px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:'15px'}}>
              <h3 style={{margin:0,fontSize:'18px',color:C.text}}>{selectedNotification.title}</h3>
              <button onClick={()=>setSelectedNotification(null)} style={{background:'transparent',border:'none',fontSize:'24px',cursor:'pointer',color:C.textSecondary}}>×</button>
            </div>
            <div style={{background:C.light,borderRadius:'12px',padding:'15px',marginBottom:'15px'}}>
              <p style={{margin:0,fontSize:'14px',lineHeight:'1.6',color:C.text}}>{selectedNotification.message}</p>
            </div>
            <div style={{fontSize:'12px',color:C.textSecondary,marginBottom:'15px'}}>📅 {selectedNotification.date}</div>
            {!selectedNotification.read&&<button onClick={()=>{setNotifications(notifications.map(x=>x.id===selectedNotification.id?{...x,read:true}:x));setSelectedNotification(null)}} style={{width:'100%',background:`linear-gradient(90deg,${C.primary},${C.secondary})`,color:'#FFF',border:'none',padding:'12px',borderRadius:'12px',fontWeight:'600',cursor:'pointer'}}>{t.markAsRead}</button>}
          </div>
        </div>}
        <Nav/>
      </div>
    );

    if(screen==='history') return (
      <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
        <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
          <button onClick={()=>setScreen('profil')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
          <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>🧾 {t.history}</h2>
        </div>
        <div style={{padding:'15px'}}>
          {historyItems.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 20px'}}><span style={{fontSize:'50px'}}>🧾</span><p style={{marginTop:'15px',color:C.textSecondary}}>{t.noHistory}</p></div>
          ) : (
            historyItems.map(h=>(
              <div key={h.id} onClick={()=>setSelectedHistoryItem(h)} style={{background:C.card,borderRadius:'14px',padding:'15px',marginBottom:'10px',cursor:'pointer',transition:'transform 0.2s'}} onMouseEnter={(e)=>e.currentTarget.style.transform='translateY(-2px)'} onMouseLeave={(e)=>e.currentTarget.style.transform='translateY(0)'}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'10px',background:C.light,display:'flex',justifyContent:'center',alignItems:'center',fontSize:'20px'}}>{h.type==='quote'?'📋':h.type==='payment'?'💰':'📅'}</div>
                    <div><h4 style={{margin:0,fontSize:'14px',color:C.text}}>{h.title}</h4><p style={{margin:'3px 0 0',fontSize:'11px',color:C.textSecondary}}>{h.date}</p></div>
                  </div>
                  <div style={{textAlign:'right'}}><span style={{background:`${C.success}20`,color:C.success,padding:'4px 10px',borderRadius:'10px',fontSize:'10px',fontWeight:'600'}}>✓ {h.status}</span><p style={{margin:'5px 0 0',fontSize:'13px',fontWeight:'bold',color:C.text}}>{h.amount}</p></div>
                </div>
              </div>
            ))
          )}
        </div>
        {selectedHistoryItem&&<div onClick={()=>setSelectedHistoryItem(null)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:200,padding:'20px'}}>
          <div onClick={(e)=>e.stopPropagation()} style={{background:C.card,borderRadius:'24px',padding:'25px',width:'100%',maxWidth:'600px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:'15px'}}>
              <h3 style={{margin:0,fontSize:'18px',color:C.text}}>{t.transactionDetails}</h3>
              <button onClick={()=>setSelectedHistoryItem(null)} style={{background:'transparent',border:'none',fontSize:'24px',cursor:'pointer',color:C.textSecondary}}>×</button>
            </div>
            <div style={{background:C.light,borderRadius:'12px',padding:'15px',marginBottom:'15px'}}>
              <div style={{marginBottom:'12px'}}><div style={{fontSize:'11px',color:C.textSecondary,marginBottom:'3px'}}>{lang==='fr'?'Type':'Type'}</div><div style={{fontSize:'14px',fontWeight:'600',color:C.text}}>{selectedHistoryItem.title}</div></div>
              <div style={{marginBottom:'12px'}}><div style={{fontSize:'11px',color:C.textSecondary,marginBottom:'3px'}}>{t.date}</div><div style={{fontSize:'14px',fontWeight:'600',color:C.text}}>{selectedHistoryItem.date}</div></div>
              <div style={{marginBottom:'12px'}}><div style={{fontSize:'11px',color:C.textSecondary,marginBottom:'3px'}}>{t.amount}</div><div style={{fontSize:'18px',fontWeight:'bold',color:C.secondary}}>{selectedHistoryItem.amount}</div></div>
              <div style={{marginBottom:'12px'}}><div style={{fontSize:'11px',color:C.textSecondary,marginBottom:'3px'}}>{t.status}</div><div><span style={{background:`${C.success}20`,color:C.success,padding:'6px 12px',borderRadius:'10px',fontSize:'12px',fontWeight:'600'}}>✓ {selectedHistoryItem.status}</span></div></div>
              <div><div style={{fontSize:'11px',color:C.textSecondary,marginBottom:'3px'}}>{t.referenceNumber}</div><div style={{fontSize:'13px',fontWeight:'600',color:C.text,fontFamily:'monospace'}}>REF-2024-{selectedHistoryItem.id.toString().padStart(6,'0')}</div></div>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button style={{flex:1,background:C.light,border:`1px solid ${C.secondary}`,color:C.secondary,padding:'12px',borderRadius:'12px',fontWeight:'600',cursor:'pointer'}}>📥 {t.download}</button>
              <button style={{flex:1,background:C.light,border:`1px solid ${C.secondary}`,color:C.secondary,padding:'12px',borderRadius:'12px',fontWeight:'600',cursor:'pointer'}}>🖨️ {t.print}</button>
            </div>
          </div>
        </div>}
        <Nav/>
      </div>
    );

    if(screen==='payments') return (
      <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
        <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
          <button onClick={()=>setScreen('profil')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
          <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>💳 {t.payments}</h2>
        </div>
        <div style={{padding:'15px'}}>
          <div style={{background:C.card,borderRadius:'16px',padding:'20px',marginBottom:'15px'}}>
            <h3 style={{margin:'0 0 15px',fontSize:'16px',color:C.text}}>{t.paymentMethods}</h3>
            <div onClick={()=>setPaymentMethod('orange')} style={{background:paymentMethod==='orange'?C.light:C.card,border:`2px solid ${paymentMethod==='orange'?C.secondary:C.light}`,borderRadius:'12px',padding:'15px',marginBottom:'10px',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'50px',height:'50px',borderRadius:'10px',background:'#FF6600',display:'flex',justifyContent:'center',alignItems:'center',fontSize:'24px',color:'#FFF',fontWeight:'bold'}}>OM</div>
              <div style={{flex:1}}><h4 style={{margin:0,fontSize:'15px',color:C.text}}>{t.orangeMoney}</h4><p style={{margin:'3px 0 0',fontSize:'12px',color:C.textSecondary}}>{getClientText('securePayment', lang)}</p></div>
              {paymentMethod==='orange'&&<span style={{color:C.secondary,fontSize:'20px'}}>✓</span>}
            </div>
            <div onClick={()=>setPaymentMethod('cash')} style={{background:paymentMethod==='cash'?C.light:C.card,border:`2px solid ${paymentMethod==='cash'?C.secondary:C.light}`,borderRadius:'12px',padding:'15px',marginBottom:'10px',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'50px',height:'50px',borderRadius:'10px',background:C.success,display:'flex',justifyContent:'center',alignItems:'center',fontSize:'24px'}}>💵</div>
              <div style={{flex:1}}><h4 style={{margin:0,fontSize:'15px',color:C.text}}>{t.cash}</h4><p style={{margin:'3px 0 0',fontSize:'12px',color:C.textSecondary}}>{getClientText('cashPaymentDesc', lang)}</p></div>
              {paymentMethod==='cash'&&<span style={{color:C.secondary,fontSize:'20px'}}>✓</span>}
            </div>
            <div onClick={()=>setPaymentMethod('bank')} style={{background:paymentMethod==='bank'?C.light:C.card,border:`2px solid ${paymentMethod==='bank'?C.secondary:C.light}`,borderRadius:'12px',padding:'15px',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'50px',height:'50px',borderRadius:'10px',background:C.primary,display:'flex',justifyContent:'center',alignItems:'center',fontSize:'24px'}}>🏦</div>
              <div style={{flex:1}}><h4 style={{margin:0,fontSize:'15px',color:C.text}}>{t.bankTransfer}</h4><p style={{margin:'3px 0 0',fontSize:'12px',color:C.textSecondary}}>{getClientText('bankTransferDesc', lang)}</p></div>
              {paymentMethod==='bank'&&<span style={{color:C.secondary,fontSize:'20px'}}>✓</span>}
            </div>
          </div>

          {paymentMethod==='orange' && (
            <div style={{background:C.card,borderRadius:'16px',padding:'20px',marginBottom:'15px'}}>
              <h3 style={{margin:'0 0 15px',fontSize:'16px',color:C.text}}>{t.orangeMoney}</h3>
              <div style={{background:C.light,borderRadius:'12px',padding:'15px',marginBottom:'15px'}}>
                <div style={{marginBottom:'12px'}}>
                  <div style={{fontSize:'12px',color:C.textSecondary,marginBottom:'3px'}}>{t.number}</div>
                  <a href="tel:+224610553255" style={{fontSize:'18px',fontWeight:'bold',color:C.secondary,textDecoration:'none'}}>+224 610 55 32 55</a>
                </div>
                <div>
                  <div style={{fontSize:'12px',color:C.textSecondary,marginBottom:'3px'}}>{t.merchantCode}</div>
                  <div style={{fontSize:'18px',fontWeight:'bold',color:C.secondary,fontFamily:'monospace'}}>687411</div>
                </div>
              </div>
              <label style={{display:'block',marginBottom:'10px'}}>
                <div style={{fontSize:'13px',color:C.text,marginBottom:'8px',fontWeight:'600'}}>{getClientText('uploadProof', lang)}</div>
                <input type="file" accept="image/*,.pdf" onChange={(e)=>{const file=e.target.files?.[0];if(file){const reader=new FileReader();reader.onload=(ev)=>setPaymentProofOrangeMoney(ev.target?.result as string);reader.readAsDataURL(file)}}} style={{width:'100%',padding:'12px',borderRadius:'10px',border:`2px solid ${C.light}`,background:C.light,color:C.text,fontSize:'13px',cursor:'pointer'}}/>
              </label>
              {paymentProofOrangeMoney&&<div style={{background:C.light,borderRadius:'10px',padding:'12px',marginTop:'10px'}}><div style={{fontSize:'12px',color:C.textSecondary,marginBottom:'5px'}}>{getClientText('paymentProof', lang)}</div><div style={{fontSize:'13px',color:C.success}}>✓ {getClientText('fileUploaded', lang)}</div></div>}
            </div>
          )}

          {paymentMethod==='cash' && (
            <div style={{background:C.card,borderRadius:'16px',padding:'20px',marginBottom:'15px'}}>
              <div style={{background:`${C.danger}20`,border:`2px solid ${C.danger}`,borderRadius:'12px',padding:'15px',marginBottom:'15px'}}>
                <div style={{display:'flex',alignItems:'start',gap:'12px'}}>
                  <span style={{fontSize:'24px'}}>⚠️</span>
                  <div>
                    <h4 style={{margin:'0 0 8px',fontSize:'14px',fontWeight:'bold',color:C.danger}}>IMPORTANT</h4>
                    <p style={{margin:'0 0 8px',fontSize:'13px',lineHeight:'1.6',color:C.text}}>{t.cashWarning}</p>
                    <p style={{margin:0,fontSize:'12px',fontWeight:'600',color:C.text}}>{t.requestReceipt}</p>
                  </div>
                </div>
              </div>
              <label style={{display:'block',marginBottom:'10px'}}>
                <div style={{fontSize:'13px',color:C.text,marginBottom:'8px',fontWeight:'600'}}>{getClientText('uploadProof', lang)}</div>
                <input type="file" accept="image/*,.pdf" onChange={(e)=>{const file=e.target.files?.[0];if(file){const reader=new FileReader();reader.onload=(ev)=>setPaymentProofCash(ev.target?.result as string);reader.readAsDataURL(file)}}} style={{width:'100%',padding:'12px',borderRadius:'10px',border:`2px solid ${C.light}`,background:C.light,color:C.text,fontSize:'13px',cursor:'pointer'}}/>
              </label>
              {paymentProofCash&&<div style={{background:C.light,borderRadius:'10px',padding:'12px',marginTop:'10px'}}><div style={{fontSize:'12px',color:C.textSecondary,marginBottom:'5px'}}>{t.paymentProof}</div><div style={{fontSize:'13px',color:C.success}}>✓ {lang==='fr'?'Fichier téléchargé':'File uploaded'}</div></div>}
            </div>
          )}

          {paymentMethod==='bank' && (
            <div style={{background:C.card,borderRadius:'16px',padding:'20px',marginBottom:'15px'}}>
              <h3 style={{margin:'0 0 15px',fontSize:'16px',color:C.text}}>{t.bankDetails}</h3>
              <div style={{background:C.light,borderRadius:'12px',padding:'15px',marginBottom:'15px'}}>
                <div style={{marginBottom:'12px'}}>
                  <div style={{fontSize:'12px',color:C.textSecondary,marginBottom:'3px'}}>{t.bank}</div>
                  <div style={{fontSize:'15px',fontWeight:'600',color:C.text}}>BICIGUI</div>
                </div>
                <div style={{marginBottom:'12px'}}>
                  <div style={{fontSize:'12px',color:C.textSecondary,marginBottom:'3px'}}>{t.iban}</div>
                  <div style={{fontSize:'15px',fontWeight:'600',color:C.text}}>GN123456789012345</div>
                </div>
                <div style={{marginBottom:'12px'}}>
                  <div style={{fontSize:'12px',color:C.textSecondary,marginBottom:'3px'}}>{t.beneficiary}</div>
                  <div style={{fontSize:'15px',fontWeight:'600',color:C.text}}>TSD et Fils SARL</div>
                </div>
                <div>
                  <div style={{fontSize:'12px',color:C.textSecondary,marginBottom:'3px'}}>{t.reference}</div>
                  <div style={{fontSize:'15px',fontWeight:'600',color:C.secondary}}>CONT-2024-{Math.floor(Math.random()*10000).toString().padStart(4,'0')}</div>
                </div>
              </div>
              <label style={{display:'block',marginBottom:'10px'}}>
                <div style={{fontSize:'13px',color:C.text,marginBottom:'8px',fontWeight:'600'}}>{getClientText('uploadProof', lang)}</div>
                <input type="file" accept="image/*,.pdf" onChange={(e)=>{const file=e.target.files?.[0];if(file){const reader=new FileReader();reader.onload=(ev)=>setPaymentProofBank(ev.target?.result as string);reader.readAsDataURL(file)}}} style={{width:'100%',padding:'12px',borderRadius:'10px',border:`2px solid ${C.light}`,background:C.light,color:C.text,fontSize:'13px',cursor:'pointer'}}/>
              </label>
              {paymentProofBank&&<div style={{background:C.light,borderRadius:'10px',padding:'12px',marginTop:'10px'}}><div style={{fontSize:'12px',color:C.textSecondary,marginBottom:'5px'}}>{getClientText('paymentProof', lang)}</div><div style={{fontSize:'13px',color:C.success}}>✓ {getClientText('fileUploaded', lang)}</div></div>}
            </div>
          )}

          <div style={{background:C.card,borderRadius:'16px',padding:'20px'}}>
            <h3 style={{margin:'0 0 15px',fontSize:'16px',color:C.text}}>{t.paymentTerms}</h3>
            <div style={{marginBottom:'12px',display:'flex',alignItems:'start',gap:'10px'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'10px',background:`${C.primary}20`,display:'flex',justifyContent:'center',alignItems:'center',fontSize:'18px',fontWeight:'bold',color:C.primary}}>65%</div>
              <div style={{flex:1}}><p style={{margin:0,fontSize:'14px',fontWeight:'600',color:C.text}}>{t.payment1}</p><p style={{margin:'3px 0 0',fontSize:'12px',color:C.textSecondary}}>{getClientText('paymentInitial', lang)}</p></div>
            </div>
            <div style={{marginBottom:'12px',display:'flex',alignItems:'start',gap:'10px'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'10px',background:`${C.secondary}20`,display:'flex',justifyContent:'center',alignItems:'center',fontSize:'18px',fontWeight:'bold',color:C.secondary}}>20%</div>
              <div style={{flex:1}}><p style={{margin:0,fontSize:'14px',fontWeight:'600',color:C.text}}>{t.payment2}</p><p style={{margin:'3px 0 0',fontSize:'12px',color:C.textSecondary}}>{getClientText('paymentIntermediate', lang)}</p></div>
            </div>
            <div style={{marginBottom:'12px',display:'flex',alignItems:'start',gap:'10px'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'10px',background:`${C.success}20`,display:'flex',justifyContent:'center',alignItems:'center',fontSize:'18px',fontWeight:'bold',color:C.success}}>15%</div>
              <div style={{flex:1}}><p style={{margin:0,fontSize:'14px',fontWeight:'600',color:C.text}}>{t.payment3}</p><p style={{margin:'3px 0 0',fontSize:'12px',color:C.textSecondary}}>{getClientText('paymentFinal', lang)}</p></div>
            </div>
            <div style={{background:`${C.warning}20`,borderRadius:'10px',padding:'12px',marginTop:'15px',display:'flex',alignItems:'center',gap:'10px'}}>
              <span style={{fontSize:'20px'}}>⚠️</span>
              <p style={{margin:0,fontSize:'12px',fontWeight:'600',color:C.warning}}>{t.nonNegotiable}</p>
            </div>
            <div onClick={()=>setPaymentEngagement(!paymentEngagement)} style={{marginTop:'20px',padding:'15px',background:paymentEngagement?`${C.success}20`:C.light,border:`2px solid ${paymentEngagement?C.success:C.light}`,borderRadius:'12px',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'24px',height:'24px',borderRadius:'6px',border:`2px solid ${paymentEngagement?C.success:C.textSecondary}`,background:paymentEngagement?C.success:'transparent',display:'flex',justifyContent:'center',alignItems:'center',flexShrink:0}}>
                {paymentEngagement&&<span style={{color:'#FFF',fontSize:'16px',fontWeight:'bold'}}>✓</span>}
              </div>
              <p style={{margin:0,fontSize:'13px',lineHeight:'1.5',color:C.text,fontWeight:paymentEngagement?'600':'400'}}>{t.paymentCommitment}</p>
            </div>
          </div>
        </div>
        <Nav/>
      </div>
    );

    if(screen==='settings') {
      if(settingsSubScreen==='notifications') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setSettingsSubScreen('')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>🔔 {t.notificationPreferences}</h2>
          </div>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'14px',padding:'18px',marginBottom:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'15px'}}>
                <div><span style={{fontSize:'15px',color:C.text}}>{getClientText('quoteNotifications', lang)}</span></div>
                <button style={{width:'50px',height:'28px',borderRadius:'14px',background:C.secondary,border:'none',cursor:'pointer',position:'relative'}}><div style={{width:'22px',height:'22px',borderRadius:'50%',background:'#FFF',position:'absolute',top:'3px',left:'25px'}}/></button>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'15px'}}>
                <div><span style={{fontSize:'15px',color:C.text}}>{getClientText('appointmentNotifications', lang)}</span></div>
                <button style={{width:'50px',height:'28px',borderRadius:'14px',background:C.secondary,border:'none',cursor:'pointer',position:'relative'}}><div style={{width:'22px',height:'22px',borderRadius:'50%',background:'#FFF',position:'absolute',top:'3px',left:'25px'}}/></button>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'15px'}}>
                <div><span style={{fontSize:'15px',color:C.text}}>{getClientText('paymentNotifications', lang)}</span></div>
                <button style={{width:'50px',height:'28px',borderRadius:'14px',background:C.secondary,border:'none',cursor:'pointer',position:'relative'}}><div style={{width:'22px',height:'22px',borderRadius:'50%',background:'#FFF',position:'absolute',top:'3px',left:'25px'}}/></button>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><span style={{fontSize:'15px',color:C.text}}>{getClientText('promoNotifications', lang)}</span></div>
                <button style={{width:'50px',height:'28px',borderRadius:'14px',background:C.light,border:'none',cursor:'pointer',position:'relative'}}><div style={{width:'22px',height:'22px',borderRadius:'50%',background:'#FFF',position:'absolute',top:'3px',left:'3px'}}/></button>
              </div>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(settingsSubScreen==='security') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setSettingsSubScreen('')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>🔐 {t.securitySettings}</h2>
          </div>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'14px',padding:'18px',marginBottom:'12px'}}>
              <h4 style={{margin:'0 0 15px',fontSize:'15px',color:C.text}}>{t.changePassword}</h4>
              <input type="password" placeholder={getClientText('currentPassword', lang)} style={{width:'100%',padding:'14px',borderRadius:'12px',border:`2px solid ${C.light}`,background:C.light,marginBottom:'10px',fontSize:'14px',boxSizing:'border-box',color:C.text}}/>
              <input type="password" placeholder={getClientText('newPassword', lang)} style={{width:'100%',padding:'14px',borderRadius:'12px',border:`2px solid ${C.light}`,background:C.light,marginBottom:'10px',fontSize:'14px',boxSizing:'border-box',color:C.text}}/>
              <input type="password" placeholder={getClientText('confirmPassword', lang)} style={{width:'100%',padding:'14px',borderRadius:'12px',border:`2px solid ${C.light}`,background:C.light,marginBottom:'15px',fontSize:'14px',boxSizing:'border-box',color:C.text}}/>
              <button style={{width:'100%',background:`linear-gradient(90deg,${C.primary},${C.secondary})`,color:'#FFF',border:'none',padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:'pointer'}}>{getClientText('update', lang)}</button>
            </div>
            <div style={{background:C.card,borderRadius:'14px',padding:'18px',marginBottom:'12px'}}>
              <h4 style={{margin:'0 0 15px',fontSize:'15px',color:C.text}}>{t.twoFactorAuth}</h4>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:'15px',borderBottom:`1px solid ${C.light}`}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{fontSize:'24px'}}>👤</span>
                  <div><h5 style={{margin:'0 0 3px',fontSize:'14px',color:C.text}}>{t.faceId2FA}</h5><p style={{margin:0,fontSize:'11px',color:C.textSecondary}}>{getClientText('facialRecognition', lang)}</p></div>
                </div>
                <button onClick={()=>setFaceIdEnabled(!faceIdEnabled)} style={{width:'50px',height:'28px',borderRadius:'14px',background:faceIdEnabled?C.secondary:C.light,border:'none',cursor:'pointer',position:'relative'}}><div style={{width:'22px',height:'22px',borderRadius:'50%',background:'#FFF',position:'absolute',top:'3px',left:faceIdEnabled?'25px':'3px',transition:'left 0.2s'}}/></button>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:'15px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{fontSize:'24px'}}>📱</span>
                  <div><h5 style={{margin:'0 0 3px',fontSize:'14px',color:C.text}}>{t.sms2FA}</h5><p style={{margin:0,fontSize:'11px',color:C.textSecondary}}>{getClientText('smsCode', lang)}</p></div>
                </div>
                <button onClick={()=>setSms2faEnabled(!sms2faEnabled)} style={{width:'50px',height:'28px',borderRadius:'14px',background:sms2faEnabled?C.secondary:C.light,border:'none',cursor:'pointer',position:'relative'}}><div style={{width:'22px',height:'22px',borderRadius:'50%',background:'#FFF',position:'absolute',top:'3px',left:sms2faEnabled?'25px':'3px',transition:'left 0.2s'}}/></button>
              </div>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(settingsSubScreen==='backup') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setSettingsSubScreen('')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>💾 {t.backupOptions}</h2>
          </div>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'14px',padding:'18px',marginBottom:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'15px'}}>
                <div><h4 style={{margin:'0 0 5px',fontSize:'15px',color:C.text}}>{t.autoBackup}</h4><p style={{margin:0,fontSize:'12px',color:C.textSecondary}}>{getClientText('dailyBackup', lang)}</p></div>
                <button style={{width:'50px',height:'28px',borderRadius:'14px',background:C.secondary,border:'none',cursor:'pointer',position:'relative'}}><div style={{width:'22px',height:'22px',borderRadius:'50%',background:'#FFF',position:'absolute',top:'3px',left:'25px'}}/></button>
              </div>
              <button style={{width:'100%',background:C.light,border:`2px solid ${C.secondary}`,color:C.secondary,padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:'pointer',marginTop:'10px'}}>📥 {t.exportData}</button>
            </div>
            <div style={{background:C.card,borderRadius:'14px',padding:'18px'}}>
              <h4 style={{margin:'0 0 10px',fontSize:'15px',color:C.text}}>{getClientText('lastBackup', lang)}</h4>
              <p style={{margin:0,fontSize:'13px',color:C.textSecondary}}>{new Date().toLocaleString(lang==='fr'?'fr-FR':'en-US')}</p>
            </div>
          </div>
          <Nav/>
        </div>
      );

      return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setScreen('profil')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>⚙️ {t.settings}</h2>
          </div>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'14px',padding:'18px',marginBottom:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><span style={{fontSize:'18px',marginRight:'10px'}}>{darkMode?'🌙':'☀️'}</span><span style={{fontSize:'15px',color:C.text}}>{darkMode?t.darkMode:t.lightMode}</span></div>
                <button onClick={()=>setDarkMode(!darkMode)} style={{width:'50px',height:'28px',borderRadius:'14px',background:darkMode?C.secondary:C.light,border:'none',cursor:'pointer',position:'relative'}}><div style={{width:'22px',height:'22px',borderRadius:'50%',background:'#FFF',position:'absolute',top:'3px',left:darkMode?'25px':'3px',transition:'left 0.3s'}}/></button>
              </div>
            </div>
            <div style={{background:C.card,borderRadius:'14px',padding:'18px',marginBottom:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><span style={{fontSize:'18px',marginRight:'10px'}}>🌍</span><span style={{fontSize:'15px',color:C.text}}>{t.language}</span></div>
                <button onClick={()=>setLang(lang==='fr'?'en':lang==='en'?'ar':'fr')} style={{background:C.light,border:'none',padding:'8px 15px',borderRadius:'10px',cursor:'pointer',fontWeight:'600',color:C.text}}>{lang==='fr'?'FR 🇫🇷':lang==='en'?'EN 🇬🇧':'AR 🇸🇦'}</button>
              </div>
            </div>
            <div
              onClick={()=>{console.log('Notifications button clicked, current screen:', screen, 'settingsSubScreen:', settingsSubScreen);setSettingsSubScreen('notifications');}}
              onMouseEnter={(e)=>e.currentTarget.style.transform='translateX(5px)'}
              onMouseLeave={(e)=>e.currentTarget.style.transform='translateX(0)'}
              style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',transition:'all 0.2s',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',userSelect:'none'}}
            >
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>🔔</span><span style={{fontSize:'15px',color:C.text,fontWeight:'500'}}>{t.notifications}</span></div>
              <span style={{color:C.textSecondary,fontSize:'20px'}}>→</span>
            </div>
            <div
              onClick={()=>{console.log('Security button clicked, current screen:', screen, 'settingsSubScreen:', settingsSubScreen);setSettingsSubScreen('security');}}
              onMouseEnter={(e)=>e.currentTarget.style.transform='translateX(5px)'}
              onMouseLeave={(e)=>e.currentTarget.style.transform='translateX(0)'}
              style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',transition:'all 0.2s',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',userSelect:'none'}}
            >
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>🔐</span><span style={{fontSize:'15px',color:C.text,fontWeight:'500'}}>{t.security}</span></div>
              <span style={{color:C.textSecondary,fontSize:'20px'}}>→</span>
            </div>
            <div
              onClick={()=>{console.log('Backup button clicked, current screen:', screen, 'settingsSubScreen:', settingsSubScreen);setSettingsSubScreen('backup');}}
              onMouseEnter={(e)=>e.currentTarget.style.transform='translateX(5px)'}
              onMouseLeave={(e)=>e.currentTarget.style.transform='translateX(0)'}
              style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',transition:'all 0.2s',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',userSelect:'none'}}
            >
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>💾</span><span style={{fontSize:'15px',color:C.text,fontWeight:'500'}}>{t.backup}</span></div>
              <span style={{color:C.textSecondary,fontSize:'20px'}}>→</span>
            </div>
          </div>
          <Nav/>
        </div>
      );
    }

    if(screen==='legal') {
      const legalMenuItems = [
        {i:'🔒',k:'privacy',l:t.privacyPolicy},
        {i:'📜',k:'terms',l:t.termsOfService},
        {i:'📅',k:'service',l:t.serviceTerms},
        {i:'💰',k:'payment',l:t.paymentTerms},
        {i:'🔄',k:'refund',l:t.refundPolicy},
        {i:'📍',k:'geo',l:t.geoPolicy},
        {i:'📷',k:'photo',l:t.photoPolicy},
        {i:'⚠️',k:'liability',l:getClientText('civilLiability', lang),sign:true},
        {i:'🚫',k:'noncompete',l:getClientText('nonCompetitionClause', lang),sign:true},
        {i:'🔐',k:'confidentiality',l:lang==='fr'?'Clause de confidentialité':'Confidentiality Clause',sign:true},
        {i:'🛡️',k:'dataprotection',l:lang==='fr'?'Protection des données':'Data Protection',sign:true},
        {i:'✅',k:'warranty',l:lang==='fr'?'Conditions de garantie':'Warranty Conditions',sign:true},
        {i:'🚪',k:'termination',l:lang==='fr'?'Clause de résiliation':'Termination Clause',sign:true},
        {i:'📞',k:'complaint',l:t.complaintPolicy},
        {i:'ℹ️',k:'about',l:t.aboutUs},
      ];

      const LegalHeader = ({title}:{title:string}) => (
        <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
          <button onClick={()=>setLegalScreen('menu')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
          <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>{title}</h2>
        </div>
      );

      const SectionTitle = ({icon,title}:{icon:string;title:string}) => (
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
          <span style={{fontSize:'20px'}}>{icon}</span>
          <h4 style={{margin:0,fontSize:'15px',fontWeight:'600',color:C.primary}}>{title}</h4>
        </div>
      );

      const Paragraph = ({children}:{children:React.ReactNode}) => (
        <p style={{margin:'0 0 12px',fontSize:'13px',lineHeight:'1.6',color:C.text}}>{children}</p>
      );

      const BulletList = ({items}:{items:string[]}) => (
        <ul style={{margin:'0 0 15px',paddingLeft:'20px'}}>
          {items.map((item,i)=><li key={i} style={{fontSize:'13px',lineHeight:'1.6',color:C.text,marginBottom:'6px'}}>{item}</li>)}
        </ul>
      );

      if(legalScreen==='menu') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setScreen('profil')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>📋 {t.legalTerms}</h2>
          </div>
          <div style={{padding:'15px'}}>
            {legalMenuItems.map((item,i)=>(
              <div
                key={i}
                onClick={()=>setLegalScreen(item.k)}
                onMouseEnter={(e)=>e.currentTarget.style.transform='translateX(5px)'}
                onMouseLeave={(e)=>e.currentTarget.style.transform='translateX(0)'}
                style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',transition:'all 0.2s',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}
              >
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>{item.i}</span><span style={{fontSize:'15px',color:C.text,fontWeight:'500'}}>{item.l}</span></div>
                <span style={{color:C.textSecondary,fontSize:'20px'}}>→</span>
              </div>
            ))}
            <div style={{background:C.card,borderRadius:'16px',padding:'20px',marginTop:'15px'}}>
              <div style={{textAlign:'center'}}><Logo size={100} /><p style={{margin:'10px 0 5px',fontSize:'13px',fontWeight:'600',color:C.text}}>TSD et Fils SARL</p><p style={{margin:0,fontSize:'12px',color:C.textSecondary}}>RCCM: GN.TCC.2024.A.12345</p><p style={{margin:'5px 0 0',fontSize:'12px',color:C.textSecondary}}>NIF: 123456789</p></div>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='privacy') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <LegalHeader title={`🔒 ${t.privacyPolicy}`}/>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="📊" title={lang==='fr'?'Données collectées':'Data Collected'}/>
              <Paragraph>{lang==='fr'?'Nous collectons les données suivantes pour assurer nos services:':'We collect the following data to provide our services:'}</Paragraph>
              <BulletList items={lang==='fr'?['Nom complet et prénom','Numéro de téléphone','Adresse email','Adresse physique (pour les interventions)','Photos de chantier (avant/pendant/après travaux)','Données de géolocalisation (uniquement pendant la recherche de technicien)','Historique des interventions et paiements']:['Full name','Phone number','Email address','Physical address (for interventions)','Site photos (before/during/after work)','Geolocation data (only during technician search)','Intervention and payment history']}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="🎯" title={lang==='fr'?'Finalité du traitement':'Purpose of Processing'}/>
              <BulletList items={lang==='fr'?['Prise de rendez-vous et gestion des interventions','Établissement de devis et facturation','Communication avec les clients et techniciens','Suivi qualité et satisfaction client','Amélioration de nos services']:['Appointment booking and intervention management','Quote preparation and billing','Communication with clients and technicians','Quality monitoring and customer satisfaction','Service improvement']}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="🔐" title={lang==='fr'?'Protection des données':'Data Protection'}/>
              <Paragraph>{lang==='fr'?'Vos données sont stockées de manière sécurisée sur des serveurs protégés. Nous utilisons le chiffrement SSL/TLS pour toutes les transmissions. Seuls les employés autorisés ont accès à vos informations personnelles.':'Your data is stored securely on protected servers. We use SSL/TLS encryption for all transmissions. Only authorized employees have access to your personal information.'}</Paragraph>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="🤝" title={lang==='fr'?'Partage des données':'Data Sharing'}/>
              <Paragraph>{lang==='fr'?'Vos données peuvent être partagées avec:':'Your data may be shared with:'}</Paragraph>
              <BulletList items={lang==='fr'?['Nos techniciens (pour les interventions)','Prestataires de paiement (Orange Money, banques)','Autorités compétentes (si requis par la loi)']:['Our technicians (for interventions)','Payment providers (Orange Money, banks)','Competent authorities (if required by law)']}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px'}}>
              <SectionTitle icon="✅" title={lang==='fr'?'Vos droits':'Your Rights'}/>
              <BulletList items={lang==='fr'?["Droit d'accès à vos données personnelles",'Droit de rectification des informations incorrectes','Droit de suppression de vos données','Droit de portabilité de vos données',"Droit d'opposition au traitement"]:['Right to access your personal data','Right to rectify incorrect information','Right to delete your data','Right to data portability','Right to object to processing']}/>
              <Paragraph>{lang==='fr'?'Pour exercer vos droits, contactez-nous à: privacy@tsdetfils.com':'To exercise your rights, contact us at: privacy@tsdetfils.com'}</Paragraph>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='terms') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <LegalHeader title={`📜 ${t.termsOfService}`}/>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="📝" title={lang==='fr'?'Objet':'Purpose'}/>
              <Paragraph>{lang==='fr'?"Les présentes conditions générales d'utilisation régissent l'utilisation de l'application TSD et Fils et les relations entre l'utilisateur (client ou technicien), l'application et TSD et Fils SARL.":"These terms of service govern the use of the TSD et Fils application and the relationships between the user (client or technician), the application, and TSD et Fils SARL."}</Paragraph>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="👤" title={lang==='fr'?"Responsabilités de l'utilisateur":"User Responsibilities"}/>
              <BulletList items={lang==='fr'?['Fournir des informations exactes et à jour','Maintenir la confidentialité de ses identifiants',"Utiliser l'application de manière légale et éthique",'Respecter les rendez-vous pris','Signaler tout problème ou dysfonctionnement']:["Provide accurate and up-to-date information","Maintain confidentiality of login credentials","Use the application legally and ethically","Respect scheduled appointments","Report any problems or malfunctions"]}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="🏢" title={lang==='fr'?"Responsabilités de TSD et Fils":"TSD et Fils Responsibilities"}/>
              <BulletList items={lang==='fr'?['Fournir des services de plomberie de qualité','Respecter les délais convenus','Garantir la qualification des techniciens',"Protéger les données personnelles","Répondre aux réclamations dans les meilleurs délais"]:["Provide quality plumbing services","Respect agreed deadlines","Guarantee technician qualifications","Protect personal data","Respond to complaints promptly"]}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="⚖️" title={lang==='fr'?'Limitation de responsabilité':'Limitation of Liability'}/>
              <Paragraph>{lang==='fr'?"TSD et Fils ne peut être tenu responsable des dommages indirects, pertes de données, ou interruptions de service indépendantes de sa volonté. En cas de litige, une solution amiable sera recherchée en priorité.":"TSD et Fils cannot be held responsible for indirect damages, data loss, or service interruptions beyond its control. In case of dispute, an amicable solution will be sought first."}</Paragraph>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="🚫" title={lang==='fr'?'Suspension de compte':'Account Suspension'}/>
              <Paragraph>{lang==='fr'?"TSD et Fils se réserve le droit de suspendre ou supprimer un compte en cas de:":"TSD et Fils reserves the right to suspend or delete an account in case of:"}</Paragraph>
              <BulletList items={lang==='fr'?['Violation des présentes conditions',"Utilisation frauduleuse de l'application",'Non-paiement répété','Comportement inapproprié envers les techniciens ou clients']:["Violation of these terms","Fraudulent use of the application","Repeated non-payment","Inappropriate behavior towards technicians or clients"]}/>
            </div>

            {legalSignature?.signed ? (
              <div style={{background:C.success+'20',borderRadius:'16px',padding:'18px',border:`2px solid ${C.success}`,textAlign:'center'}}>
                <div style={{fontSize:'48px',marginBottom:'10px'}}>✅</div>
                <h4 style={{margin:'0 0 8px',fontSize:'16px',color:C.success}}>{lang==='fr'?'Conditions acceptées':'Terms accepted'}</h4>
                <p style={{margin:0,fontSize:'13px',color:C.textSecondary}}>{t.signedOn} {legalSignature.date}</p>
              </div>
            ) : (
              <div style={{background:C.card,borderRadius:'16px',padding:'18px'}}>
                <div style={{marginBottom:'15px',display:'flex',alignItems:'start',gap:'10px',cursor:'pointer'}} onClick={()=>setTermsAccepted(!termsAccepted)}>
                  <div style={{width:'20px',height:'20px',borderRadius:'4px',border:`2px solid ${C.secondary}`,background:termsAccepted?C.secondary:'transparent',display:'flex',justifyContent:'center',alignItems:'center',flexShrink:0}}>
                    {termsAccepted&&<span style={{color:'#FFF',fontSize:'14px',fontWeight:'bold'}}>✓</span>}
                  </div>
                  <label style={{fontSize:'13px',color:C.text,cursor:'pointer'}}>{t.readAndAccept}</label>
                </div>
                <div style={{display:'flex',gap:'10px'}}>
                  <button onClick={()=>{setLegalSignature({signed:false,date:safeDate(new Date(), lang==='fr'?'fr':'en'),accepted:false});setLegalScreen('menu')}} style={{flex:1,background:'#FEE2E2',color:C.danger,border:`2px solid ${C.danger}`,padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:'pointer'}}>✗ {t.decline}</button>
                  <button disabled={!termsAccepted} onClick={()=>{setLegalSignature({signed:true,date:safeDate(new Date(), lang==='fr'?'fr':'en'),accepted:true});setShowSuccess(true);setTimeout(()=>setShowSuccess(false),2000)}} style={{flex:1,background:termsAccepted?`linear-gradient(90deg,${C.success},#27ae60)`:'#ccc',color:'#FFF',border:'none',padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:termsAccepted?'pointer':'not-allowed'}}>✓ {t.approve}</button>
                </div>
              </div>
            )}
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='service') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <LegalHeader title={`📅 ${t.serviceTerms}`}/>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="📅" title={lang==='fr'?'Réservation':'Booking'}/>
              <BulletList items={lang==='fr'?['Sélectionnez le type de service souhaité','Choisissez une date et un créneau horaire disponible','Décrivez votre problème ou besoin','Confirmez votre réservation',"Vous recevrez une confirmation par notification et SMS"]:["Select the desired service type","Choose an available date and time slot","Describe your problem or need","Confirm your booking","You will receive confirmation by notification and SMS"]}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="⏰" title={lang==='fr'?"Délais d'intervention":"Intervention Times"}/>
              <Paragraph>{lang==='fr'?'Nos délais standards sont:':'Our standard times are:'}</Paragraph>
              <BulletList items={lang==='fr'?['Urgences: dans les 2 heures (supplément applicable)','Interventions normales: selon disponibilité (24-48h)','Projets importants: planification sur mesure']:["Emergencies: within 2 hours (surcharge applies)","Normal interventions: based on availability (24-48h)","Major projects: custom scheduling"]}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="❌" title={lang==='fr'?'Annulation / Report':'Cancellation / Rescheduling'}/>
              <BulletList items={lang==='fr'?['Annulation gratuite 24h avant le RDV','Annulation tardive: frais de 50 000 GNF','Report possible une seule fois sans frais','Report tardif: frais de 25 000 GNF']:["Free cancellation 24h before appointment","Late cancellation: 50,000 GNF fee","Rescheduling possible once without charge","Late rescheduling: 25,000 GNF fee"]}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="🚨" title={lang==='fr'?'Retard ou Absence':'Delay or No-Show'}/>
              <Paragraph>{lang==='fr'?"En cas de retard du technicien supérieur à 30 minutes, vous serez notifié et pourrez reporter sans frais. En cas d'absence du client sans préavis, des frais de déplacement de 75 000 GNF seront facturés.":"If the technician is more than 30 minutes late, you will be notified and can reschedule for free. If the client is absent without notice, a travel fee of 75,000 GNF will be charged."}</Paragraph>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px'}}>
              <SectionTitle icon="💵" title={lang==='fr'?'Devis':'Quotes'}/>
              <Paragraph>{lang==='fr'?"Un devis détaillé vous sera présenté avant tout travail. Le devis est estimatif et peut varier de +/- 10% selon les conditions réelles du chantier. Tout dépassement supérieur nécessitera votre accord préalable.":"A detailed quote will be presented before any work. The quote is an estimate and may vary by +/- 10% depending on actual site conditions. Any greater excess will require your prior agreement."}</Paragraph>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='payment') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <LegalHeader title={`💰 ${t.paymentTerms}`}/>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="💳" title={lang==='fr'?'Moyens de paiement acceptés':'Accepted Payment Methods'}/>
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',background:C.light,borderRadius:'10px'}}>
                  <span style={{fontSize:'24px'}}>🟠</span>
                  <div><p style={{margin:0,fontSize:'14px',fontWeight:'600',color:C.text}}>Orange Money</p><p style={{margin:'2px 0 0',fontSize:'12px',color:C.textSecondary}}>+224 610 55 32 55</p></div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',background:C.light,borderRadius:'10px'}}>
                  <span style={{fontSize:'24px'}}>🏦</span>
                  <div><p style={{margin:0,fontSize:'14px',fontWeight:'600',color:C.text}}>{t.bankTransfer}</p><p style={{margin:'2px 0 0',fontSize:'12px',color:C.textSecondary}}>BICIGUI - TSD et Fils SARL</p></div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',background:C.light,borderRadius:'10px'}}>
                  <span style={{fontSize:'24px'}}>💵</span>
                  <div><p style={{margin:0,fontSize:'14px',fontWeight:'600',color:C.text}}>{t.cash}</p><p style={{margin:'2px 0 0',fontSize:'12px',color:C.textSecondary}}>{lang==='fr'?'Remise au technicien':'Payment to technician'}</p></div>
                </div>
              </div>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="📊" title={lang==='fr'?'Échéancier de paiement':'Payment Schedule'}/>
              <div style={{background:`${C.primary}10`,borderRadius:'12px',padding:'15px',marginBottom:'12px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
                  <div style={{width:'50px',height:'50px',borderRadius:'50%',background:C.primary,display:'flex',justifyContent:'center',alignItems:'center',color:'#FFF',fontWeight:'bold',fontSize:'16px'}}>65%</div>
                  <div><p style={{margin:0,fontSize:'14px',fontWeight:'600',color:C.text}}>{t.payment1}</p><p style={{margin:'3px 0 0',fontSize:'12px',color:C.textSecondary}}>{lang==='fr'?'Acompte obligatoire':'Required deposit'}</p></div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
                  <div style={{width:'50px',height:'50px',borderRadius:'50%',background:C.secondary,display:'flex',justifyContent:'center',alignItems:'center',color:'#FFF',fontWeight:'bold',fontSize:'16px'}}>20%</div>
                  <div><p style={{margin:0,fontSize:'14px',fontWeight:'600',color:C.text}}>{t.payment2}</p><p style={{margin:'3px 0 0',fontSize:'12px',color:C.textSecondary}}>{lang==='fr'?'Paiement intermédiaire':'Intermediate payment'}</p></div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <div style={{width:'50px',height:'50px',borderRadius:'50%',background:C.success,display:'flex',justifyContent:'center',alignItems:'center',color:'#FFF',fontWeight:'bold',fontSize:'16px'}}>15%</div>
                  <div><p style={{margin:0,fontSize:'14px',fontWeight:'600',color:C.text}}>{t.payment3}</p><p style={{margin:'3px 0 0',fontSize:'12px',color:C.textSecondary}}>{lang==='fr'?'Solde à la réception':'Balance upon completion'}</p></div>
                </div>
              </div>
              <div style={{background:`${C.warning}20`,borderRadius:'10px',padding:'12px',display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontSize:'20px'}}>⚠️</span>
                <p style={{margin:0,fontSize:'13px',fontWeight:'600',color:C.warning}}>{t.nonNegotiable}</p>
              </div>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px'}}>
              <SectionTitle icon="📅" title={lang==='fr'?'Délais de paiement':'Payment Deadlines'}/>
              <BulletList items={lang==='fr'?["Acompte: avant le début des travaux","Paiement intermédiaire: dans les 48h après l'état d'avancement","Solde: dans les 7 jours suivant la fin des travaux","Retard de paiement: pénalité de 2% dès le lendemain de l'échéance","Retard prolongé: +5% supplémentaire par semaine de retard (cumulatif)"]:["Deposit: before work begins","Intermediate payment: within 48h after progress report","Balance: within 7 days after work completion","Late payment: 2% penalty from the day after due date","Extended delay: +5% additional per week of delay (cumulative)"]}/>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='refund') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <LegalHeader title={`🔄 ${t.refundPolicy}`}/>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="✅" title={lang==='fr'?'Cas de remboursement':'Refund Cases'}/>
              <BulletList items={lang==='fr'?['Annulation par TSD et Fils','Travaux non conformes au devis (après expertise)','Double facturation (erreur technique)','Service non effectué']:['Cancellation by TSD et Fils','Work not conforming to quote (after assessment)','Double billing (technical error)','Service not performed']}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="❌" title={lang==='fr'?'Cas de non-remboursement':'Non-Refund Cases'}/>
              <BulletList items={lang==='fr'?['Annulation tardive par le client (moins de 24h)','Travaux effectués conformément au devis','Changement de décision du client après début des travaux','Dommages causés par le client ou tiers']:['Late cancellation by client (less than 24h)','Work performed according to quote','Client change of mind after work begins','Damages caused by client or third parties']}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="⏱️" title={lang==='fr'?'Délais de remboursement':'Refund Timeframes'}/>
              <Paragraph>{lang==='fr'?'Les remboursements sont effectués sous 7 à 14 jours ouvrés via le même moyen de paiement utilisé initialement.':'Refunds are processed within 7 to 14 business days via the same payment method originally used.'}</Paragraph>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px'}}>
              <SectionTitle icon="⚖️" title={lang==='fr'?'Litiges':'Disputes'}/>
              <Paragraph>{lang==='fr'?"En cas de litige sur un remboursement, une médiation sera proposée. Si aucun accord n'est trouvé, le tribunal compétent de Conakry sera saisi.":"In case of dispute over a refund, mediation will be offered. If no agreement is reached, the competent court of Conakry will be seized."}</Paragraph>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='geo') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <LegalHeader title={`📍 ${t.geoPolicy}`}/>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="🎯" title={lang==='fr'?'Pourquoi utilisons-nous la géolocalisation?':'Why do we use geolocation?'}/>
              <BulletList items={lang==='fr'?['Trouver le technicien le plus proche de vous','Calculer les frais de déplacement','Optimiser les itinéraires de nos équipes',"Fournir des estimations de temps d'arrivée précises"]:['Find the nearest technician to you','Calculate travel costs','Optimize our team routes','Provide accurate arrival time estimates']}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="⏰" title={lang==='fr'?'Quand est-elle active?':'When is it active?'}/>
              <Paragraph>{lang==='fr'?'La géolocalisation est utilisée UNIQUEMENT pendant:':'Geolocation is used ONLY during:'}</Paragraph>
              <BulletList items={lang==='fr'?['La recherche de technicien disponible','La confirmation de votre adresse','Le suivi en temps réel de votre technicien']:['Searching for available technician','Confirming your address','Real-time tracking of your technician']}/>
              <div style={{background:`${C.success}20`,borderRadius:'10px',padding:'12px',display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontSize:'20px'}}>✅</span>
                <p style={{margin:0,fontSize:'13px',color:C.success}}>{lang==='fr'?"Elle n'est JAMAIS active en arrière-plan":"It is NEVER active in the background"}</p>
              </div>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px'}}>
              <SectionTitle icon="🔒" title={lang==='fr'?'Comment la désactiver?':'How to disable it?'}/>
              <BulletList items={lang==='fr'?["Allez dans les paramètres de votre téléphone","Sélectionnez TSD et Fils dans la liste des applications","Désactivez l'autorisation de localisation","Vous pouvez aussi refuser lors de la demande d'autorisation"]:["Go to your phone settings","Select TSD et Fils in the app list","Disable location permission","You can also refuse when prompted for authorization"]}/>
              <div style={{background:`${C.warning}20`,borderRadius:'10px',padding:'12px',marginTop:'12px',display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontSize:'20px'}}>⚠️</span>
                <p style={{margin:0,fontSize:'12px',color:C.warning}}>{lang==='fr'?'Sans géolocalisation, certaines fonctionnalités seront limitées':'Without geolocation, some features will be limited'}</p>
              </div>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='photo') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <LegalHeader title={`📷 ${t.photoPolicy}`}/>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="📸" title={lang==='fr'?'Types de contenus':'Types of Content'}/>
              <Paragraph>{lang==='fr'?'Les utilisateurs peuvent envoyer:':'Users can send:'}</Paragraph>
              <BulletList items={lang==='fr'?['Photos de dégâts ou problèmes','Photos avant/pendant/après travaux','Vidéos explicatives','Messages texte et vocaux']:['Photos of damage or problems','Before/during/after work photos','Explanatory videos','Text and voice messages']}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="👤" title={lang==='fr'?'Propriété des contenus':'Content Ownership'}/>
              <Paragraph>{lang==='fr'?"Vous restez propriétaire de tous les contenus que vous envoyez. En les partageant, vous accordez à TSD et Fils une licence d'utilisation limitée pour:":"You remain the owner of all content you send. By sharing them, you grant TSD et Fils a limited license to use for:"}</Paragraph>
              <BulletList items={lang==='fr'?['Traitement de votre demande',"Établissement de devis","Communication avec les techniciens","Amélioration de nos services (anonymisé)"]:['Processing your request','Quote preparation','Communication with technicians','Service improvement (anonymized)']}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="🗄️" title={lang==='fr'?'Conservation':'Storage'}/>
              <BulletList items={lang==='fr'?['Photos de chantier: 2 ans après fin des travaux','Messages: 1 an','Données de facturation: 10 ans (obligation légale)','Vous pouvez demander la suppression anticipée']:['Site photos: 2 years after work completion','Messages: 1 year','Billing data: 10 years (legal requirement)','You can request early deletion']}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px'}}>
              <SectionTitle icon="🚫" title={lang==='fr'?'Contenus interdits':'Prohibited Content'}/>
              <BulletList items={lang==='fr'?['Contenus illégaux ou offensants','Informations personnelles de tiers','Contenus sans rapport avec les services','Spam ou publicité']:['Illegal or offensive content','Third party personal information','Content unrelated to services','Spam or advertising']}/>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='liability') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <LegalHeader title={`⚠️ ${t.liabilityClause}`}/>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="🏢" title={lang==='fr'?"Rôle de l'application":"Application Role"}/>
              <Paragraph>{lang==='fr'?"L'application TSD et Fils agit comme plateforme de mise en relation entre clients et techniciens qualifiés. Elle facilite la prise de rendez-vous, le suivi des interventions et les paiements.":"The TSD et Fils application acts as a platform connecting clients with qualified technicians. It facilitates appointment booking, intervention tracking, and payments."}</Paragraph>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="👷" title={lang==='fr'?'Responsabilité des travaux':'Work Responsibility'}/>
              <Paragraph>{lang==='fr'?'Les travaux de plomberie sont effectués sous la responsabilité directe des techniciens certifiés TSD et Fils. Chaque technicien est:':'Plumbing work is performed under the direct responsibility of certified TSD et Fils technicians. Each technician is:'}</Paragraph>
              <BulletList items={lang==='fr'?['Formé et certifié','Couvert par une assurance responsabilité civile professionnelle','Soumis à des contrôles qualité réguliers']:['Trained and certified','Covered by professional liability insurance','Subject to regular quality controls']}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="🛡️" title={lang==='fr'?'Garanties':'Warranties'}/>
              <BulletList items={lang==='fr'?['Garantie décennale sur les travaux de gros oeuvre','Garantie 2 ans sur les installations sanitaires','Garantie 1 an sur les réparations','SAV gratuit pendant 30 jours']:['10-year warranty on major works','2-year warranty on sanitary installations','1-year warranty on repairs','Free after-sales service for 30 days']}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px'}}>
              <SectionTitle icon="❌" title={lang==='fr'?'Exclusions de responsabilité':'Liability Exclusions'}/>
              <Paragraph>{lang==='fr'?'TSD et Fils ne peut être tenu responsable pour:':'TSD et Fils cannot be held responsible for:'}</Paragraph>
              <BulletList items={lang==='fr'?['Dommages préexistants non signalés','Modifications effectuées par le client après intervention','Utilisation inappropriée des installations','Force majeure (catastrophes naturelles, etc.)','Problèmes techniques de l\'application (bugs, pannes serveur)']:['Pre-existing unreported damages','Modifications made by client after intervention','Improper use of installations','Force majeure (natural disasters, etc.)','Application technical issues (bugs, server outages)']}/>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='noncompete') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <LegalHeader title={`🚫 ${t.nonCompete}`}/>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="📋" title={lang==='fr'?'Objet de la clause':'Purpose of Clause'}/>
              <Paragraph>{lang==='fr'?"La présente clause de non-concurrence vise à protéger les intérêts légitimes de TSD et Fils SARL et à préserver la confidentialité des informations commerciales et techniques.":"This non-competition clause aims to protect the legitimate interests of TSD et Fils SARL and preserve the confidentiality of commercial and technical information."}</Paragraph>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="🚫" title={lang==='fr'?'Engagements du Client':'Client Commitments'}/>
              <Paragraph>{lang==='fr'?"En utilisant nos services, le client s'engage à:":"By using our services, the client commits to:"}</Paragraph>
              <BulletList items={lang==='fr'?['Ne pas solliciter directement les techniciens TSD et Fils pour des travaux personnels en dehors de la plateforme','Ne pas divulguer les tarifs préférentiels ou informations commerciales obtenues','Ne pas reproduire ou copier les méthodes de travail propriétaires','Ne pas dénigrer publiquement TSD et Fils ou ses employés']:['Not directly soliciting TSD et Fils technicians for personal work outside the platform','Not disclosing preferential rates or commercial information obtained','Not reproducing or copying proprietary work methods','Not publicly disparaging TSD et Fils or its employees']}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="⏰" title={lang==='fr'?'Durée':'Duration'}/>
              <Paragraph>{lang==='fr'?"Cette clause reste en vigueur pendant toute la durée de la relation commerciale et pendant une période de 12 mois après la dernière intervention.":"This clause remains in effect throughout the commercial relationship and for a period of 12 months after the last intervention."}</Paragraph>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="📅" title={lang==='fr'?'Anniversaire du Contrat':'Contract Anniversary'}/>
              <Paragraph>{lang==='fr'?"La date de création de votre compte marque le début de votre relation contractuelle avec TSD et Fils. Cette date anniversaire est importante pour:":"Your account creation date marks the beginning of your contractual relationship with TSD et Fils. This anniversary date is important for:"}</Paragraph>
              <BulletList items={lang==='fr'?["Le calcul de votre ancienneté client","L'accès aux avantages fidélité","La révision annuelle des conditions tarifaires","Le renouvellement automatique des engagements"]:["Calculating your client seniority","Access to loyalty benefits","Annual review of pricing conditions","Automatic renewal of commitments"]}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px'}}>
              <SectionTitle icon="⚖️" title={lang==='fr'?'Sanctions':'Penalties'}/>
              <Paragraph>{lang==='fr'?"En cas de violation de cette clause, TSD et Fils se réserve le droit de:":"In case of violation of this clause, TSD et Fils reserves the right to:"}</Paragraph>
              <BulletList items={lang==='fr'?['Suspendre immédiatement le compte client','Réclamer des dommages et intérêts','Engager des poursuites judiciaires','Facturer une pénalité contractuelle de 5 000 000 GNF']:['Immediately suspend the client account','Claim damages and interest','Initiate legal proceedings','Invoice a contractual penalty of 5,000,000 GNF']}/>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='confidentiality') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <LegalHeader title={`🔐 ${lang==='fr'?'Clause de confidentialité':'Confidentiality Clause'}`}/>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="🔐" title={lang==='fr'?'Objet':'Purpose'}/>
              <Paragraph>{lang==='fr'?"La présente clause vise à protéger toutes les informations confidentielles échangées entre le client et TSD et Fils.":"This clause aims to protect all confidential information exchanged between the client and TSD et Fils."}</Paragraph>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="📋" title={lang==='fr'?'Informations protégées':'Protected Information'}/>
              <BulletList items={lang==='fr'?['Données personnelles du client','Informations sur les installations','Détails des devis et factures','Photos des chantiers','Communications privées']:['Client personal data','Installation information','Quote and invoice details','Site photos','Private communications']}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="🔒" title={lang==='fr'?'Engagements':'Commitments'}/>
              <BulletList items={lang==='fr'?['Ne pas divulguer les informations à des tiers','Utiliser les données uniquement dans le cadre des services','Protéger les accès aux informations','Signaler toute violation de confidentialité']:['Not disclose information to third parties','Use data only within the scope of services','Protect access to information','Report any confidentiality breach']}/>
            </div>
            {legalClauses.confidentiality?.signed ? (
              <div style={{background:C.success+'20',borderRadius:'16px',padding:'18px',border:`2px solid ${C.success}`,textAlign:'center'}}>
                <div style={{fontSize:'48px',marginBottom:'10px'}}>✅</div>
                <h4 style={{margin:'0 0 8px',fontSize:'16px',color:C.success}}>{lang==='fr'?'Clause signée':'Clause signed'}</h4>
                <p style={{margin:0,fontSize:'13px',color:C.textSecondary}}>{lang==='fr'?'Signé le':'Signed on'} {legalClauses.confidentiality.date}</p>
              </div>
            ) : (
              <div style={{display:'flex',gap:'10px'}}>
                <button onClick={()=>setLegalScreen('menu')} style={{flex:1,background:'#FEE2E2',color:C.danger,border:`2px solid ${C.danger}`,padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:'pointer'}}>✗ {lang==='fr'?'Refuser':'Decline'}</button>
                <button onClick={()=>{setLegalClauses({...legalClauses,confidentiality:{signed:true,date:safeDate(new Date(), lang==='fr'?'fr':'en')}});setShowSuccess(true);setTimeout(()=>setShowSuccess(false),2000)}} style={{flex:1,background:`linear-gradient(90deg,${C.success},#27ae60)`,color:'#FFF',border:'none',padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:'pointer'}}>✓ {lang==='fr'?'Approuver':'Approve'}</button>
              </div>
            )}
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='dataprotection') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <LegalHeader title={`🛡️ ${lang==='fr'?'Protection des données':'Data Protection'}`}/>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="🛡️" title={lang==='fr'?'Vos droits':'Your Rights'}/>
              <BulletList items={lang==='fr'?['Droit d\'accès à vos données','Droit de rectification','Droit à l\'effacement','Droit à la portabilité','Droit d\'opposition']:['Right to access your data','Right to rectification','Right to erasure','Right to data portability','Right to object']}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="🔐" title={lang==='fr'?'Sécurité':'Security'}/>
              <BulletList items={lang==='fr'?['Chiffrement SSL/TLS','Serveurs sécurisés','Accès restreint','Audits réguliers']:['SSL/TLS encryption','Secure servers','Restricted access','Regular audits']}/>
            </div>
            {legalClauses.dataprotection?.signed ? (
              <div style={{background:C.success+'20',borderRadius:'16px',padding:'18px',border:`2px solid ${C.success}`,textAlign:'center'}}>
                <div style={{fontSize:'48px',marginBottom:'10px'}}>✅</div>
                <h4 style={{margin:'0 0 8px',fontSize:'16px',color:C.success}}>{lang==='fr'?'Clause signée':'Clause signed'}</h4>
                <p style={{margin:0,fontSize:'13px',color:C.textSecondary}}>{lang==='fr'?'Signé le':'Signed on'} {legalClauses.dataprotection.date}</p>
              </div>
            ) : (
              <div style={{display:'flex',gap:'10px'}}>
                <button onClick={()=>setLegalScreen('menu')} style={{flex:1,background:'#FEE2E2',color:C.danger,border:`2px solid ${C.danger}`,padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:'pointer'}}>✗ {lang==='fr'?'Refuser':'Decline'}</button>
                <button onClick={()=>{setLegalClauses({...legalClauses,dataprotection:{signed:true,date:safeDate(new Date(), lang==='fr'?'fr':'en')}});setShowSuccess(true);setTimeout(()=>setShowSuccess(false),2000)}} style={{flex:1,background:`linear-gradient(90deg,${C.success},#27ae60)`,color:'#FFF',border:'none',padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:'pointer'}}>✓ {lang==='fr'?'Approuver':'Approve'}</button>
              </div>
            )}
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='warranty') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <LegalHeader title={`✅ ${lang==='fr'?'Conditions de garantie':'Warranty Conditions'}`}/>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="✅" title={lang==='fr'?'Garanties offertes':'Warranties Offered'}/>
              <BulletList items={lang==='fr'?['Garantie décennale sur gros oeuvre','Garantie 2 ans sur installations','Garantie 1 an sur réparations','SAV gratuit 30 jours']:['10-year warranty on major works','2-year warranty on installations','1-year warranty on repairs','Free after-sales 30 days']}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="❌" title={lang==='fr'?'Exclusions':'Exclusions'}/>
              <BulletList items={lang==='fr'?['Dommages causés par le client','Usage anormal','Modifications non autorisées','Force majeure']:['Damages caused by client','Abnormal use','Unauthorized modifications','Force majeure']}/>
            </div>
            {legalClauses.warranty?.signed ? (
              <div style={{background:C.success+'20',borderRadius:'16px',padding:'18px',border:`2px solid ${C.success}`,textAlign:'center'}}>
                <div style={{fontSize:'48px',marginBottom:'10px'}}>✅</div>
                <h4 style={{margin:'0 0 8px',fontSize:'16px',color:C.success}}>{lang==='fr'?'Clause signée':'Clause signed'}</h4>
                <p style={{margin:0,fontSize:'13px',color:C.textSecondary}}>{lang==='fr'?'Signé le':'Signed on'} {legalClauses.warranty.date}</p>
              </div>
            ) : (
              <div style={{display:'flex',gap:'10px'}}>
                <button onClick={()=>setLegalScreen('menu')} style={{flex:1,background:'#FEE2E2',color:C.danger,border:`2px solid ${C.danger}`,padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:'pointer'}}>✗ {lang==='fr'?'Refuser':'Decline'}</button>
                <button onClick={()=>{setLegalClauses({...legalClauses,warranty:{signed:true,date:safeDate(new Date(), lang==='fr'?'fr':'en')}});setShowSuccess(true);setTimeout(()=>setShowSuccess(false),2000)}} style={{flex:1,background:`linear-gradient(90deg,${C.success},#27ae60)`,color:'#FFF',border:'none',padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:'pointer'}}>✓ {lang==='fr'?'Approuver':'Approve'}</button>
              </div>
            )}
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='termination') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <LegalHeader title={`🚪 ${lang==='fr'?'Clause de résiliation':'Termination Clause'}`}/>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="🚪" title={lang==='fr'?'Conditions de résiliation':'Termination Conditions'}/>
              <BulletList items={lang==='fr'?['Résiliation possible à tout moment','Préavis de 30 jours recommandé','Solde de tout compte à régler','Restitution des équipements si applicable']:['Termination possible at any time','30-day notice recommended','Outstanding balance to be settled','Equipment return if applicable']}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="⚠️" title={lang==='fr'?'Conséquences':'Consequences'}/>
              <BulletList items={lang==='fr'?['Fin des services actifs','Archivage des données 5 ans','Fin des garanties en cours','Facturation des travaux réalisés']:['End of active services','Data archived for 5 years','End of current warranties','Billing for completed work']}/>
            </div>
            {legalClauses.termination?.signed ? (
              <div style={{background:C.success+'20',borderRadius:'16px',padding:'18px',border:`2px solid ${C.success}`,textAlign:'center'}}>
                <div style={{fontSize:'48px',marginBottom:'10px'}}>✅</div>
                <h4 style={{margin:'0 0 8px',fontSize:'16px',color:C.success}}>{lang==='fr'?'Clause signée':'Clause signed'}</h4>
                <p style={{margin:0,fontSize:'13px',color:C.textSecondary}}>{lang==='fr'?'Signé le':'Signed on'} {legalClauses.termination.date}</p>
              </div>
            ) : (
              <div style={{display:'flex',gap:'10px'}}>
                <button onClick={()=>setLegalScreen('menu')} style={{flex:1,background:'#FEE2E2',color:C.danger,border:`2px solid ${C.danger}`,padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:'pointer'}}>✗ {lang==='fr'?'Refuser':'Decline'}</button>
                <button onClick={()=>{setLegalClauses({...legalClauses,termination:{signed:true,date:safeDate(new Date(), lang==='fr'?'fr':'en')}});setShowSuccess(true);setTimeout(()=>setShowSuccess(false),2000)}} style={{flex:1,background:`linear-gradient(90deg,${C.success},#27ae60)`,color:'#FFF',border:'none',padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:'pointer'}}>✓ {lang==='fr'?'Approuver':'Approve'}</button>
              </div>
            )}
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='complaint') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <LegalHeader title={`📞 ${t.complaintPolicy}`}/>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="📱" title={lang==='fr'?'Nous contacter':'Contact Us'}/>
              <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                <a href="tel:+224610553255" style={{display:'flex',alignItems:'center',gap:'12px',padding:'14px',background:C.light,borderRadius:'12px',textDecoration:'none'}}>
                  <span style={{fontSize:'24px'}}>📞</span>
                  <div><p style={{margin:0,fontSize:'14px',fontWeight:'600',color:C.text}}>+224 610 55 32 55</p><p style={{margin:'2px 0 0',fontSize:'12px',color:C.textSecondary}}>{lang==='fr'?'Lun-Sam: 8h-18h':'Mon-Sat: 8am-6pm'}</p></div>
                </a>
                <a href="mailto:contact@tsdetfils.com" style={{display:'flex',alignItems:'center',gap:'12px',padding:'14px',background:C.light,borderRadius:'12px',textDecoration:'none'}}>
                  <span style={{fontSize:'24px'}}>📧</span>
                  <div><p style={{margin:0,fontSize:'14px',fontWeight:'600',color:C.text}}>contact@tsdetfils.com</p><p style={{margin:'2px 0 0',fontSize:'12px',color:C.textSecondary}}>{lang==='fr'?'Réponse sous 24-48h':'Response within 24-48h'}</p></div>
                </a>
                <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'14px',background:C.light,borderRadius:'12px'}}>
                  <span style={{fontSize:'24px'}}>📍</span>
                  <div><p style={{margin:0,fontSize:'14px',fontWeight:'600',color:C.text}}>Conakry, Guinée</p><p style={{margin:'2px 0 0',fontSize:'12px',color:C.textSecondary}}>Kaloum, Avenue de la République</p></div>
                </div>
              </div>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="⏰" title={lang==='fr'?'Délais de réponse':'Response Times'}/>
              <BulletList items={lang==='fr'?['Demandes urgentes: 2-4 heures','Questions générales: 24-48 heures','Réclamations: 48-72 heures','Demandes de remboursement: 5-7 jours ouvrés']:['Urgent requests: 2-4 hours','General questions: 24-48 hours','Complaints: 48-72 hours','Refund requests: 5-7 business days']}/>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px'}}>
              <SectionTitle icon="📝" title={lang==='fr'?'Procédure de réclamation':'Complaint Procedure'}/>
              <BulletList items={lang==='fr'?['1. Contactez notre service client','2. Décrivez votre problème avec détails',"3. Fournissez votre numéro de commande/intervention",'4. Un conseiller vous recontactera','5. Suivi de votre dossier par email/SMS']:['1. Contact our customer service','2. Describe your problem in detail','3. Provide your order/intervention number','4. An advisor will contact you back','5. Track your case by email/SMS']}/>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='about') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <LegalHeader title={`ℹ️ ${t.aboutUs}`}/>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'20px',marginBottom:'12px',textAlign:'center'}}>
              <Logo size={140}/>
              <h3 style={{margin:'15px 0 8px',fontSize:'18px',color:C.text}}>TSD et Fils SARL</h3>
              <p style={{margin:0,fontSize:'14px',color:C.secondary,fontStyle:'italic'}}>{t.slogan}</p>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="🎯" title={lang==='fr'?'Notre Mission':'Our Mission'}/>
              <Paragraph>{lang==='fr'?"Fournir des services de plomberie de qualité européenne en Guinée, avec professionnalisme, ponctualité et transparence. Nous nous engageons à former les meilleurs techniciens locaux et à utiliser des matériaux de première qualité.":"Provide European-quality plumbing services in Guinea, with professionalism, punctuality, and transparency. We are committed to training the best local technicians and using top-quality materials."}</Paragraph>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <SectionTitle icon="📊" title={lang==='fr'?'Nos Chiffres':'Our Numbers'}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div style={{background:C.light,borderRadius:'12px',padding:'15px',textAlign:'center'}}><p style={{margin:0,fontSize:'24px',fontWeight:'bold',color:C.primary}}>500+</p><p style={{margin:'5px 0 0',fontSize:'12px',color:C.textSecondary}}>{lang==='fr'?'Clients satisfaits':'Satisfied clients'}</p></div>
                <div style={{background:C.light,borderRadius:'12px',padding:'15px',textAlign:'center'}}><p style={{margin:0,fontSize:'24px',fontWeight:'bold',color:C.primary}}>15+</p><p style={{margin:'5px 0 0',fontSize:'12px',color:C.textSecondary}}>{lang==='fr'?'Techniciens qualifiés':'Qualified technicians'}</p></div>
                <div style={{background:C.light,borderRadius:'12px',padding:'15px',textAlign:'center'}}><p style={{margin:0,fontSize:'24px',fontWeight:'bold',color:C.primary}}>98%</p><p style={{margin:'5px 0 0',fontSize:'12px',color:C.textSecondary}}>{lang==='fr'?'Satisfaction client':'Customer satisfaction'}</p></div>
                <div style={{background:C.light,borderRadius:'12px',padding:'15px',textAlign:'center'}}><p style={{margin:0,fontSize:'24px',fontWeight:'bold',color:C.primary}}>5+</p><p style={{margin:'5px 0 0',fontSize:'12px',color:C.textSecondary}}>{lang==='fr'?"Années d'expérience":'Years experience'}</p></div>
              </div>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px'}}>
              <SectionTitle icon="🏢" title={lang==='fr'?'Informations légales':'Legal Information'}/>
              <div style={{fontSize:'13px',color:C.text,lineHeight:'1.8'}}>
                <p style={{margin:'0 0 8px'}}><strong>Raison sociale:</strong> TSD et Fils SARL</p>
                <p style={{margin:'0 0 8px'}}><strong>RCCM:</strong> GN.TCC.2024.A.12345</p>
                <p style={{margin:'0 0 8px'}}><strong>NIF:</strong> 123456789</p>
                <p style={{margin:'0 0 8px'}}><strong>Capital:</strong> 50 000 000 GNF</p>
                <p style={{margin:'0 0 8px'}}><strong>Siège:</strong> Kaloum, Conakry, Guinée</p>
                <p style={{margin:0}}><strong>Directeur:</strong> Tidiane Sow Diallo</p>
              </div>
            </div>
          </div>
          <Nav/>
        </div>
      );

      return null;
    }

    if(screen==='faq') {
      const faqItems = lang==='fr' ? [
        {q:'Comment prendre rendez-vous?',a:'Allez dans l\'onglet RDV, sélectionnez un service, choisissez une date et un créneau horaire, puis confirmez votre réservation.'},
        {q:'Quels sont les modes de paiement acceptés?',a:'Nous acceptons Orange Money, les virements bancaires et les espèces remises directement au technicien.'},
        {q:'Comment fonctionne l\'échéancier de paiement?',a:'65% à la signature du contrat, 20% à la moitié des travaux, et 15% à la fin du chantier.'},
        {q:'Puis-je annuler un rendez-vous?',a:'Oui, gratuitement jusqu\'à 24h avant. Après, des frais de 50 000 GNF s\'appliquent.'},
        {q:'Comment suivre mon intervention?',a:'Dans l\'onglet Suivi, vous pouvez voir l\'état de vos chantiers en temps réel avec photos.'},
        {q:'Quelle est la garantie sur les travaux?',a:'Garantie décennale sur le gros oeuvre, 2 ans sur les installations sanitaires, 1 an sur les réparations.'},
        {q:'Comment contacter le support?',a:'Par téléphone au +224 610 55 32 55, par email à contact@tsdetfils.com, ou via le chatbot de l\'application.'},
        {q:'Les devis sont-ils gratuits?',a:'Oui, le diagnostic et le devis sont gratuits. Seul le déplacement peut être facturé pour les zones éloignées.'},
      ] : [
        {q:'How to book an appointment?',a:'Go to the Booking tab, select a service, choose a date and time slot, then confirm your reservation.'},
        {q:'What payment methods are accepted?',a:'We accept Orange Money, bank transfers, and cash paid directly to the technician.'},
        {q:'How does the payment schedule work?',a:'65% upon contract signing, 20% at project midpoint, and 15% upon completion.'},
        {q:'Can I cancel an appointment?',a:'Yes, free of charge up to 24h before. After that, a 50,000 GNF fee applies.'},
        {q:'How to track my intervention?',a:'In the Tracking tab, you can see your site status in real-time with photos.'},
        {q:'What warranty is offered on work?',a:'10-year warranty on major works, 2 years on sanitary installations, 1 year on repairs.'},
        {q:'How to contact support?',a:'By phone at +224 610 55 32 55, by email at contact@tsdetfils.com, or via the app chatbot.'},
        {q:'Are quotes free?',a:'Yes, diagnosis and quotes are free. Only travel may be charged for remote areas.'},
      ];

      return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setScreen('profil')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>❓ {t.faq}</h2>
          </div>
          <div style={{padding:'15px'}}>
            {faqItems.map((item,i)=>(
              <div key={i} onClick={()=>setExpandedFaq(expandedFaq===i?null:i)} style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',cursor:'pointer',borderLeft:`4px solid ${expandedFaq===i?C.primary:C.light}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <p style={{margin:0,fontSize:'14px',fontWeight:'600',color:C.text,flex:1}}>{item.q}</p>
                  <span style={{color:C.primary,fontSize:'18px',transform:expandedFaq===i?'rotate(180deg)':'rotate(0deg)',transition:'transform 0.3s'}}>▼</span>
                </div>
                {expandedFaq===i&&<p style={{margin:'12px 0 0',fontSize:'13px',lineHeight:'1.6',color:C.textSecondary}}>{item.a}</p>}
              </div>
            ))}
          </div>
          <Nav/>
        </div>
      );
    }

    if(screen==='chatbot') {
      const sendChatMessage = async () => {
        if(!chatInput.trim()) return;
        const now = new Date();
        const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
        const userMsg = {id:Date.now(),text:chatInput,isBot:false,time};
        setChatMessages([...chatMessages,userMsg]);
        const userQuestion = chatInput.toLowerCase();
        setChatInput('');

        setTimeout(async ()=>{
          try {
            const { data: settings } = await supabase.from('admin_settings').select('*');
            let companyInfo: any = {};
            let chatbotContext = '';

            if (settings) {
              settings.forEach((item: any) => {
                if (item.setting_key === 'company_info') {
                  try {
                    companyInfo = JSON.parse(item.setting_value);
                  } catch (e) {}
                } else if (item.setting_key === 'chatbot_context') {
                  chatbotContext = item.setting_value;
                }
              });
            }

            let response = '';

            if (userQuestion.includes('nom') || userQuestion.includes('name') || userQuestion.includes('entreprise') || userQuestion.includes('company')) {
              response = lang === 'fr'
                ? `Notre entreprise s'appelle ${companyInfo.name || 'TSD et Fils'}. ${companyInfo.description || ''}`
                : `Our company name is ${companyInfo.name || 'TSD et Fils'}. ${companyInfo.description || ''}`;
            } else if (userQuestion.includes('fondé') || userQuestion.includes('créé') || userQuestion.includes('founded') || userQuestion.includes('created')) {
              response = lang === 'fr'
                ? `${companyInfo.name || 'TSD et Fils'} a été fondée en ${companyInfo.founded || '2020'}.`
                : `${companyInfo.name || 'TSD et Fils'} was founded in ${companyInfo.founded || '2020'}.`;
            } else if (userQuestion.includes('où') || userQuestion.includes('location') || userQuestion.includes('adresse') || userQuestion.includes('address')) {
              response = lang === 'fr'
                ? `Nous sommes situés à ${companyInfo.location || 'Guinée'}.`
                : `We are located in ${companyInfo.location || 'Guinea'}.`;
            } else if (userQuestion.includes('service') || userQuestion.includes('quoi') || userQuestion.includes('what') || userQuestion.includes('faites')) {
              response = chatbotContext || (lang === 'fr'
                ? `${companyInfo.name || 'TSD et Fils'} est spécialisée dans les services de plomberie, d'installation et de maintenance. Nous offrons des solutions de qualité à nos clients.`
                : `${companyInfo.name || 'TSD et Fils'} specializes in plumbing, installation, and maintenance services. We offer quality solutions to our clients.`);
            } else if (userQuestion.includes('contact') || userQuestion.includes('téléphone') || userQuestion.includes('phone') || userQuestion.includes('email')) {
              response = lang === 'fr'
                ? `Vous pouvez nous contacter par téléphone au +224 610 55 32 55 ou par email à contact@tsdetfils.com.`
                : `You can contact us by phone at +224 610 55 32 55 or by email at contact@tsdetfils.com.`;
            } else if (userQuestion.includes('prix') || userQuestion.includes('tarif') || userQuestion.includes('price') || userQuestion.includes('cost')) {
              response = lang === 'fr'
                ? `Pour obtenir un devis personnalisé, veuillez nous contacter au +224 610 55 32 55 ou utiliser notre formulaire de demande de devis dans l'application.`
                : `For a personalized quote, please contact us at +224 610 55 32 55 or use our quote request form in the app.`;
            } else if (userQuestion.includes('horaire') || userQuestion.includes('heure') || userQuestion.includes('hour') || userQuestion.includes('schedule')) {
              response = lang === 'fr'
                ? `Nous sommes disponibles du lundi au vendredi de 8h à 18h et le samedi de 9h à 13h. Pour les urgences, appelez le +224 610 55 32 55.`
                : `We are available Monday to Friday from 8am to 6pm and Saturday from 9am to 1pm. For emergencies, call +224 610 55 32 55.`;
            } else {
              const responses = lang==='fr' ? [
                chatbotContext || 'Je comprends votre demande. Un conseiller vous contactera dans les plus brefs délais.',
                'Merci pour votre message! Pour les urgences, appelez le +224 610 55 32 55.',
                'Votre demande a été enregistrée. Consultez notre FAQ pour des réponses rapides.',
                `${companyInfo.name || 'TSD et Fils'} est là pour vous aider. Un conseiller vous répondra sous 24-48h.`,
              ] : [
                chatbotContext || 'I understand your request. An advisor will contact you shortly.',
                'Thank you for your message! For emergencies, call +224 610 55 32 55.',
                'Your request has been recorded. Check our FAQ for quick answers.',
                `${companyInfo.name || 'TSD et Fils'} is here to help. An advisor will respond within 24-48h.`,
              ];
              response = responses[Math.floor(Math.random()*responses.length)];
            }

            const botMsg = {id:Date.now()+1,text:response,isBot:true,time:`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`};
            setChatMessages(prev=>[...prev,botMsg]);
          } catch (error) {
            const fallbackResponses = lang==='fr' ? [
              'Désolé, une erreur est survenue. Veuillez réessayer.',
              'Pour toute question, appelez le +224 610 55 32 55.',
            ] : [
              'Sorry, an error occurred. Please try again.',
              'For any questions, call +224 610 55 32 55.',
            ];
            const botMsg = {id:Date.now()+1,text:fallbackResponses[0],isBot:true,time:`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`};
            setChatMessages(prev=>[...prev,botMsg]);
          }
        },1000);
      };

      const quickActions = lang==='fr' ? ['Prendre RDV','Demander devis','Problème urgent','Suivi intervention'] : ['Book appointment','Request quote','Urgent problem','Track intervention'];

      return (
        <div style={{height:'100%',background:C.gray,display:'flex',flexDirection:'column'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setScreen('profil')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <div style={{flex:1}}><h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>🤖 {t.chatbot}</h2><p style={{color:'rgba(255,255,255,0.8)',fontSize:'12px',margin:'3px 0 0'}}>{lang==='fr'?'En ligne':'Online'}</p></div>
          </div>

          <div style={{flex:1,overflow:'auto',padding:'15px'}}>
            {chatMessages.length===0&&(
              <div style={{textAlign:'center',padding:'20px'}}>
                <div style={{width:'80px',height:'80px',borderRadius:'50%',background:C.card,display:'flex',justifyContent:'center',alignItems:'center',fontSize:'40px',margin:'0 auto 15px',boxShadow:'0 4px 15px rgba(0,0,0,0.1)'}}>🤖</div>
                <p style={{fontSize:'14px',color:C.text,margin:'0 0 20px'}}>{t.botWelcome}</p>
                <p style={{fontSize:'12px',color:C.textSecondary,margin:'0 0 15px'}}>{t.helpTopics}:</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:'8px',justifyContent:'center'}}>
                  {quickActions.map((action,i)=>(
                    <button key={i} onClick={()=>{setChatInput(action);}} style={{background:C.card,border:`1px solid ${C.light}`,padding:'10px 16px',borderRadius:'20px',fontSize:'13px',color:C.text,cursor:'pointer'}}>{action}</button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map(msg=>(
              <div key={msg.id} style={{display:'flex',justifyContent:msg.isBot?'flex-start':'flex-end',marginBottom:'12px'}}>
                <div style={{maxWidth:'80%',background:msg.isBot?C.card:C.primary,borderRadius:msg.isBot?'18px 18px 18px 4px':'18px 18px 4px 18px',padding:'12px 16px',boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                  <p style={{margin:0,fontSize:'14px',color:msg.isBot?C.text:'#FFF',lineHeight:'1.5'}}>{msg.text}</p>
                  <p style={{margin:'6px 0 0',fontSize:'11px',color:msg.isBot?C.textSecondary:'rgba(255,255,255,0.7)',textAlign:'right'}}>{msg.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{padding:'15px',background:C.card,borderTop:`1px solid ${C.light}`}}>
            <div style={{display:'flex',gap:'10px'}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyPress={e=>e.key==='Enter'&&sendChatMessage()} placeholder={t.typeMessage} style={{flex:1,padding:'14px 18px',borderRadius:'25px',border:`1px solid ${C.light}`,background:C.gray,fontSize:'14px',color:C.text,outline:'none'}}/>
              <button onClick={sendChatMessage} style={{width:'50px',height:'50px',borderRadius:'50%',background:`linear-gradient(135deg,${C.primary},${C.secondary})`,border:'none',cursor:'pointer',display:'flex',justifyContent:'center',alignItems:'center'}}>
                <span style={{color:'#FFF',fontSize:'20px'}}>→</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const TechApp = () => {
    if (!legalTermsAccepted && currentUser?.id) {
      return <LegalTermsScreen userId={currentUser.id} onAccepted={() => setLegalTermsAccepted(true)} colors={C} lang={lang} />;
    }

    if (showSiteDetail && selectedSite) {
      return <SiteDetailView siteId={selectedSite.id} siteName={selectedSite.titre} siteLocation={selectedSite.lieu} userId={currentUser?.id} colors={C} lang={lang} onBack={() => { setShowSiteDetail(false); setSelectedSite(null); }} />;
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
      return <AlertsManager userId={currentUser?.id} userRole={userRole || 'tech'} colors={C} onBack={() => setShowAlerts(false)} />;
    }

    const Nav = () => (
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:C.card,padding:'10px',display:'flex',justifyContent:'space-around',boxShadow:`0 -4px 20px ${darkMode?'rgba(0,0,0,0.5)':'rgba(0,0,0,0.08)'}`,borderRadius:'20px 20px 0 0',zIndex:100}}>
        {[{i:'🏠',l:t.home,s:'home'},{i:'📅',l:t.planning,s:'planning'},{i:'🏗️',l:lang==='fr'?'Chantiers':'Sites',s:'chantiers'},{i:'👤',l:t.profile,s:'profil'}].map(x=>(
          <button key={x.s} onClick={()=>setScreen(x.s)} style={{background:screen===x.s?C.light:'transparent',border:'none',cursor:'pointer',padding:'8px 10px',borderRadius:'12px',display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
            <span style={{fontSize:'18px'}}>{x.i}</span><span style={{fontSize:'9px',fontWeight:screen===x.s?'600':'400',color:screen===x.s?C.primary:C.textSecondary}}>{x.l}</span>
          </button>
        ))}
      </div>
    );

    if(screen==='home') return (
      <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px',position:'relative'}}>
        <div style={{position:'fixed',inset:0,backgroundImage:'url(/moi_et.jpeg)',backgroundSize:'cover',backgroundPosition:'center',opacity:0.39,zIndex:0,pointerEvents:'none'}} />
        <div style={{position:'relative',zIndex:1}}>
        <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',borderRadius:'0 0 25px 25px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><p style={{color:'rgba(255,255,255,0.8)',fontSize:'12px',margin:0}}>{t.welcome} 👷</p><h2 style={{color:'#FFF',fontSize:'18px',margin:'5px 0 0'}}>{currentUser?.name}</h2></div><button onClick={()=>setDarkMode(!darkMode)} style={{background:'rgba(255,255,255,0.2)',border:'none',padding:'8px 12px',borderRadius:'10px',color:'#FFF',cursor:'pointer'}}>{darkMode?'☀️':'🌙'}</button></div></div>
        <BroadcastBanner userRole="tech" darkMode={darkMode} />
        <div style={{padding:'15px'}}>
          <WorkShiftTracker userId={currentUser?.id} userRole="technician" darkMode={darkMode} />
          <h3 style={{margin:'0 0 12px',fontSize:'16px',color:C.text}}>{lang==='fr'?'Chantiers du jour':"Today's sites"}</h3>
          {planning.filter(p=>p.jour===0).length > 0 ? planning.filter(p=>p.jour===0).map(p=>(<div key={p.id} onClick={()=>setScreen('chantiers')} style={{background:C.card,borderRadius:'14px',padding:'15px',marginBottom:'10px',borderLeft:`4px solid ${C.secondary}`,cursor:'pointer'}}><h4 style={{margin:0,fontSize:'15px',color:C.text}}>{p.client}</h4><p style={{margin:'5px 0 0',fontSize:'13px',color:C.textSecondary}}>{p.type} • 📍 {p.lieu}</p>{p.heure && p.heure !== ' - ' && <p style={{margin:'4px 0 0',fontSize:'12px',color:C.primary,fontWeight:'600'}}>⏰ {p.heure}</p>}</div>)) : <p style={{color:C.textSecondary,fontSize:'13px',textAlign:'center',padding:'20px 0'}}>{lang==='fr'?'Aucun chantier planifie aujourd\'hui':'No sites planned today'}</p>}
        </div>
        <Nav/>
        </div>
      </div>
    );

    if(screen==='chantiers') {
      const planningChantiers = planning.filter(p => p.chantier_id);
      const uniqueChantierMap = new Map<string, any>();
      planningChantiers.forEach(p => {
        if (!uniqueChantierMap.has(p.chantier_id)) {
          uniqueChantierMap.set(p.chantier_id, {
            id: p.chantier_id,
            titre: p.client,
            lieu: p.lieu,
            prog: p.chantier_progress || 0,
            statut: p.chantier_status || 'planned',
            heure: p.heure,
            scheduled_date: p.scheduled_date
          });
        }
      });
      chantiers.forEach(ch => {
        if ((ch.status === 'inProgress' || ch.status === 'interrupted') && !uniqueChantierMap.has(ch.id)) {
          uniqueChantierMap.set(ch.id, {
            id: ch.id,
            titre: ch.title || ch.client_name || 'Chantier',
            lieu: ch.location || '',
            prog: ch.progress || 0,
            statut: ch.status,
            heure: ch.scheduled_time || '',
            scheduled_date: ch.scheduled_date
          });
        }
      });
      const planningBasedChantiers = Array.from(uniqueChantierMap.values());

      const getStatusLabel = (s: string) => {
        const labels: Record<string, string> = lang === 'fr'
          ? { planned: 'Planifie', inProgress: 'En cours', interrupted: 'Interrompu', abandoned: 'Abandonne', completed: 'Termine' }
          : { planned: 'Planned', inProgress: 'In Progress', interrupted: 'Interrupted', abandoned: 'Abandoned', completed: 'Completed' };
        return labels[s] || s;
      };

      const getStatusColor = (s: string) => {
        const colors: Record<string, string> = {
          planned: C.warning, inProgress: C.secondary, interrupted: '#f97316', abandoned: C.danger, completed: C.success
        };
        return colors[s] || C.textSecondary;
      };

      return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',borderRadius:'0 0 25px 25px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <button onClick={()=>setScreen('home')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
              <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>🏗️ {lang==='fr'?'Gestion Chantiers':'Site Management'}</h2>
            </div>
          </div>
          <div style={{padding:'15px'}}>
            {planningBasedChantiers.length === 0 && (
              <p style={{color:C.textSecondary,fontSize:'13px',textAlign:'center',padding:'20px 0'}}>{lang==='fr'?'Aucun chantier dans votre planning':'No sites in your planning'}</p>
            )}
            {planningBasedChantiers.map(c=>{
              const statusColor = getStatusColor(c.statut);
              return (
              <div key={c.id} style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'15px',borderLeft:`4px solid ${statusColor}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
                  <div style={{flex:1}}>
                    <h4 style={{margin:0,fontSize:'16px',color:C.text}}>{c.titre}</h4>
                    <p style={{margin:'5px 0 0',fontSize:'13px',color:C.textSecondary}}>📍 {c.lieu}</p>
                    {c.scheduled_date && <p style={{margin:'4px 0 0',fontSize:'12px',color:C.primary,fontWeight:'600'}}>📅 {safeDate(c.scheduled_date + 'T00:00:00', lang==='fr'?'fr':'en')}{c.heure && c.heure !== ' - ' ? ` • ⏰ ${c.heure}` : ''}</p>}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'4px'}}>
                    <span style={{background:`${statusColor}20`,color:statusColor,padding:'4px 10px',borderRadius:'10px',fontSize:'11px',fontWeight:'700'}}>{getStatusLabel(c.statut)}</span>
                    <span style={{fontSize:'13px',fontWeight:'700',color:C.secondary}}>{c.prog}%</span>
                  </div>
                </div>

                <div style={{height:'8px',background:C.light,borderRadius:'4px',marginBottom:'16px'}}>
                  <div style={{height:'100%',width:`${c.prog}%`,background:`linear-gradient(90deg,${C.primary},${C.secondary})`,borderRadius:'4px',transition:'width 0.5s'}}/>
                </div>

                {c.statut === 'planned' && (
                  <button
                    disabled={!!updatingChantierId}
                    onClick={() => updateChantierStatusFn(c.id, 'inProgress', 'started', lang==='fr' ? 'Debut des travaux' : 'Work started')}
                    style={{width:'100%',background: updatingChantierId === c.id ? '#9CA3AF' : 'linear-gradient(135deg, #10B981, #059669)',color:'#FFF',border:'none',padding:'16px',borderRadius:'14px',fontWeight:'700',fontSize:'15px',cursor: updatingChantierId === c.id ? 'wait' : 'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',boxShadow:'0 4px 14px rgba(16,185,129,0.35)',opacity: updatingChantierId === c.id ? 0.7 : 1,transition:'all 0.2s',marginBottom:'12px'}}
                  >
                    {updatingChantierId === c.id ? (lang==='fr'?'Demarrage en cours...':'Starting...') : (<>🚀 {lang==='fr'?'Debut chantier':'Start work'}</>)}
                  </button>
                )}

                {c.statut === 'interrupted' && (
                  <button
                    disabled={!!updatingChantierId}
                    onClick={() => updateChantierStatusFn(c.id, 'inProgress', 'resumed', lang==='fr' ? 'Reprise des travaux' : 'Work resumed')}
                    style={{width:'100%',background: updatingChantierId === c.id ? '#9CA3AF' : 'linear-gradient(135deg, #10B981, #059669)',color:'#FFF',border:'none',padding:'16px',borderRadius:'14px',fontWeight:'700',fontSize:'15px',cursor: updatingChantierId === c.id ? 'wait' : 'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',boxShadow:'0 4px 14px rgba(16,185,129,0.35)',opacity: updatingChantierId === c.id ? 0.7 : 1,transition:'all 0.2s',marginBottom:'12px'}}
                  >
                    {updatingChantierId === c.id ? (lang==='fr'?'Reprise en cours...':'Resuming...') : (<>▶️ {lang==='fr'?'Reprendre le chantier':'Resume work'}</>)}
                  </button>
                )}

                {(c.statut === 'inProgress' || c.statut === 'interrupted') && (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
                    {c.statut === 'inProgress' && (
                      <button
                        disabled={!!updatingChantierId}
                        onClick={() => { setReasonInput(''); setReasonModalAction({chantierId: c.id, action: 'interrupted', label: lang==='fr' ? 'Raison de l\'interruption' : 'Reason for interruption'}); }}
                        style={{background: updatingChantierId === c.id ? '#9CA3AF' : 'linear-gradient(135deg, #f97316, #ea580c)',color:'#FFF',border:'none',padding:'12px 8px',borderRadius:'12px',fontWeight:'700',fontSize:'12px',cursor: updatingChantierId === c.id ? 'wait' : 'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',boxShadow:'0 2px 8px rgba(249,115,22,0.3)',opacity: updatingChantierId === c.id ? 0.7 : 1,transition:'all 0.2s'}}
                      >
                        ⏸️ {lang==='fr'?'Interruption':'Pause'}
                      </button>
                    )}
                    {c.statut === 'inProgress' && (
                      <button
                        disabled={!!updatingChantierId}
                        onClick={() => { setReasonInput(''); setReasonModalAction({chantierId: c.id, action: 'completed', label: lang==='fr' ? 'Confirmer la fin du chantier' : 'Confirm work completion'}); }}
                        style={{background: updatingChantierId === c.id ? '#9CA3AF' : 'linear-gradient(135deg, #059669, #047857)',color:'#FFF',border:'none',padding:'12px 8px',borderRadius:'12px',fontWeight:'700',fontSize:'12px',cursor: updatingChantierId === c.id ? 'wait' : 'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',boxShadow:'0 2px 8px rgba(5,150,105,0.3)',opacity: updatingChantierId === c.id ? 0.7 : 1,transition:'all 0.2s'}}
                      >
                        ✅ {lang==='fr'?'Fin chantier':'Complete'}
                      </button>
                    )}
                    <button
                      disabled={!!updatingChantierId}
                      onClick={() => { setReasonInput(''); setReasonModalAction({chantierId: c.id, action: 'abandoned', label: lang==='fr' ? 'Raison de l\'abandon' : 'Reason for abandoning'}); }}
                      style={{background: updatingChantierId === c.id ? '#9CA3AF' : 'linear-gradient(135deg, #ef4444, #dc2626)',color:'#FFF',border:'none',padding:'12px 8px',borderRadius:'12px',fontWeight:'700',fontSize:'12px',cursor: updatingChantierId === c.id ? 'wait' : 'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',boxShadow:'0 2px 8px rgba(239,68,68,0.3)',opacity: updatingChantierId === c.id ? 0.7 : 1,transition:'all 0.2s'}}
                    >
                      🚫 {lang==='fr'?'Abandon':'Abandon'}
                    </button>
                    <button
                      disabled={!!updatingChantierId}
                      onClick={() => { setReasonInput(''); setReasonModalAction({chantierId: c.id, action: 'team_changed', currentStatus: c.statut, label: lang==='fr' ? 'Raison du changement d\'equipe' : 'Reason for team change'}); }}
                      style={{background: updatingChantierId === c.id ? '#9CA3AF' : `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,color:'#FFF',border:'none',padding:'12px 8px',borderRadius:'12px',fontWeight:'700',fontSize:'12px',cursor: updatingChantierId === c.id ? 'wait' : 'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',boxShadow:`0 2px 8px ${C.primary}40`,opacity: updatingChantierId === c.id ? 0.7 : 1,transition:'all 0.2s'}}
                    >
                      🔄 {lang==='fr'?'Chg. equipe':'Change team'}
                    </button>
                  </div>
                )}

                {c.statut === 'completed' && (
                  <div style={{background:`${C.success}15`,border:`1px solid ${C.success}40`,borderRadius:'12px',padding:'14px',marginBottom:'12px',display:'flex',alignItems:'center',gap:'10px'}}>
                    <span style={{fontSize:'20px'}}>✅</span>
                    <div>
                      <p style={{margin:0,fontSize:'14px',fontWeight:'700',color:C.success}}>{lang==='fr'?'Chantier termine':'Work completed'}</p>
                      <p style={{margin:'2px 0 0',fontSize:'11px',color:C.textSecondary}}>{lang==='fr'?'Le client a ete notifie automatiquement':'Client was notified automatically'}</p>
                    </div>
                  </div>
                )}
                {c.statut === 'abandoned' && (
                  <div style={{background:`${C.danger}15`,border:`1px solid ${C.danger}40`,borderRadius:'12px',padding:'14px',marginBottom:'12px',display:'flex',alignItems:'center',gap:'10px'}}>
                    <span style={{fontSize:'20px'}}>🚫</span>
                    <div>
                      <p style={{margin:0,fontSize:'14px',fontWeight:'700',color:C.danger}}>{lang==='fr'?'Chantier abandonne':'Work abandoned'}</p>
                      <p style={{margin:'2px 0 0',fontSize:'11px',color:C.textSecondary}}>{lang==='fr'?'Le client a ete notifie automatiquement':'Client was notified automatically'}</p>
                    </div>
                  </div>
                )}

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <button
                    onClick={()=>{setSelectedSite({id: c.id, titre: c.titre, lieu: c.lieu});setShowSiteDetail(true);}}
                    style={{background:`linear-gradient(90deg,${C.primary},${C.secondary})`,color:'#FFF',border:'none',padding:'14px',borderRadius:'12px',fontWeight:'bold',fontSize:'13px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}
                  >
                    🔧 {lang==='fr'?'Gestion':'Management'}
                  </button>
                  <button
                    onClick={()=>{
                      if(c.lieu){
                        const encoded=encodeURIComponent(c.lieu);
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`,'_blank');
                      }else{
                        alert(lang==='fr'?'Aucune adresse disponible':'No address available');
                      }
                    }}
                    style={{background:C.success||'#10b981',color:'#FFF',border:'none',padding:'14px',borderRadius:'12px',fontWeight:'bold',fontSize:'13px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}
                  >
                    🗺️ {lang==='fr'?'Itineraire':'Directions'}
                  </button>
                </div>
              </div>
              );
            })}
          </div>
          {reasonModalAction && (
            <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}} onClick={() => setReasonModalAction(null)}>
              <div style={{background:C.card,borderRadius:'20px',padding:'24px',width:'100%',maxWidth:'400px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}} onClick={e => e.stopPropagation()}>
                <h3 style={{margin:'0 0 16px',fontSize:'17px',color:C.text}}>{reasonModalAction.label}</h3>
                <textarea
                  value={reasonInput}
                  onChange={e => setReasonInput(e.target.value)}
                  placeholder={reasonModalAction.action === 'completed'
                    ? (lang === 'fr' ? 'Commentaire de fin de chantier (optionnel)...' : 'Completion notes (optional)...')
                    : (lang === 'fr' ? 'Entrez la raison (optionnel)...' : 'Enter reason (optional)...')}
                  autoFocus
                  style={{width:'100%',minHeight:'80px',padding:'12px',borderRadius:'12px',border:`1px solid ${C.textSecondary}40`,background:C.bg,color:C.text,fontSize:'14px',resize:'vertical',boxSizing:'border-box',fontFamily:'inherit'}}
                />
                <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
                  <button
                    onClick={() => setReasonModalAction(null)}
                    style={{flex:1,padding:'12px',borderRadius:'12px',border:`1px solid ${C.textSecondary}40`,background:'transparent',color:C.textSecondary,fontWeight:'600',fontSize:'14px',cursor:'pointer'}}
                  >
                    {lang === 'fr' ? 'Annuler' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleReasonSubmit}
                    style={{flex:1,padding:'12px',borderRadius:'12px',border:'none',background:
                      reasonModalAction.action === 'abandoned' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                      reasonModalAction.action === 'completed' ? 'linear-gradient(135deg, #059669, #047857)' :
                      reasonModalAction.action === 'team_changed' ? `linear-gradient(135deg, ${C.primary}, ${C.secondary})` :
                      'linear-gradient(135deg, #f97316, #ea580c)',color:'#FFF',fontWeight:'700',fontSize:'14px',cursor:'pointer'}}
                  >
                    {lang === 'fr' ? 'Confirmer' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}
          <Nav/>
        </div>
      );
    }

    if(screen==='planning') return (
      <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
        <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',borderRadius:'0 0 25px 25px'}}>
          <h2 style={{color:'#FFF',fontSize:'18px',margin:'0 0 15px'}}>📅 {t.planning}</h2>
          <div style={{display:'flex',gap:'8px'}}>{weekDays.map((d,i)=>(<button key={i} onClick={()=>setSelectedDay(i)} style={{flex:1,background:selectedDay===i?'#FFF':'rgba(255,255,255,0.15)',border:'none',borderRadius:'12px',padding:'10px',cursor:'pointer',textAlign:'center'}}><div style={{fontSize:'10px',color:selectedDay===i?C.secondary:'rgba(255,255,255,0.8)'}}>{d.day}</div><div style={{fontSize:'18px',fontWeight:'bold',color:selectedDay===i?C.primary:'#FFF'}}>{d.date}</div></button>))}</div>
        </div>
        <div style={{padding:'15px'}}>
          {planning.filter(p=>p.jour===selectedDay).map(p=>(
            <div
              key={p.id}
              onClick={() => setSelectedPlanning(p)}
              style={{
                background:C.card,
                borderRadius:'14px',
                padding:'15px',
                marginBottom:'10px',
                borderLeft:`4px solid ${C.secondary}`,
                cursor:'pointer',
                transition:'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h4 style={{margin:0,fontSize:'15px',color:C.text,fontWeight:'bold'}}>{p.client}</h4>
                <span style={{color:C.secondary,fontSize:'13px',fontWeight:'600'}}>⏰ {p.heure}</span>
              </div>
              <p style={{margin:'5px 0 0',fontSize:'13px',color:C.textSecondary}}>
                {p.type} • 📍 {p.lieu}
              </p>
            </div>
          ))}
          {planning.filter(p=>p.jour===selectedDay).length === 0 && (
            <div style={{textAlign:'center',padding:'50px 20px',color:C.textSecondary}}>
              <span style={{fontSize:'60px',display:'block',marginBottom:'15px'}}>📅</span>
              <div style={{fontSize:'16px',fontWeight:'bold',marginBottom:'8px'}}>
                {lang==='fr'?'Aucune mission prévue':'No mission scheduled'}
              </div>
              <div style={{fontSize:'14px'}}>
                {lang==='fr'?'Profitez de votre journée !':'Enjoy your day!'}
              </div>
            </div>
          )}
        </div>
        {selectedPlanning && (
          <div
            onClick={() => setSelectedPlanning(null)}
            style={{
              position:'fixed',
              top:0,
              left:0,
              right:0,
              bottom:0,
              background:'rgba(0,0,0,0.6)',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              padding:'20px',
              zIndex:1000
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background:C.card,
                borderRadius:'20px',
                padding:'25px',
                maxWidth:'600px',
                width:'calc(100% - 40px)',
                boxShadow:'0 20px 60px rgba(0,0,0,0.4)'
              }}
            >
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'25px'}}>
                <h3 style={{margin:0,color:C.primary,fontSize:'22px',fontWeight:'bold'}}>
                  📋 {lang==='fr'?'Détails de la mission':'Mission Details'}
                </h3>
                <button
                  onClick={() => setSelectedPlanning(null)}
                  style={{
                    background:C.light,
                    border:'none',
                    borderRadius:'50%',
                    width:'36px',
                    height:'36px',
                    cursor:'pointer',
                    fontSize:'20px',
                    color:C.text,
                    fontWeight:'bold'
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{marginBottom:'18px'}}>
                <div style={{fontSize:'12px',color:C.textSecondary,marginBottom:'6px',textTransform:'uppercase',fontWeight:'bold',letterSpacing:'0.5px'}}>
                  {lang==='fr'?'Client':'Client'}
                </div>
                <div style={{fontSize:'18px',color:C.text,fontWeight:'bold'}}>{selectedPlanning.client}</div>
              </div>

              <div style={{marginBottom:'18px'}}>
                <div style={{fontSize:'12px',color:C.textSecondary,marginBottom:'6px',textTransform:'uppercase',fontWeight:'bold',letterSpacing:'0.5px'}}>
                  {lang==='fr'?'Type de mission':'Mission Type'}
                </div>
                <div style={{fontSize:'16px',color:C.text}}>{selectedPlanning.type}</div>
              </div>

              <div style={{marginBottom:'18px'}}>
                <div style={{fontSize:'12px',color:C.textSecondary,marginBottom:'6px',textTransform:'uppercase',fontWeight:'bold',letterSpacing:'0.5px'}}>
                  {lang==='fr'?'Horaires':'Schedule'}
                </div>
                <div style={{fontSize:'16px',color:C.text}}>⏰ {selectedPlanning.heure}</div>
              </div>

              <div style={{marginBottom:'25px'}}>
                <div style={{fontSize:'12px',color:C.textSecondary,marginBottom:'6px',textTransform:'uppercase',fontWeight:'bold',letterSpacing:'0.5px'}}>
                  {lang==='fr'?'Lieu':'Location'}
                </div>
                <div style={{fontSize:'16px',color:C.text}}>📍 {selectedPlanning.lieu}</div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <button
                  onClick={() => setSelectedPlanning(null)}
                  style={{
                    background:C.light,
                    color:C.text,
                    border:'none',
                    borderRadius:'12px',
                    padding:'14px',
                    fontSize:'15px',
                    fontWeight:'bold',
                    cursor:'pointer'
                  }}
                >
                  {lang==='fr'?'Fermer':'Close'}
                </button>
                <button
                  onClick={() => {
                    const address = selectedPlanning?.lieu || selectedPlanning?.client || '';
                    if (!address) {
                      alert(lang==='fr'?'Aucune adresse disponible':'No address available');
                      return;
                    }
                    const encodedAddress = encodeURIComponent(address);
                    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
                    window.open(mapsUrl, '_blank');
                  }}
                  style={{
                    background:`linear-gradient(135deg,${C.primary},${C.secondary})`,
                    color:'#FFF',
                    border:'none',
                    borderRadius:'12px',
                    padding:'14px',
                    fontSize:'15px',
                    fontWeight:'bold',
                    cursor:'pointer',
                    boxShadow:'0 4px 12px rgba(0,0,0,0.2)'
                  }}
                >
                  {lang==='fr'?'🗺️ Itinéraire':'🗺️ Directions'}
                </button>
              </div>
            </div>
          </div>
        )}
        <Nav/>
      </div>
    );

    if(screen==='profil') return (
      <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
        <ProfileHeader
          userId={currentUser?.id || ''}
          userName={currentUser?.name || ''}
          userEmail={currentUser?.email}
          subtitle={lang === 'fr' ? 'Technicien' : lang === 'en' ? 'Technician' : 'فني'}
          infoLines={[
            ...(currentUser?.status ? [{ label: lang === 'fr' ? 'Rôle' : lang === 'en' ? 'Role' : 'الدور', value: currentUser.status }] : []),
            ...(currentUser?.echelon ? [{ label: lang === 'fr' ? 'Échelon' : lang === 'en' ? 'Level' : 'الرتبة', value: currentUser.echelon }] : []),
          ]}
          profilePhoto={profilePhoto || null}
          coverPhoto={coverPhoto || null}
          onProfilePhotoChange={(url) => setProfilePhoto(url || '')}
          onCoverPhotoChange={(url) => setCoverPhoto(url || '')}
          onBack={() => setScreen('home')}
          darkMode={darkMode}
          lang={lang}
          primaryColor={C.primary}
          secondaryColor={C.secondary}
          langToggle={() => setLang(lang === 'fr' ? 'en' : lang === 'en' ? 'ar' : 'fr')}
          langLabel={lang === 'fr' ? 'FR' : lang === 'en' ? 'EN' : 'AR'}
        />
        <div style={{padding:'0 15px'}}>
          <div onClick={()=>setScreen('settings')} style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>⚙️</span><span style={{fontSize:'15px',color:C.text}}>{t.settings}</span></div>
            <span style={{color:C.textSecondary}}>→</span>
          </div>
          <div onClick={()=>{setLegalScreen('menu');setScreen('legal');}} style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>📋</span><span style={{fontSize:'15px',color:C.text}}>{t.legalTerms}</span></div>
            <span style={{color:C.textSecondary}}>→</span>
          </div>
          <div onClick={()=>setScreen('faq')} style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>❓</span><span style={{fontSize:'15px',color:C.text}}>{t.faq}</span></div>
            <span style={{color:C.textSecondary}}>→</span>
          </div>
          <div onClick={()=>setScreen('chatbot')} style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>🤖</span><span style={{fontSize:'15px',color:C.text}}>{t.chatbot}</span></div>
            <span style={{color:C.textSecondary}}>→</span>
          </div>
          <div onClick={()=>setShowIncidentForm(true)} style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>⚠️</span><span style={{fontSize:'15px',color:C.text}}>{lang==='fr'?'Déclarer Incident':'Report Incident'}</span></div>
            <span style={{color:C.textSecondary}}>→</span>
          </div>
          <div onClick={()=>setShowBirthdays(true)} style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>🎂</span><span style={{fontSize:'15px',color:C.text}}>{lang==='fr'?'Anniversaires':'Birthdays'}</span></div>
            <span style={{color:C.textSecondary}}>→</span>
          </div>
          <div onClick={()=>setShowAlerts(true)} style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>🔔</span><span style={{fontSize:'15px',color:C.text}}>{lang==='fr'?'Alertes':'Alerts'}</span></div>
            <span style={{color:C.textSecondary}}>→</span>
          </div>
          <button onClick={handleLogout} style={{width:'100%',marginTop:'15px',background:'#FEE2E2',color:C.danger,border:`2px solid ${C.danger}`,padding:'16px',borderRadius:'14px',fontWeight:'bold',cursor:'pointer'}}>🚪 {t.logout}</button>
        </div>
        <Nav/>
      </div>
    );

    if(screen==='settings') {
      if(settingsSubScreen==='notifications') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setSettingsSubScreen('')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>🔔 {t.notificationPreferences}</h2>
          </div>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'14px',padding:'18px',marginBottom:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'15px'}}>
                <div><span style={{fontSize:'15px',color:C.text}}>{getClientText('quoteNotifications', lang)}</span></div>
                <button style={{width:'50px',height:'28px',borderRadius:'14px',background:C.secondary,border:'none',cursor:'pointer',position:'relative'}}><div style={{width:'22px',height:'22px',borderRadius:'50%',background:'#FFF',position:'absolute',top:'3px',left:'25px'}}/></button>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'15px'}}>
                <div><span style={{fontSize:'15px',color:C.text}}>{getClientText('appointmentNotifications', lang)}</span></div>
                <button style={{width:'50px',height:'28px',borderRadius:'14px',background:C.secondary,border:'none',cursor:'pointer',position:'relative'}}><div style={{width:'22px',height:'22px',borderRadius:'50%',background:'#FFF',position:'absolute',top:'3px',left:'25px'}}/></button>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'15px'}}>
                <div><span style={{fontSize:'15px',color:C.text}}>{getClientText('paymentNotifications', lang)}</span></div>
                <button style={{width:'50px',height:'28px',borderRadius:'14px',background:C.secondary,border:'none',cursor:'pointer',position:'relative'}}><div style={{width:'22px',height:'22px',borderRadius:'50%',background:'#FFF',position:'absolute',top:'3px',left:'25px'}}/></button>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><span style={{fontSize:'15px',color:C.text}}>{getClientText('promoNotifications', lang)}</span></div>
                <button style={{width:'50px',height:'28px',borderRadius:'14px',background:C.light,border:'none',cursor:'pointer',position:'relative'}}><div style={{width:'22px',height:'22px',borderRadius:'50%',background:'#FFF',position:'absolute',top:'3px',left:'3px'}}/></button>
              </div>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(settingsSubScreen==='security') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setSettingsSubScreen('')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>🔐 {t.securitySettings}</h2>
          </div>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'14px',padding:'18px',marginBottom:'12px'}}>
              <h4 style={{margin:'0 0 15px',fontSize:'15px',color:C.text}}>{t.changePassword}</h4>
              <input type="password" placeholder={getClientText('currentPassword', lang)} style={{width:'100%',padding:'14px',borderRadius:'12px',border:`2px solid ${C.light}`,background:C.light,marginBottom:'10px',fontSize:'14px',boxSizing:'border-box',color:C.text}}/>
              <input type="password" placeholder={getClientText('newPassword', lang)} style={{width:'100%',padding:'14px',borderRadius:'12px',border:`2px solid ${C.light}`,background:C.light,marginBottom:'10px',fontSize:'14px',boxSizing:'border-box',color:C.text}}/>
              <input type="password" placeholder={getClientText('confirmPassword', lang)} style={{width:'100%',padding:'14px',borderRadius:'12px',border:`2px solid ${C.light}`,background:C.light,marginBottom:'15px',fontSize:'14px',boxSizing:'border-box',color:C.text}}/>
              <button style={{width:'100%',background:`linear-gradient(90deg,${C.primary},${C.secondary})`,color:'#FFF',border:'none',padding:'14px',borderRadius:'12px',fontWeight:'600',cursor:'pointer'}}>{getClientText('update', lang)}</button>
            </div>
            <div style={{background:C.card,borderRadius:'14px',padding:'18px',marginBottom:'12px'}}>
              <h4 style={{margin:'0 0 15px',fontSize:'15px',color:C.text}}>{t.twoFactorAuth}</h4>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:'15px',borderBottom:`1px solid ${C.light}`}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{fontSize:'24px'}}>👤</span>
                  <div><h5 style={{margin:'0 0 3px',fontSize:'14px',color:C.text}}>{t.faceId2FA}</h5><p style={{margin:0,fontSize:'11px',color:C.textSecondary}}>{getClientText('facialRecognition', lang)}</p></div>
                </div>
                <button onClick={()=>setFaceIdEnabled(!faceIdEnabled)} style={{width:'50px',height:'28px',borderRadius:'14px',background:faceIdEnabled?C.secondary:C.light,border:'none',cursor:'pointer',position:'relative'}}><div style={{width:'22px',height:'22px',borderRadius:'50%',background:'#FFF',position:'absolute',top:'3px',left:faceIdEnabled?'25px':'3px',transition:'left 0.2s'}}/></button>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:'15px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{fontSize:'24px'}}>📱</span>
                  <div><h5 style={{margin:'0 0 3px',fontSize:'14px',color:C.text}}>{t.sms2FA}</h5><p style={{margin:0,fontSize:'11px',color:C.textSecondary}}>{getClientText('smsCode', lang)}</p></div>
                </div>
                <button onClick={()=>setSms2faEnabled(!sms2faEnabled)} style={{width:'50px',height:'28px',borderRadius:'14px',background:sms2faEnabled?C.secondary:C.light,border:'none',cursor:'pointer',position:'relative'}}><div style={{width:'22px',height:'22px',borderRadius:'50%',background:'#FFF',position:'absolute',top:'3px',left:sms2faEnabled?'25px':'3px',transition:'left 0.2s'}}/></button>
              </div>
            </div>
          </div>
          <Nav/>
        </div>
      );

      return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setScreen('profil')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>⚙️ {t.settings}</h2>
          </div>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'14px',padding:'18px',marginBottom:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><span style={{fontSize:'18px',marginRight:'10px'}}>{darkMode?'🌙':'☀️'}</span><span style={{fontSize:'15px',color:C.text}}>{darkMode?t.darkMode:t.lightMode}</span></div>
                <button onClick={()=>setDarkMode(!darkMode)} style={{width:'50px',height:'28px',borderRadius:'14px',background:darkMode?C.secondary:C.light,border:'none',cursor:'pointer',position:'relative'}}><div style={{width:'22px',height:'22px',borderRadius:'50%',background:'#FFF',position:'absolute',top:'3px',left:darkMode?'25px':'3px',transition:'left 0.3s'}}/></button>
              </div>
            </div>
            <div style={{background:C.card,borderRadius:'14px',padding:'18px',marginBottom:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><span style={{fontSize:'18px',marginRight:'10px'}}>🌍</span><span style={{fontSize:'15px',color:C.text}}>{t.language}</span></div>
                <button onClick={()=>setLang(lang==='fr'?'en':lang==='en'?'ar':'fr')} style={{background:C.light,border:'none',padding:'8px 15px',borderRadius:'10px',cursor:'pointer',fontWeight:'600',color:C.text}}>{lang==='fr'?'FR':'EN'}</button>
              </div>
            </div>
            <div
              onClick={()=>{console.log('Tech Notifications clicked');setSettingsSubScreen('notifications');}}
              onMouseEnter={(e)=>e.currentTarget.style.transform='translateX(5px)'}
              onMouseLeave={(e)=>e.currentTarget.style.transform='translateX(0)'}
              style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',transition:'all 0.2s',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',userSelect:'none'}}
            >
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>🔔</span><span style={{fontSize:'15px',color:C.text}}>{t.notifications}</span></div>
              <span style={{color:C.textSecondary,fontSize:'20px'}}>→</span>
            </div>
            <div
              onClick={()=>{console.log('Tech Security clicked');setSettingsSubScreen('security');}}
              onMouseEnter={(e)=>e.currentTarget.style.transform='translateX(5px)'}
              onMouseLeave={(e)=>e.currentTarget.style.transform='translateX(0)'}
              style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',transition:'all 0.2s',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',userSelect:'none'}}
            >
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>🔐</span><span style={{fontSize:'15px',color:C.text}}>{t.security}</span></div>
              <span style={{color:C.textSecondary,fontSize:'20px'}}>→</span>
            </div>
          </div>
          <Nav/>
        </div>
      );
    }

    if(screen==='legal') {
      const legalMenuItems = [
        {i:'🔒',k:'privacy',l:t.privacyPolicy},
        {i:'📜',k:'terms',l:t.termsOfService},
        {i:'💰',k:'payment',l:t.paymentTerms},
        {i:'⚠️',k:'liability',l:t.liabilityClause},
        {i:'🚫',k:'noncompete',l:t.nonCompete},
        {i:'📞',k:'complaint',l:t.complaintPolicy},
        {i:'ℹ️',k:'about',l:t.aboutUs},
      ];

      if(legalScreen==='menu') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setScreen('profil')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>📋 {t.legalTerms}</h2>
          </div>
          <div style={{padding:'15px'}}>
            {legalMenuItems.map((item,i)=>(
              <div
                key={i}
                onClick={()=>setLegalScreen(item.k)}
                onMouseEnter={(e)=>e.currentTarget.style.transform='translateX(5px)'}
                onMouseLeave={(e)=>e.currentTarget.style.transform='translateX(0)'}
                style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',transition:'all 0.2s',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}
              >
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'22px'}}>{item.i}</span><span style={{fontSize:'15px',color:C.text,fontWeight:'500'}}>{item.l}</span></div>
                <span style={{color:C.textSecondary,fontSize:'20px'}}>→</span>
              </div>
            ))}
            <div style={{background:C.card,borderRadius:'16px',padding:'20px',marginTop:'15px'}}>
              <div style={{textAlign:'center'}}><Logo size={100} /><p style={{margin:'10px 0 5px',fontSize:'13px',fontWeight:'600',color:C.text}}>TSD et Fils SARL</p><p style={{margin:0,fontSize:'12px',color:C.textSecondary}}>Espace Technicien</p></div>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='privacy') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setLegalScreen('menu')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>🔒 {t.privacyPolicy}</h2>
          </div>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <h4 style={{margin:'0 0 12px',fontSize:'15px',fontWeight:'600',color:C.primary}}>{lang==='fr'?'Données collectées (Technicien)':'Data Collected (Technician)'}</h4>
              <ul style={{margin:'0 0 15px',paddingLeft:'20px'}}>
                {(lang==='fr'?['Identité et coordonnées','Qualifications et certifications','Géolocalisation en temps réel (pendant missions)','Historique des interventions','Photos de chantiers','Évaluations clients']:['Identity and contact details','Qualifications and certifications','Real-time geolocation (during missions)','Intervention history','Site photos','Client ratings']).map((item,i)=><li key={i} style={{fontSize:'13px',lineHeight:'1.6',color:C.text,marginBottom:'6px'}}>{item}</li>)}
              </ul>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px'}}>
              <h4 style={{margin:'0 0 12px',fontSize:'15px',fontWeight:'600',color:C.primary}}>{lang==='fr'?'Vos droits':'Your Rights'}</h4>
              <p style={{margin:0,fontSize:'13px',lineHeight:'1.6',color:C.text}}>{lang==='fr'?'Vous pouvez accéder, modifier ou supprimer vos données en contactant privacy@tsdetfils.com':'You can access, modify, or delete your data by contacting privacy@tsdetfils.com'}</p>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='terms') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setLegalScreen('menu')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>📜 {t.termsOfService}</h2>
          </div>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <h4 style={{margin:'0 0 12px',fontSize:'15px',fontWeight:'600',color:C.primary}}>{lang==='fr'?'Obligations du Technicien':'Technician Obligations'}</h4>
              <ul style={{margin:0,paddingLeft:'20px'}}>
                {(lang==='fr'?['Respecter les horaires de rendez-vous','Fournir un travail de qualité','Porter l\'uniforme TSD et Fils','Maintenir une conduite professionnelle','Documenter les interventions avec photos','Respecter les consignes de sécurité']:['Respect appointment schedules','Provide quality work','Wear TSD et Fils uniform','Maintain professional conduct','Document interventions with photos','Follow safety guidelines']).map((item,i)=><li key={i} style={{fontSize:'13px',lineHeight:'1.6',color:C.text,marginBottom:'6px'}}>{item}</li>)}
              </ul>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px'}}>
              <h4 style={{margin:'0 0 12px',fontSize:'15px',fontWeight:'600',color:C.primary}}>{lang==='fr'?'Engagements de TSD et Fils':'TSD et Fils Commitments'}</h4>
              <ul style={{margin:0,paddingLeft:'20px'}}>
                {(lang==='fr'?['Formation continue','Fourniture du matériel nécessaire','Paiement ponctuel des commissions','Support technique 24/7','Assurance responsabilité civile']:['Ongoing training','Provide necessary equipment','Timely commission payments','24/7 technical support','Liability insurance coverage']).map((item,i)=><li key={i} style={{fontSize:'13px',lineHeight:'1.6',color:C.text,marginBottom:'6px'}}>{item}</li>)}
              </ul>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='payment') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setLegalScreen('menu')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>💰 {t.paymentTerms}</h2>
          </div>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <h4 style={{margin:'0 0 12px',fontSize:'15px',fontWeight:'600',color:C.primary}}>{lang==='fr'?'Rémunération':'Compensation'}</h4>
              <ul style={{margin:0,paddingLeft:'20px'}}>
                {(lang==='fr'?['Salaire sans commission sur les prestations','Prime de performance selon satisfaction client','Bonus spécial pour clients satisfaits (5 étoiles)','Indemnités de déplacement incluses']:['Salary with no commission on services','Performance bonus based on client satisfaction','Special bonus for satisfied clients (5 stars)','Travel allowances included']).map((item,i)=><li key={i} style={{fontSize:'13px',lineHeight:'1.6',color:C.text,marginBottom:'6px'}}>{item}</li>)}
              </ul>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px'}}>
              <h4 style={{margin:'0 0 12px',fontSize:'15px',fontWeight:'600',color:C.primary}}>{lang==='fr'?'Calendrier de paiement':'Payment Schedule'}</h4>
              <ul style={{margin:0,paddingLeft:'20px'}}>
                <li style={{fontSize:'13px',lineHeight:'1.6',color:C.text,marginBottom:'8px'}}>
                  <strong style={{color:C.primary}}>{lang==='fr'?'60% du salaire':'60% of salary'}</strong> {lang==='fr'?'versé le 20 de chaque mois':'paid on the 20th of each month'}
                </li>
                <li style={{fontSize:'13px',lineHeight:'1.6',color:C.text,marginBottom:'8px'}}>
                  <strong style={{color:C.primary}}>{lang==='fr'?'40% restant (solde)':'40% remaining (balance)'}</strong> {lang==='fr'?'versé au plus tard le 08 du mois suivant':'paid no later than the 8th of the following month'}
                </li>
              </ul>
              <p style={{margin:'12px 0 0',fontSize:'12px',lineHeight:'1.5',color:C.textSecondary,fontStyle:'italic'}}>
                {lang==='fr'?'Paiements par virement bancaire ou Orange Money':'Payments by bank transfer or Orange Money'}
              </p>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='liability') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setLegalScreen('menu')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>⚠️ {t.liabilityClause}</h2>
          </div>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <h4 style={{margin:'0 0 12px',fontSize:'15px',fontWeight:'600',color:C.primary}}>{lang==='fr'?'Assurance':'Insurance'}</h4>
              <p style={{margin:0,fontSize:'13px',lineHeight:'1.6',color:C.text}}>{lang==='fr'?'Tous les techniciens sont couverts par l\'assurance responsabilité civile professionnelle de TSD et Fils pendant les interventions.':'All technicians are covered by TSD et Fils professional liability insurance during interventions.'}</p>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px'}}>
              <h4 style={{margin:'0 0 12px',fontSize:'15px',fontWeight:'600',color:C.primary}}>{lang==='fr'?'Procédure en cas de dommage':'Damage Procedure'}</h4>
              <ul style={{margin:0,paddingLeft:'20px'}}>
                {(lang==='fr'?['Documenter immédiatement avec photos','Informer le superviseur','Remplir le formulaire d\'incident','Ne jamais admettre de responsabilité au client']:['Document immediately with photos','Inform supervisor','Complete incident form','Never admit liability to client']).map((item,i)=><li key={i} style={{fontSize:'13px',lineHeight:'1.6',color:C.text,marginBottom:'6px'}}>{item}</li>)}
              </ul>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='noncompete') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setLegalScreen('menu')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>🚫 {t.nonCompete}</h2>
          </div>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <h4 style={{margin:'0 0 12px',fontSize:'15px',fontWeight:'600',color:C.primary}}>{lang==='fr'?'Engagements du Technicien':'Technician Commitments'}</h4>
              <p style={{margin:'0 0 12px',fontSize:'13px',lineHeight:'1.6',color:C.text}}>{lang==='fr'?"En tant que technicien TSD et Fils, vous vous engagez à:":"As a TSD et Fils technician, you commit to:"}</p>
              <ul style={{margin:0,paddingLeft:'20px'}}>
                {(lang==='fr'?['Ne pas exercer d\'activité concurrente pendant la durée du contrat','Ne pas travailler directement pour les clients TSD et Fils en dehors de la plateforme','Ne pas divulguer les secrets commerciaux, tarifs ou méthodes de travail','Ne pas débaucher d\'autres techniciens TSD et Fils','Respecter l\'exclusivité pendant les heures de travail assignées']:['Not engage in competing activities during the contract period','Not work directly for TSD et Fils clients outside the platform','Not disclose trade secrets, rates, or work methods','Not poach other TSD et Fils technicians','Respect exclusivity during assigned work hours']).map((item,i)=><li key={i} style={{fontSize:'13px',lineHeight:'1.6',color:C.text,marginBottom:'6px'}}>{item}</li>)}
              </ul>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <h4 style={{margin:'0 0 12px',fontSize:'15px',fontWeight:'600',color:C.primary}}>{lang==='fr'?'Durée de la clause':'Clause Duration'}</h4>
              <p style={{margin:0,fontSize:'13px',lineHeight:'1.6',color:C.text}}>{lang==='fr'?"Cette clause de non-concurrence reste en vigueur pendant toute la durée de votre contrat avec TSD et Fils, et pendant une période de 24 mois après la fin de la collaboration dans un rayon de 50 km autour de Conakry.":"This non-competition clause remains in effect throughout your contract with TSD et Fils, and for a period of 24 months after the end of collaboration within a 50 km radius of Conakry."}</p>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <h4 style={{margin:'0 0 12px',fontSize:'15px',fontWeight:'600',color:C.primary}}>{lang==='fr'?'Anniversaire du Contrat':'Contract Anniversary'}</h4>
              <p style={{margin:0,fontSize:'13px',lineHeight:'1.6',color:C.text}}>{lang==='fr'?"La date de signature de votre contrat est enregistrée et célébrée chaque année. Cette date marque le renouvellement de vos engagements et l'évaluation de vos performances pour les primes d'ancienneté.":"Your contract signature date is recorded and celebrated each year. This date marks the renewal of your commitments and the evaluation of your performance for seniority bonuses."}</p>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <h4 style={{margin:'0 0 12px',fontSize:'15px',fontWeight:'600',color:C.primary}}>{lang==='fr'?'Compensation':'Compensation'}</h4>
              <p style={{margin:'0 0 12px',fontSize:'13px',lineHeight:'1.6',color:C.text}}>{lang==='fr'?"En contrepartie de cette clause, TSD et Fils s'engage à:":"In exchange for this clause, TSD et Fils commits to:"}</p>
              <ul style={{margin:0,paddingLeft:'20px'}}>
                {(lang==='fr'?['Verser une indemnité mensuelle de non-concurrence de 20% du salaire après la fin du contrat','Exceptions : Sauf en cas de licenciement pour faute grave, abandon de poste ou demande de départ volontaire','Fournir une formation continue certifiante','Offrir une priorité de réembauche pendant 2 ans']:['Pay a monthly non-competition allowance of 20% of salary after contract end','Exceptions: Except in case of dismissal for serious misconduct, abandonment of position or voluntary departure','Provide certified continuous training','Offer rehiring priority for 2 years']).map((item,i)=><li key={i} style={{fontSize:'13px',lineHeight:'1.6',color:C.text,marginBottom:'6px'}}>{item}</li>)}
              </ul>
            </div>
            <div style={{background:C.danger+'20',border:`2px solid ${C.danger}`,borderRadius:'16px',padding:'18px',marginBottom:'20px'}}>
              <h4 style={{margin:'0 0 12px',fontSize:'15px',fontWeight:'600',color:C.danger}}>⚠️ {lang==='fr'?'Sanctions en cas de non-respect':'Penalties for Non-Compliance'}</h4>
              <p style={{margin:0,fontSize:'13px',lineHeight:'1.6',color:C.text,fontWeight:'bold'}}>{lang==='fr'?"Le non-respect de cet accord peut entraîner des poursuites judiciaires et une amende pouvant atteindre 50.000.000 GNF.":"Failure to comply with this agreement may result in legal action and a fine of up to 50,000,000 GNF."}</p>
            </div>
            {nonCompeteSigned ? (
              <div style={{background:C.success+'20',border:`2px solid ${C.success}`,borderRadius:'16px',padding:'18px',textAlign:'center'}}>
                <span style={{fontSize:'48px',display:'block',marginBottom:'10px'}}>✅</span>
                <h4 style={{margin:'0 0 8px',fontSize:'16px',fontWeight:'600',color:C.success}}>{lang==='fr'?'Clause Signée':'Clause Signed'}</h4>
                <p style={{margin:0,fontSize:'13px',color:C.text}}>{lang==='fr'?'Vous avez accepté cette clause':'You have accepted this clause'}</p>
              </div>
            ) : (
              <button
                onClick={async ()=>{
                  if(confirm(lang==='fr'?'Confirmez-vous avoir lu et compris la clause de non-concurrence et ses conséquences ?':'Do you confirm that you have read and understood the non-competition clause and its consequences?')){
                    try {
                      await supabase.from('non_compete_signatures').insert({
                        user_id: currentUser?.id,
                        signed: true,
                        signed_at: new Date().toISOString(),
                        terms_version: '1.0'
                      });
                      setNonCompeteSigned(true);
                      alert(lang==='fr'?'Signature enregistrée avec succès':'Signature recorded successfully');
                    } catch(err) {
                      console.error('Error signing:', err);
                      alert(lang==='fr'?'Erreur lors de la signature':'Error during signature');
                    }
                  }
                }}
                style={{width:'100%',background:`linear-gradient(90deg,${C.primary},${C.secondary})`,color:'#FFF',border:'none',padding:'18px',borderRadius:'14px',fontWeight:'bold',fontSize:'16px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'}}
              >
                ✍️ {lang==='fr'?'Signer la clause de non-concurrence':'Sign Non-Compete Clause'}
              </button>
            )}
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='complaint') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setLegalScreen('menu')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>📞 {t.complaintPolicy}</h2>
          </div>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px',marginBottom:'12px'}}>
              <h4 style={{margin:'0 0 12px',fontSize:'15px',fontWeight:'600',color:C.primary}}>{lang==='fr'?'Support Technicien':'Technician Support'}</h4>
              <a href="tel:610553255" style={{textDecoration:'none',display:'block',marginBottom:'10px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'14px',background:C.light,borderRadius:'12px',cursor:'pointer',transition:'all 0.2s'}} onMouseOver={(e)=>e.currentTarget.style.background=C.secondary+'20'} onMouseOut={(e)=>e.currentTarget.style.background=C.light}>
                  <span style={{fontSize:'24px'}}>📞</span>
                  <div><p style={{margin:0,fontSize:'14px',fontWeight:'600',color:C.primary}}>610 553 255</p><p style={{margin:'2px 0 0',fontSize:'12px',color:C.textSecondary}}>{lang==='fr'?'Ligne techniciens 24/7 - Cliquer pour appeler':'Technician line 24/7 - Click to call'}</p></div>
                </div>
              </a>
              <a href="mailto:tech@tsdetfils.com" style={{textDecoration:'none',display:'block'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'14px',background:C.light,borderRadius:'12px',cursor:'pointer',transition:'all 0.2s'}} onMouseOver={(e)=>e.currentTarget.style.background=C.secondary+'20'} onMouseOut={(e)=>e.currentTarget.style.background=C.light}>
                  <span style={{fontSize:'24px'}}>📧</span>
                  <div><p style={{margin:0,fontSize:'14px',fontWeight:'600',color:C.primary}}>tech@tsdetfils.com</p><p style={{margin:'2px 0 0',fontSize:'12px',color:C.textSecondary}}>{lang==='fr'?'Support technique - Cliquer pour envoyer email':'Technical support - Click to send email'}</p></div>
                </div>
              </a>
            </div>
          </div>
          <Nav/>
        </div>
      );

      if(legalScreen==='about') return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setLegalScreen('menu')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>ℹ️ {t.aboutUs}</h2>
          </div>
          <div style={{padding:'15px'}}>
            <div style={{background:C.card,borderRadius:'16px',padding:'20px',marginBottom:'12px',textAlign:'center'}}>
              <Logo size={140}/>
              <h3 style={{margin:'15px 0 8px',fontSize:'18px',color:C.text}}>TSD et Fils SARL</h3>
              <p style={{margin:0,fontSize:'14px',color:C.secondary,fontStyle:'italic'}}>{t.slogan}</p>
            </div>
            <div style={{background:C.card,borderRadius:'16px',padding:'18px'}}>
              <p style={{margin:0,fontSize:'13px',lineHeight:'1.6',color:C.text}}>{lang==='fr'?'Rejoignez notre équipe de techniciens qualifiés et participez à notre mission d\'excellence en plomberie en Guinée.':'Join our team of qualified technicians and participate in our mission of plumbing excellence in Guinea.'}</p>
            </div>
          </div>
          <Nav/>
        </div>
      );

      return null;
    }

    if(screen==='faq') {
      const faqItems = lang==='fr' ? [
        {q:'Comment accepter une mission?',a:'Les nouvelles missions apparaissent dans l\'onglet Planning. Appuyez sur une mission pour voir les détails et l\'accepter.'},
        {q:'Comment documenter une intervention?',a:'Utilisez l\'onglet Chantiers pour prendre des photos avant, pendant et après les travaux.'},
        {q:'Quand suis-je payé?',a:'Les commissions sont versées le 5 de chaque mois. Vous recevez 70% du montant facturé.'},
        {q:'Que faire en cas de problème sur chantier?',a:'Contactez immédiatement le support technique au +224 610 55 32 56.'},
        {q:'Comment améliorer mes évaluations?',a:'Soyez ponctuel, professionnel, et assurez-vous que le client comprend les travaux effectués.'},
      ] : [
        {q:'How to accept a mission?',a:'New missions appear in the Planning tab. Tap a mission to see details and accept it.'},
        {q:'How to document an intervention?',a:'Use the Sites tab to take photos before, during, and after the work.'},
        {q:'When am I paid?',a:'Commissions are paid on the 5th of each month. You receive 70% of the billed amount.'},
        {q:'What to do if there is a problem on site?',a:'Contact technical support immediately at +224 610 55 32 56.'},
        {q:'How to improve my ratings?',a:'Be punctual, professional, and ensure the client understands the work performed.'},
      ];

      return (
        <div style={{height:'100%',background:C.gray,overflow:'auto',paddingBottom:'80px'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setScreen('profil')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>❓ {t.faq}</h2>
          </div>
          <div style={{padding:'15px'}}>
            {faqItems.map((item,i)=>(
              <div key={i} onClick={()=>setExpandedFaq(expandedFaq===i?null:i)} style={{background:C.card,borderRadius:'14px',padding:'16px',marginBottom:'10px',cursor:'pointer',borderLeft:`4px solid ${expandedFaq===i?C.primary:C.light}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <p style={{margin:0,fontSize:'14px',fontWeight:'600',color:C.text,flex:1}}>{item.q}</p>
                  <span style={{color:C.primary,fontSize:'18px',transform:expandedFaq===i?'rotate(180deg)':'rotate(0deg)',transition:'transform 0.3s'}}>▼</span>
                </div>
                {expandedFaq===i&&<p style={{margin:'12px 0 0',fontSize:'13px',lineHeight:'1.6',color:C.textSecondary}}>{item.a}</p>}
              </div>
            ))}
          </div>
          <Nav/>
        </div>
      );
    }

    if(screen==='chatbot') {
      const sendChatMessage = async () => {
        if(!chatInput.trim()) return;
        const now = new Date();
        const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
        const userMsg = {id:Date.now(),text:chatInput,isBot:false,time};
        setChatMessages([...chatMessages,userMsg]);
        const userQuestion = chatInput.toLowerCase();
        setChatInput('');

        setTimeout(async ()=>{
          try {
            const { data: settings } = await supabase.from('admin_settings').select('*');
            let companyInfo: any = {};
            let chatbotContext = '';

            if (settings) {
              settings.forEach((item: any) => {
                if (item.setting_key === 'company_info') {
                  try {
                    companyInfo = JSON.parse(item.setting_value);
                  } catch (e) {}
                } else if (item.setting_key === 'chatbot_context') {
                  chatbotContext = item.setting_value;
                }
              });
            }

            let response = '';

            if (userQuestion.includes('nom') || userQuestion.includes('name') || userQuestion.includes('entreprise') || userQuestion.includes('company')) {
              response = lang === 'fr'
                ? `Notre entreprise s'appelle ${companyInfo.name || 'TSD et Fils'}. ${companyInfo.description || ''}`
                : `Our company name is ${companyInfo.name || 'TSD et Fils'}. ${companyInfo.description || ''}`;
            } else if (userQuestion.includes('fondé') || userQuestion.includes('créé') || userQuestion.includes('founded') || userQuestion.includes('created')) {
              response = lang === 'fr'
                ? `${companyInfo.name || 'TSD et Fils'} a été fondée en ${companyInfo.founded || '2020'}.`
                : `${companyInfo.name || 'TSD et Fils'} was founded in ${companyInfo.founded || '2020'}.`;
            } else if (userQuestion.includes('où') || userQuestion.includes('location') || userQuestion.includes('adresse') || userQuestion.includes('address')) {
              response = lang === 'fr'
                ? `Nous sommes situés à ${companyInfo.location || 'Guinée'}.`
                : `We are located in ${companyInfo.location || 'Guinea'}.`;
            } else if (userQuestion.includes('service') || userQuestion.includes('quoi') || userQuestion.includes('what') || userQuestion.includes('faites')) {
              response = chatbotContext || (lang === 'fr'
                ? `${companyInfo.name || 'TSD et Fils'} est spécialisée dans les services de plomberie, d'installation et de maintenance. Nous offrons des solutions de qualité à nos clients.`
                : `${companyInfo.name || 'TSD et Fils'} specializes in plumbing, installation, and maintenance services. We offer quality solutions to our clients.`);
            } else if (userQuestion.includes('contact') || userQuestion.includes('téléphone') || userQuestion.includes('phone') || userQuestion.includes('email')) {
              response = lang === 'fr'
                ? `Vous pouvez contacter le support au +224 610 55 32 56 ou l'administration à contact@tsdetfils.com.`
                : `You can contact support at +224 610 55 32 56 or administration at contact@tsdetfils.com.`;
            } else if (userQuestion.includes('paie') || userQuestion.includes('salaire') || userQuestion.includes('payment') || userQuestion.includes('salary')) {
              response = lang === 'fr'
                ? `Les paiements sont effectués le 5 de chaque mois. Vous recevez 70% du montant facturé.`
                : `Payments are made on the 5th of each month. You receive 70% of the billed amount.`;
            } else if (userQuestion.includes('horaire') || userQuestion.includes('heure') || userQuestion.includes('hour') || userQuestion.includes('schedule')) {
              response = lang === 'fr'
                ? `Consultez votre planning dans l'application. Pour toute question, contactez votre superviseur.`
                : `Check your schedule in the app. For any questions, contact your supervisor.`;
            } else {
              const responses = lang==='fr' ? [
                chatbotContext || 'Message reçu. Un superviseur vous contactera rapidement.',
                'Pour les urgences techniques, appelez le +224 610 55 32 56.',
                'Votre demande est enregistrée. Consultez la FAQ pour des réponses rapides.',
              ] : [
                chatbotContext || 'Message received. A supervisor will contact you shortly.',
                'For technical emergencies, call +224 610 55 32 56.',
                'Your request is recorded. Check the FAQ for quick answers.',
              ];
              response = responses[Math.floor(Math.random()*responses.length)];
            }

            const botMsg = {id:Date.now()+1,text:response,isBot:true,time};
            setChatMessages(prev=>[...prev,botMsg]);
          } catch (error) {
            const fallbackResponses = lang==='fr' ? [
              'Désolé, une erreur est survenue. Veuillez réessayer.',
              'Pour toute question, appelez le +224 610 55 32 56.',
            ] : [
              'Sorry, an error occurred. Please try again.',
              'For any questions, call +224 610 55 32 56.',
            ];
            const botMsg = {id:Date.now()+1,text:fallbackResponses[0],isBot:true,time};
            setChatMessages(prev=>[...prev,botMsg]);
          }
        },1000);
      };

      return (
        <div style={{height:'100%',background:C.gray,display:'flex',flexDirection:'column'}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setScreen('profil')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',color:'#FFF'}}>←</button>
            <div style={{flex:1}}><h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>🤖 {t.chatbot}</h2><p style={{color:'rgba(255,255,255,0.8)',fontSize:'12px',margin:'3px 0 0'}}>{lang==='fr'?'Support technique':'Technical support'}</p></div>
          </div>
          <div style={{flex:1,overflow:'auto',padding:'15px'}}>
            {chatMessages.length===0&&(
              <div style={{textAlign:'center',padding:'20px'}}>
                <div style={{width:'80px',height:'80px',borderRadius:'50%',background:C.card,display:'flex',justifyContent:'center',alignItems:'center',fontSize:'40px',margin:'0 auto 15px'}}>🤖</div>
                <p style={{fontSize:'14px',color:C.text,margin:'0 0 20px'}}>{lang==='fr'?'Support technique TSD et Fils. Comment puis-je vous aider?':'TSD et Fils technical support. How can I help you?'}</p>
              </div>
            )}
            {chatMessages.map(msg=>(
              <div key={msg.id} style={{display:'flex',justifyContent:msg.isBot?'flex-start':'flex-end',marginBottom:'12px'}}>
                <div style={{maxWidth:'80%',background:msg.isBot?C.card:C.primary,borderRadius:msg.isBot?'18px 18px 18px 4px':'18px 18px 4px 18px',padding:'12px 16px'}}>
                  <p style={{margin:0,fontSize:'14px',color:msg.isBot?C.text:'#FFF'}}>{msg.text}</p>
                  <p style={{margin:'6px 0 0',fontSize:'11px',color:msg.isBot?C.textSecondary:'rgba(255,255,255,0.7)',textAlign:'right'}}>{msg.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{padding:'15px',background:C.card,borderTop:`1px solid ${C.light}`}}>
            <div style={{display:'flex',gap:'10px'}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyPress={e=>e.key==='Enter'&&sendChatMessage()} placeholder={t.typeMessage} style={{flex:1,padding:'14px 18px',borderRadius:'25px',border:`1px solid ${C.light}`,background:C.gray,fontSize:'14px',color:C.text,outline:'none'}}/>
              <button onClick={sendChatMessage} style={{width:'50px',height:'50px',borderRadius:'50%',background:`linear-gradient(135deg,${C.primary},${C.secondary})`,border:'none',cursor:'pointer',display:'flex',justifyContent:'center',alignItems:'center'}}>
                <span style={{color:'#FFF',fontSize:'20px'}}>→</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const SuccessModal = () => (<div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:200}}><div style={{background:C.card,borderRadius:'24px',padding:'30px',textAlign:'center',margin:'20px'}}><div style={{width:'70px',height:'70px',borderRadius:'50%',background:'#E8F8EF',display:'flex',justifyContent:'center',alignItems:'center',margin:'0 auto 15px',fontSize:'35px'}}>✅</div><h3 style={{margin:'0 0 10px',fontSize:'18px',color:C.text}}>{lang==='fr'?'Succès !':'Success!'}</h3><p style={{color:C.textSecondary,fontSize:'14px',margin:0}}>{lang==='fr'?'Merci !':'Thank you!'}</p></div></div>);

  const GpsMapModal = () => {
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [selectedTechOnMap, setSelectedTechOnMap] = useState<any>(null);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartY, setDragStartY] = useState(0);
    const [initialOffset, setInitialOffset] = useState(0);
    const [isPanningMap, setIsPanningMap] = useState(false);
    const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [initialPanPosition, setInitialPanPosition] = useState({ x: 0, y: 0 });

    const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
      setIsDragging(true);
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setDragStartY(clientY);
      setInitialOffset(dragOffset);
    }, [dragOffset]);

    const handleDragMove = useCallback((e: TouchEvent | MouseEvent) => {
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const diff = clientY - dragStartY;
      const newOffset = Math.max(0, Math.min(window.innerHeight * 0.8, initialOffset + diff));
      setDragOffset(newOffset);
    }, [dragStartY, initialOffset]);

    const handleDragEnd = useCallback(() => {
      setIsDragging(false);

      const windowHeight = window.innerHeight;
      const snapPositions = [0, windowHeight * 0.5, windowHeight * 0.8];

      setDragOffset(prevOffset => {
        let closestSnap = snapPositions[0];
        let minDistance = Math.abs(prevOffset - closestSnap);

        for (const snap of snapPositions) {
          const distance = Math.abs(prevOffset - snap);
          if (distance < minDistance) {
            minDistance = distance;
            closestSnap = snap;
          }
        }

        return closestSnap;
      });
    }, []);

    const handleMapPanStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
      e.stopPropagation();
      setIsPanningMap(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setPanStart({ x: clientX, y: clientY });
      setInitialPanPosition(panPosition);
    }, [panPosition]);

    const handleMapPanMove = useCallback((e: TouchEvent | MouseEvent) => {
      if (!isPanningMap) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - panStart.x;
      const deltaY = clientY - panStart.y;
      setPanPosition({
        x: initialPanPosition.x + deltaX,
        y: initialPanPosition.y + deltaY
      });
    }, [isPanningMap, panStart, initialPanPosition]);

    const handleMapPanEnd = useCallback(() => {
      setIsPanningMap(false);
    }, []);

    useEffect(() => {
      if (isDragging) {
        const handleMove = (e: TouchEvent | MouseEvent) => {
          e.preventDefault();
          handleDragMove(e);
        };
        const handleEnd = () => handleDragEnd();

        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('touchend', handleEnd);
        window.addEventListener('mouseup', handleEnd);

        return () => {
          window.removeEventListener('touchmove', handleMove);
          window.removeEventListener('mousemove', handleMove);
          window.removeEventListener('touchend', handleEnd);
          window.removeEventListener('mouseup', handleEnd);
        };
      }
    }, [isDragging, handleDragMove, handleDragEnd]);

    useEffect(() => {
      if (isPanningMap) {
        const handleMove = (e: TouchEvent | MouseEvent) => {
          e.preventDefault();
          handleMapPanMove(e);
        };
        const handleEnd = () => handleMapPanEnd();

        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('touchend', handleEnd);
        window.addEventListener('mouseup', handleEnd);

        return () => {
          window.removeEventListener('touchmove', handleMove);
          window.removeEventListener('mousemove', handleMove);
          window.removeEventListener('touchend', handleEnd);
          window.removeEventListener('mouseup', handleEnd);
        };
      }
    }, [isPanningMap, handleMapPanMove, handleMapPanEnd]);

    const [teamFilter, setTeamFilter] = useState<'all'|'tech'|'bureau'>('all');

    const statuses = [
      { key: 'Mission', label: lang==='fr'?'En Mission':'On Mission', icon: '🚀', color: C.success },
      { key: 'Disponible', label: lang==='fr'?'Disponible':'Available', icon: '✅', color: C.primary },
      { key: 'Pause', label: lang==='fr'?'En Pause':'On Break', icon: '☕', color: C.warning },
      { key: 'Conge', label: lang==='fr'?'En Conge':'On Leave', icon: '🏖️', color: '#9B59B6' },
      { key: 'Maladie', label: lang==='fr'?'Maladie':'Sick', icon: '🏥', color: C.danger },
      { key: 'Bureau', label: lang==='fr'?'Au Bureau':'At Office', icon: '🏢', color: '#1e40af' }
    ];

    const officeStaff = [
      { id: 101, nom: 'Aissatou Bah', role: 'RH', statut: 'Bureau', photo: '👩🏾‍💼', color: '#1e40af', teamType: 'bureau' as const },
      { id: 102, nom: 'Mariama Diallo', role: lang==='fr'?'Secrétariat':'Secretary', statut: 'Bureau', photo: '👩🏾‍💻', color: '#3b82f6', teamType: 'bureau' as const },
      { id: 103, nom: 'Abdoulaye Camara', role: 'Finance', statut: 'Bureau', photo: '👨🏾‍💼', color: '#1e40af', teamType: 'bureau' as const },
      { id: 104, nom: 'Kadiatou Sylla', role: lang==='fr'?'Comptable':'Accountant', statut: 'Bureau', photo: '👩🏾', color: '#3b82f6', teamType: 'bureau' as const },
      { id: 105, nom: 'Boubacar Balde', role: lang==='fr'?'Magasinier':'Storekeeper', statut: 'Mission', photo: '👨🏾', color: '#1e40af', teamType: 'bureau' as const },
      { id: 106, nom: 'Fatoumata Keita', role: 'Assistant', statut: 'Pause', photo: '👩🏾‍🦱', color: '#3b82f6', teamType: 'bureau' as const },
    ];

    const allTechsMapped = techs.map((tech, idx) => ({
      ...tech,
      teamType: 'tech' as const,
      statut: ['Mission', 'Disponible', 'Pause', 'Conge', 'Maladie', 'Mission', 'Disponible', 'Mission'][idx % 8],
      location: [
        {name: 'Conakry - Kaloum', lat: 9.51, lng: -13.71},
        {name: 'Conakry - Matam', lat: 9.54, lng: -13.68},
        {name: 'Conakry - Ratoma', lat: 9.57, lng: -13.65},
        {name: 'Kindia', lat: 10.05, lng: -12.85},
        {name: 'Mamou', lat: 10.38, lng: -12.09},
        {name: 'Labe', lat: 11.32, lng: -12.29},
        {name: 'Kankan', lat: 10.39, lng: -9.31},
        {name: 'Nzerekore', lat: 7.75, lng: -8.82}
      ][idx % 8],
      battery: [87, 92, 78, 85, 90, 76, 88, 94][idx % 8],
      distance: [12.5, 8.3, 15.7, 23.4, 18.9, 31.2, 6.8, 42.1][idx % 8],
      duration: ['2h 15min', '1h 45min', '3h 05min', '3h 45min', '2h 50min', '4h 20min', '1h 10min', '5h 35min'][idx % 8]
    }));

    const allOfficeMapped = officeStaff.map((staff, idx) => ({
      ...staff,
      location: [
        {name: 'Conakry - Kaloum', lat: 9.51, lng: -13.71},
        {name: 'Conakry - Kaloum', lat: 9.515, lng: -13.712},
        {name: 'Conakry - Matam', lat: 9.54, lng: -13.68},
        {name: 'Conakry - Kaloum', lat: 9.508, lng: -13.708},
        {name: 'Conakry - Ratoma', lat: 9.57, lng: -13.65},
        {name: 'Conakry - Kaloum', lat: 9.512, lng: -13.715},
      ][idx % 6],
      battery: [95, 88, 91, 82, 79, 93][idx % 6],
      distance: [2.1, 1.5, 3.8, 0.8, 5.2, 1.2][idx % 6],
      duration: ['7h 30min', '6h 45min', '8h 00min', '5h 15min', '7h 00min', '6h 30min'][idx % 6],
      ca: 0,
      chantier: lang==='fr'?'Bureau':'Office',
      sat: 0,
      lat: null as number | null,
      lng: null as number | null
    }));

    const allMembers = [...allTechsMapped, ...allOfficeMapped];
    const allTechs = teamFilter === 'tech' ? allTechsMapped : teamFilter === 'bureau' ? allOfficeMapped : allMembers;

    const filteredTechs = statusFilter ? allTechs.filter(t => t.statut === statusFilter) : allTechs;

    const getStatusColor = (statut: string) => {
      const status = statuses.find(s => s.key === statut);
      return status ? status.color : C.textSecondary;
    };

    const getStatusCount = (key: string) => allTechs.filter(t => t.statut === key).length;

    return (
      <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.3)',zIndex:300}} onClick={()=>setShowGpsMap(false)}>
        <div
          style={{
            position:'absolute',
            top:`${dragOffset}px`,
            left:0,
            right:0,
            bottom:0,
            background:C.bg,
            borderRadius:'25px 25px 0 0',
            boxShadow:'0 -4px 30px rgba(0,0,0,0.3)',
            overflow:'auto',
            transition: isDragging ? 'none' : 'top 0.3s ease-out'
          }}
          onClick={(e)=>e.stopPropagation()}
        >
          <div
            style={{
              background:`linear-gradient(135deg,${C.primary},${C.secondary})`,
              padding:'8px 20px 20px',
              borderRadius:'25px 25px 0 0',
              boxShadow:'0 4px 15px rgba(0,0,0,0.15)',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none'
            }}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            <div
              style={{
                width:'60px',
                height:'5px',
                background:'rgba(255,255,255,0.4)',
                borderRadius:'10px',
                margin:'0 auto 12px',
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
            />
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <span style={{fontSize:'28px'}}>📍</span>
                <div>
                  <h2 style={{color:'#FFF',fontSize:'18px',margin:0}}>{lang==='fr'?'GPS EN DIRECT - Guinee':'LIVE GPS - Guinea'}</h2>
                  <p style={{color:'rgba(255,255,255,0.8)',fontSize:'12px',margin:'3px 0 0'}}>{filteredTechs.length} {lang==='fr'?'membres affiches':'members displayed'}</p>
                </div>
              </div>
              <button onClick={()=>setShowGpsMap(false)} style={{background:'rgba(255,255,255,0.2)',color:'#FFF',border:'2px solid #FFF',padding:'8px 16px',borderRadius:'12px',fontWeight:'600',cursor:'pointer',fontSize:'14px'}}>X {lang==='fr'?'Fermer':'Close'}</button>
            </div>
          </div>

        <div style={{padding:'15px'}}>
          <div style={{display:'flex',gap:'8px',marginBottom:'15px'}}>
            {([
              {key:'all' as const,label:lang==='fr'?'Tous':'All',icon:'👥',count:allMembers.length},
              {key:'tech' as const,label:lang==='fr'?'Techniciens':'Technicians',icon:'👷',count:allTechsMapped.length},
              {key:'bureau' as const,label:'Bureau',icon:'🏢',count:allOfficeMapped.length}
            ]).map(f=>(
              <button key={f.key} onClick={()=>{setTeamFilter(f.key);setStatusFilter(null);}} style={{flex:1,padding:'12px 8px',borderRadius:'14px',border:teamFilter===f.key?'2px solid #FFF':'2px solid transparent',background:teamFilter===f.key?'rgba(255,255,255,0.2)':C.card,cursor:'pointer',textAlign:'center',transition:'all 0.2s'}}>
                <span style={{fontSize:'18px',display:'block'}}>{f.icon}</span>
                <span style={{fontSize:'11px',fontWeight:'700',color:teamFilter===f.key?C.text:C.textSecondary,display:'block',marginTop:'4px'}}>{f.label}</span>
                <span style={{fontSize:'16px',fontWeight:'800',color:teamFilter===f.key?C.primary:C.text,display:'block',marginTop:'2px'}}>{f.count}</span>
              </button>
            ))}
          </div>
          <div style={{display:'flex',gap:'10px',overflowX:'auto',paddingBottom:'10px',marginBottom:'15px'}}>
            <div
              onClick={()=>setStatusFilter(null)}
              style={{
                minWidth:'80px',
                background: statusFilter === null ? C.primary : C.card,
                borderRadius:'12px',
                padding:'12px 15px',
                textAlign:'center',
                cursor:'pointer',
                border: statusFilter === null ? `2px solid ${C.primary}` : `2px solid ${C.light}`,
                transition:'all 0.2s',
                flexShrink:0
              }}
            >
              <p style={{margin:0,fontSize:'22px',fontWeight:'bold',color: statusFilter === null ? '#FFF' : C.text}}>{allTechs.length}</p>
              <p style={{margin:'4px 0 0',fontSize:'10px',color: statusFilter === null ? 'rgba(255,255,255,0.9)' : C.textSecondary,fontWeight:'600'}}>{lang==='fr'?'TOUS':'ALL'}</p>
            </div>
            {statuses.map(status => (
              <div
                key={status.key}
                onClick={()=>setStatusFilter(statusFilter === status.key ? null : status.key)}
                style={{
                  minWidth:'90px',
                  background: statusFilter === status.key ? status.color : C.card,
                  borderRadius:'12px',
                  padding:'12px 15px',
                  textAlign:'center',
                  cursor:'pointer',
                  border: statusFilter === status.key ? `2px solid ${status.color}` : `2px solid ${C.light}`,
                  transition:'all 0.2s',
                  flexShrink:0
                }}
              >
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'5px'}}>
                  <span style={{fontSize:'16px'}}>{status.icon}</span>
                  <p style={{margin:0,fontSize:'22px',fontWeight:'bold',color: statusFilter === status.key ? '#FFF' : status.color}}>{getStatusCount(status.key)}</p>
                </div>
                <p style={{margin:'4px 0 0',fontSize:'9px',color: statusFilter === status.key ? 'rgba(255,255,255,0.9)' : C.textSecondary,fontWeight:'600',textTransform:'uppercase'}}>{status.label}</p>
              </div>
            ))}
          </div>

          <div style={{background:C.card,borderRadius:'20px',padding:'15px',marginBottom:'15px',position:'relative',minHeight:`${300 * zoomLevel}px`,border:`2px solid ${C.light}`,overflow:'hidden'}}>
            <div style={{position:'absolute',top:'10px',right:'10px',display:'flex',flexDirection:'column',gap:'5px',zIndex:10}}>
              <button onClick={()=>setZoomLevel(Math.min(zoomLevel + 0.25, 2))} style={{width:'40px',height:'40px',borderRadius:'10px',background:C.primary,color:'#FFF',border:'none',fontSize:'20px',fontWeight:'bold',cursor:'pointer',boxShadow:'0 2px 10px rgba(0,0,0,0.2)'}}>+</button>
              <button onClick={()=>setZoomLevel(Math.max(zoomLevel - 0.25, 0.5))} style={{width:'40px',height:'40px',borderRadius:'10px',background:C.primary,color:'#FFF',border:'none',fontSize:'20px',fontWeight:'bold',cursor:'pointer',boxShadow:'0 2px 10px rgba(0,0,0,0.2)'}}>-</button>
              <button onClick={()=>setZoomLevel(1)} style={{width:'40px',height:'40px',borderRadius:'10px',background:C.light,color:C.text,border:'none',fontSize:'12px',fontWeight:'bold',cursor:'pointer',boxShadow:'0 2px 10px rgba(0,0,0,0.2)'}}>1:1</button>
              <button onClick={()=>{setZoomLevel(1);setPanPosition({x:0,y:0});}} style={{width:'40px',height:'40px',borderRadius:'10px',background:C.secondary,color:'#FFF',border:'none',fontSize:'18px',fontWeight:'bold',cursor:'pointer',boxShadow:'0 2px 10px rgba(0,0,0,0.2)'}} title={lang==='fr'?'Réinitialiser':'Reset'}>⟲</button>
            </div>

            <div style={{position:'absolute',top:'10px',left:'10px',background:'rgba(0,0,0,0.7)',color:'#FFF',padding:'6px 12px',borderRadius:'8px',fontSize:'11px',fontWeight:'600',zIndex:10}}>
              Zoom: {Math.round(zoomLevel * 100)}%
            </div>

            <div
              style={{
                transform:`translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
                transformOrigin:'center center',
                transition: isPanningMap ? 'none' : 'transform 0.3s ease',
                width:'100%',
                height:'100%',
                position:'relative',
                minHeight:'280px',
                cursor: isPanningMap ? 'grabbing' : 'grab'
              }}
              onMouseDown={handleMapPanStart}
              onTouchStart={handleMapPanStart}
            >
              <svg viewBox="0 0 500 600" style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%, -50%)',width:'95%',height:'auto',opacity:0.2,pointerEvents:'none'}}>
                <path d="M150,80 Q180,60 220,70 L280,90 Q320,100 350,130 L380,170 Q400,210 390,260 L370,320 Q350,380 320,430 L280,480 Q240,520 200,540 L160,550 Q120,540 90,510 L70,470 Q50,420 60,360 L80,290 Q90,220 110,160 L130,110 Q140,90 150,80 Z" stroke={C.primary} strokeWidth="4" fill={`${C.primary}10`}/>
                <text x="250" y="300" fill={C.primary} fontSize="24" fontWeight="bold" textAnchor="middle">GUINEE</text>
                <circle cx="180" cy="420" r="8" fill={C.success}/>
                <text x="180" y="445" fill={C.textSecondary} fontSize="10" textAnchor="middle">Conakry</text>
                <circle cx="220" cy="350" r="5" fill={C.textSecondary}/>
                <text x="220" y="370" fill={C.textSecondary} fontSize="8" textAnchor="middle">Kindia</text>
                <circle cx="280" cy="300" r="5" fill={C.textSecondary}/>
                <text x="280" y="320" fill={C.textSecondary} fontSize="8" textAnchor="middle">Mamou</text>
                <circle cx="250" cy="200" r="5" fill={C.textSecondary}/>
                <text x="250" y="220" fill={C.textSecondary} fontSize="8" textAnchor="middle">Labe</text>
                <circle cx="380" cy="280" r="5" fill={C.textSecondary}/>
                <text x="380" y="300" fill={C.textSecondary} fontSize="8" textAnchor="middle">Kankan</text>
                <circle cx="350" cy="450" r="5" fill={C.textSecondary}/>
                <text x="350" y="470" fill={C.textSecondary} fontSize="8" textAnchor="middle">Nzerekore</text>
              </svg>

              {filteredTechs.map((tech) => {
                const mapPositions: {[key:string]:{top:string;left:string}} = {
                  'Conakry - Kaloum': {top:'70%',left:'32%'},
                  'Conakry - Matam': {top:'68%',left:'35%'},
                  'Conakry - Ratoma': {top:'66%',left:'38%'},
                  'Kindia': {top:'58%',left:'42%'},
                  'Mamou': {top:'50%',left:'52%'},
                  'Labe': {top:'33%',left:'48%'},
                  'Kankan': {top:'46%',left:'72%'},
                  'Nzerekore': {top:'75%',left:'68%'}
                };
                const pos = mapPositions[tech.location.name] || {top:'50%',left:'50%'};
                const statusColor = getStatusColor(tech.statut);

                return (
                  <div
                    key={tech.id}
                    style={{position:'absolute',top:pos.top,left:pos.left,transform:'translate(-50%, -50%)',zIndex: selectedTechOnMap?.id === tech.id ? 20 : 5}}
                    onClick={()=>setSelectedTechOnMap(selectedTechOnMap?.id === tech.id ? null : tech)}
                  >
                    <div style={{position:'relative',cursor:'pointer'}}>
                      <div style={{
                        width: `${40 / zoomLevel}px`,
                        height: `${40 / zoomLevel}px`,
                        borderRadius:'50%',
                        background:`linear-gradient(135deg,${statusColor},${statusColor}CC)`,
                        border:'3px solid #FFF',
                        display:'flex',
                        justifyContent:'center',
                        alignItems:'center',
                        fontSize:`${20 / zoomLevel}px`,
                        boxShadow:`0 4px 15px ${statusColor}50`,
                        transition:'transform 0.2s'
                      }}>
                        {tech.photo}
                      </div>
                      {tech.statut === 'Mission' && (
                        <div style={{position:'absolute',top:'-3px',right:'-3px',width:`${16 / zoomLevel}px`,height:`${16 / zoomLevel}px`,borderRadius:'50%',background:statusColor,border:'2px solid #FFF',animation:'pulse 2s infinite'}}>
                          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } }`}</style>
                        </div>
                      )}
                    </div>
                    {selectedTechOnMap?.id === tech.id && (
                      <div style={{position:'absolute',top:`${50 / zoomLevel}px`,left:'50%',transform:'translateX(-50%)',minWidth:'180px',background:C.card,padding:'12px',borderRadius:'12px',boxShadow:'0 4px 20px rgba(0,0,0,0.4)',border:`3px solid ${statusColor}`,zIndex:30}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                          <span style={{fontSize:'24px'}}>{tech.photo}</span>
                          <div>
                            <p style={{margin:0,fontSize:'13px',fontWeight:'bold',color:C.text}}>{tech.nom}</p>
                            <p style={{margin:'2px 0 0',fontSize:'10px',color:C.textSecondary}}>{tech.role}</p>
                          </div>
                        </div>
                        <p style={{margin:'0 0 6px',fontSize:'11px',color:C.textSecondary,display:'flex',alignItems:'center',gap:'5px'}}>
                          <span>📍</span> {tech.location.name}
                        </p>
                        <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'8px',fontSize:'10px',color:C.text}}>
                          <span style={{background:C.light,padding:'3px 8px',borderRadius:'6px'}}>🔋 {tech.battery}%</span>
                          <span style={{background:C.light,padding:'3px 8px',borderRadius:'6px'}}>🚗 {tech.distance}km</span>
                          <span style={{background:C.light,padding:'3px 8px',borderRadius:'6px'}}>⏱️ {tech.duration}</span>
                        </div>
                        <div style={{padding:'6px 10px',borderRadius:'8px',background:`${statusColor}20`,fontSize:'11px',fontWeight:'bold',color:statusColor,textAlign:'center'}}>
                          {statuses.find(s=>s.key===tech.statut)?.icon} {statuses.find(s=>s.key===tech.statut)?.label}
                        </div>
                        <button onClick={(e)=>{e.stopPropagation();setSelectedTechOnMap(null);}} style={{position:'absolute',top:'-8px',right:'-8px',width:'24px',height:'24px',borderRadius:'50%',background:C.danger,color:'#FFF',border:'2px solid #FFF',fontSize:'12px',fontWeight:'bold',cursor:'pointer'}}>X</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{background:C.card,borderRadius:'16px',padding:'15px',marginBottom:'15px'}}>
            <h3 style={{margin:'0 0 12px',fontSize:'14px',fontWeight:'bold',color:C.text}}>
              {teamFilter==='bureau'?'🏢':'👷'} {teamFilter==='bureau'?(lang==='fr'?'Personnel Bureau':'Office Staff'):teamFilter==='tech'?(lang==='fr'?'Techniciens':'Technicians'):(lang==='fr'?'Tous les membres':'All Members')} {statusFilter && `(${statuses.find(s=>s.key===statusFilter)?.label})`}
            </h3>
            <div style={{maxHeight:'250px',overflowY:'auto'}}>
              {filteredTechs.map(tech => (
                <div key={`${tech.teamType}-${tech.id}`} onClick={()=>setSelectedTechOnMap(tech)} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px',background:selectedTechOnMap?.id === tech.id ? `${getStatusColor(tech.statut)}15` : 'transparent',borderRadius:'10px',marginBottom:'8px',cursor:'pointer',border:`2px solid ${selectedTechOnMap?.id === tech.id ? getStatusColor(tech.statut) : 'transparent'}`,transition:'all 0.2s'}}>
                  <div style={{position:'relative'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'50%',background:`linear-gradient(135deg,${getStatusColor(tech.statut)},${getStatusColor(tech.statut)}CC)`,display:'flex',justifyContent:'center',alignItems:'center',fontSize:'20px',border:'2px solid #FFF',boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
                      {tech.photo}
                    </div>
                    <div style={{position:'absolute',bottom:'-2px',right:'-2px',width:'16px',height:'16px',borderRadius:'50%',background:tech.teamType==='bureau'?'#1e40af':C.success,border:'2px solid #FFF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'8px'}}>
                      {tech.teamType==='bureau'?'🏢':'🔧'}
                    </div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                      <p style={{margin:0,fontSize:'13px',fontWeight:'bold',color:C.text}}>{tech.nom}</p>
                      <span style={{padding:'2px 6px',borderRadius:'6px',fontSize:'9px',fontWeight:'700',background:tech.teamType==='bureau'?'#1e40af20':'#10B98120',color:tech.teamType==='bureau'?'#1e40af':'#10B981'}}>
                        {tech.teamType==='bureau'?(lang==='fr'?'Bureau':'Office'):(lang==='fr'?'Tech':'Tech')}
                      </span>
                    </div>
                    <p style={{margin:'2px 0 0',fontSize:'11px',color:C.textSecondary}}>📍 {tech.location.name} • {tech.role}</p>
                  </div>
                  <div style={{padding:'5px 10px',borderRadius:'8px',background:`${getStatusColor(tech.statut)}20`,fontSize:'10px',fontWeight:'bold',color:getStatusColor(tech.statut)}}>
                    {statuses.find(s=>s.key===tech.statut)?.icon} {tech.statut}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{background:C.card,borderRadius:'16px',padding:'15px'}}>
            <h3 style={{margin:'0 0 15px',fontSize:'14px',fontWeight:'bold',color:C.text}}>📊 {lang==='fr'?'Resume':'Summary'}</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
              <div style={{background:C.light,borderRadius:'12px',padding:'12px',textAlign:'center'}}>
                <p style={{margin:0,fontSize:'20px',fontWeight:'bold',color:C.primary}}>{safeFixed(allTechs.reduce((sum,t)=>sum+t.distance,0), 1)} km</p>
                <p style={{margin:'4px 0 0',fontSize:'10px',color:C.textSecondary}}>{lang==='fr'?'Distance totale':'Total distance'}</p>
              </div>
              <div style={{background:C.light,borderRadius:'12px',padding:'12px',textAlign:'center'}}>
                <p style={{margin:0,fontSize:'20px',fontWeight:'bold',color:C.warning}}>{Math.round(allTechs.reduce((sum,t)=>sum+t.battery,0)/(allTechs.length||1))}%</p>
                <p style={{margin:'4px 0 0',fontSize:'10px',color:C.textSecondary}}>{lang==='fr'?'Batterie moy.':'Avg battery'}</p>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <div style={{background:'#10B98115',borderRadius:'12px',padding:'12px',textAlign:'center',border:'2px solid #10B98130'}}>
                <p style={{margin:0,fontSize:'20px',fontWeight:'bold',color:C.success}}>{allTechsMapped.length}</p>
                <p style={{margin:'4px 0 0',fontSize:'10px',color:C.textSecondary}}>👷 {lang==='fr'?'Techniciens':'Technicians'}</p>
              </div>
              <div style={{background:'#1e40af15',borderRadius:'12px',padding:'12px',textAlign:'center',border:'2px solid #1e40af30'}}>
                <p style={{margin:0,fontSize:'20px',fontWeight:'bold',color:'#1e40af'}}>{allOfficeMapped.length}</p>
                <p style={{margin:'4px 0 0',fontSize:'10px',color:C.textSecondary}}>🏢 {lang==='fr'?'Bureau':'Office'}</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  };

  const handleAcceptGlobalCall = useCallback((_call: any) => {
    incomingRingtone.stop();
  }, []);

  return (
    <div style={{width:'100%',minHeight:'100vh',position:'relative',background:C.bg}}>
      {!isLoggedIn && (
        <LoginScreen
          colors={C}
          translations={t}
          lang={lang}
          darkMode={darkMode}
          onLoginSuccess={handleLoginSuccess}
          onLanguageChange={() => setLang(lang === 'fr' ? 'en' : lang === 'en' ? 'ar' : 'fr')}
          onDarkModeToggle={() => setDarkMode(!darkMode)}
          onBackToHome={onBackToVisitor}
          isPasswordRecovery={isPasswordRecovery}
        />
      )}
      {isLoggedIn && showWelcome && (
        <WelcomeIntroPage
          lang={lang}
          darkMode={darkMode}
          onComplete={() => setShowWelcome(false)}
          user={currentUser}
          role={userRole || 'client'}
        />
      )}
      {isLoggedIn && !showWelcome && userRole === 'client' && ClientApp()}
      {isLoggedIn && !showWelcome && userRole === 'tech' && TechApp()}
      {isLoggedIn && !showWelcome && userRole === 'office' && (
        <OfficeApp
          currentUser={currentUser}
          darkMode={darkMode}
          lang={lang}
          t={t}
          legalTermsAccepted={legalTermsAccepted}
          setLegalTermsAccepted={setLegalTermsAccepted}
          setIsLoggedIn={setIsLoggedIn}
          setUserRole={setUserRole}
          handleLogout={handleLogout}
          setLang={setLang}
          setDarkMode={setDarkMode}
          weekDays={weekDays}
          planning={planning}
          expandedFaq={expandedFaq}
          setExpandedFaq={setExpandedFaq}
          profilePhoto={profilePhoto}
          setProfilePhoto={setProfilePhoto}
          coverPhoto={coverPhoto}
          setCoverPhoto={setCoverPhoto}
        />
      )}
      {isLoggedIn && !showWelcome && userRole === 'admin' && (
        <AdminDashboardEnhanced
          currentUser={currentUser}
          darkMode={darkMode}
          lang={lang}
          onBack={handleLogout}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />
      )}
      {showSuccess && <SuccessModal/>}
      {showGpsMap && <GpsMapModal/>}
      {showAccountManager && (
        <AccountManager
          lang={lang}
          darkMode={darkMode}
          onClose={() => setShowAccountManager(false)}
        />
      )}
      {showAdminSettings && (
        <AdminSettings
          darkMode={darkMode}
          lang={lang}
          onBack={() => setShowAdminSettings(false)}
          currentUser={currentUser}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />
      )}
      {showChatbot && (
        <IntelligentChatbot
          darkMode={darkMode}
          lang={lang}
          onClose={() => setShowChatbot(false)}
          currentUser={currentUser}
        />
      )}
      {isLoggedIn && currentUser && (
        <NotificationProvider currentUser={currentUser} onAcceptCall={handleAcceptGlobalCall}>
          <RealtimeNotifications
            currentUser={currentUser}
            darkMode={darkMode}
          />
          {!showMessaging && <MessagingBadge />}
          {showMessaging && (
            <MessagingSystem
              currentUser={currentUser}
              darkMode={darkMode}
              lang={lang}
              onBack={() => setShowMessaging(false)}
            />
          )}
        </NotificationProvider>
      )}
      {isLoggedIn && !showWelcome && (
        <>
          <button
            onClick={() => setShowChatbot(!showChatbot)}
            style={{
              position: 'fixed',
              bottom: '85px',
              right: '16px',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: showChatbot
                ? `linear-gradient(135deg, ${C.danger}, #dc2626)`
                : `linear-gradient(135deg, ${C.secondary}, ${C.primary})`,
              border: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              cursor: 'pointer',
              fontSize: '26px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10002,
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {showChatbot ? '\u2715' : '\uD83D\uDCAC'}
          </button>
          {currentUser && (userRole === 'admin' || userRole === 'tech' || userRole === 'client' || userRole === 'office') && (
            <button
              onClick={() => setShowMessaging(true)}
              style={{
                position: 'fixed',
                bottom: '150px',
                right: '16px',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, #10B981, #059669)`,
                border: 'none',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                cursor: 'pointer',
                fontSize: '28px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 999,
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {'\u2709\uFE0F'}
            </button>
          )}
        </>
      )}
    </div>
  );
};

function MessagingBadge() {
  const { totalBadgeCount } = useNotifications();
  if (totalBadgeCount <= 0) return null;
  return (
    <div style={{
      position: 'fixed',
      bottom: '190px',
      right: '12px',
      minWidth: '22px',
      height: '22px',
      borderRadius: '11px',
      background: '#EF4444',
      color: '#FFF',
      fontSize: '12px',
      fontWeight: '800',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 6px',
      zIndex: 1000,
      border: '2px solid #FFF',
      boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
      animation: 'badgePop 0.3s ease',
      pointerEvents: 'none',
    }}>
      {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
      <style>{`
        @keyframes badgePop {
          0% { transform: scale(0); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}


export default TSDApp;
