import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastMessage, dismissToast, subscribeToast } from '../utils/toast';

const STYLES: Record<ToastMessage['type'], { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  error: {
    bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800',
    icon: <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
  },
  success: {
    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
  },
  info: {
    bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800',
    icon: <Info className="w-4 h-4 text-slate-600 shrink-0" />
  }
};

// Mounted once at the app root. Renders as a fixed stack of small cards —
// deliberately NOT a full-screen backdrop, so it never blocks scrolling,
// clicking or touch input elsewhere on the page (unlike window.alert()).
export const ToastContainer: React.FC = () => {
  const [items, setItems] = useState<ToastMessage[]>([]);

  useEffect(() => subscribeToast(setItems), []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 pointer-events-none">
      {items.map((t) => {
        const s = STYLES[t.type];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 ${s.bg} ${s.border} ${s.text} border rounded-xl shadow-lg px-4 py-3 text-xs font-medium sm:max-w-sm animate-in fade-in slide-in-from-bottom-2`}
          >
            {s.icon}
            <span className="flex-1 break-words">{t.message}</span>
            <button onClick={() => dismissToast(t.id)} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
