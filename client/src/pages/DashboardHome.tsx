import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getRoleNavigation } from '../utils/rbac';
import { ArrowRight } from 'lucide-react';
import { ModuleIcon } from '../components/ModuleIcon';
import { Overview } from '../components/Overview';

interface DashboardHomeProps {
  onNavigateTab: (tab: string) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const { menuItems, otherTools, roleTitle, roleSubtitle } = getRoleNavigation(user?.role);

  // Exclude dashboard itself from the tile grid
  const mainTiles = menuItems.filter((item) => item.id !== 'dashboard');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.name || 'there').split(' ')[0];

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2 select-none">
      
      {/* Role-Specific Institutional Welcome Banner */}
      <div className="mt-hero rounded-2xl p-5 sm:p-6 shadow-md shadow-[#4a0709]/15">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#d9a85a] text-[#4a0709] uppercase tracking-wider">
                {user?.role?.replace('_', ' ') || 'INSTITUTIONAL ACCESS'}
              </span>
              <span className="text-xs text-white/70 font-medium">
                {/* TEMPORARY: displaying the campus as "SIRMV Campus" regardless of the
                    account's real assigned branch, per request — swap this
                    back to the plain currentBranch?.name line below once
                    the proper multi-campus display is sorted out. */}
                • SIRMV Campus
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight">
              {greeting}, <span className="mt-underline-draw text-[#f3dcae]">{firstName}</span>
            </h1>
            <p className="text-sm font-medium text-white/85">{roleTitle}</p>
            <p className="text-xs text-white/65 max-w-2xl leading-relaxed">
              {roleSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-white/10 backdrop-blur px-4 py-2.5 rounded-xl border border-white/20">
            <div className="w-9 h-9 rounded-xl bg-[#d9a85a] flex items-center justify-center font-bold text-[#4a0709] text-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white truncate max-w-[150px]">
                {user?.name || 'Authorized User'}
              </div>
              <div className="text-[10px] text-white/60 truncate max-w-[150px]">
                {user?.email || 'Logged In'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Overview />

      {/* Role-Assigned Workspace Tiles Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-semibold text-slate-900 font-heading flex items-center gap-2">
            Your workspace
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#fbf6ec] text-[#8a561f] border border-[#f5e8cc]">{mainTiles.length} modules</span>
          </h2>
          <span className="hidden sm:inline text-[11px] text-slate-400 font-medium">
            Press <kbd className="font-semibold border border-slate-200 rounded px-1">Ctrl K</kbd> to jump anywhere
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
          {mainTiles.map((tile, idx) => {
            return (
              <button
                key={tile.id}
                style={{ ['--i' as any]: idx }}
                onClick={() => onNavigateTab(tile.targetTab)}
                className="mt-tile group mt-tile-card bg-white rounded-2xl p-5 flex flex-col items-center justify-center text-center min-h-[176px] cursor-pointer"
              >
                <div className="mt-tile-icon shrink-0 mb-4 w-[72px] h-[72px] sm:w-20 sm:h-20 flex items-center justify-center">
                  <ModuleIcon item={tile} className="w-full h-full" />
                </div>
                <span className="mt-tile-label text-[15px] font-semibold text-[#2f2d4a] group-hover:text-[#a3161b]">
                  {tile.label}
                </span>
                <span className="mt-tile-go">Open <ArrowRight className="w-3.5 h-3.5" /></span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Other Tools Section (if applicable for this role) */}
      {otherTools.length > 0 && (
        <div className="space-y-3 pt-2">
          <h2 className="text-base font-semibold text-slate-900 font-heading px-1">
            More tools
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
            {otherTools.map((tile, idx) => {
                return (
                <button
                  key={tile.id}
                  style={{ ['--i' as any]: idx }}
                  onClick={() => onNavigateTab(tile.targetTab)}
                  className="mt-tile group mt-tile-card bg-white rounded-2xl p-5 flex flex-col items-center justify-center text-center min-h-[176px] cursor-pointer"
                >
                  <div className="mt-tile-icon shrink-0 mb-4 w-[72px] h-[72px] sm:w-20 sm:h-20 flex items-center justify-center">
                    <ModuleIcon item={tile} className="w-full h-full" />
                  </div>
                  <span className="mt-tile-label text-[15px] font-semibold text-[#2f2d4a] group-hover:text-[#a3161b]">
                    {tile.label}
                  </span>
                  <span className="mt-tile-go">Open <ArrowRight className="w-3.5 h-3.5" /></span>
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
