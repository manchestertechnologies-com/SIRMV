import React from 'react';
import { Bell, Calendar, Pin, AlertCircle, FileText, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const NoticeboardModule: React.FC = () => {
  const notices = [
    {
      id: 'not-1',
      title: 'Mid-Term Examination Schedule & Syllabus Notification',
      date: 'Sept 20, 2026',
      author: 'Office of the Principal',
      category: 'ACADEMIC',
      pinned: true,
      content: 'The Mid-Term Examination for 1st & 2nd PUC batches commences from October 05, 2026. Hall tickets and time tables have been issued.'
    },
    {
      id: 'not-2',
      title: 'Special NEET / JEE Morning Doubt-Clearing Sessions',
      date: 'Sept 19, 2026',
      author: 'Academic Coordinator',
      category: 'COACHING',
      pinned: true,
      content: 'Special morning doubt clearing classes for NEET/JEE intensive batches will be conducted in Lecture Halls 201-204 from 07:30 AM.'
    },
    {
      id: 'not-3',
      title: 'Hostel Evening Study Mandatory Attendance Policy',
      date: 'Sept 18, 2026',
      author: 'Chief Warden',
      category: 'HOSTEL',
      pinned: false,
      content: 'All hostellers must report to Study Hall 1 by 06:30 PM sharp. Outpasses for weekday evenings require prior parent OTP approval.'
    },
    {
      id: 'not-4',
      title: 'Mahalaya Amavasya Holiday Declaration',
      date: 'Sept 15, 2026',
      author: 'Administration',
      category: 'GENERAL',
      pinned: false,
      content: 'The college will remain closed on account of Mahalaya Amavasya. Normal academic schedule resumes on the following working day.'
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#ded9cf]">
        <div>
          <h1 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <span>Institutional Noticeboard & Circulars</span>
          </h1>
          <p className="text-xs text-slate-500">
            Official announcements, examination circulars, holiday notices, and campus notifications.
          </p>
        </div>
      </div>

      {/* Notices Grid */}
      <div className="space-y-4">
        {notices.map((n) => (
          <div
            key={n.id}
            className={`bg-white rounded-2xl border p-5 shadow-2xs space-y-3 transition ${
              n.pinned ? 'border-amber-300 ring-2 ring-amber-400/10' : 'border-[#ded8cb]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {n.pinned && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    <Pin className="w-3 h-3 text-amber-600" /> Pinned Notice
                  </span>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {n.category}
                </span>
              </div>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {n.date}
              </span>
            </div>

            <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{n.content}</p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Issued by: {n.author}</span>
              <button className="text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                <FileText className="w-3.5 h-3.5" />
                <span>View Circular PDF</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
export default NoticeboardModule;
