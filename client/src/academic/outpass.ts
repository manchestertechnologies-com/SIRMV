// Outpass records (kept on this device until the database is connected).
export interface Outpass {
  id: string; studentId: string; name: string; roll: string; section: string; block: string; floor: string; room: string;
  wardenName: string; parentPhone: string; reason: string; destination: string; outAt: string; returnBy: string;
  guardian: string; guardianPhone: string; photo: string; otpVerified: boolean; createdAt: string; createdBy: string;
  status: 'Pending' | 'Approved' | 'Rejected'; decidedBy?: string; decidedAt?: string; note?: string; seen: boolean;
}
const KEY = 'mt-outpasses';
export const loadOutpasses = (): Outpass[] => { try { const v = localStorage.getItem(KEY); return v ? (JSON.parse(v) as Outpass[]) : []; } catch { return []; } };
export const saveOutpasses = (l: Outpass[]) => { try { localStorage.setItem(KEY, JSON.stringify(l)); return true; } catch { return false; } };
export const nextOutpassId = (l: Outpass[]) => `OP-${new Date().getFullYear()}-${String(l.length + 1).padStart(4, '0')}`;

export const fmtDT = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? iso : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }); };

// checks the head warden sees before deciding
export const checksFor = (o: Outpass) => {
  const hrs = (+new Date(o.returnBy) - +new Date(o.outAt)) / 3600000;
  return [
    { label: 'Live photo captured at the gate', ok: !!o.photo },
    { label: 'OTP confirmed by parent / guardian', ok: o.otpVerified },
    { label: 'Return time is after leaving time', ok: hrs > 0 },
    { label: 'Leave is within 72 hours', ok: hrs > 0 && hrs <= 72 },
    { label: 'Hostel room and warden on record', ok: !!o.room && !!o.wardenName },
  ];
};

export const downloadOutpassPdf = async (o: Outpass) => {
  const [{ jsPDF }, QR] = await Promise.all([import('jspdf'), import('qrcode')]);
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const W = 148; const red: [number, number, number] = [163, 22, 27];
  doc.setFillColor(...red); doc.rect(0, 0, W, 24, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('SIR MV PU College', 10, 11);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text('Hostel Outpass  |  SIRMV Campus', 10, 18);
  doc.setFontSize(10); doc.text(o.id, W - 10, 11, { align: 'right' });
  doc.setFontSize(9); doc.text(o.status.toUpperCase(), W - 10, 18, { align: 'right' });
  doc.setTextColor(30, 30, 40);
  if (o.photo) { try { doc.addImage(o.photo, 'JPEG', 10, 30, 32, 40); } catch { /* skip bad image */ } }
  doc.setDrawColor(200, 190, 175); doc.rect(10, 30, 32, 40);
  const rows: [string, string][] = [
    ['Student', o.name], ['Roll No', o.roll], ['Class', o.section], ['Hostel', `${o.block} - ${o.floor}, ${o.room}`], ['Warden', o.wardenName],
  ];
  let y = 35; doc.setFontSize(9);
  rows.forEach(([k, v]) => { doc.setFont('helvetica', 'bold'); doc.text(k + ':', 48, y); doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(v, 88), 70, y); y += 7; });
  y = 78;
  const rows2: [string, string][] = [
    ['Reason', o.reason], ['Destination', o.destination], ['Leaves', fmtDT(o.outAt)], ['Return by', fmtDT(o.returnBy)],
    ['Going with', `${o.guardian} (${o.guardianPhone})`], ['OTP confirmed', o.otpVerified ? 'Yes - parent / guardian' : 'No'],
  ];
  rows2.forEach(([k, v]) => { doc.setFont('helvetica', 'bold'); doc.text(k + ':', 10, y); doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(v, 100), 38, y); y += 7; });
  if (o.decidedBy) { doc.setFont('helvetica', 'bold'); doc.text('Decision:', 10, y); doc.setFont('helvetica', 'normal'); doc.text(`${o.status} by ${o.decidedBy}${o.note ? ' - ' + o.note : ''}`, 38, y); y += 7; }
  try { const qr = await QR.toDataURL(`${o.id}|${o.studentId}|${o.status}`, { margin: 1, width: 160 }); doc.addImage(qr, 'PNG', W - 40, 150, 30, 30); } catch { /* optional */ }
  doc.setDrawColor(120); doc.line(10, 190, 55, 190); doc.line(W - 55, 190, W - 10, 190);
  doc.setFontSize(8); doc.setTextColor(100); doc.text('Head Warden signature', 10, 195); doc.text('Gate staff signature', W - 55, 195);
  doc.text(`Generated ${fmtDT(o.createdAt)}`, 10, 142);
  doc.save(`${o.id}.pdf`);
};
