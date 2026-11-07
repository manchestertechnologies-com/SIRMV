import React, { useEffect, useRef, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRoleNavigation } from '../utils/rbac';
import { ModuleIcon } from './ModuleIcon';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen = false, onClose }) => {
  const { user } = useAuth();
  const { menuItems, otherTools } = getRoleNavigation(user?.role);
  // icon-only rail by default; the toggle reveals names next to the icons
  // hovering the rail opens it (names under the icons); the button pins it open
  const [pinned, setPinned] = useState(() => { try { return localStorage.getItem('mt-sidebar-wide') === '1'; } catch { return false; } });
  const [hover, setHover] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  // small delays so brushing past the rail doesn't flicker it open or shut
  const setHoverSoon = (v: boolean) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setHover(v), 0); };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const wide = pinned || hover;
  const toggle = () => setPinned((w) => { const n = !w; try { localStorage.setItem('mt-sidebar-wide', n ? '1' : '0'); } catch { /* ignore */ } return n; });

  // Selecting a tab always navigates; on mobile it also closes the drawer
  // so the newly chosen page is immediately visible.
  const handleSelect = (tab: string) => {
    setActiveTab(tab);
    onClose?.();
  };

  // Lock background scroll while the drawer is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prevOverflow; };
    }
  }, [isOpen]);

  const renderItem = (item: (typeof menuItems)[number], isActive: boolean, index: number) => (
    <button
      key={item.id}
      data-active={isActive}
      title={item.label}
      style={{ ['--i' as any]: index }}
      onClick={() => handleSelect(item.targetTab)}
      className="press mt-nav-tile w-full flex flex-col items-center gap-1 px-1 py-1.5 rounded-[12px]"
    >
      <span className="mt-nav-icon w-10 h-10 rounded-[10px] bg-white flex items-center justify-center shrink-0">
        <ModuleIcon item={item} className="w-7 h-7" />
      </span>
      <span className={`mt-nav-label text-[11px] font-semibold leading-tight text-center line-clamp-2 px-0.5 min-h-[26px] ${wide ? 'opacity-100' : 'md:opacity-0'}`}>
        {item.label}
      </span>
    </button>
  );

  return (
    <div className={`md:relative md:shrink-0 md:h-full transition-[width] duration-300 ${pinned ? 'md:w-28' : 'md:w-[68px]'}`}>
      {/* Backdrop — mobile only, shown while the drawer is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden animate-backdrop-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        onMouseEnter={() => setHoverSoon(true)}
        onMouseLeave={() => setHoverSoon(false)}
        className={`
          fixed md:absolute top-0 left-0 h-screen md:h-full z-50
          mt-sidebar w-28 ${wide ? 'md:w-28' : 'md:w-[68px]'} overflow-hidden md:transition-[width] md:duration-200
          flex flex-col select-none safe-top safe-bottom
          transform transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}
      >
        {/* Official logo */}
        <div className={`px-3 pt-4 pb-3 flex items-center gap-2 border-b border-white/10 ${wide ? 'justify-between' : 'md:flex-col md:justify-center'} justify-between`}>
          <img
            src="/logo.png"
            alt="SIR MV PU College Logo"
            className={`object-contain rounded-[12px] bg-white p-1 ring-2 ring-[#d9a85a]/70 ${wide ? 'w-12 h-12' : 'w-12 h-12 md:w-10 md:h-10'}`}
          />
          <button onClick={toggle} title={pinned ? 'Unpin names' : 'Keep names visible'} aria-label="Toggle sidebar names" className="hidden md:inline-flex p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition">
            {pinned ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <div className="py-2 px-2 flex-1 overflow-y-auto space-y-1">
          <nav className="space-y-1">
            {menuItems.map((item, i) =>
              renderItem(item, activeTab === item.targetTab || (item.id === 'dashboard' && activeTab === 'dashboard-home'), i)
            )}
          </nav>

          {otherTools.length > 0 && (
            <div className="pt-3 mt-2 border-t border-white/10">
              <div className={`pb-1.5 text-center text-[10px] font-semibold text-[#e6c28f]/80 ${wide ? '' : 'md:hidden'}`}>More tools</div>
              <nav className="space-y-1">
                {otherTools.map((item, i) => renderItem(item, activeTab === item.targetTab, menuItems.length + i))}
              </nav>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
