import React, { useRef, useState } from 'react';
import jsQR from 'jsqr';
import { apiFetch } from '../services/api';
import { QrCode, Camera, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

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
// phone) to confirm they are physically present in the exam room. Uses a
// plain camera-capture file input rather than a live video stream — every
// mobile browser supports "take a photo" with zero extra permissions
// plumbing, and a single still frame is all jsQR needs to decode the code.
export const InvigilationScanPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setIsScanning(true);
    setResult(null);
    setError(null);
    try {
      const imageBitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not process the image.');
      ctx.drawImage(imageBitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(imageData.data, imageData.width, imageData.height);

      if (!decoded || !decoded.data) {
        setError('No QR code found in that photo. Try again with the code centered and in focus.');
        return;
      }

      const res = await apiFetch<ScanResult>('/exam-management/invigilation-scan', {
        method: 'POST',
        body: JSON.stringify({ token: decoded.data })
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Could not scan or verify this QR code.');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <QrCode className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-900 font-heading">Scan Invigilation QR</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Scan the QR code shown on an invigilator's phone to confirm they are present for their exam duty.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 text-center space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning}
          className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition disabled:opacity-60"
        >
          <Camera className="w-5 h-5" />
          {isScanning ? 'Scanning…' : 'Open Camera & Scan QR'}
        </button>
        <p className="text-[11px] text-slate-400">
          Each QR code only works during that exam's time window and can only be used once.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-2 text-rose-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className={`rounded-2xl p-5 border space-y-2 ${result.alreadyMarked ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
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
    </div>
  );
};
