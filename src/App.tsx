import { useState, useEffect } from 'react';
import { SplashScreen } from './components/SplashScreen';
import TSDApp from './components/TSDApp';
import VisitorHomePage from './components/VisitorHomePage';
import DevisForm from './components/DevisForm';
import ContactPage from './components/ContactPage';
import ClientQuoteTracker from './components/ClientQuoteTracker';
import { AuthProvider } from './contexts/AuthContext';
import { supabase } from './lib/supabase';

type AppMode = 'visitor' | 'client';
type VisitorScreen = 'home' | 'devis' | 'contact' | 'track';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [appMode, setAppMode] = useState<AppMode>('visitor');
  const [visitorScreen, setVisitorScreen] = useState<VisitorScreen>('home');
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<'fr' | 'en' | 'ar'>('fr');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    const savedLanguage = localStorage.getItem('language');
    const savedAppMode = localStorage.getItem('appMode');

    if (savedDarkMode) setDarkMode(savedDarkMode === 'true');
    if (savedLanguage) setLanguage(savedLanguage as 'fr' | 'en' | 'ar');
    if (savedAppMode) setAppMode(savedAppMode as AppMode);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setAppMode('client');
        setShowSplash(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
    localStorage.setItem('language', language);
    localStorage.setItem('appMode', appMode);
  }, [darkMode, language, appMode]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (appMode === 'client') {
    return (
      <AuthProvider>
        <TSDApp onBackToVisitor={() => setAppMode('visitor')} isPasswordRecovery={isPasswordRecovery} />
      </AuthProvider>
    );
  }


  const renderVisitorScreen = () => {
    switch (visitorScreen) {
      case 'home':
        return (
          <VisitorHomePage
            darkMode={darkMode}
            lang={language}
            onNavigateToServices={() => {
              window.scrollTo({ top: 600, behavior: 'smooth' });
            }}
            onNavigateToDevis={() => setVisitorScreen('devis')}
            onNavigateToContact={() => setVisitorScreen('contact')}
            onNavigateToTrack={() => setVisitorScreen('track')}
            onNavigateToLogin={() => setAppMode('client')}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            onChangeLang={(lang) => setLanguage(lang)}
          />
        );

      case 'devis':
        return (
          <DevisForm
            darkMode={darkMode}
            lang={language}
            onSuccess={() => setVisitorScreen('home')}
            onBack={() => setVisitorScreen('home')}
          />
        );

      case 'contact':
        return (
          <ContactPage
            darkMode={darkMode}
            lang={language}
            onBack={() => setVisitorScreen('home')}
          />
        );

      case 'track':
        return (
          <ClientQuoteTracker
            darkMode={darkMode}
            lang={language}
            onBack={() => setVisitorScreen('home')}
          />
        );

      default:
        return (
          <VisitorHomePage
            darkMode={darkMode}
            lang={language}
            onNavigateToServices={() => {
              window.scrollTo({ top: 600, behavior: 'smooth' });
            }}
            onNavigateToDevis={() => setVisitorScreen('devis')}
            onNavigateToContact={() => setVisitorScreen('contact')}
            onNavigateToTrack={() => setVisitorScreen('track')}
            onNavigateToLogin={() => setAppMode('client')}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            onChangeLang={(lang) => setLanguage(lang)}
          />
        );
    }
  };

  return <>{renderVisitorScreen()}</>;
}

export default App;
