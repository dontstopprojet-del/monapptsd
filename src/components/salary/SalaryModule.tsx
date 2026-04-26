import SalaryAdminPanel from './SalaryAdminPanel';
import SalaryEmployeePanel from './SalaryEmployeePanel';

interface Props {
  currentUser: any;
  darkMode: boolean;
  lang: string;
  onBack: () => void;
}

export default function SalaryModule({ currentUser, darkMode, lang, onBack }: Props) {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'office';

  return (
    <div style={{ height: '100vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0e7490, #0891b2, #06b6d4)',
        padding: '20px 24px',
        color: '#fff',
        boxShadow: '0 4px 20px rgba(8,145,178,0.3)',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: 10,
            padding: '8px 16px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 12,
            backdropFilter: 'blur(10px)',
          }}
        >
          ← Retour au tableau de bord
        </button>
        <div style={{ fontSize: 20, fontWeight: 700 }}>
          {isAdmin ? 'Gestion des Salaires' : 'Mon Salaire'}
        </div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>
          {isAdmin
            ? 'Tarifs horaires • Heures travaillées • Fiches de paie'
            : 'Mes heures • Mes fiches de paie'}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 20 }}>
        {isAdmin
          ? <SalaryAdminPanel darkMode={darkMode} lang={lang} />
          : <SalaryEmployeePanel currentUser={currentUser} darkMode={darkMode} lang={lang} />
        }
      </div>
    </div>
  );
}
