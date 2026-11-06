import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRoleNavigation } from '../utils/rbac';
import { ModuleIcon } from './ModuleIcon';

interface Props {
  onNavigate: (tab: string) => void;
}

// Ctrl/Cmd + K (or "/") opens a quick jump menu for every page the role can use.
export const CommandPalette: React.FC<Props> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { menuItems, otherTools } = getRoleNavigation(user?.role);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    const all = [...menuItems, ...otherTools];
    const q = query.trim().toLowerCase();
    return q
      ? all.filter((i) => `${i.label} ${i.description || ''}`.toLowerCase().includes(q))
      : all;
  }, [menuItems, otherTools, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName || '');
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === '/' && !typing && !open) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('mt:open-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mt:open-palette', onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => { setIndex(0); }, [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-sel="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  if (!open) return null;

  const go = (tab: string) => {
    setOpen(false);
    onNavigate(tab);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && items[index]) { e.preventDefault(); go(items[index].targetTab); }
  };

  return (
    <div className="fixed inset-0 z-[9000] flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal="true" aria-label="Quick search">
      <div className="mt-palette-backdrop absolute inset-0 bg-[#3d0507]/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="mt-palette relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#ecdcc6] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search className="w-4.5 h-4.5 text-[#a3161b] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Jump to a page…  (students, attendance, exams)"
            className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline text-[10px] font-semibold text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2 custom-scrollbar">
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-400">Nothing matches “{query}”.</div>
          )}
          {items.map((item, i) => {
            const sel = i === index;
            return (
              <button
                key={item.id}
                data-sel={sel}
                data-no-ripple
                onMouseEnter={() => setIndex(i)}
                onClick={() => go(item.targetTab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-200 ${
                  sel ? 'bg-[#fdf0f0]' : 'hover:bg-slate-50'
                }`}
              >
                <span className="w-9 h-9 rounded-lg bg-[#fbf6ec] border border-[#f5e8cc] flex items-center justify-center shrink-0">
                  <ModuleIcon item={item} className="w-6 h-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-slate-900 truncate">{item.label}</span>
                  {item.description && (
                    <span className="block text-[11px] text-slate-500 truncate">{item.description}</span>
                  )}
                </span>
                {sel && <CornerDownLeft className="w-3.5 h-3.5 text-[#a3161b] shrink-0" />}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-[#fdfaf4] text-[10px] text-slate-400 font-medium">
          <span>↑ ↓ to move &nbsp;·&nbsp; Enter to open</span>
          <span>Ctrl K anywhere</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
