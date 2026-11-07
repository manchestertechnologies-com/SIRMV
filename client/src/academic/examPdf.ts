import { Staff } from './sampleData';
import { Classroom } from './classrooms';
import { ExamPlan, fmtTime } from './examPlan';
import { RoomPlan, groupName } from './seating';

// PDFs for exam duty: one hall for the invigilator, every hall for the exam department.
type Doc = import('jspdf').jsPDF;
const dateText = (p: ExamPlan) => new Date(`${p.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const header = (d: Doc, title: string, p: ExamPlan) => {
  d.setFillColor(140, 17, 24); d.rect(0, 0, 210, 22, 'F'); d.setTextColor(255); d.setFont('helvetica', 'bold'); d.setFontSize(14); d.text('SIR MV PU College', 14, 10);
  d.setFontSize(10); d.setFont('helvetica', 'normal'); d.text(title, 14, 17); d.setTextColor(30);
  d.setFont('helvetica', 'bold'); d.setFontSize(12); d.text(p.name, 14, 31);
  d.setFont('helvetica', 'normal'); d.setFontSize(9.5); d.text(`${dateText(p)}  |  ${fmtTime(p.start)}  |  ${p.durationMin} minutes`, 14, 37);
};
const hall = (d: Doc, rp: RoomPlan, floor: string, inv: Staff | undefined, y: number) => {
  d.setFont('helvetica', 'bold'); d.setFontSize(11); d.text(`${rp.room.name}  (${floor})`, 14, y);
  d.setFont('helvetica', 'normal'); d.setFontSize(9.5);
  d.text(`Students: ${rp.count}   |   Benches: ${rp.room.benches} (${rp.room.perBench} seats each)`, 14, y + 6);
  d.text(inv ? `Invigilator: ${inv.name}  (${inv.subject}, ${inv.mobile})` : 'Invigilator: not assigned yet', 14, y + 12);
  return y + 20;
};
const table = (d: Doc, rp: RoomPlan, p: ExamPlan, y: number, title: string) => {
  const cols = [14, 34, 62, 130, 168]; const head = ['Seat', 'Roll No', 'Student', 'Class', 'Syllabus'];
  const rowsOf = rp.seats.filter((s) => s.student).sort((a, b) => a.row - b.row || a.col - b.col || a.side - b.side);
  const drawHead = (yy: number) => { d.setFillColor(243, 227, 196); d.rect(12, yy - 5, 186, 7, 'F'); d.setFont('helvetica', 'bold'); d.setFontSize(9); head.forEach((h, i) => d.text(h, cols[i], yy)); d.setFont('helvetica', 'normal'); return yy + 7; };
  y = drawHead(y);
  rowsOf.forEach((s, i) => {
    if (y > 278) { d.addPage(); header(d, title, p); y = drawHead(46); }
    const st = s.student!; const sec = st.sectionId;
    if (i % 2) { d.setFillColor(252, 248, 240); d.rect(12, y - 4.5, 186, 6.4, 'F'); }
    d.setFontSize(9); d.text(s.label, cols[0], y); d.text(st.roll, cols[1], y); d.text(st.name, cols[2], y);
    d.text(sec.slice(0, 24), cols[3], y); d.text(s.group ? groupName(s.group) : '', cols[4], y);
    y += 6.4;
  });
  return y;
};
const save = (d: Doc, name: string) => d.save(`${name.replace(/[^a-z0-9]+/gi, '-')}.pdf`);

export const dutyPdf = async (p: ExamPlan, rp: RoomPlan, floor: string, inv: Staff, sectionTitle: (id: string) => string) => {
  const { jsPDF } = await import('jspdf'); const d = new jsPDF({ unit: 'mm', format: 'a4' });
  header(d, 'Invigilation duty slip', p);
  let y = hall(d, rp, floor, inv, 48);
  d.setFont('helvetica', 'normal'); d.setFontSize(9); d.setTextColor(90); d.text('Please reach the hall 20 minutes before the exam, check the seating below and note absentees.', 14, y); d.setTextColor(30); y += 8;
  y = table(d, { ...rp, seats: rp.seats.map((s) => (s.student ? { ...s, student: { ...s.student, sectionId: sectionTitle(s.student.sectionId) } } : s)) }, p, y, 'Invigilation duty slip');
  d.setFontSize(9); d.text('Absentees: ______________________________________________', 14, Math.min(y + 12, 285)); d.text('Invigilator signature: ______________________', 120, Math.min(y + 12, 285));
  save(d, `Duty-${rp.room.name}-${p.name}`);
};

export const studentListPdf = async (p: ExamPlan, plans: RoomPlan[], floorOf: (r: Classroom) => string, invOf: (roomId: string) => Staff | undefined, sectionTitle: (id: string) => string) => {
  const { jsPDF } = await import('jspdf'); const d = new jsPDF({ unit: 'mm', format: 'a4' });
  plans.forEach((rp, i) => {
    if (i) d.addPage();
    header(d, 'Student list with invigilator', p);
    const y = hall(d, rp, floorOf(rp.room), invOf(rp.room.id), 48);
    table(d, { ...rp, seats: rp.seats.map((s) => (s.student ? { ...s, student: { ...s.student, sectionId: sectionTitle(s.student.sectionId) } } : s)) }, p, y, 'Student list with invigilator');
  });
  save(d, `Student-list-${p.name}`);
};
