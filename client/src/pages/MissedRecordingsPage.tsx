import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Video,
  Play,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  AlertCircle,
  CheckCircle,
  X,
  ExternalLink
} from 'lucide-react';

export const MissedRecordingsPage: React.FC = () => {
  const { user } = useAuth();
  const [missedClasses, setMissedClasses] = useState<any[]>([]);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeLectureTitle, setActiveLectureTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMissedClasses() {
      setIsLoading(true);
      try {
        const res = await apiFetch<any>(`/lectures/student/missed-classes?student_id=${user?.student_id || 'sp-rahul'}`);
        setMissedClasses(res.missedClasses || []);
      } catch (err: any) {
        console.error('Failed to load missed classes', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadMissedClasses();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Video className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Missed Class Video Recordings Portal</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Access authorized faculty classroom recordings for lectures where you were marked absent or on medical leave.
          </p>
        </div>
      </div>

      {/* Missed Lectures List */}
      <div className="space-y-4">
        {missedClasses.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-700">No missed lectures recorded.</p>
            <p className="text-xs text-slate-400 mt-0.5">Your attendance is up to date.</p>
          </div>
        ) : (
          missedClasses.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900 text-base">{item.subject_name}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                    ATTENDANCE: {item.attendance_status}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Session ID: {item.lecture_session_id}
                  </span>
                </div>

                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-5 gap-y-1">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {item.date}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {item.scheduled_start} - {item.scheduled_end}
                  </span>
                  <span>Faculty: <strong>{item.teacher_name}</strong></span>
                  <span>Room: <strong>{item.room_number}</strong></span>
                </div>

                {item.concept && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                    <span className="font-bold text-slate-700">Concept Taught: </span>
                    <span className="text-indigo-900 font-semibold">{item.chapter} - {item.concept}</span>
                    {item.topic_taught && (
                      <p className="text-slate-500 text-[11px] mt-0.5">{item.topic_taught}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="shrink-0">
                {item.hasRecording ? (
                  <button
                    onClick={() => {
                      setActiveVideoUrl(item.recording_url);
                      setActiveLectureTitle(`${item.subject_name}: ${item.concept || item.chapter}`);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                  >
                    <Play className="w-4 h-4" />
                    WATCH CLASS RECORDING
                  </button>
                ) : (
                  <div className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold border border-slate-200">
                    CLASS RECORDING NOT AVAILABLE
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Video Player Modal */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-800 text-white">
            <div className="p-4 bg-slate-950 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm truncate max-w-md">{activeLectureTitle}</h3>
              </div>
              <button
                onClick={() => setActiveVideoUrl(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-16/9 bg-black flex items-center justify-center">
              <video
                src={activeVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
              <span>SIR MV PU College Lecture Stream</span>
              <a
                href={activeVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
              >
                Open in Fullscreen <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
