import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getRoleNavigation } from '../utils/rbac';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const { menuItems, otherTools } = getRoleNavigation(user?.role);

  return (
    <aside className="w-56 shrink-0 bg-[#ebe7de] border-r border-[#ded9cf] min-h-screen flex flex-col select-none">
      {/* Top Brand / Official Logo */}
      <div className="p-3.5 flex items-center gap-2.5 border-b border-[#ded9cf]/60">
        <img
          src="/logo.png"
          alt="SIR MV Logo"
          className="w-10 h-10 object-contain drop-shadow-xs shrink-0"
        />
        <div className="min-w-0">
          <div className="font-extrabold text-slate-900 text-[13px] tracking-tight font-heading leading-tight truncate">
            SIR MV PU COLLEGE
          </div>
          <div className="text-[10px] text-blue-700 font-extrabold uppercase tracking-wider truncate">
            SHIVAMOGGA CAMPUS
          </div>
        </div>
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
                onClick={() => setActiveTab(item.targetTab)}
                className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] transition-all duration-100 ${
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
                  onClick={() => setActiveTab(item.targetTab)}
                  className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] transition-all duration-100 ${
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
  );
};
