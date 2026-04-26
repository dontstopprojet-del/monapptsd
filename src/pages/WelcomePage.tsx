import { useNavigate } from 'react-router-dom';
import { COLORS } from '../constants/theme';
import Logo from '../components/Logo';

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)` }}
    >
      <div className="absolute inset-0 overflow-hidden opacity-10">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animation: `float ${Math.random() * 10 + 5}s ease-in-out infinite`,
              animationDelay: Math.random() * 5 + 's',
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div style={{ transform: 'scale(1.5)' }}>
              <Logo size="large" darkMode={false} />
            </div>
          </div>
          <p className="text-white/80 text-sm">Plomberie & Sanitaire</p>
          <p className="text-white/60 text-xs mt-2">L'Excellence Européenne au Service de la Guinée</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/login/client')}
            className="w-full bg-white rounded-2xl shadow-2xl p-8 transition-all hover:shadow-3xl hover:scale-105 active:scale-95"
          >
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.accent + '20' }}>
                <svg className="w-12 h-12" style={{ color: COLORS.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <h2 className="text-2xl font-bold text-gray-800">Client</h2>
                <p className="text-sm text-gray-600 mt-1">Demander un devis ou service</p>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => navigate('/login/technician')}
            className="w-full bg-white rounded-2xl shadow-2xl p-8 transition-all hover:shadow-3xl hover:scale-105 active:scale-95"
          >
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.primary + '20' }}>
                <svg className="w-12 h-12" style={{ color: COLORS.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <h2 className="text-2xl font-bold text-gray-800">Technicien</h2>
                <p className="text-sm text-gray-600 mt-1">Gérer les chantiers et missions</p>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-white/60 text-sm">
            Vous n'avez pas de compte?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-white font-semibold underline hover:text-cyan-200 transition-colors"
            >
              Créer un compte
            </button>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-10px); }
          75% { transform: translateY(-30px) translateX(5px); }
        }
      `}</style>
    </div>
  );
}
