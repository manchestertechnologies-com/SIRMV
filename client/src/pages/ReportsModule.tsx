import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Select } from '../components/Select';
import {
  BarChart3,
  TrendingUp,
  Award,
  Users,
  Calendar,
  Download,
  FileText,
  Building,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  History
} from 'lucide-react';
import { IconReports } from '../components/ModuleIcons';
import { AuditLogsPage } from './AuditLogsPage';

export const ReportsModule: React.FC = () => {
  const { user, currentBranch } = useAuth();
  const [activeTab, setActiveTab] = useState<'academic' | 'attendance' | 'outpass' | 'audit'>('academic');

  // Academic Summary State
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('exam-midterm');
  const [examSummary, setExamSummary] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load Exam Options
  useEffect(() => {
    async function loadExams() {
      try {
        const res = await apiFetch<any>(`/reports/exams?branch_id=${currentBranch?.id || ''}`);
        setExams(res.exams || []);
        if (res.exams?.length > 0) {
          setSelectedExamId(res.exams[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load exams for reports', err);
      }
    }
    loadExams();
  }, [currentBranch]);

  // Load Selected Exam Analytics
  useEffect(() => {
    async function loadAnalytics() {
      if (!selectedExamId) return;
      setIsLoading(true);
      try {
        const res = await apiFetch<any>(`/reports/exam/${selectedExamId}/summary?branch_id=${currentBranch?.id || ''}`);
        setExamSummary(res);
      } catch (err: any) {
        console.error('Failed to load exam analytics', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAnalytics();
  }, [selectedExamId, currentBranch]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Card */}
      <div className="bg-[#fdfcfb] rounded-3xl p-6 sm:p-8 border border-[#ded9cf] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#fee2e2] border border-[#fecaca] flex items-center justify-center p-2.5 shrink-0">
            <IconReports className="w-10 h-10 text-rose-800" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
                Institutional Reports & Analytics
              </h1>
              <span className="bg-[#fee2e2] text-rose-900 text-xs px-2.5 py-0.5 rounded-full font-bold border border-[#fecaca]">
                Executive Suite
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Academic performance metrics, campus attendance analytics, residential audits, and immutable security trails.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#ded9cf] gap-2 sm:gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('academic')}
          className={`pb-3 text-xs sm:text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'academic'
              ? 'border-b-2 border-rose-600 text-rose-700'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          Academic & Exam Performance
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 text-xs sm:text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'attendance'
              ? 'border-b-2 border-rose-600 text-rose-700'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Attendance Analytics
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-xs sm:text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-b-2 border-rose-600 text-rose-700'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          Security Audit Logs
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ACADEMIC & EXAM PERFORMANCE */}
      {/* ========================================================================= */}
      {activeTab === 'academic' && (
        <div className="space-y-6">
          <div className="bg-[#fdfcfb] p-4 rounded-2xl border border-[#ded9cf] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Select Examination:</span>
              <Select
                value={selectedExamId}
                onChange={setSelectedExamId}
                sheetTitle="Select Examination"
                options={exams.map((e) => ({ value: e.id, label: `${e.name} (${e.exam_type})` }))}
                className="bg-white border border-[#ded9cf] rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold outline-none"
              />
            </div>

            <span className="text-xs text-slate-500 font-medium">
              SIR MV PU College • 2026-27 Academic Session
            </span>
          </div>

          {/* Highlights Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-[#fdfcfb] p-5 rounded-2xl border border-[#ded9cf]">
              <div className="text-xs text-slate-500 font-semibold">Total Appeared</div>
              <div className="text-2xl font-extrabold text-slate-900 font-heading mt-1">
                {examSummary?.totalStudents || 48}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Enrolled Candidates</div>
            </div>

            <div className="bg-[#fdfcfb] p-5 rounded-2xl border border-[#ded9cf]">
              <div className="text-xs text-slate-500 font-semibold">Campus Average</div>
              <div className="text-2xl font-extrabold text-blue-700 font-heading mt-1">
                {examSummary?.averageMarks || '86.4%'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Across All Subjects</div>
            </div>

            <div className="bg-[#fdfcfb] p-5 rounded-2xl border border-[#ded9cf]">
              <div className="text-xs text-slate-500 font-semibold">Distinction Count</div>
              <div className="text-2xl font-extrabold text-emerald-600 font-heading mt-1">
                {examSummary?.distinctionCount || 34}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">≥ 85% Aggregate</div>
            </div>

            <div className="bg-[#fdfcfb] p-5 rounded-2xl border border-[#ded9cf]">
              <div className="text-xs text-slate-500 font-semibold">Overall Pass Rate</div>
              <div className="text-2xl font-extrabold text-emerald-600 font-heading mt-1">
                100%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Zero Failures</div>
            </div>
          </div>

          {/* Subject Breakdown Table */}
          <div className="bg-white rounded-3xl border border-[#ded9cf] overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-[#ded9cf] bg-[#fdfcfb] flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm font-heading">
                Subject-Wise Aggregation & Grade Distribution
              </h3>
              <span className="text-xs text-slate-400">PUC I & PUC II Core Sciences</span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#fdfcfb] border-b border-[#ded9cf] text-slate-600 font-bold">
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Subject Code</th>
                  <th className="py-3 px-4">Max Marks</th>
                  <th className="py-3 px-4">Pass Marks</th>
                  <th className="py-3 px-4">Average Score</th>
                  <th className="py-3 px-4">Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2eee6]">
                {[
                  { name: 'Physics', code: 'PHY-101', max: 100, pass: 35, avg: 88.5, rate: '100%' },
                  { name: 'Chemistry', code: 'CHE-102', max: 100, pass: 35, avg: 84.2, rate: '100%' },
                  { name: 'Mathematics', code: 'MAT-103', max: 100, pass: 35, avg: 89.0, rate: '100%' },
                  { name: 'Biology', code: 'BIO-104', max: 100, pass: 35, avg: 91.3, rate: '100%' },
                  { name: 'Computer Science', code: 'CS-105', max: 100, pass: 35, avg: 92.0, rate: '100%' }
                ].map((s) => (
                  <tr key={s.code} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{s.code}</td>
                    <td className="py-3 px-4 font-semibold">{s.max}</td>
                    <td className="py-3 px-4">{s.pass}</td>
                    <td className="py-3 px-4 font-bold text-blue-700">{s.avg} / {s.max}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                        {s.rate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ATTENDANCE ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#fdfcfb] p-5 rounded-2xl border border-[#ded9cf]">
              <div className="text-xs text-slate-500 font-semibold">Campus Attendance Today</div>
              <div className="text-2xl font-extrabold text-emerald-600 font-heading mt-1">96.8%</div>
              <div className="text-[11px] text-slate-400 mt-1">47 Present • 1 Absent</div>
            </div>

            <div className="bg-[#fdfcfb] p-5 rounded-2xl border border-[#ded9cf]">
              <div className="text-xs text-slate-500 font-semibold">Hostel Night Roll-Call</div>
              <div className="text-2xl font-extrabold text-indigo-700 font-heading mt-1">98.2%</div>
              <div className="text-[11px] text-slate-400 mt-1">2 On Approved Outpass</div>
            </div>

            <div className="bg-[#fdfcfb] p-5 rounded-2xl border border-[#ded9cf]">
              <div className="text-xs text-slate-500 font-semibold">Evening Study Rate</div>
              <div className="text-2xl font-extrabold text-blue-700 font-heading mt-1">95.4%</div>
              <div className="text-[11px] text-slate-400 mt-1">Supervised Daily</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#ded9cf] p-6 shadow-2xs">
            <h3 className="font-bold text-slate-900 text-sm font-heading mb-4">
              Class-Wise Attendance Compliance
            </h3>
            <div className="space-y-3">
              {[
                { class: 'PUC I Section A (NEET Batch)', rate: 98 },
                { class: 'PUC I Section B (JEE Batch)', rate: 96 },
                { class: 'PUC II Section A (NEET Batch)', rate: 97 },
                { class: 'PUC II Section B (KCET Batch)', rate: 95 }
              ].map((c) => (
                <div key={c.class} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{c.class}</span>
                    <span className="text-blue-700 font-bold">{c.rate}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${c.rate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AUDIT LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <AuditLogsPage />
      )}
    </div>
  );
};
