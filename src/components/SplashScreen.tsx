import { useEffect, useState } from 'react';
import { COLORS } from '../constants/theme';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setTimeout(() => setShowContent(true), 100);

    const duration = 2800;
    const intervalTime = 30;
    const increment = 100 / (duration / intervalTime);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setFadeOut(true), 300);
          setTimeout(onComplete, 800);
          return 100;
        }
        return Math.min(prev + increment, 100);
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-50 transition-all duration-700 ${fadeOut ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}
      style={{ background: `linear-gradient(160deg, #071e2e 0%, ${COLORS.primary} 40%, ${COLORS.secondary} 70%, #051520 100%)` }}
    >
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-cyan-400"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              opacity: Math.random() * 0.12 + 0.03,
              animation: `splash-twinkle ${Math.random() * 4 + 3}s ease-in-out infinite`,
              animationDelay: Math.random() * 3 + 's',
            }}
          />
        ))}
      </div>

      <div className={`relative transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="absolute inset-0 blur-3xl bg-cyan-400/15 rounded-full scale-150" />

        <svg viewBox="0 0 200 200" className="w-36 h-36 md:w-48 md:h-48 relative z-10 drop-shadow-2xl">
          <defs>
            <linearGradient id="splashBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0D4A6E" />
              <stop offset="100%" stopColor="#0A3D5C" />
            </linearGradient>
            <linearGradient id="splashDrop" x1="100" y1="30" x2="100" y2="130" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="40%" stopColor="#00D4FF" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
            <filter id="splashGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="20" y="20" width="160" height="160" rx="40" fill="url(#splashBg)" filter="url(#splashGlow)" />

          <path
            d="M100 45C100 45 130 80 130 95C130 112 117 122 100 122C83 122 70 112 70 95C70 80 100 45 100 45Z"
            fill="url(#splashDrop)"
          />
          <ellipse cx="88" cy="82" rx="10" ry="6" fill="white" opacity="0.4" transform="rotate(-30 88 82)" />
          <ellipse cx="92" cy="92" rx="5" ry="3" fill="white" opacity="0.25" transform="rotate(-30 92 92)" />

          <rect x="60" y="128" width="80" height="8" rx="4" fill="white" opacity="0.4" />

          <text
            x="100" y="160"
            textAnchor="middle"
            fontSize="28"
            fontWeight="800"
            fill="white"
            fontFamily="Arial, Helvetica, sans-serif"
            letterSpacing="5"
          >
            TSD
          </text>
        </svg>
      </div>

      <div className={`mt-8 text-center relative z-10 transition-all duration-1000 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <h1
          className="text-3xl md:text-4xl font-extrabold text-white tracking-tight"
          style={{ textShadow: '0 2px 20px rgba(0, 180, 220, 0.4)' }}
        >
          TSD <span className="text-xl md:text-2xl font-light text-cyan-300/80">et</span> Fils
        </h1>
        <div className="flex items-center justify-center gap-3 mt-3">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-cyan-400/50" />
          <p className="text-cyan-200/70 text-xs md:text-sm tracking-[0.2em] uppercase font-medium">
            Plomberie & Sanitaire
          </p>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-400/50" />
        </div>
      </div>

      <div className={`mt-12 w-64 md:w-80 relative z-10 transition-all duration-1000 delay-500 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="relative">
          <div className="h-1 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #0891b2 0%, #00D4FF 60%, #67e8f9 100%)',
                boxShadow: '0 0 20px rgba(0, 212, 255, 0.6)',
              }}
            />
          </div>

          <div className="flex justify-between items-center mt-3">
            <p className="text-white/40 text-xs tracking-wider font-light">
              {progress < 30 ? 'Initialisation...' : progress < 70 ? 'Chargement...' : progress < 100 ? 'Finalisation...' : 'Bienvenue!'}
            </p>
            <p className="text-cyan-300/80 text-sm font-mono font-semibold">{Math.round(progress)}%</p>
          </div>
        </div>
      </div>

      <div className={`absolute bottom-6 flex items-center gap-2 transition-all duration-1000 delay-700 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-white/25 text-xs tracking-[0.15em] uppercase font-light">Excellence & Innovation</span>
      </div>

      <style>{`
        @keyframes splash-twinkle {
          0%, 100% { opacity: 0.03; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}
