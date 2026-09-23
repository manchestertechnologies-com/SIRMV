import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getRoleNavigation } from '../utils/rbac';
import { Sparkles, Building2, UserCheck, ShieldCheck } from 'lucide-react';

interface DashboardHomeProps {
  onNavigateTab: (tab: string) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ onNavigateTab }) => {
  const { user, currentBranch } = useAuth();
  const { menuItems, otherTools, roleTitle, roleSubtitle } = getRoleNavigation(user?.role);

  // Exclude dashboard itself from the tile grid
  const mainTiles = menuItems.filter((item) => item.id !== 'dashboard');

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2 select-none">
      
      {/* Role-Specific Institutional Welcome Banner */}
      <div className="bg-[#fdfcfb] border border-[#ded9cf] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                {user?.role?.replace('_', ' ') || 'INSTITUTIONAL ACCESS'}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                • {currentBranch?.name || 'Shivamogga Campus'}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 font-heading">
              {roleTitle}
            </h1>
            <p className="text-xs text-slate-600 max-w-2xl">
              {roleSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-[#f4f1ea] px-4 py-2.5 rounded-xl border border-[#ded8cb]">
            <div className="w-9 h-9 rounded-xl bg-white border border-[#ded8cb] flex items-center justify-center font-bold text-blue-700 text-sm shadow-2xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                {user?.name || 'Authorized User'}
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                {user?.email || 'Logged In'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Assigned Workspace Tiles Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Assigned Workspace Modules ({mainTiles.length})
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">
            Role-Based Access
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-5">
          {mainTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.id}
                onClick={() => onNavigateTab(tile.targetTab)}
                className="group bg-[#fdfcfb] hover:bg-white border border-[#ded9cf] hover:border-blue-400/60 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-2xs hover:shadow-md transition-all duration-150 active:scale-[0.98] min-h-[140px] cursor-pointer"
              >
                <div className="shrink-0 mb-3 group-hover:scale-105 transition-transform duration-150">
                  <Icon className="w-12 h-12 sm:w-13 sm:h-13" />
                </div>
                <span className="text-[13px] font-bold text-slate-800 group-hover:text-blue-700 transition-colors tracking-tight">
                  {tile.label}
                </span>
                {tile.description && (
                  <span className="text-[10px] text-slate-400 mt-1 line-clamp-1 max-w-[140px]">
                    {tile.description}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Other Tools Section (if applicable for this role) */}
      {otherTools.length > 0 && (
        <div className="space-y-3 pt-2">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
            Specialized Tools
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-5">
            {otherTools.map((tile) => {
              const Icon = tile.icon;
              return (
                <button
                  key={tile.id}
                  onClick={() => onNavigateTab(tile.targetTab)}
                  className="group bg-[#fdfcfb] hover:bg-white border border-[#ded9cf] hover:border-blue-400/60 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-2xs hover:shadow-md transition-all duration-150 active:scale-[0.98] min-h-[140px] cursor-pointer"
                >
                  <div className="shrink-0 mb-3 group-hover:scale-105 transition-transform duration-150">
                    <Icon className="w-12 h-12 sm:w-13 sm:h-13" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800 group-hover:text-blue-700 transition-colors tracking-tight">
                    {tile.label}
                  </span>
                  {tile.description && (
                    <span className="text-[10px] text-slate-400 mt-1 line-clamp-1 max-w-[140px]">
                      {tile.description}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardHome;
