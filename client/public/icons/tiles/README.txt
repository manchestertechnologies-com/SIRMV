Optional: use your own artwork for the dashboard / sidebar icons.

1. Save the icon images into this folder (PNG, SVG or WebP, roughly square, 128px or larger).
2. Name each file after the tile id:

   staffs  students  classes  batches  tests  board-marks  questions  reports
   attendance  fee  timetable  timetable-generator  exam-management  live-class
   sms  noticeboard  counsellings  college-calendar  discipline  floor-issues
   hostel  gate-pass  admission  leaderboard  settings  notifications  report-card
   my-profile  my-exam-duty  exam-seating  invigilation-scan  invigilator-requests  dashboard

   e.g.  students.png   classes.png   leaderboard.svg

3. Run  make-manifest.ps1  (right-click > Run with PowerShell, or `./make-manifest.ps1`)
   to rebuild manifest.json from the files in this folder.
4. Commit and push. Tiles without a file keep the built-in icon.
