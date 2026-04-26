import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'horizontal' | 'icon';
  darkMode?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'medium', variant = 'horizontal', darkMode = false }) => {
  const sizes = {
    small: { height: 32, fontSize: 14 },
    medium: { height: 40, fontSize: 18 },
    large: { height: 56, fontSize: 24 },
  };

  const currentSize = sizes[size];
  const uid = React.useId().replace(/:/g, '_');

  const LogoIcon = () => (
    <svg width={currentSize.height} height={currentSize.height} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id={`${uid}bg`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0D4A6E" />
          <stop offset="100%" stopColor="#0A3D5C" />
        </linearGradient>
        <linearGradient id={`${uid}drop`} x1="32" y1="8" x2="32" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="50%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${uid}bg)`} />
      <path
        d="M32 10C32 10 43 25 43 32C43 38 38 42 32 42C26 42 21 38 21 32C21 25 32 10 32 10Z"
        fill={`url(#${uid}drop)`}
      />
      <ellipse cx="28" cy="26" rx="4" ry="2.5" fill="white" opacity="0.45" transform="rotate(-30 28 26)" />
      <rect x="18" y="44" width="28" height="3" rx="1.5" fill="white" opacity="0.5" />
      <text
        x="32" y="57"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="11"
        fontWeight="800"
        fill="white"
        letterSpacing="2"
      >
        TSD
      </text>
    </svg>
  );

  if (variant === 'icon') {
    return <LogoIcon />;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <LogoIcon />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        <span style={{
          fontSize: currentSize.fontSize,
          fontWeight: '800',
          color: darkMode ? '#e0f2fe' : '#0D4A6E',
          letterSpacing: '0.5px',
          lineHeight: '1.1',
        }}>
          TSD & FILS
        </span>
        <span style={{
          fontSize: Math.max(currentSize.fontSize * 0.5, 9),
          fontWeight: '600',
          color: darkMode ? '#94a3b8' : '#64748b',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          lineHeight: '1',
        }}>
          Plomberie Pro
        </span>
      </div>
    </div>
  );
};

export default Logo;
