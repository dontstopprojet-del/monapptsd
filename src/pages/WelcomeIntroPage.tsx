import { useState, useEffect } from 'react';

interface WelcomeIntroPageProps {
  lang: string;
  darkMode: boolean;
  onComplete: () => void;
  user: any;
  role: string;
}

const WelcomeIntroPage = ({ lang, darkMode, onComplete, user, role }: WelcomeIntroPageProps) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setTimeout(() => setShowContent(true), 300);
  }, []);

  const getMessages = () => {
    const userName = user?.name || '';

    if (lang === 'fr') {
      switch (role) {
        case 'client':
          return {
            title: "Bienvenue chez TSD et Fils",
            subtitle: "L'Excellence Européenne au Service de la Guinée",
            greeting: `Bonjour ${userName}`,
            intro: "Nous sommes ravis de vous compter parmi nos clients. Votre satisfaction est notre priorité.",
            section1: "📋 Vos Services",
            section1Text: "Accédez à tous nos services : demandes de devis, prises de rendez-vous, suivi de vos projets en temps réel et historique de vos interventions.",
            section2: "💬 Support Client",
            section2Text: "Notre équipe est à votre disposition pour répondre à toutes vos questions et vous accompagner dans vos projets de plomberie et sanitaire.",
            section3: "🔔 Notifications",
            section3Text: "Restez informé de l'avancement de vos projets, des rendez-vous confirmés et recevez des alertes importantes en temps réel.",
            section4: "💳 Paiements Sécurisés",
            section4Text: "Effectuez vos paiements en toute sécurité avec nos différents moyens de paiement : Orange Money, Mobile Money, virement bancaire ou espèces.",
            ready: "Explorez votre espace client",
            readyText: "Découvrez toutes les fonctionnalités mises à votre disposition pour une expérience optimale.",
            button: "Accéder à mon espace"
          };
        case 'tech':
          return {
            title: "Espace Technicien",
            subtitle: "TSD et Fils - Gestion des Chantiers",
            greeting: `Bienvenue ${userName}`,
            intro: "Votre espace professionnel pour gérer efficacement vos missions et chantiers au quotidien.",
            section1: "📍 Vos Chantiers",
            section1Text: "Consultez vos chantiers assignés, leur localisation GPS, et mettez à jour leur statut en temps réel. Ajoutez des photos et commentaires pour chaque intervention.",
            section2: "📅 Planning",
            section2Text: "Visualisez votre emploi du temps, vos rendez-vous clients et organisez vos interventions de manière optimale.",
            section3: "📝 Rapports d'intervention",
            section3Text: "Rédigez vos rapports quotidiens, signalez les incidents et documentez chaque étape de vos interventions avec précision.",
            section4: "🎂 Équipe",
            section4Text: "Restez connecté avec vos collègues, consultez les anniversaires de l'équipe et accédez aux alertes importantes de l'entreprise.",
            ready: "Gérez vos missions",
            readyText: "Tous les outils nécessaires pour un travail efficace et une communication fluide avec l'équipe.",
            button: "Accéder à mes chantiers"
          };
        case 'office':
          return {
            title: "Espace Bureau",
            subtitle: "TSD et Fils - Administration",
            greeting: `Bonjour ${userName}`,
            intro: "Bienvenue dans votre espace de gestion administrative et coordination des opérations.",
            section1: "📊 Tableau de Bord",
            section1Text: "Suivez l'ensemble des projets en cours, les statistiques de performance et les indicateurs clés de l'entreprise.",
            section2: "👥 Gestion des Équipes",
            section2Text: "Coordonnez les techniciens, gérez les plannings, suivez les présences et organisez les ressources humaines efficacement.",
            section3: "📄 Documents",
            section3Text: "Accédez aux devis, factures, contrats et tous les documents administratifs. Générez et exportez des rapports détaillés.",
            section4: "💼 Coordination",
            section4Text: "Assurez la liaison entre les clients, les techniciens et la direction. Gérez les demandes urgentes et priorisez les interventions.",
            ready: "Gérez les opérations",
            readyText: "Coordonnez efficacement toutes les activités de l'entreprise depuis votre espace dédié.",
            button: "Accéder au tableau de bord"
          };
        case 'admin':
          return {
            title: "Espace Administrateur",
            subtitle: "TSD et Fils - Administration Complète",
            greeting: `Bienvenue ${userName}`,
            intro: "Accès complet à tous les outils de gestion et d'administration de TSD et Fils.",
            section1: "🎯 Gestion Globale",
            section1Text: "Vue d'ensemble complète de l'entreprise : projets, équipes, finances, et tous les indicateurs de performance en temps réel.",
            section2: "👥 Utilisateurs",
            section2Text: "Gérez tous les comptes utilisateurs, leurs rôles et permissions. Créez et modifiez les accès pour clients, techniciens et employés.",
            section3: "📈 Statistiques",
            section3Text: "Analysez les performances, générez des rapports détaillés, suivez le chiffre d'affaires et les tendances de l'entreprise.",
            section4: "⚙️ Configuration",
            section4Text: "Paramétrez l'application, gérez les services, tarifs, zones d'intervention et tous les aspects techniques de la plateforme.",
            ready: "Administration complète",
            readyText: "Tous les outils nécessaires pour piloter TSD et Fils et prendre les décisions stratégiques.",
            button: "Accéder au panneau admin"
          };
        default:
          return {
            title: "Bienvenue chez TSD et Fils",
            subtitle: "L'Excellence Européenne au Service de la Guinée",
            greeting: `Bonjour ${userName}`,
            intro: "Nous sommes ravis de vous accueillir.",
            section1: "Services",
            section1Text: "Découvrez nos services.",
            section2: "Support",
            section2Text: "Notre équipe est à votre disposition.",
            section3: "Notifications",
            section3Text: "Restez informé en temps réel.",
            section4: "Espace Personnel",
            section4Text: "Accédez à votre espace.",
            ready: "Commencer",
            readyText: "Explorez votre espace.",
            button: "C'est parti"
          };
      }
    } else {
      switch (role) {
        case 'client':
          return {
            title: "Welcome to TSD et Fils",
            subtitle: "European Excellence at Guinea's Service",
            greeting: `Hello ${userName}`,
            intro: "We are delighted to have you as our client. Your satisfaction is our priority.",
            section1: "📋 Your Services",
            section1Text: "Access all our services: quote requests, appointment scheduling, real-time project tracking, and intervention history.",
            section2: "💬 Customer Support",
            section2Text: "Our team is available to answer all your questions and support you with your plumbing and sanitary projects.",
            section3: "🔔 Notifications",
            section3Text: "Stay informed about your project progress, confirmed appointments, and receive important real-time alerts.",
            section4: "💳 Secure Payments",
            section4Text: "Make secure payments with our various payment methods: Orange Money, Mobile Money, bank transfer, or cash.",
            ready: "Explore your client area",
            readyText: "Discover all the features available for an optimal experience.",
            button: "Access my area"
          };
        case 'tech':
          return {
            title: "Technician Area",
            subtitle: "TSD et Fils - Site Management",
            greeting: `Welcome ${userName}`,
            intro: "Your professional space to efficiently manage your daily missions and sites.",
            section1: "📍 Your Sites",
            section1Text: "View your assigned sites, their GPS location, and update their status in real-time. Add photos and comments for each intervention.",
            section2: "📅 Schedule",
            section2Text: "View your timetable, client appointments, and organize your interventions optimally.",
            section3: "📝 Intervention Reports",
            section3Text: "Write your daily reports, report incidents, and accurately document each step of your interventions.",
            section4: "🎂 Team",
            section4Text: "Stay connected with your colleagues, check team birthdays, and access important company alerts.",
            ready: "Manage your missions",
            readyText: "All the tools needed for efficient work and smooth communication with the team.",
            button: "Access my sites"
          };
        case 'office':
          return {
            title: "Office Area",
            subtitle: "TSD et Fils - Administration",
            greeting: `Hello ${userName}`,
            intro: "Welcome to your administrative management and operations coordination space.",
            section1: "📊 Dashboard",
            section1Text: "Track all ongoing projects, performance statistics, and key company indicators.",
            section2: "👥 Team Management",
            section2Text: "Coordinate technicians, manage schedules, track attendance, and organize human resources efficiently.",
            section3: "📄 Documents",
            section3Text: "Access quotes, invoices, contracts, and all administrative documents. Generate and export detailed reports.",
            section4: "💼 Coordination",
            section4Text: "Ensure liaison between clients, technicians, and management. Handle urgent requests and prioritize interventions.",
            ready: "Manage operations",
            readyText: "Efficiently coordinate all company activities from your dedicated space.",
            button: "Access dashboard"
          };
        case 'admin':
          return {
            title: "Administrator Area",
            subtitle: "TSD et Fils - Full Administration",
            greeting: `Welcome ${userName}`,
            intro: "Complete access to all TSD et Fils management and administration tools.",
            section1: "🎯 Global Management",
            section1Text: "Complete company overview: projects, teams, finances, and all real-time performance indicators.",
            section2: "👥 Users",
            section2Text: "Manage all user accounts, their roles and permissions. Create and modify access for clients, technicians, and employees.",
            section3: "📈 Statistics",
            section3Text: "Analyze performance, generate detailed reports, track revenue, and company trends.",
            section4: "⚙️ Configuration",
            section4Text: "Configure the application, manage services, rates, coverage areas, and all technical aspects of the platform.",
            ready: "Complete administration",
            readyText: "All the tools needed to manage TSD et Fils and make strategic decisions.",
            button: "Access admin panel"
          };
        default:
          return {
            title: "Welcome to TSD et Fils",
            subtitle: "European Excellence at Guinea's Service",
            greeting: `Hello ${userName}`,
            intro: "We are delighted to welcome you.",
            section1: "Services",
            section1Text: "Discover our services.",
            section2: "Support",
            section2Text: "Our team is at your disposal.",
            section3: "Notifications",
            section3Text: "Stay informed in real-time.",
            section4: "Personal Area",
            section4Text: "Access your space.",
            ready: "Start",
            readyText: "Explore your space.",
            button: "Let's go"
          };
      }
    }
  };

  const t = getMessages();

  return (
    <div style={{
      minHeight: '100vh',
      background: darkMode
        ? 'linear-gradient(160deg, #071e2e 0%, #0D4A6E 50%, #0A3D5C 100%)'
        : 'linear-gradient(160deg, #0D3B54 0%, #0D4A6E 40%, #0A3D5C 70%, #0e7490 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: darkMode
          ? 'radial-gradient(circle at 20% 50%, rgba(78, 205, 196, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 107, 107, 0.1) 0%, transparent 50%)'
          : 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.15) 0%, transparent 50%)',
        animation: 'pulse 8s ease-in-out infinite'
      }}></div>

      <div style={{
        maxWidth: '500px',
        width: '100%',
        position: 'relative',
        zIndex: 1,
        opacity: showContent ? 1 : 0,
        transform: showContent ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.8s ease-out'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            margin: '0 auto 25px',
            position: 'relative',
            animation: 'float 3s ease-in-out infinite'
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, #00D4FF 0%, #0D4A6E 50%, #0891b2 100%)',
              borderRadius: '30px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              transform: 'rotate(-10deg)'
            }}></div>

            <div style={{
              position: 'absolute',
              inset: '6px',
              background: darkMode
                ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(-10deg)'
            }}>
              <svg width="65" height="65" viewBox="0 0 100 100" fill="none">
                <defs>
                  <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00D4FF"/>
                    <stop offset="50%" stopColor="#0891b2"/>
                    <stop offset="100%" stopColor="#0D4A6E"/>
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="38" stroke="url(#gradient1)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray="12 8"/>
                <g transform="translate(50, 50)">
                  <circle r="6" fill="url(#gradient1)"/>
                  <line x1="0" y1="-28" x2="0" y2="-14" stroke="url(#gradient1)" strokeWidth="5" strokeLinecap="round"/>
                  <line x1="0" y1="14" x2="0" y2="28" stroke="url(#gradient1)" strokeWidth="5" strokeLinecap="round"/>
                  <line x1="-28" y1="0" x2="-14" y2="0" stroke="url(#gradient1)" strokeWidth="5" strokeLinecap="round"/>
                  <line x1="14" y1="0" x2="28" y2="0" stroke="url(#gradient1)" strokeWidth="5" strokeLinecap="round"/>
                </g>
              </svg>
            </div>
          </div>

          <h1 style={{
            fontSize: '32px',
            fontWeight: '800',
            color: '#FFF',
            margin: '0 0 10px',
            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            letterSpacing: '1px'
          }}>
            {t.title}
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.95)',
            fontSize: '14px',
            margin: 0,
            fontWeight: '600',
            textShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }}>
            {t.subtitle}
          </p>
        </div>

        <div style={{
          background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(20px)',
          borderRadius: '25px',
          padding: '30px 25px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.3)'
        }}>
          <div style={{ marginBottom: '25px' }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#FFF',
              margin: '0 0 15px',
              textAlign: 'center'
            }}>
              {t.greeting}
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.95)',
              fontSize: '15px',
              lineHeight: '1.6',
              margin: 0,
              textAlign: 'center'
            }}>
              {t.intro}
            </p>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            <div style={{
              background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)',
              borderRadius: '15px',
              padding: '15px',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#FFF',
                margin: '0 0 8px'
              }}>
                {t.section1}
              </h3>
              <p style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '13px',
                lineHeight: '1.5',
                margin: 0
              }}>
                {t.section1Text}
              </p>
            </div>

            <div style={{
              background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)',
              borderRadius: '15px',
              padding: '15px',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#FFF',
                margin: '0 0 8px'
              }}>
                {t.section2}
              </h3>
              <p style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '13px',
                lineHeight: '1.5',
                margin: 0
              }}>
                {t.section2Text}
              </p>
            </div>

            <div style={{
              background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)',
              borderRadius: '15px',
              padding: '15px',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#FFF',
                margin: '0 0 8px'
              }}>
                {t.section3}
              </h3>
              <p style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '13px',
                lineHeight: '1.5',
                margin: 0
              }}>
                {t.section3Text}
              </p>
            </div>

            <div style={{
              background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)',
              borderRadius: '15px',
              padding: '15px',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#FFF',
                margin: '0 0 8px'
              }}>
                {t.section4}
              </h3>
              <p style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '13px',
                lineHeight: '1.5',
                margin: 0
              }}>
                {t.section4Text}
              </p>
            </div>
          </div>

          <div style={{
            marginTop: '25px',
            textAlign: 'center',
            padding: '20px 15px',
            background: darkMode ? 'rgba(8, 145, 178, 0.2)' : 'rgba(255,255,255,0.5)',
            borderRadius: '15px',
            border: '2px solid rgba(0, 212, 255, 0.3)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#FFF',
              margin: '0 0 10px'
            }}>
              {t.ready}
            </h3>
            <p style={{
              color: 'rgba(255,255,255,0.95)',
              fontSize: '14px',
              lineHeight: '1.5',
              margin: '0 0 20px'
            }}>
              {t.readyText}
            </p>
            <button
              onClick={onComplete}
              style={{
                background: 'linear-gradient(135deg, #0891b2 0%, #00D4FF 100%)',
                color: '#FFF',
                border: 'none',
                padding: '14px 35px',
                borderRadius: '50px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease',
                width: '100%',
                maxWidth: '250px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 12px 35px rgba(0,0,0,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
              }}
            >
              {t.button}
            </button>
          </div>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '25px'
        }}>
          <div style={{
            background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)',
            backdropFilter: 'blur(10px)',
            display: 'inline-block',
            padding: '12px 25px',
            borderRadius: '20px',
            boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
          }}>
            <p style={{
              color: '#FFF',
              margin: '0 0 5px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              📞 <a href="tel:+224610553255" style={{ color: '#FFF', textDecoration: 'none' }}>+224 610 55 32 55</a>
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.9)',
              margin: 0,
              fontSize: '13px'
            }}>
              ✉️ <a href="mailto:contact@tsdetfils.com" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none' }}>contact@tsdetfils.com</a>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-10deg); }
          50% { transform: translateY(-15px) rotate(-10deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default WelcomeIntroPage;
