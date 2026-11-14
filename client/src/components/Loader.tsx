import React from 'react';
// Branded loading animation: a gold ring turning around the college mark.
export const Loader: React.FC<{ label?: string; full?: boolean }> = ({ label = 'Loading', full }) => (
  <div className={`flex flex-col items-center justify-center gap-4 ${full ? 'h-[100dvh] bg-[#f4f6fa]' : 'py-16'}`} role="status" aria-live="polite">
    <div className="mt-loader"><span /><b>SIR MV</b></div>
    <p className="text-xs font-medium text-slate-500">{label}…</p>
  </div>
);
