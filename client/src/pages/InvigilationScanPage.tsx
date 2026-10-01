import React, { useState } from 'react';
import { apiFetch } from '../services/api';
import { QrCode, Camera, CheckCircle2, AlertCircle, ShieldCheck, RotateCcw } from 'lucide-react';
import { LiveQrScanner } from '../components/LiveQrScanner';

interface ScanResult {
  success: boolean;
  alreadyMarked: boolean;
  message: string;
  teacherName: string;
  roomNumber: string;
  subjectName: string;
  examName: string;
}

// Floor Attender scans an invigilator's duty QR (shown on the teacher's own
// phone) to confirm they are physically present in the exam room. The
// camera is NOT started on page load — it only opens once "Scan QR Code"
// is clicked, which mounts the live, continuous camera scanner.
export const InvigilationScanPage: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (token: string) => {
    if (isVerifying) return; // avoid double-firing while a request is in flight
    setIsVerifying(true);
    setError(null);
    try {
      const res = await apiFetch<ScanResult>('/exam-management/invigilation-scan', {
        method: 'POST',
        body: JSON.stringify({ token })
      });
      setResult(res);
      setIsScanning(false);
    } catch (err: any) {
      setError(err.message || 'Could not scan or verify this QR code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const startScanning = () => {
    setResult(null);
    setError(null);
    setIsScanning(true);
  };

  const scanAnother = () => {
    setResult(null);
    setError(null);
    setIsScanning(true);
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <QrCode className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-900 font-heading">Exam Invigilation Attendance</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Scan the QR code shown on an invigilator's phone to confirm they are present for their exam duty.
        </p>
      </div>

      {!isScanning && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 text-center space-y-4">
          <button
            onClick={startScanning}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition active:scale-[0.98]"
          >
            <Camera className="w-5 h-5" />
            Scan QR Code
          </button>
          <p className="text-[11px] text-slate-400">
            Each QR code only works during that exam's time window and can only be used once.
          </p>
        </div>
      )}

      {isScanning && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
          <LiveQrScanner onScan={handleScan} active={isScanning} heightPx={320} />
          {isVerifying && (
            <p className="text-center text-xs font-semibold text-indigo-600">Verifying…</p>
          )}
          <button
            onClick={() => setIsScanning(false)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            Cancel
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-2 text-rose-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {result && !isScanning && (
        <div className={`rounded-2xl p-5 border space-y-3 ${result.alreadyMarked ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
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
          <button
            onClick={scanAnother}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Scan Another
          </button>
        </div>
      )}
    </div>
  );
};

export default InvigilationScanPage;
