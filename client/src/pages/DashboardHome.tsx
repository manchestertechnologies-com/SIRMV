import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRoleNavigation } from '../utils/rbac';
import { apiFetch } from '../services/api';
import { Sparkles, Building2, UserCheck, ShieldCheck, QrCode, CheckCircle2, AlertCircle } from 'lucide-react';
import { LiveQrScanner } from '../components/LiveQrScanner';

interface DashboardHomeProps {
  onNavigateTab: (tab: string) => void;
}

interface ScanResult {
  success: boolean;
  alreadyMarked: boolean;
  message: string;
  teacherName: string;
  roomNumber: string;
  subjectName: string;
  examName: string;
}

// Floor Attender's always-on invigilation-duty scanner — kept right on their
// dashboard home (PhonePe/GPay style: open the app, the camera is already
// scanning) rather than tucked behind a separate nav tab, since this is the
// thing they'll reach for dozens of times a day during exam season.
const InvigilationScannerCard: React.FC = () => {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [scannerKey, setScannerKey] = useState(0); // remount to resume scanning after a result

  const handleScan = async (token: string) => {
    if (isVerifying) return;
    setIsVerifying(true);
    setError(null);
    try {
      const res = await apiFetch<ScanResult>('/exam-management/invigilation-scan', {
        method: 'POST',
        body: JSON.stringify({ token })
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Could not verify this QR code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const resumeScanning = () => {
    setResult(null);
    setError(null);
    setScannerKey((k) => k + 1);
  };

  return (
    <div className="bg-[#fdfcfb] border border-[#ded9cf] rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <QrCode className="w-5 h-5 text-indigo-600" />
        <h2 className="text-sm font-bold text-slate-900">Scan Invigilation Duty QR</h2>
      </div>
      <p className="text-xs text-slate-500">
        Point the camera at an invigilator's duty QR to confirm they're present in their exam room. It
        verifies and marks attendance automatically — no extra steps.
      </p>

      {result || error ? (
        <div className="space-y-3">
          {result && (
            <div className={`rounded-2xl p-4 border space-y-1.5 ${result.alreadyMarked ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {result.alreadyMarked ? (
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
                <span className={result.alreadyMarked ? 'text-amber-800' : 'text-emerald-800'}>{result.message}</span>
              </div>
              <div className="text-xs text-slate-600 space-y-0.5">
                <div><span className="font-semibold">Invigilator:</span> {result.teacherName}</div>
                <div><span className="font-semibold">Room:</span> {result.roomNumber}</div>
                <div><span className="font-semibold">Exam:</span> {result.examName} — {result.subjectName}</div>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-2 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          <button
            onClick={resumeScanning}
            className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
          >
            Scan Another
          </button>
        </div>
      ) : (
        <LiveQrScanner key={scannerKey} onScan={handleScan} />
      )}
    </div>
  );
};

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

      {/* Floor Attender: always-on invigilation QR scanner, front and center */}
      {user?.role === 'FLOOR_ATTENDER' && <InvigilationScannerCard />}

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
