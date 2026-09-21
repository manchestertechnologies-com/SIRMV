import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'compact' | 'badge';
  branchName?: string;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'full',
  branchName = 'Davangere Campus',
  className = ''
}) => {
  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'w-8 h-8';
      case 'lg': return 'w-14 h-14';
      case 'xl': return 'w-20 h-20';
      default: return 'w-11 h-11';
    }
  };

  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      {/* Luxury Shield Crest SVG */}
      <div className={`relative ${getIconSize()} rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-700 to-sky-600 p-0.5 shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-500/30 shrink-0 group`}>
        <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-slate-900 to-indigo-950 flex items-center justify-center overflow-hidden relative">
          {/* Subtle gold inner aura */}
          <div className="absolute inset-0 bg-radial-gradient from-amber-400/15 via-transparent to-transparent"></div>
          
          <svg
            viewBox="0 0 100 100"
            className="w-[82%] h-[82%] text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Laurel / Shield outline */}
            <path
              d="M50 8L88 22V52C88 74 72 90 50 96C28 90 12 74 12 52V22L50 8Z"
              stroke="url(#shieldGold)"
              strokeWidth="3.5"
              fill="#0f172a"
              fillOpacity="0.85"
            />
            {/* Sir MV Gear + Torch of Knowledge */}
            <circle cx="50" cy="50" r="22" stroke="url(#gearGold)" strokeWidth="3" strokeDasharray="6 4" />
            <path
              d="M50 28L54 44H46L50 28Z"
              fill="url(#flameGradient)"
            />
            <path
              d="M50 22C50 22 55 27 55 31C55 34 52.8 36 50 36C47.2 36 45 34 45 31C45 27 50 22 50 22Z"
              fill="#f59e0b"
            />
            {/* Central Monogram / Book */}
            <path
              d="M34 54C39 50 45 52 50 55C55 52 61 50 66 54V74C61 70 55 72 50 75C45 72 39 70 34 74V54Z"
              fill="url(#bookGold)"
              opacity="0.95"
            />
            <line x1="50" y1="55" x2="50" y2="75" stroke="#0f172a" strokeWidth="2" />

            {/* Gradients */}
            <defs>
              <linearGradient id="shieldGold" x1="12" y1="8" x2="88" y2="96" gradientUnits="userSpaceOnUse">
                <stop stopColor="#fbbf24" />
                <stop offset="0.5" stopColor="#f59e0b" />
                <stop offset="1" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="gearGold" x1="28" y1="28" x2="72" y2="72" gradientUnits="userSpaceOnUse">
                <stop stopColor="#60a5fa" />
                <stop offset="1" stopColor="#c084fc" />
              </linearGradient>
              <linearGradient id="flameGradient" x1="46" y1="22" x2="54" y2="44" gradientUnits="userSpaceOnUse">
                <stop stopColor="#fef08a" />
                <stop offset="0.6" stopColor="#f59e0b" />
                <stop offset="1" stopColor="#dc2626" />
              </linearGradient>
              <linearGradient id="bookGold" x1="34" y1="50" x2="66" y2="75" gradientUnits="userSpaceOnUse">
                <stop stopColor="#fef3c7" />
                <stop offset="1" stopColor="#fde68a" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Typography */}
      {variant !== 'badge' && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-tight text-slate-900 text-lg leading-tight font-heading">
              SIR MV <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-600">PU COLLEGE</span>
            </span>
            <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-xs">
              CORE ERP
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mt-0.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-live-dot"></span>
            <span className="font-semibold text-slate-700">{branchName}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400">Davangere • Shivamogga • Ballari</span>
          </div>
        </div>
      )}
    </div>
  );
};
