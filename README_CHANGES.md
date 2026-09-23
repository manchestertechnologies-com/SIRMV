# SIR MV — Staffs / Students / Classes / Batches / Tests / Board Marks module

This bundle implements the module described in your PDF notes, matching your
`lasya-shetty-dev` branch's existing sidebar tabs (Staffs, Students, Classes,
Batches, Tests, Board Marks) and reusing the same backend/frontend patterns
your teammate used for Attendance / Reports / Outpass / Hostel etc.

## How to apply

Copy the files in this zip over the matching paths in your repo (all paths
are already relative to the repo root, so you can just extract the zip on
top of your checkout). New files vs. modified files:

**New backend routes**
- `server/src/routes/staff.ts` — teaching staff (full profile, assignments,
  timetable, leaves, substitution history, per-class performance) and
  non-teaching staff (floor in-charge / cleaning / bus / warden / mess)
- `server/src/routes/students.ts` — full student profile CRUD, documents
  (Aadhar / study cert / SSLC marks card / TC / caste&income / EWS / PWD),
  theory marks + competitive (NEET/JEE/KCET) marks with class & overall rank
- `server/src/routes/classes.ts` — classes + sections CRUD
- `server/src/routes/batches.ts` — batches CRUD (NEET/JEE/KCET/Regular)
- `server/src/routes/tests.ts` — online tests (question bank + auto-grading)
  and offline tests (question-paper upload)
- `server/src/routes/boardMarks.ts` — board exam Cycle 1/2/3 management,
  marks entry grid, evaluated-paper upload

**Modified backend files**
- `server/src/database/schema.sql` — added `staff_profiles`, `staff_leaves`,
  `student_documents`, `tests`, `test_questions`, `test_submissions` tables
- `server/src/database/db.ts` — added a safe, idempotent migration step for
  4 new columns on `student_profiles` (category, sslc_result,
  residence_status, admission_type). This runs automatically on server start;
  it won't error on repeated restarts.
- `server/src/index.ts` — registered the 6 new routers under `/api/staff`,
  `/api/students`, `/api/classes`, `/api/batches`, `/api/tests`,
  `/api/board-marks`, and added their upload directories.

**New frontend pages**
- `client/src/pages/StaffsPage.tsx`
- `client/src/pages/StudentsPage.tsx`
- `client/src/pages/ClassesPage.tsx`
- `client/src/pages/BatchesPage.tsx`
- `client/src/pages/TestsPage.tsx`
- `client/src/pages/BoardMarksPage.tsx`

**Modified frontend files**
- `client/src/App.tsx` — wires the 6 new pages into the existing sidebar
  tabs, and also wires `reports` → `ReportCardGenerator` and `attendance` →
  `AttendanceTaking` (your teammate's already-built components, which
  weren't routed to anything yet on this branch).
- `client/src/main.tsx` — wraps `<App />` in `<AuthProvider>`, which several
  pages (including yours) need via `useAuth()`. It wasn't wrapped yet on
  this branch, so pages using `useAuth()` would have crashed.

## After copying the files

1. `npm install` at the repo root (adds no new dependencies — everything
   used, e.g. `multer`, `bcryptjs`, `jsonwebtoken`, was already a
   dependency).
2. Delete `server/sirmv.sqlite` (or back it up) before your next `npm run
   seed` / `npm start` if you want the new columns/tables created cleanly —
   though the migration in `db.ts` is also safe to run against your existing
   database file directly (`npm start` alone will apply it).
3. `npm run dev:server` and `npm run dev:client` as usual.

## Notes on design choices

- **Non-teaching staff** got its own `staff_profiles` table rather than
  reusing `users.role`, since cleaning/bus/mess staff often won't have a
  login account at all, and SQLite `CHECK` constraints on `users.role`
  aren't easy to extend later.
- **Board marks** and **competitive marks** reuse the existing
  `exams` / `exam_subjects` / `student_marks` / `evaluated_papers` tables
  (already in the schema, built for Reports) rather than duplicating them —
  a "Cycle 1" board exam is just an `exams` row with
  `exam_type = 'Board Exam'`, and a NEET/JEE/KCET test is an `exams` row
  with the matching `exam_type`. This keeps Report Card generation, rank
  calculations, and evaluated-paper uploads all consistent across modules.
- Class/overall rank calculations use SQLite window functions (`RANK() OVER
  (PARTITION BY ...)`), computed on read rather than stored, so they're
  always correct even after marks are edited.
- All new routes follow the existing file's conventions exactly: Express
  Router + `better-sqlite3` prepared statements, `authenticate` /
  `requireRoles` middleware, `logAudit` calls, and the same JSON response
  shapes (`{ success, message }` / `{ error }`).

## Verified

- `server/src/database/schema.sql` parses cleanly against SQLite
  (`sqlite3.executescript`).
- `client` type-checks cleanly with `tsc --noEmit` (all new pages, `App.tsx`,
  `main.tsx`).
- `server` route files were reviewed against the same patterns as your
  teammate's existing routes; full `tsc` verification wasn't possible in
  this sandbox because `better-sqlite3`'s native build couldn't complete
  here, but the errors that did show up were identical "missing
  @types/node" noise across *every* file in the project, old and new alike
  — not anything specific to the new code.
