import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRoleNavigation } from '../utils/rbac';
import { X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen = false, onClose }) => {
  const { user } = useAuth();
  const { menuItems, otherTools } = getRoleNavigation(user?.role);

  // Desktop: the menu can shrink to an icon rail that slides open on hover.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('mt-sb-collapsed') === '1'; } catch { return false; }
  });
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try { localStorage.setItem('mt-sb-collapsed', c ? '0' : '1'); } catch { /* storage blocked */ }
      return !c;
    });
  };
  const label = 'transition-opacity duration-200 md:group-data-[collapsed=true]/sb:opacity-0 md:group-data-[collapsed=true]/sb:group-hover/sb:opacity-100';

  // Selecting a tab always navigates; on mobile it also closes the drawer
  // so the newly chosen page is immediately visible instead of staying
  // hidden behind the open sidebar.
  const handleSelect = (tab: string) => {
    setActiveTab(tab);
    onClose?.();
  };

  // Lock background scroll while the drawer is open — standard iOS drawer behavior
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prevOverflow; };
    }
  }, [isOpen]);

  return (
    <div
      data-collapsed={collapsed}
      className="group/sb md:relative md:shrink-0 md:h-full md:w-[var(--sbw)] transition-[width] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
      style={{ ['--sbw' as any]: collapsed ? '68px' : '224px' }}
    >
      {/* Backdrop — mobile only, shown while the drawer is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden animate-backdrop-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed md:absolute top-0 left-0 h-screen md:h-full z-50
          mt-sidebar w-72 sm:w-64 md:w-[var(--sbw)] md:group-data-[collapsed=true]/sb:hover:w-56 overflow-hidden
          flex flex-col select-none safe-top safe-bottom
          transform [transition-property:transform,width] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}
      >
        {/* Top Brand / Official Logo */}
        <div className="p-3.5 flex items-center gap-2.5 border-b border-white/10">
          <img
            src="/logo.png"
            alt="Manchester Technologies Logo"
            className="w-10 h-10 object-contain rounded-xl bg-white p-0.5 ring-1 ring-[#c28535]/60 shrink-0"
          />
          <div className={`min-w-0 flex-1 whitespace-nowrap ${label}`}>
            <div className="font-extrabold text-white text-[13px] tracking-tight font-heading leading-tight truncate">
              MANCHESTER TECHNOLOGIES
            </div>
            <div className="text-[10px] text-[#e6c28f] font-extrabold uppercase tracking-wider truncate">
              DAVANGERE CAMPUS
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="press md:hidden p-1.5 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition shrink-0"
            aria-label="Close menu"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="py-2 px-2 flex-1 overflow-y-auto space-y-0.5 custom-scrollbar">
          <nav className="space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.targetTab ||
                (item.id === 'dashboard' && activeTab === 'dashboard-home');

              return (
                <button
                  key={item.id}
                  data-active={isActive}
                  style={{ ['--i' as any]: menuItems.indexOf(item) }}
                  onClick={() => handleSelect(item.targetTab)}
                  className={`press mt-nav-item mt-slide w-full flex items-center gap-3 px-3 py-2 md:py-1.5 rounded-lg text-sm md:text-[13px] duration-200 ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-white/75 hover:text-white'
                  }`}
                >
                  <div className="shrink-0 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className={`truncate whitespace-nowrap ${label}`}>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Other Tools Section */}
          <div className="pt-3 mt-2 border-t border-white/10">
            <div className={`px-3 pb-1 text-[11px] font-bold text-[#e6c28f]/80 uppercase tracking-wider whitespace-nowrap ${label}`}>
              Other Tools
            </div>
            <nav className="space-y-0.5">
              {otherTools.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.targetTab;

                return (
                  <button
                    key={item.id}
                    data-active={isActive}
                    onClick={() => handleSelect(item.targetTab)}
                    className={`press mt-nav-item w-full flex items-center gap-3 px-3 py-2 md:py-1.5 rounded-lg text-sm md:text-[13px] duration-200 ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-white/75 hover:text-white'
                    }`}
                  >
                    <div className="shrink-0 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span className={`truncate whitespace-nowrap ${label}`}>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Collapse / expand — desktop only */}
        <div className="hidden md:block p-2 border-t border-white/10">
          <button
            onClick={toggleCollapsed}
            className="mt-nav-item w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-white/75 hover:text-white"
            aria-label={collapsed ? 'Pin menu open' : 'Collapse menu'}
          >
            <div className="shrink-0 flex items-center justify-center">
              {collapsed ? <PanelLeftOpen className="w-4.5 h-4.5" /> : <PanelLeftClose className="w-4.5 h-4.5" />}
            </div>
            <span className={`truncate whitespace-nowrap ${label}`}>{collapsed ? 'Pin menu open' : 'Collapse menu'}</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
