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
      {/* Brand Crest */}
      <div className={`relative ${getIconSize()} rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-black p-0.5 shadow-lg shadow-black/25 ring-2 ring-amber-500/30 shrink-0 group`}>
        <div className="w-full h-full rounded-[14px] bg-black flex items-center justify-center overflow-hidden relative">
          <img
            src="/logo.png"
            alt="Manchester Technologies Logo"
            className="w-full h-full object-contain p-0.5"
          />
        </div>
      </div>

      {/* Typography */}
      {variant !== 'badge' && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-tight text-slate-900 text-lg leading-tight font-heading">
              MANCHESTER <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-600">TECHNOLOGIES</span>
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
