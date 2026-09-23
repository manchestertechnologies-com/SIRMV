import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getRoleNavigation } from '../utils/rbac';
import { X } from 'lucide-react';

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
  // so the newly chosen page is immediately visible instead of staying
  // hidden behind the open sidebar.
  const handleSelect = (tab: string) => {
    setActiveTab(tab);
    onClose?.();
  };

  return (
    <>
      {/* Backdrop — mobile only, shown while the drawer is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed md:relative top-0 left-0 h-screen md:h-auto md:min-h-screen z-50 md:z-auto
          w-72 sm:w-64 md:w-56 shrink-0 bg-[#ebe7de] border-r border-[#ded9cf]
          flex flex-col select-none
          transform transition-transform duration-200 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}
      >
        {/* Top Brand / Official Logo */}
        <div className="p-3.5 flex items-center gap-2.5 border-b border-[#ded9cf]/60">
          <img
            src="/logo.png"
            alt="SIR MV Logo"
            className="w-10 h-10 object-contain drop-shadow-xs shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-slate-900 text-[13px] tracking-tight font-heading leading-tight truncate">
              SIR MV PU COLLEGE
            </div>
            <div className="text-[10px] text-blue-700 font-extrabold uppercase tracking-wider truncate">
              SHIVAMOGGA CAMPUS
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-[#dfdbd2] hover:text-slate-800 transition shrink-0"
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
                  onClick={() => handleSelect(item.targetTab)}
                  className={`w-full flex items-center gap-3 px-3 py-2 md:py-1.5 rounded-lg text-sm md:text-[13px] transition-all duration-100 ${
                    isActive
                      ? 'bg-[#dfdbd2] text-slate-900 font-semibold'
                      : 'text-slate-700 hover:bg-[#e4dfd6] hover:text-slate-900'
                  }`}
                >
                  <div className="shrink-0 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Other Tools Section */}
          <div className="pt-3 mt-2 border-t border-[#ded9cf]">
            <div className="px-3 pb-1 text-[11px] font-bold text-slate-500">
              Other Tools
            </div>
            <nav className="space-y-0.5">
              {otherTools.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.targetTab;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.targetTab)}
                    className={`w-full flex items-center gap-3 px-3 py-2 md:py-1.5 rounded-lg text-sm md:text-[13px] transition-all duration-100 ${
                      isActive
                        ? 'bg-[#dfdbd2] text-slate-900 font-semibold'
                        : 'text-slate-700 hover:bg-[#e4dfd6] hover:text-slate-900'
                    }`}
                  >
                    <div className="shrink-0 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
};
