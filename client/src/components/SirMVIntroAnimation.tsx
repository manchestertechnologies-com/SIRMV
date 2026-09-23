import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Zap, ArrowRight, Lightbulb } from 'lucide-react';

interface SirMVIntroAnimationProps {
  onComplete: () => void;
}

export const SirMVIntroAnimation: React.FC<SirMVIntroAnimationProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'intro' | 'opening' | 'shining' | 'complete'>('intro');

  useEffect(() => {
    const t1 = setTimeout(() => setStage('opening'), 1200);
    const t2 = setTimeout(() => setStage('shining'), 2800);
    const t3 = setTimeout(() => {
      setStage('complete');
      onComplete();
    }, 4600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#0b1329] via-[#0f172a] to-[#020617] flex flex-col items-center justify-center p-4 overflow-hidden select-none">
      {/* Background Starfield / Particle Radiance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[120px] -top-20 -left-20 transition-all duration-1000 ${stage === 'shining' ? 'scale-150 bg-amber-500/30' : ''}`} />
        <div className={`absolute w-[500px] h-[500px] rounded-full bg-amber-500/15 blur-[100px] -bottom-20 -right-20 transition-all duration-1000 ${stage === 'shining' ? 'scale-150 bg-cyan-400/30' : ''}`} />
      </div>

      {/* Main Animated Stage */}
      <div className="relative flex flex-col items-center max-w-md w-full text-center z-10">
        
        {/* Animated Sir M. Visvesvaraya Illustration */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 mb-6 flex items-center justify-center">
          
          {/* Glowing Aura Rings */}
          <div className={`absolute inset-0 rounded-full border border-amber-400/30 animate-ping transition-opacity duration-700 ${stage === 'shining' ? 'opacity-100 scale-125' : 'opacity-0'}`} />
          <div className={`absolute w-56 h-56 rounded-full bg-radial from-amber-400/40 via-blue-500/20 to-transparent blur-xl transition-all duration-700 ${stage === 'shining' ? 'scale-150 opacity-100' : 'opacity-40'}`} />

          {/* SVG Portrait of Sir M. Visvesvaraya with Opening Turban & Glowing Brain */}
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Defs / Gradients */}
            <defs>
              <linearGradient id="petaGold" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f59e0b" />
                <stop offset="0.5" stopColor="#d97706" />
                <stop offset="1" stopColor="#78350f" />
              </linearGradient>
              <linearGradient id="brainGlow" x1="50" y1="20" x2="150" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38bdf8" />
                <stop offset="0.5" stopColor="#818cf8" />
                <stop offset="1" stopColor="#f59e0b" />
              </linearGradient>
              <radialGradient id="lightBurst" cx="50%" cy="50%" r="50%">
                <stop stopColor="#ffffff" stopOpacity="1" />
                <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="80%" stopColor="#fbbf24" stopOpacity="0.4" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Glowing Brain Emerging Out (Stage 2 & 3) */}
            <g
              className={`transition-all duration-1000 ease-out origin-center ${
                stage === 'intro'
                  ? 'opacity-0 scale-50 translate-y-10'
                  : stage === 'opening'
                  ? 'opacity-90 scale-100 -translate-y-4'
                  : 'opacity-100 scale-125 -translate-y-10 filter drop-shadow-[0_0_20px_#38bdf8]'
              }`}
            >
              {/* Brain Flare Circle */}
              <circle cx="100" cy="55" r="38" fill="url(#lightBurst)" opacity={stage === 'shining' ? '0.9' : '0.5'} />
              
              {/* Left Brain Hemisphere */}
              <path
                d="M82 40C72 40 64 48 64 58C64 64 68 70 73 73C70 78 72 84 76 87C80 90 87 90 92 88C95 89 98 88 100 86V36C94 36 88 38 82 40Z"
                fill="url(#brainGlow)"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              {/* Right Brain Hemisphere */}
              <path
                d="M118 40C128 40 136 48 136 58C136 64 132 70 127 73C130 78 128 84 124 87C120 90 113 90 108 88C105 89 102 88 100 86V36C106 36 112 38 118 40Z"
                fill="url(#brainGlow)"
                stroke="#ffffff"
                strokeWidth="1.5"
              />

              {/* Neural Synapse Electric Sparks */}
              <circle cx="85" cy="50" r="2.5" fill="#ffffff" className="animate-ping" />
              <circle cx="115" cy="52" r="2.5" fill="#fef08a" className="animate-ping" />
              <circle cx="100" cy="65" r="3" fill="#38bdf8" />
              <path d="M85 50L100 65L115 52M88 72L100 65L112 72" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 2" />
            </g>

            {/* Shoulders / Coat / Formal Collar */}
            <path
              d="M40 190C40 155 65 145 100 145C135 145 160 155 160 190H40Z"
              fill="#1e293b"
              stroke="#334155"
              strokeWidth="2"
            />
            {/* White Collar & Tie */}
            <path d="M88 145L100 170L112 145H88Z" fill="#f8fafc" />
            <path d="M96 155L100 190L104 155H96Z" fill="#991b1b" />

            {/* Neck & Face */}
            <path d="M82 130H118V148H82V130Z" fill="#fbd5b5" />
            <path
              d="M70 85C70 65 130 65 130 85C130 115 120 135 100 135C80 135 70 115 70 85Z"
              fill="#f8c9a3"
              stroke="#d49a6a"
              strokeWidth="1.5"
            />

            {/* Eyes & Dignified Expressions */}
            <circle cx="86" cy="95" r="3" fill="#1e293b" />
            <circle cx="114" cy="95" r="3" fill="#1e293b" />
            {/* Spectacles (Iconic Round Wire-rim Glasses) */}
            <circle cx="86" cy="95" r="9" stroke="#94a3b8" strokeWidth="1.8" fill="rgba(255,255,255,0.15)" />
            <circle cx="114" cy="95" r="9" stroke="#94a3b8" strokeWidth="1.8" fill="rgba(255,255,255,0.15)" />
            <line x1="95" y1="95" x2="105" y2="95" stroke="#94a3b8" strokeWidth="2" />
            {/* Nose & Gentle Smile */}
            <path d="M100 95V108L96 112H104" stroke="#c07d4b" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M90 122C95 125 105 125 110 122" stroke="#8c4e23" strokeWidth="2" strokeLinecap="round" />

            {/* Iconic Mysuru Peta (Turban) - Opens Upward in Stage 2/3 */}
            <g
              className={`transition-all duration-1000 ease-out origin-top ${
                stage === 'intro'
                  ? 'translate-y-0 opacity-100'
                  : stage === 'opening'
                  ? '-translate-y-8 rotate-[-3deg] opacity-95'
                  : '-translate-y-16 opacity-80 scale-95'
              }`}
            >
              {/* Turban Body with Golden Mysore Brocade */}
              <path
                d="M58 75C55 52 75 42 100 42C125 42 145 52 142 75C140 82 60 82 58 75Z"
                fill="url(#petaGold)"
                stroke="#b45309"
                strokeWidth="2"
              />
              {/* Turban Crown Fan */}
              <path
                d="M80 44C80 28 100 24 100 24C100 24 120 28 120 44H80Z"
                fill="#b91c1c"
                stroke="#7f1d1d"
                strokeWidth="1.5"
              />
              {/* Golden Zari Bands */}
              <path d="M62 65C80 62 120 62 138 65" stroke="#fef08a" strokeWidth="2.5" />
              <path d="M66 55C82 52 118 52 134 55" stroke="#fef08a" strokeWidth="2" />
              {/* Turban Kalgi / Jewel */}
              <circle cx="100" cy="40" r="5" fill="#fef08a" stroke="#d97706" strokeWidth="1.5" />
              <circle cx="100" cy="40" r="2" fill="#ef4444" />
            </g>
          </svg>

          {/* Radiating Light Beams on Shining */}
          {stage === 'shining' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent blur-xs animate-pulse rotate-45" />
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-sky-300 to-transparent blur-xs animate-pulse -rotate-45" />
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent blur-xs animate-pulse rotate-90" />
            </div>
          )}
        </div>

        {/* Text Announcements */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wide">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span>LEGACY OF SIR M. VISVESVARAYA</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading">
            {stage === 'intro' && 'Awakening the Vision...'}
            {stage === 'opening' && 'The Intellect of Engineering...'}
            {stage === 'shining' && 'Illuminating SIR MV Campus ERP'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 italic max-w-sm mx-auto">
            "Work is worship, and discipline is the bridge between goals and accomplishment."
          </p>

          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              onClick={onComplete}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95"
            >
              <span>Enter Shivamogga Campus ERP</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
