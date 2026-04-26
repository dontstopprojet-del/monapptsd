import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface ChatbotProps {
  darkMode: boolean;
  lang: string;
  onClose: () => void;
  currentUser?: any;
}

interface ChatMessage {
  id: number;
  text: string;
  isBot: boolean;
  time: string;
  options?: string[];
  category?: string;
  attachments?: string[];
}

interface KnowledgeItem {
  response: string;
  keywords: string[];
  category: string;
  relatedTopics?: string[];
}

const IntelligentChatbot = ({ darkMode, lang, onClose, currentUser }: ChatbotProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 800;
    const h = typeof window !== 'undefined' ? window.innerHeight : 600;
    const chatW = Math.min(420, w - 20);
    const chatH = Math.min(620, h - 20);
    return { x: Math.max(0, w - chatW - 20), y: Math.max(20, (h - chatH) / 2 - 50) };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const chatboxRef = useRef<HTMLDivElement>(null);

  const C = {
    primary: '#00bcd4',
    primaryDark: '#00838f',
    primaryLight: '#00e5ff',
    accent: '#26c6da',
    success: '#00bfa5',
    danger: '#EF4444',
    warning: '#F59E0B',
    card: darkMode ? '#1e293b' : '#FFFFFF',
    bg: darkMode ? '#0f172a' : '#f8fafc',
    bgSecondary: darkMode ? '#1e293b' : '#f1f5f9',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#334155' : '#e2e8f0',
    hover: darkMode ? '#334155' : '#f8fafc',
    shadow: darkMode ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)',
    botMessage: darkMode ? '#1e3a3f' : '#e0f7fa',
    userMessage: darkMode ? '#00838f' : '#00bcd4',
  };

  const t = lang === 'fr' ? {
    title: 'Assistant Intelligent TSD',
    subtitle: 'Disponible 24/7 pour vous aider',
    placeholder: 'Posez votre question...',
    send: 'Envoyer',
    suggestions: 'Suggestions rapides',
    typing: 'En train d\'écrire...',
    quickReplies: 'Réponses rapides',
    clearHistory: 'Effacer l\'historique',
    saveConversation: 'Sauvegarder',
    newConversation: 'Nouvelle conversation',
  } : lang === 'en' ? {
    title: 'TSD Intelligent Assistant',
    subtitle: 'Available 24/7 to help you',
    placeholder: 'Ask your question...',
    send: 'Send',
    suggestions: 'Quick suggestions',
    typing: 'Typing...',
    quickReplies: 'Quick replies',
    clearHistory: 'Clear history',
    saveConversation: 'Save',
    newConversation: 'New conversation',
  } : {
    title: 'مساعد TSD الذكي',
    subtitle: 'متاح 24/7 لمساعدتك',
    placeholder: 'اسأل سؤالك...',
    send: 'إرسال',
    suggestions: 'اقتراحات سريعة',
    typing: 'يكتب...',
    quickReplies: 'ردود سريعة',
    clearHistory: 'مسح السجل',
    saveConversation: 'حفظ',
    newConversation: 'محادثة جديدة',
  };

  const knowledgeBase: Record<string, KnowledgeItem> = {
    company: {
      response: lang === 'fr'
        ? '🏢 TSD & FILS - Excellence en Plomberie Pro\n\n✨ Qui sommes-nous?\nEntreprise guinéenne de référence fondée par un expert formé en Belgique avec 6+ ans d\'expérience européenne.\n\n📍 Basée à Conakry, Guinée\n🎯 Spécialiste en plomberie professionnelle\n🏆 Certification ISO & normes européennes\n💼 Services B2B et particuliers\n🌟 100+ projets réalisés en Belgique\n\n🔧 Notre expertise:\n• Installation sanitaire complète\n• Systèmes de chauffage moderne\n• Plomberie industrielle\n• Maintenance préventive\n• Solutions d\'urgence 24/7\n\n💰 Tarifs:\n• Devis GRATUIT\n• Deplacement en ville jusqu\'a la Cimenterie: 120 000 GNF\n• De la Cimenterie au reste de Conakry: 290 000 GNF\n• Hors Conakry (ex: Kindia): a partir de 1 150 000 GNF'
        : '🏢 TSD & FILS - Professional Plumbing Excellence\n\n✨ Who we are?\nLeading Guinean company founded by a Belgium-trained expert with 6+ years European experience.\n\n📍 Based in Conakry, Guinea\n🎯 Professional plumbing specialist\n🏆 ISO certified & European standards\n💼 B2B and individual services\n🌟 100+ projects completed in Belgium\n\n🔧 Our expertise:\n• Complete sanitary installation\n• Modern heating systems\n• Industrial plumbing\n• Preventive maintenance\n• 24/7 emergency solutions\n\n💰 Pricing:\n• FREE Quote\n• Travel in city to Cimenterie: 120,000 GNF\n• From Cimenterie to rest of Conakry: 290,000 GNF\n• Outside Conakry (e.g. Kindia): from 1,150,000 GNF',
      keywords: ['tsd', 'fils', 'entreprise', 'qui', 'societe', 'company', 'about', 'presentation', 'histoire'],
      category: 'company',
      relatedTopics: ['services', 'garantie', 'techniciens'],
    },
    services: {
      response: lang === 'fr'
        ? '🛠️ NOS SERVICES PROFESSIONNELS\n\n🔧 PLOMBERIE COMPLÈTE\n• Installation sanitaire neuve\n• Réparation et dépannage\n• Débouchage canalisation\n• Détection de fuites\n• Remplacement tuyauterie\n• Robinetterie de qualité\n\n⚡ ÉLECTRICITÉ\n• Installation électrique complète\n• Mise aux normes\n• Dépannage électrique\n• Tableaux électriques\n• Éclairage LED économique\n\n❄️ CLIMATISATION\n• Installation clim split/centrale\n• Maintenance préventive\n• Réparation toutes marques\n• Recharge gaz réfrigérant\n• Nettoyage professionnel\n\n🏗️ CONSTRUCTION\n• Travaux de bâtiment\n• Rénovation complète\n• Extension de maison\n• Maçonnerie\n• Carrelage & finitions\n\n🚨 URGENCES 24/7\n• Fuites d\'eau\n• Pannes électriques\n• Climatisation\n• Canalisations bouchées\n\n💰 TARIFS TRANSPARENTS\n✅ Devis gratuit sous 24h\n✅ Garantie travaux 6 mois\n✅ Paiement flexible'
        : '🛠️ OUR PROFESSIONAL SERVICES\n\n🔧 COMPLETE PLUMBING\n• New sanitary installation\n• Repair & troubleshooting\n• Pipe unblocking\n• Leak detection\n• Pipe replacement\n• Quality faucets\n\n⚡ ELECTRICITY\n• Complete electrical installation\n• Standards compliance\n• Electrical troubleshooting\n• Electrical panels\n• Energy-efficient LED lighting\n\n❄️ AIR CONDITIONING\n• Split/central AC installation\n• Preventive maintenance\n• All brands repair\n• Refrigerant recharge\n• Professional cleaning\n\n🏗️ CONSTRUCTION\n• Building works\n• Complete renovation\n• House extension\n• Masonry\n• Tiling & finishes\n\n🚨 24/7 EMERGENCIES\n• Water leaks\n• Electrical failures\n• Air conditioning\n• Blocked pipes\n\n💰 TRANSPARENT PRICING\n✅ Free quote within 24h\n✅ 6 months work guarantee\n✅ Flexible payment',
      keywords: ['service', 'services', 'faire', 'proposer', 'offre', 'plomberie', 'electricite', 'climatisation', 'construction', 'what do'],
      category: 'services',
      relatedTopics: ['devis', 'urgence', 'garantie'],
    },
    devis: {
      response: lang === 'fr'
        ? '💰 DEMANDE DE DEVIS GRATUIT ET RAPIDE\n\n📝 ÉTAPES SIMPLES:\n\n1️⃣ Créez votre compte (2 min)\n   • Email + mot de passe\n   • Validation instantanée\n\n2️⃣ Décrivez votre projet\n   • Type de travaux\n   • Surface/quantités\n   • Date souhaitée\n\n3️⃣ Ajoutez des photos\n   • État actuel\n   • Zone concernée\n   • Détails importants\n\n4️⃣ Recevez votre devis\n   ⏱️ Sous 24h maximum\n   📊 Détaillé et transparent\n   💰 Prix compétitifs\n\n✅ INCLUS DANS LE DEVIS:\n• Détail des matériaux\n• Coût de la main d\'œuvre\n• Frais de déplacement\n• Délais d\'exécution\n• Conditions de paiement\n• Garanties\n\n🎁 BONUS:\n• Visite technique gratuite (Conakry)\n• Conseils d\'expert inclus\n• Modification gratuite du devis\n• Sans engagement\n\n📞 Besoin d\'aide?\n+224 610 55 32 55'
        : '💰 FREE AND FAST QUOTE REQUEST\n\n📝 SIMPLE STEPS:\n\n1️⃣ Create your account (2 min)\n   • Email + password\n   • Instant validation\n\n2️⃣ Describe your project\n   • Type of work\n   • Surface/quantities\n   • Desired date\n\n3️⃣ Add photos\n   • Current state\n   • Concerned area\n   • Important details\n\n4️⃣ Receive your quote\n   ⏱️ Within 24h max\n   📊 Detailed and transparent\n   💰 Competitive prices\n\n✅ INCLUDED IN QUOTE:\n• Material details\n• Labor cost\n• Travel expenses\n• Execution time\n• Payment terms\n• Guarantees\n\n🎁 BONUS:\n• Free technical visit (Conakry)\n• Expert advice included\n• Free quote modification\n• No commitment\n\n📞 Need help?\n+224 610 55 32 55',
      keywords: ['devis', 'estimation', 'prix', 'cout', 'tarif', 'quote', 'price', 'combien', 'how much', 'gratuit'],
      category: 'commercial',
      relatedTopics: ['facturation', 'services', 'rdv'],
    },
    facturation: {
      response: lang === 'fr'
        ? '💳 FACTURATION & PAIEMENT FLEXIBLE\n\n💰 MOYENS DE PAIEMENT:\n\n📱 Mobile Money:\n• Orange Money ✅\n• MTN Money ✅\n• Transfert instantané\n• Commission à notre charge\n\n🏦 Bancaire:\n• Virement bancaire\n• Chèque d\'entreprise\n• Carte bancaire (bientôt)\n\n💵 Espèces:\n• À la livraison\n• Paiement échelonné possible\n• Reçu officiel fourni\n\n📄 VOS FACTURES:\n\n✅ Envoi automatique par email\n✅ Téléchargeable en PDF\n✅ Disponible dans votre espace\n✅ Détaillée et conforme\n✅ Archivage sécurisé\n\n💎 FACILITÉS DE PAIEMENT:\n\n• Projets < 2M GNF: Paiement comptant\n• Projets 2M-5M GNF: 50% + 50%\n• Projets > 5M GNF: 3 versements\n\n🎁 REMISES FIDÉLITÉ:\n• -5% dès la 3ème intervention\n• -10% après 5 projets\n• -15% clients VIP (10+ projets)\n\n📊 SUIVI PAIEMENTS:\n• Statut en temps réel\n• Historique complet\n• Rappels automatiques\n• Support dédié'
        : '💳 FLEXIBLE BILLING & PAYMENT\n\n💰 PAYMENT METHODS:\n\n📱 Mobile Money:\n• Orange Money ✅\n• MTN Money ✅\n• Instant transfer\n• Fee on us\n\n🏦 Bank:\n• Bank transfer\n• Company check\n• Credit card (coming soon)\n\n💵 Cash:\n• On delivery\n• Staged payment possible\n• Official receipt provided\n\n📄 YOUR INVOICES:\n\n✅ Automatic email sending\n✅ Downloadable PDF\n✅ Available in your space\n✅ Detailed and compliant\n✅ Secure archiving\n\n💎 PAYMENT FACILITIES:\n\n• Projects < 2M GNF: Cash payment\n• Projects 2M-5M GNF: 50% + 50%\n• Projects > 5M GNF: 3 installments\n\n🎁 LOYALTY DISCOUNTS:\n• -5% from 3rd service\n• -10% after 5 projects\n• -15% VIP clients (10+ projects)\n\n📊 PAYMENT TRACKING:\n• Real-time status\n• Complete history\n• Automatic reminders\n• Dedicated support',
      keywords: ['facture', 'facturation', 'paiement', 'payer', 'payment', 'invoice', 'orange money', 'mtn', 'argent', 'bill'],
      category: 'commercial',
      relatedTopics: ['devis', 'garantie'],
    },
    chantiers: {
      response: lang === 'fr'
        ? '📱 SUIVI DE CHANTIER TEMPS RÉEL\n\n🔴 GÉOLOCALISATION LIVE:\n• 📍 Position GPS du technicien\n• 🚗 Trajet en temps réel\n• ⏱️ Temps d\'arrivée estimé\n• 🗺️ Carte interactive\n\n📸 PHOTOS PROGRESSION:\n• Avant travaux (état initial)\n• Pendant (étapes clés)\n• Après (rendu final)\n• Galerie complète sauvegardée\n\n📊 TABLEAU DE BORD:\n• Progression en % en direct\n• Matériaux utilisés\n• Heures travaillées\n• Équipe sur site\n\n💬 COMMUNICATION DIRECTE:\n• Chat avec le technicien\n• Appel direct intégré\n• Questions/réponses instantanées\n• Validation des étapes\n\n🔔 NOTIFICATIONS PUSH:\n• Technicien en route\n• Arrivée sur site (5min)\n• Début des travaux\n• Pause déjeuner\n• Fin de journée\n• Travaux terminés\n\n📝 RAPPORT FINAL:\n• Détail des travaux effectués\n• Liste des matériaux\n• Photos HD avant/après\n• Garanties applicables\n• Conseils d\'entretien\n• QR code facture\n\n✅ VALIDATION CLIENT:\n• Signature électronique\n• Note de satisfaction\n• Commentaire\n• Paiement sécurisé'
        : '📱 REAL-TIME SITE TRACKING\n\n🔴 LIVE GEOLOCATION:\n• 📍 Technician GPS position\n• 🚗 Real-time route\n• ⏱️ Estimated arrival time\n• 🗺️ Interactive map\n\n📸 PROGRESS PHOTOS:\n• Before work (initial state)\n• During (key steps)\n• After (final result)\n• Complete saved gallery\n\n📊 DASHBOARD:\n• Live % progress\n• Materials used\n• Hours worked\n• Team on site\n\n💬 DIRECT COMMUNICATION:\n• Chat with technician\n• Integrated direct call\n• Instant Q&A\n• Step validation\n\n🔔 PUSH NOTIFICATIONS:\n• Technician on the way\n• Site arrival (5min)\n• Work start\n• Lunch break\n• End of day\n• Work completed\n\n📝 FINAL REPORT:\n• Work details\n• Materials list\n• HD before/after photos\n• Applicable guarantees\n• Maintenance advice\n• Invoice QR code\n\n✅ CLIENT VALIDATION:\n• Electronic signature\n• Satisfaction rating\n• Comment\n• Secure payment',
      keywords: ['chantier', 'travaux', 'suivi', 'avancement', 'progression', 'project', 'tracking', 'map', 'gps', 'localisation'],
      category: 'tracking',
      relatedTopics: ['techniciens', 'messagerie'],
    },
    urgence: {
      response: lang === 'fr'
        ? '🚨 SERVICE D\'URGENCE 24/7/365 🚨\n\n📞 NUMÉROS D\'URGENCE:\n\n🔴 Principal: +224 610 55 32 55\n📧 Email: urgence@tsdetfils.com\n💬 WhatsApp: +224 610 55 32 55\n📱 App: Bouton SOS rouge\n\n⏱️ DÉLAIS D\'INTERVENTION:\n\n• Conakry centre: 30-60 min\n• Conakry périphérie: 1-2h\n• Coyah/Dubréka: 2-3h\n• Urgences vitales: IMMÉDIAT\n\n🚨 URGENCES TRAITÉES:\n\n💧 PLOMBERIE:\n• Fuite d\'eau majeure\n• Inondation\n• Chauffe-eau dangereux\n• Canalisation éclatée\n• Compteur défectueux\n\n⚡ ÉLECTRICITÉ:\n• Court-circuit\n• Tableau électrique en feu\n• Câbles apparents dangereux\n• Panne totale d\'électricité\n• Odeur de brûlé\n\n❄️ CLIMATISATION:\n• Fuite de gaz réfrigérant\n• Surchauffe moteur\n• Panne totale (forte chaleur)\n\n🛡️ SERVICE PREMIUM:\n• Technicien certifié urgences\n• Équipement d\'urgence complet\n• Véhicule d\'intervention rapide\n• Pièces de rechange en stock\n• Tarif majoré: +30% nuit/weekend\n\n💳 PAIEMENT:\n• Après intervention\n• Tous moyens acceptés\n• Facture immédiate'
        : '🚨 24/7/365 EMERGENCY SERVICE 🚨\n\n📞 EMERGENCY NUMBERS:\n\n🔴 Main: +224 610 55 32 55\n📧 Email: urgence@tsdetfils.com\n💬 WhatsApp: +224 610 55 32 55\n📱 App: Red SOS button\n\n⏱️ RESPONSE TIME:\n\n• Conakry center: 30-60 min\n• Conakry outskirts: 1-2h\n• Coyah/Dubréka: 2-3h\n• Life-threatening: IMMEDIATE\n\n🚨 EMERGENCIES HANDLED:\n\n💧 PLUMBING:\n• Major water leak\n• Flooding\n• Dangerous water heater\n• Burst pipe\n• Defective meter\n\n⚡ ELECTRICITY:\n• Short circuit\n• Electrical panel on fire\n• Dangerous exposed wires\n• Total power outage\n• Burning smell\n\n❄️ AIR CONDITIONING:\n• Refrigerant gas leak\n• Motor overheating\n• Total failure (extreme heat)\n\n🛡️ PREMIUM SERVICE:\n• Emergency certified technician\n• Complete emergency equipment\n• Rapid response vehicle\n• Spare parts in stock\n• Premium rate: +30% night/weekend\n\n💳 PAYMENT:\n• After service\n• All methods accepted\n• Immediate invoice',
      keywords: ['urgence', 'urgent', 'emergency', 'rapide', 'vite', 'fuite', 'panne', 'immediat', 'sos', 'help', 'aide'],
      category: 'emergency',
      relatedTopics: ['contact', 'services'],
    },
    contact: {
      response: lang === 'fr'
        ? '📞 NOUS CONTACTER\n\n🏢 INFORMATIONS PRINCIPALES:\n\n📧 Email général:\ncontact@tsdetfils.com\n\n📱 Téléphone principal:\n+224 610 55 32 55\n\n📍 Adresse physique:\nKaloum, Avenue de la République\nConakry, République de Guinée\n\n🌐 En ligne:\n• Site web: www.tsdetfils.com\n• Facebook: @TSDEtFils\n• Instagram: @tsd_et_fils_pro\n• LinkedIn: TSD & FILS\n\n🕐 HORAIRES D\'OUVERTURE:\n\n📅 Lundi - Vendredi:\n8h00 - 18h00 (sans interruption)\n\n📅 Samedi:\n9h00 - 14h00\n\n📅 Dimanche:\nFermé (sauf urgences)\n\n🚨 Urgences 24/7:\nTous les jours, jour et nuit\n\n💬 SUPPORT CLIENT:\n\n📧 Email support:\nsupport@tsdetfils.com\nRéponse sous 2h (heures bureau)\n\n💬 Chat en ligne:\nSur le site web\nRéponse instantanée\n\n📱 WhatsApp Business:\n+224 610 55 32 55\nRéponse sous 30 min\n\n📞 Hotline gratuite:\nAppel gratuit depuis Guinée\n\n🗓️ PRENDRE RDV:\n• Via l\'application\n• Par téléphone\n• Sur le site web\n• En personne au bureau'
        : '📞 CONTACT US\n\n🏢 MAIN INFORMATION:\n\n📧 General email:\ncontact@tsdetfils.com\n\n📱 Main phone:\n+224 610 55 32 55\n\n📍 Physical address:\nKaloum, Avenue de la République\nConakry, Republic of Guinea\n\n🌐 Online:\n• Website: www.tsdetfils.com\n• Facebook: @TSDEtFils\n• Instagram: @tsd_et_fils_pro\n• LinkedIn: TSD & FILS\n\n🕐 OPENING HOURS:\n\n📅 Monday - Friday:\n8:00 AM - 6:00 PM (continuous)\n\n📅 Saturday:\n9:00 AM - 2:00 PM\n\n📅 Sunday:\nClosed (except emergencies)\n\n🚨 24/7 Emergencies:\nEvery day, day and night\n\n💬 CUSTOMER SUPPORT:\n\n📧 Support email:\nsupport@tsdetfils.com\nResponse within 2h (office hours)\n\n💬 Online chat:\nOn website\nInstant response\n\n📱 WhatsApp Business:\n+224 610 55 32 55\nResponse within 30 min\n\n📞 Free hotline:\nFree call from Guinea\n\n🗓️ MAKE APPOINTMENT:\n• Via app\n• By phone\n• On website\n• In person at office',
      keywords: ['contact', 'contacter', 'telephone', 'email', 'adresse', 'horaire', 'appeler', 'joindre', 'address', 'phone'],
      category: 'contact',
      relatedTopics: ['urgence', 'rdv'],
    },
    techniciens: {
      response: lang === 'fr'
        ? '👷 NOS TECHNICIENS D\'ÉLITE\n\n✅ SÉLECTION RIGOUREUSE:\n\n🎓 Formation & Diplômes:\n• CAP/BEP minimum requis\n• Formation continue obligatoire\n• Certifications spécialisées\n• Stage pratique 6 mois minimum\n• Tests techniques validés\n\n🔍 Vérifications sécurité:\n• Casier judiciaire vierge ✅\n• Vérification identité ✅\n• Références professionnelles ✅\n• Période d\'essai 3 mois ✅\n\n⭐ EXPÉRIENCE GARANTIE:\n• Minimum 3 ans d\'expérience\n• Spécialisations multiples\n• Formés aux normes européennes\n• Expertise locale adaptée\n\n🛠️ ÉQUIPEMENT PROFESSIONNEL:\n\n📦 Chaque technicien dispose de:\n• Outillage professionnel complet\n• Équipements de sécurité (EPI)\n• Détecteurs et testeurs\n• Pièces de rechange courantes\n• Véhicule d\'entreprise équipé\n• Tablette/smartphone connecté\n\n📱 TRAÇABILITÉ TOTALE:\n• GPS activé pendant missions\n• Photos avant/pendant/après\n• Rapport d\'intervention détaillé\n• Signature électronique client\n• Évaluation après chaque visite\n\n⭐ ÉVALUATIONS CLIENTS:\n• Note moyenne: 4.8/5\n• Profil technicien consultable\n• Historique interventions\n• Spécialités affichées\n\n🛡️ ASSURANCES:\n• RC Professionnelle\n• Assurance tous risques\n• Protection juridique\n• Garantie décennale'
        : '👷 OUR ELITE TECHNICIANS\n\n✅ RIGOROUS SELECTION:\n\n🎓 Training & Diplomas:\n• Minimum CAP/BEP required\n• Mandatory continuous training\n• Specialized certifications\n• Minimum 6 months internship\n• Validated technical tests\n\n🔍 Security checks:\n• Clean criminal record ✅\n• Identity verification ✅\n• Professional references ✅\n• 3-month probation ✅\n\n⭐ GUARANTEED EXPERIENCE:\n• Minimum 3 years experience\n• Multiple specializations\n• European standards training\n• Adapted local expertise\n\n🛠️ PROFESSIONAL EQUIPMENT:\n\n📦 Each technician has:\n• Complete professional tools\n• Safety equipment (PPE)\n• Detectors and testers\n• Common spare parts\n• Equipped company vehicle\n• Connected tablet/smartphone\n\n📱 TOTAL TRACEABILITY:\n• GPS enabled during missions\n• Before/during/after photos\n• Detailed service report\n• Client electronic signature\n• Evaluation after each visit\n\n⭐ CLIENT REVIEWS:\n• Average rating: 4.8/5\n• Consultable technician profile\n• Service history\n• Displayed specialties\n\n🛡️ INSURANCE:\n• Professional liability\n• Comprehensive insurance\n• Legal protection\n• 10-year guarantee',
      keywords: ['technicien', 'ouvrier', 'equipe', 'professionnel', 'technician', 'worker', 'team', 'qui vient', 'plombier'],
      category: 'team',
      relatedTopics: ['garantie', 'chantiers'],
    },
    zone: {
      response: lang === 'fr'
        ? '🗺️ ZONES D\'INTERVENTION GUINÉE\n\n📍 TOUT CONAKRY:\n\n✅ Zones couvertes:\n• Kaloum (siège)\n• Matam\n• Ratoma\n• Matoto\n• Dixinn\n• Enville à Cimenterie\n\n⏱️ Délais moyens:\n• Urgences: 30-60 min\n• Standard: 24-48h\n• Sur RDV: Créneaux flexibles\n\n💰 FRAIS DE DEPLACEMENT (tous payants):\n\n🚗 En ville jusqu\'a la Cimenterie: 120 000 GNF\n🚗 De la Cimenterie au reste de Conakry: 290 000 GNF\n🚗 Hors Conakry (ex: Kindia): a partir de 1 150 000 GNF\n\n📋 Devis GRATUIT:\n• Estimation des travaux: GRATUIT\n• Le devis reste gratuit, seul le deplacement est payant\n\n📍 PERIPHERIE CONAKRY:\n\n🚗 Zones desservies:\n• Coyah\n• Dubreka\n• Forecariah\n• Kindia (a partir de 1 150 000 GNF)\n\n⏱️ Délais:\n• Urgences: 2-3h\n• Standard: 2-4 jours\n• Planification préalable requise\n\n📍 INTÉRIEUR DU PAYS:\n\n🏗️ Grands projets uniquement:\n• Labé\n• Kankan\n• N\'Zérékoré\n• Boké\n\n📋 Conditions:\n• Projet > 10M GNF\n• Devis sur mesure\n• Équipe dédiée\n• Hébergement inclus dans devis'
        : '🗺️ GUINEA SERVICE AREAS\n\n📍 ALL CONAKRY:\n\n✅ Covered areas:\n• Kaloum (headquarters)\n• Matam\n• Ratoma\n• Matoto\n• Dixinn\n• Enville to Cimenterie\n\n⏱️ Average delays:\n• Emergencies: 30-60 min\n• Standard: 24-48h\n• By appointment: Flexible slots\n\n💰 TRAVEL FEES (all paid):\n\n🚗 In city to Cimenterie: 120,000 GNF\n🚗 From Cimenterie to rest of Conakry: 290,000 GNF\n🚗 Outside Conakry (e.g. Kindia): from 1,150,000 GNF\n\n📋 FREE Quote:\n• Work estimate: FREE\n• Quote is free, only travel is charged\n\n📍 CONAKRY OUTSKIRTS:\n\n🚗 Served areas:\n• Coyah\n• Dubreka\n• Forecariah\n• Kindia (from 1,150,000 GNF)\n\n⏱️ Delays:\n• Emergencies: 2-3h\n• Standard: 2-4 days\n• Prior planning required\n\n📍 INLAND:\n\n🏗️ Large projects only:\n• Labé\n• Kankan\n• N\'Zérékoré\n• Boké\n\n📋 Conditions:\n• Project > 10M GNF\n• Custom quote\n• Dedicated team\n• Accommodation in quote',
      keywords: ['zone', 'secteur', 'intervenir', 'deplacer', 'region', 'area', 'ou', 'where', 'kaloum', 'matam', 'conakry'],
      category: 'location',
      relatedTopics: ['devis', 'urgence'],
    },
    garantie: {
      response: lang === 'fr'
        ? '🛡️ GARANTIES & ASSURANCES COMPLÈTES\n\n✅ GARANTIE SATISFACTION:\n• 100% satisfait ou travail refait GRATUITEMENT\n• Aucun frais caché\n• Devis respecté à la lettre\n• Délais garantis ou réduction\n\n🔧 GARANTIES TECHNIQUES:\n\n⚙️ Pièces & matériaux:\n• Pièces neuves: 1 à 2 ans\n• Équipements: Selon fabricant\n• Garantie constructeur transférée\n\n👷 Main d\'œuvre:\n• Installation: 12 mois\n• Réparation: 6 mois\n• Retour gratuit si défaut\n• Remplacement sans frais\n\n🏗️ Travaux complets:\n• Plomberie: 12 mois\n• Électricité: 12 mois\n• Climatisation: 12 mois\n• Construction: Garantie décennale\n\n🛡️ ASSURANCES PROFESSIONNELLES:\n\n💼 Responsabilité civile:\n• Dommages matériels: 50M GNF\n• Dommages corporels: 100M GNF\n• Dommages immatériels: 20M GNF\n\n🏠 Tous risques chantier:\n• Vol sur chantier couvert\n• Dégâts accidentels\n• Incendie\n• Dégâts des eaux\n\n⚖️ Protection juridique:\n• Litiges clients\n• Défense pénale\n• Recours\n\n📄 DOCUMENTS FOURNIS:\n• Facture détaillée officielle\n• Certificat de garantie nominatif\n• Carnet d\'entretien\n• Coordonnées SAV\n• Conditions générales\n\n📞 SERVICE APRÈS-VENTE:\n• Hotline dédiée\n• Intervention rapide\n• Historique client conservé\n• Rappels entretien automatiques'
        : '🛡️ COMPLETE GUARANTEES & INSURANCE\n\n✅ SATISFACTION GUARANTEE:\n• 100% satisfied or FREE rework\n• No hidden fees\n• Quote strictly respected\n• Guaranteed deadlines or discount\n\n🔧 TECHNICAL GUARANTEES:\n\n⚙️ Parts & materials:\n• New parts: 1 to 2 years\n• Equipment: Per manufacturer\n• Manufacturer warranty transferred\n\n👷 Labor:\n• Installation: 12 months\n• Repair: 6 months\n• Free return if defect\n• Free replacement\n\n🏗️ Complete work:\n• Plumbing: 12 months\n• Electricity: 12 months\n• Air conditioning: 12 months\n• Construction: 10-year guarantee\n\n🛡️ PROFESSIONAL INSURANCE:\n\n💼 Civil liability:\n• Material damage: 50M GNF\n• Bodily injury: 100M GNF\n• Intangible damage: 20M GNF\n\n🏠 All risks site:\n• Site theft covered\n• Accidental damage\n• Fire\n• Water damage\n\n⚖️ Legal protection:\n• Customer disputes\n• Criminal defense\n• Appeals\n\n📄 PROVIDED DOCUMENTS:\n• Official detailed invoice\n• Named guarantee certificate\n• Maintenance booklet\n• After-sales contacts\n• General conditions\n\n📞 AFTER-SALES SERVICE:\n• Dedicated hotline\n• Rapid intervention\n• Customer history kept\n• Automatic maintenance reminders',
      keywords: ['garantie', 'assurance', 'warranty', 'guarantee', 'protection', 'securite', 'sav'],
      category: 'legal',
      relatedTopics: ['techniciens', 'services'],
    },
    compte: {
      response: lang === 'fr'
        ? '👤 CRÉER VOTRE COMPTE CLIENT\n\n✨ INSCRIPTION RAPIDE (2 min):\n\n1️⃣ Informations de base:\n• Nom complet\n• Numéro de téléphone\n• Adresse email\n• Mot de passe sécurisé\n\n2️⃣ Validation:\n• Code SMS de vérification\n• Confirmation email\n• Activation instantanée\n\n3️⃣ Profil complet (optionnel):\n• Adresse complète\n• Type de propriété\n• Préférences de contact\n• Photo de profil\n\n🎁 AVANTAGES MEMBRE:\n\n✅ Accès exclusif:\n• Tableau de bord personnalisé\n• Historique complet projets\n• Factures téléchargeables PDF\n• Documents archivés\n\n💬 Communication:\n• Chat direct techniciens\n• Messagerie sécurisée\n• Notifications personnalisées\n• Alertes importantes\n\n📊 Suivi en temps réel:\n• Position GPS technicien\n• Photos chantier live\n• Progression en %\n• Estimation arrivée\n\n💰 Avantages financiers:\n• Devis sauvegardés\n• Remises fidélité progressives\n• Paiement en ligne sécurisé\n• Historique paiements\n\n⭐ Programme VIP:\n• -5% dès 3 interventions\n• -10% après 5 projets\n• -15% statut VIP (10+ projets)\n• Priorité interventions\n• Technicien dédié\n\n🔒 SÉCURITÉ:\n• Données cryptées SSL\n• Conformité RGPD\n• Confidentialité garantie\n• Suppression compte possible\n\n📱 MULTI-PLATEFORME:\n• Application iOS/Android\n• Site web responsive\n• Synchronisation automatique'
        : '👤 CREATE YOUR CLIENT ACCOUNT\n\n✨ QUICK REGISTRATION (2 min):\n\n1️⃣ Basic information:\n• Full name\n• Phone number\n• Email address\n• Secure password\n\n2️⃣ Validation:\n• SMS verification code\n• Email confirmation\n• Instant activation\n\n3️⃣ Complete profile (optional):\n• Full address\n• Property type\n• Contact preferences\n• Profile photo\n\n🎁 MEMBER BENEFITS:\n\n✅ Exclusive access:\n• Personalized dashboard\n• Complete project history\n• Downloadable PDF invoices\n• Archived documents\n\n💬 Communication:\n• Direct technician chat\n• Secure messaging\n• Personalized notifications\n• Important alerts\n\n📊 Real-time tracking:\n• Technician GPS position\n• Live site photos\n• % progress\n• Arrival estimate\n\n💰 Financial benefits:\n• Saved quotes\n• Progressive loyalty discounts\n• Secure online payment\n• Payment history\n\n⭐ VIP Program:\n• -5% from 3 services\n• -10% after 5 projects\n• -15% VIP status (10+ projects)\n• Priority services\n• Dedicated technician\n\n🔒 SECURITY:\n• SSL encrypted data\n• GDPR compliance\n• Guaranteed confidentiality\n• Account deletion possible\n\n📱 MULTI-PLATFORM:\n• iOS/Android app\n• Responsive website\n• Automatic sync',
      keywords: ['compte', 'inscription', 'inscrire', 'creer', 'account', 'sign up', 'register', 'membre'],
      category: 'account',
      relatedTopics: ['messagerie', 'suivi'],
    },
    rdv: {
      response: lang === 'fr'
        ? '📅 PRENDRE RENDEZ-VOUS FACILEMENT\n\n🗓️ RÉSERVATION EN LIGNE:\n\n1️⃣ Connectez-vous à votre compte\n2️⃣ Section "Réservations"\n3️⃣ Choisissez le service:\n   • Plomberie\n   • Électricité\n   • Climatisation\n   • Visite technique\n   • Devis sur site\n\n4️⃣ Sélectionnez date & heure:\n   • Calendrier interactif\n   • Créneaux disponibles en vert\n   • Suggestions alternatives\n\n5️⃣ Informations complémentaires:\n   • Description du problème\n   • Photos optionnelles\n   • Urgence ou standard\n\n6️⃣ Confirmez votre RDV\n\n⏰ CRÉNEAUX HORAIRES:\n\n🌅 Matin:\n• 8h00 - 10h00\n• 10h00 - 12h00\n\n🌞 Après-midi:\n• 14h00 - 16h00\n• 16h00 - 18h00\n\n🌙 Soir (sur demande):\n• 18h00 - 20h00\n(+20% tarif)\n\n📱 CONFIRMATIONS:\n\n✅ Instantané:\n• Email de confirmation\n• SMS récapitulatif\n• Ajout calendrier automatique\n\n✅ Rappels:\n• 24h avant: Email\n• 3h avant: SMS\n• 30 min avant: Notification\n• Technicien en route: Alerte\n\n🔄 MODIFICATIONS:\n\n• Reprogrammer: Jusqu\'à 6h avant\n• Annuler: Jusqu\'à 12h avant\n• Reporter: Sans frais\n• Urgence: Intervention immédiate possible\n\n💰 TARIFICATION:\n\n• RDV standard: Gratuit\n• Deplacement payant (a partir de 120 000 GNF)\n• Devis gratuit\n• Paiement apres travaux\n\n👨‍🔧 TECHNICIEN ASSIGNÉ:\n• Profil visible après confirmation\n• Note et avis clients\n• Spécialités\n• Contact direct possible'
        : '📅 EASY APPOINTMENT BOOKING\n\n🗓️ ONLINE RESERVATION:\n\n1️⃣ Log in to your account\n2️⃣ "Bookings" section\n3️⃣ Choose service:\n   • Plumbing\n   • Electricity\n   • Air conditioning\n   • Technical visit\n   • On-site quote\n\n4️⃣ Select date & time:\n   • Interactive calendar\n   • Available slots in green\n   • Alternative suggestions\n\n5️⃣ Additional information:\n   • Problem description\n   • Optional photos\n   • Emergency or standard\n\n6️⃣ Confirm your appointment\n\n⏰ TIME SLOTS:\n\n🌅 Morning:\n• 8:00 AM - 10:00 AM\n• 10:00 AM - 12:00 PM\n\n🌞 Afternoon:\n• 2:00 PM - 4:00 PM\n• 4:00 PM - 6:00 PM\n\n🌙 Evening (on request):\n• 6:00 PM - 8:00 PM\n(+20% rate)\n\n📱 CONFIRMATIONS:\n\n✅ Instant:\n• Confirmation email\n• Summary SMS\n• Auto calendar add\n\n✅ Reminders:\n• 24h before: Email\n• 3h before: SMS\n• 30 min before: Notification\n• Technician on way: Alert\n\n🔄 CHANGES:\n\n• Reschedule: Up to 6h before\n• Cancel: Up to 12h before\n• Postpone: No fee\n• Emergency: Immediate intervention possible\n\n💰 PRICING:\n\n• Standard appointment: Free\n• Travel fee paid (from 120,000 GNF)\n• Free quote\n• Payment after work\n\n👨‍🔧 ASSIGNED TECHNICIAN:\n• Profile visible after confirmation\n• Customer ratings\n• Specialties\n• Direct contact possible',
      keywords: ['rendez-vous', 'rdv', 'reservation', 'reserver', 'appointment', 'booking', 'date', 'quand'],
      category: 'booking',
      relatedTopics: ['devis', 'techniciens'],
    },
  };

  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: Date.now(),
      text: lang === 'fr'
        ? '👋 Bonjour! Je suis votre assistant intelligent TSD & FILS.\n\n✨ Je peux vous aider avec:\n• Informations sur nos services\n• Demandes de devis\n• Suivi de vos projets\n• Contact et urgences\n• Questions techniques\n\nComment puis-je vous aider aujourd\'hui?'
        : '👋 Hello! I am your TSD & FILS intelligent assistant.\n\n✨ I can help you with:\n• Service information\n• Quote requests\n• Project tracking\n• Contact and emergencies\n• Technical questions\n\nHow can I help you today?',
      isBot: true,
      time: new Date().toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      category: 'welcome',
      options: lang === 'fr'
        ? ['🔧 Nos services', '💰 Devis gratuit', '🚨 Urgence', '📞 Contact']
        : ['🔧 Our services', '💰 Free quote', '🚨 Emergency', '📞 Contact'],
    };
    setMessages([welcomeMessage]);
  }, [lang]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startDrag = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName !== 'BUTTON' &&
        !(e.target as HTMLElement).closest('button')) {
      e.preventDefault();
      startDrag(e.clientX, e.clientY);
    }
  };

  const handleHeaderTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).tagName !== 'BUTTON' &&
        !(e.target as HTMLElement).closest('button')) {
      const touch = e.touches[0];
      startDrag(touch.clientX, touch.clientY);
    }
  };

  useEffect(() => {
    const chatW = Math.min(420, window.innerWidth - 20);
    const chatH = Math.min(620, window.innerHeight - 20);

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(window.innerWidth - chatW, e.clientX - dragStartRef.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - chatH, e.clientY - dragStartRef.current.y));
      setPosition({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const newX = Math.max(0, Math.min(window.innerWidth - chatW, touch.clientX - dragStartRef.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - chatH, touch.clientY - dragStartRef.current.y));
      setPosition({ x: newX, y: newY });
    };

    const stopDrag = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', stopDrag);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', stopDrag);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', stopDrag);
    };
  }, [isDragging]);


  const saveConversation = async (userMessage: string, botResponse: string) => {
    if (!currentUser) return;

    try {
      await supabase.from('chatbot_conversations').insert({
        user_id: currentUser.id,
        user_message: userMessage,
        bot_response: botResponse,
        language: lang,
      });
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const findBestResponse = (userInput: string): { response: string; category: string; relatedTopics?: string[] } => {
    const normalizedInput = userInput.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    let bestMatchKey = '';
    let bestScore = 0;

    for (const [key, { keywords }] of Object.entries(knowledgeBase)) {
      let score = 0;
      for (const keyword of keywords) {
        const normalizedKeyword = keyword.toLowerCase();
        if (normalizedInput === normalizedKeyword) {
          score += 10;
        } else if (normalizedInput.includes(normalizedKeyword)) {
          score += 5;
        } else if (normalizedKeyword.includes(normalizedInput)) {
          score += 3;
        }
        const words = normalizedInput.split(' ');
        if (words.includes(normalizedKeyword)) {
          score += 7;
        }
      }

      if (score > bestScore) {
        bestMatchKey = key;
        bestScore = score;
      }
    }

    if (bestMatchKey && bestScore >= 3) {
      const match = knowledgeBase[bestMatchKey];
      return {
        response: match.response,
        category: match.category,
        relatedTopics: match.relatedTopics,
      };
    }

    return {
      response: lang === 'fr'
        ? '🤔 Je ne suis pas certain de bien comprendre votre question.\n\n💡 Voici ce que je peux vous expliquer:\n\n🔧 Services:\n• Plomberie, électricité, climatisation\n• Construction et rénovation\n\n💰 Commercial:\n• Devis gratuits\n• Facturation et paiements\n\n📍 Pratique:\n• Zones d\'intervention\n• Prise de rendez-vous\n• Contact et urgences\n\n👷 Équipe:\n• Nos techniciens\n• Garanties et assurances\n\n📱 Suivi:\n• Tracking temps réel\n• Messagerie instantanée\n\nPouvez-vous reformuler ou choisir un sujet?'
        : '🤔 I am not sure I understand your question.\n\n💡 Here is what I can explain:\n\n🔧 Services:\n• Plumbing, electricity, air conditioning\n• Construction and renovation\n\n💰 Commercial:\n• Free quotes\n• Billing and payments\n\n📍 Practical:\n• Service areas\n• Appointment booking\n• Contact and emergencies\n\n👷 Team:\n• Our technicians\n• Guarantees and insurance\n\n📱 Tracking:\n• Real-time tracking\n• Instant messaging\n\nCan you rephrase or choose a topic?',
      category: 'fallback',
    };
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      text: messageText,
      isBot: false,
      time: new Date().toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(async () => {
      const result = findBestResponse(messageText);
      const botResponse: ChatMessage = {
        id: Date.now() + 1,
        text: result.response,
        isBot: true,
        time: new Date().toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
        category: result.category,
        options: result.relatedTopics?.map(topic =>
          lang === 'fr' ? `En savoir plus sur ${topic}` : `Learn more about ${topic}`
        ),
      };

      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);

      await saveConversation(messageText, result.response);
    }, 800 + Math.random() * 700);
  };

  const handleOptionClick = (option: string) => {
    const optionMap: Record<string, string> = {
      '🔧 Nos services': 'Quels sont vos services?',
      '💰 Devis gratuit': 'Comment demander un devis?',
      '🚨 Urgence': 'Service d\'urgence',
      '📞 Contact': 'Comment vous contacter?',
      '🔧 Our services': 'What are your services?',
      '💰 Free quote': 'How to request a quote?',
      '🚨 Emergency': 'Emergency service',
    };

    if (option.includes('En savoir plus') || option.includes('Learn more')) {
      const topic = option.replace('En savoir plus sur ', '').replace('Learn more about ', '');
      handleSend(topic);
    } else {
      handleSend(optionMap[option] || option);
    }
  };

  return (
    <div
      ref={chatboxRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${Math.min(420, window.innerWidth - 20)}px`,
        height: `${Math.min(620, window.innerHeight - 20)}px`,
        background: C.card,
        borderRadius: '20px',
        boxShadow: `0 12px 48px ${C.shadow}, 0 0 0 1px ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10001,
        overflow: 'hidden',
        animation: 'chatbotSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        transition: isDragging ? 'none' : 'box-shadow 0.3s ease',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.boxShadow = `0 16px 56px ${C.shadow}, 0 0 0 2px ${C.primary}40`;
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.boxShadow = `0 12px 48px ${C.shadow}, 0 0 0 1px ${C.border}`;
        }
      }}
    >
      <style>
        {`
          @keyframes chatbotSlideIn {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes messageSlideIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }

          @keyframes typing {
            0%, 60%, 100% { opacity: 0.3; }
            30% { opacity: 1; }
          }
        `}
      </style>

      <div
        onMouseDown={handleHeaderMouseDown}
        onTouchStart={handleHeaderTouchStart}
        style={{
          background: `linear-gradient(135deg, ${C.primaryDark} 0%, ${C.primary} 50%, ${C.primaryLight} 100%)`,
          padding: '20px 24px',
          color: '#FFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          position: 'relative',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at top right, rgba(255,255,255,0.2), transparent)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 12px #10B981',
              animation: 'pulse 2s infinite',
            }} />
            <div style={{ fontSize: '19px', fontWeight: '900', letterSpacing: '-0.5px' }}>{t.title}</div>
          </div>
          <div style={{ fontSize: '12px', opacity: 0.95, marginTop: '4px', fontWeight: '500' }}>{t.subtitle}</div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            color: '#FFF',
            cursor: 'pointer',
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            zIndex: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
          }}
        >
          ×
        </button>
      </div>

      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '20px',
        background: darkMode ?
          'linear-gradient(180deg, #0a0f1e 0%, #0f172a 100%)' :
          'linear-gradient(180deg, #fafafa 0%, #f8fafc 100%)',
      }}>
        {messages.map((message) => (
          <div key={message.id} style={{ marginBottom: '20px', animation: 'messageSlideIn 0.4s ease-out' }}>
            <div style={{
              display: 'flex',
              justifyContent: message.isBot ? 'flex-start' : 'flex-end',
              gap: '10px',
            }}>
              {message.isBot && (
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  fontSize: '18px',
                  fontWeight: '700',
                  flexShrink: 0,
                  boxShadow: `0 4px 12px ${C.primary}40`,
                }}>
                  🤖
                </div>
              )}
              <div style={{
                maxWidth: message.isBot ? '85%' : '80%',
                background: message.isBot ? C.botMessage : `linear-gradient(135deg, ${C.userMessage}, ${C.primaryLight})`,
                color: message.isBot ? C.text : '#FFF',
                padding: '14px 18px',
                borderRadius: message.isBot ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                boxShadow: message.isBot ?
                  `0 3px 12px ${C.shadow}` :
                  `0 4px 16px ${C.primary}40`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                <div style={{
                  fontSize: '14px',
                  lineHeight: '1.7',
                  whiteSpace: 'pre-line',
                  wordBreak: 'break-word',
                }}>
                  {message.text}
                </div>
                <div style={{
                  fontSize: '11px',
                  opacity: 0.75,
                  marginTop: '8px',
                  fontWeight: '500',
                }}>
                  {message.time}
                </div>
              </div>
            </div>
            {message.options && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                marginTop: '14px',
                marginLeft: message.isBot ? '46px' : '0',
              }}>
                {message.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(option)}
                    style={{
                      background: C.card,
                      border: `2px solid ${C.border}`,
                      borderRadius: '24px',
                      padding: '10px 18px',
                      color: C.text,
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '700',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: `0 2px 8px ${C.shadow}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`;
                      e.currentTarget.style.color = '#FFF';
                      e.currentTarget.style.borderColor = C.primary;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 6px 16px ${C.primary}40`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = C.card;
                      e.currentTarget.style.color = C.text;
                      e.currentTarget.style.borderColor = C.border;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = `0 2px 8px ${C.shadow}`;
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              fontSize: '18px',
              flexShrink: 0,
              boxShadow: `0 4px 12px ${C.primary}40`,
            }}>
              🤖
            </div>
            <div style={{
              background: C.botMessage,
              padding: '14px 18px',
              borderRadius: '18px 18px 18px 4px',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: C.primary,
                animation: 'typing 1.4s infinite',
              }} />
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: C.primary,
                animation: 'typing 1.4s infinite 0.2s',
              }} />
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: C.primary,
                animation: 'typing 1.4s infinite 0.4s',
              }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{
        padding: '18px 20px',
        borderTop: `2px solid ${C.border}`,
        background: C.card,
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        boxShadow: '0 -8px 24px rgba(0,0,0,0.06)',
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={t.placeholder}
          autoFocus
          style={{
            flex: 1,
            padding: '14px 20px',
            borderRadius: '28px',
            border: `2px solid ${C.border}`,
            background: C.bg,
            color: C.text,
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            fontWeight: '500',
            cursor: 'text',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = C.primary;
            e.currentTarget.style.boxShadow = `0 0 0 4px ${C.primary}20`;
            e.currentTarget.style.transform = 'scale(1.01)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = C.border;
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim()}
          style={{
            background: input.trim() ?
              `linear-gradient(135deg, ${C.primaryDark}, ${C.primary}, ${C.primaryLight})` :
              C.border,
            color: '#FFF',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            fontSize: '20px',
            fontWeight: '700',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: input.trim() ? `0 6px 20px ${C.primary}50` : 'none',
          }}
          onMouseEnter={(e) => {
            if (input.trim()) {
              e.currentTarget.style.transform = 'scale(1.15) rotate(5deg)';
              e.currentTarget.style.boxShadow = `0 8px 28px ${C.primary}70`;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
            e.currentTarget.style.boxShadow = input.trim() ? `0 6px 20px ${C.primary}50` : 'none';
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
};

export default IntelligentChatbot;
