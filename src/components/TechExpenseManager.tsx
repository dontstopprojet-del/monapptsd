import ExpenseTracker from './ExpenseTracker';

interface TechExpenseManagerProps {
  currentUser: any;
  darkMode: boolean;
  lang: string;
  onBack: () => void;
}

const TechExpenseManager = ({ currentUser, darkMode, lang, onBack }: TechExpenseManagerProps) => {
  const colors = {
    primary: darkMode ? '#3b82f6' : '#2563eb',
    background: darkMode ? '#1e293b' : '#ffffff',
  };

  return (
    <div style={{ height: '100vh', background: colors.background, overflow: 'auto' }}>
      <div style={{
        background: `linear-gradient(135deg, #0e7490, #0891b2, #06b6d4)`,
        padding: '24px',
        color: '#FFF',
        boxShadow: '0 4px 20px rgba(8,145,178,0.3)',
      }}>
        <button
          onClick={onBack}
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
          ← {lang === 'fr' ? 'Retour' : 'Back'}
        </button>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '900' }}>
          {lang === 'fr' ? 'Mes Dépenses' : 'My Expenses'}
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: '14px', opacity: 0.9 }}>
          {lang === 'fr'
            ? 'Enregistrez vos dépenses liées aux projets'
            : 'Record your project-related expenses'}
        </p>
      </div>
      <ExpenseTracker userId={currentUser?.id} userRole="tech" darkMode={darkMode} />
    </div>
  );
};

export default TechExpenseManager;
