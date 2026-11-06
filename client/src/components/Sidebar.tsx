import React, { useEffect } from 'react';
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
      className="press mt-nav-tile mt-rise w-full flex flex-col items-center gap-1.5 px-1 pt-2 pb-2 rounded-2xl"
    >
      <span className="mt-nav-icon w-12 h-12 rounded-2xl bg-white flex items-center justify-center">
        <ModuleIcon item={item} className="w-9 h-9" />
      </span>
      <span className="mt-nav-label text-[11px] font-semibold leading-tight text-center line-clamp-2 px-0.5">
        {item.label}
      </span>
    </button>
  );

  return (
    <div className="md:relative md:shrink-0 md:h-full md:w-28">
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
          mt-sidebar w-28 overflow-hidden
          flex flex-col select-none safe-top safe-bottom
          transform transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}
      >
        {/* Official logo */}
        <div className="px-3 pt-4 pb-3 flex justify-center border-b border-white/10">
          <img
            src="/logo.png"
            alt="SIR MV PU College Logo"
            className="w-14 h-14 object-contain rounded-2xl bg-white p-1 ring-2 ring-[#d9a85a]/70"
          />
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
              <div className="pb-1.5 text-center text-[10px] font-semibold text-[#e6c28f]/80">More tools</div>
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
