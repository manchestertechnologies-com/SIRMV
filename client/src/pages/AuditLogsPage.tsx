import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import {
  History,
  Search,
  Filter,
  ShieldCheck,
  Calendar,
  User,
  Clock,
  Terminal
} from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<any>(
        `/audit/logs?search=${encodeURIComponent(searchQuery)}&action=${encodeURIComponent(actionFilter)}`
      );
      setLogs(res.logs || []);
    } catch (err: any) {
      console.error('Failed to load audit logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [actionFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadAuditLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Institution Security & Audit Logs</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable tracking of attendance overrides, substitution duties, outpass approvals, marks entries, and gate timestamps.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit actions, user names, or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
          />
        </form>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none"
        >
          <option value="">All Audit Actions</option>
          <option value="ATTENDANCE_FINALIZED">Attendance Finalized</option>
          <option value="TEACHER_MARKED_ABSENT">Teacher Marked Absent</option>
          <option value="SUBSTITUTION_ASSIGNED">Substitution Assigned</option>
          <option value="OUTPASS_APPROVED">Outpass Approved</option>
          <option value="GATE_EXIT_RECORDED">Gate Exit Recorded</option>
          <option value="GATE_RETURN_RECORDED">Gate Return Recorded</option>
          <option value="REPORT_CARD_GENERATED">Report Card Generated</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Details & Mutation Data</th>
                <th className="py-3 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                    {log.created_at}
                  </td>
                  <td className="py-3 px-4 font-sans font-bold text-slate-900 whitespace-nowrap">
                    {log.user_name}
                    <span className="block font-mono text-[10px] text-indigo-600 font-normal">
                      [{log.role}]
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-[11px]">{log.entity_type}</td>
                  <td className="py-3 px-4 text-[11px] text-slate-700 max-w-md break-all">
                    {log.details_json}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[10px]">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
