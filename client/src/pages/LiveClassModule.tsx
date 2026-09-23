import React, { useState } from 'react';
import { Play, Video, BookOpen, Clock, Calendar, CheckCircle2, User, Sparkles, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LiveClassModule: React.FC = () => {
  const { user } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [activeVideo, setActiveVideo] = useState<any | null>(null);

  const recordings = [
    {
      id: 'rec-101',
      subject: 'Physics',
      code: 'PHY101',
      title: 'Thermodynamics: 2nd Law & Carnot Engine Efficiency',
      faculty: 'Dr. K. S. Venkatesh',
      date: '2026-09-22',
      duration: '45 mins',
      views: 38,
      chapter: 'Chapter 11: Thermodynamics',
      description: 'Derivation of work done in isothermal/adiabatic expansion and Carnot cycle efficiency.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
    },
    {
      id: 'rec-102',
      subject: 'Chemistry',
      code: 'CHE101',
      title: 'Organic Chemistry: Reaction Mechanisms & Aldehydes',
      faculty: 'Prof. Shwetha Murthy',
      date: '2026-09-21',
      duration: '42 mins',
      views: 44,
      chapter: 'Chapter 12: Aldehydes, Ketones & Carboxylic Acids',
      description: 'Nucleophilic addition reactions and mechanism of aldol condensation.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
    },
    {
      id: 'rec-103',
      subject: 'Mathematics',
      code: 'MAT101',
      title: 'Calculus: Definite Integrals & Area Under Curves',
      faculty: 'Dr. N. R. Nagaraj',
      date: '2026-09-20',
      duration: '48 mins',
      views: 52,
      chapter: 'Chapter 8: Application of Integrals',
      description: 'Techniques of finding area enclosed between parabolas and straight lines with JEE shortcuts.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
    },
    {
      id: 'rec-104',
      subject: 'Biology',
      code: 'BIO101',
      title: 'Human Physiology: Endocrine System & Hormone Action',
      faculty: 'Mrs. Anupama Hegde',
      date: '2026-09-19',
      duration: '40 mins',
      views: 41,
      chapter: 'Chapter 22: Chemical Coordination & Integration',
      description: 'Mechanism of hormone action, pituitary gland secretion pathways, and NEET high-yield questions.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
    },
    {
      id: 'rec-105',
      subject: 'Computer Science',
      code: 'CS101',
      title: 'Object-Oriented Programming: Virtual Functions & Polymorphism',
      faculty: 'Mr. Chethan Kumar',
      date: '2026-09-18',
      duration: '45 mins',
      views: 29,
      chapter: 'Chapter 7: Classes and Objects in C++',
      description: 'Runtime polymorphism using virtual functions and abstract base classes.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
    }
  ];

  const filtered = selectedSubject === 'ALL'
    ? recordings
    : recordings.filter((r) => r.subject === selectedSubject);

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#ded9cf]">
        <div>
          <h1 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-600" />
            <span>Classroom Video Recordings & Live Streams</span>
          </h1>
          <p className="text-xs text-slate-500">
            Recorded classroom lectures automatically linked to absent student portals for self-paced catchup.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#ded8cb] rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">All Subjects</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Biology">Biology</option>
            <option value="Computer Science">Computer Science</option>
          </select>
        </div>
      </div>

      {/* Video Player Modal/Section if Active */}
      {activeVideo && (
        <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-4 sm:p-6 text-white space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                {activeVideo.subject} • {activeVideo.chapter}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {activeVideo.title}
              </h2>
            </div>
            <button
              onClick={() => setActiveVideo(null)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition"
            >
              Close Player
            </button>
          </div>

          <div className="aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center">
            <video
              src={activeVideo.videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> {activeVideo.faculty}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {activeVideo.date}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> {activeVideo.duration}</span>
            </div>
            <span className="text-[11px] bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">
              HD 1080p Verified Lecture
            </span>
          </div>
        </div>
      )}

      {/* Recordings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-[#ded8cb] hover:border-blue-400/60 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
          >
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {item.subject}
                </span>
                <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {item.duration}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {item.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <User className="w-3.5 h-3.5 text-slate-400" /> {item.faculty}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {item.date}
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#faf8f3] border-t border-[#ded8cb]">
              <button
                onClick={() => setActiveVideo(item)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Watch Class Lecture</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
export default LiveClassModule;
