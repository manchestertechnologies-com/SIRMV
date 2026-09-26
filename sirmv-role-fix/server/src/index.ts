import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { testConnection } from './database/postgres';
import { authRouter } from './routes/auth';
import { branchesRouter } from './routes/branches';
import { teachersRouter } from './routes/teachers';
import { studentsRouter } from './routes/students';
import { classesRouter } from './routes/classes';
import { batchesRouter } from './routes/batches';
import { testsRouter } from './routes/tests';
import { boardMarksRouter } from './routes/boardMarks';
import { staffRouter } from './routes/staff';
import { substitutionsRouter } from './routes/substitutions';
import { floorAttenderRouter } from './routes/floorAttender';
import { lecturesRouter } from './routes/lectures';
import { attendanceRouter } from './routes/attendance';
import { eveningStudyRouter } from './routes/eveningStudy';
import { hostelRouter } from './routes/hostel';
import { outpassRouter } from './routes/outpass';
import { reportsRouter } from './routes/reports';
import { auditRouter } from './routes/audit';
import { announcementsRouter } from './routes/announcements';
import { notificationsRouter } from './routes/notifications';
import { timetableGeneratorRouter } from './routes/timetableGenerator';
import { examManagementRouter } from './routes/examManagement';
import { calendarRouter } from './routes/calendar';
import { counsellingRouter } from './routes/counselling';
import { disciplineRouter } from './routes/discipline';
import { floorIssuesRouter } from './routes/floorIssues';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON body parser
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/classroom_photos', 'uploads/pickup_photos', 'uploads/evaluated_papers', 'uploads/student_photos', 'uploads/student_documents', 'uploads/question_papers'];
uploadDirs.forEach((dir) => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Serve uploaded files securely (or static assets)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Register API Routes
app.use('/api/auth', authRouter);
app.use('/api/branches', branchesRouter);
app.use('/api/teachers', teachersRouter);
app.use('/api/students', studentsRouter);
app.use('/api/classes', classesRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/tests', testsRouter);
app.use('/api/board-marks', boardMarksRouter);
app.use('/api/staff', staffRouter);
app.use('/api/substitutions', substitutionsRouter);
app.use('/api/floor-attender', floorAttenderRouter);
app.use('/api/lectures', lecturesRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/evening-study', eveningStudyRouter);
app.use('/api/hostel', hostelRouter);
app.use('/api/outpass', outpassRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/timetable-generator', timetableGeneratorRouter);
app.use('/api/exam-management', examManagementRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/counselling', counsellingRouter);
app.use('/api/discipline', disciplineRouter);
app.use('/api/floor-issues', floorIssuesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    institution: 'SIR MV PU COLLEGE',
    branches: ['Davangere', 'Shivamogga', 'Ballari'],
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Serve frontend in production if built
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Verify PostgreSQL connection and start server
testConnection().then((res) => {
  if (res.success) {
    console.log(`✅ Connected to Neon PostgreSQL database (${res.serverVersion})`);
  } else {
    console.error(`❌ Neon PostgreSQL connection failed:`, res.error);
  }
});

app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🚀 SIR MV PU COLLEGE Server is running on http://localhost:${PORT}`);
  console.log(`🏢 Branches: Davangere, Shivamogga, Ballari`);
  console.log(`================================================================`);
});

export default app;

