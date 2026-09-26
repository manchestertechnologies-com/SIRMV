import React, { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { Bell, Calendar, Pin, FileText, Plus, X, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

const POSTER_ROLES = ['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER', 'WARDEN', 'HEAD_WARDEN', 'FLOOR_ATTENDER', 'NON_TEACHING_STAFF', 'GATE_STAFF'];
const CATEGORIES = ['GENERAL', 'ACADEMIC', 'COACHING', 'HOSTEL', 'EXAM', 'ADMIN'];
const ALL_ROLES = ['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER', 'FLOOR_ATTENDER', 'NON_TEACHING_STAFF', 'GATE_STAFF', 'WARDEN', 'HEAD_WARDEN', 'STUDENT', 'PARENT'];

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  target_roles: string | null;
  is_pinned: number;
  posted_by_name: string;
  created_at: string;
}

export const NoticeboardModule: React.FC = () => {
  const { user, currentBranch } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPost = user?.role && POSTER_ROLES.includes(user.role);

  const load = async () => {
    try {
      setIsLoading(true);
      const branchId = currentBranch?.id;
      const res = await apiFetch<{ announcements: Announcement[] }>(
        `/announcements${branchId ? `?branch_id=${branchId}` : ''}`
      );
      setAnnouncements(res.announcements);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [currentBranch?.id]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await apiFetch(`/announcements/${id}`, { method: 'DELETE' });
      load();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

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
        {canPost && (
          <button
            onClick={() => setShowComposer(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Post Announcement
          </button>
        )}
      </div>

      {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{error}</div>}

      {/* Notices */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-10">Loading notices...</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">No announcements yet.</p>
        ) : (
          announcements.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-2xl border p-5 shadow-2xs space-y-3 transition ${
                n.is_pinned ? 'border-amber-300 ring-2 ring-amber-400/10' : 'border-[#ded8cb]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {!!n.is_pinned && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                      <Pin className="w-3 h-3 text-amber-600" /> Pinned Notice
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    {n.category}
                  </span>
                </div>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {formatDate(n.created_at)}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{n.content}</p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Issued by: {n.posted_by_name || 'Administration'}</span>
                {(user?.id && canPost) && (
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showComposer && (
        <ComposerModal
          branchId={currentBranch?.id}
          onClose={() => setShowComposer(false)}
          onPosted={() => { setShowComposer(false); load(); }}
        />
      )}
    </div>
  );
};

const ComposerModal: React.FC<{ branchId?: string; onClose: () => void; onPosted: () => void }> = ({ branchId, onClose, onPosted }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [isPinned, setIsPinned] = useState(false);
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRole = (role: string) => {
    setTargetRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiFetch('/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title, content, category, is_pinned: isPinned,
          target_roles: targetRoles.length > 0 ? targetRoles : null,
          branch_id: branchId
        })
      });
      onPosted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Post Announcement</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{error}</div>}

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Title *</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Content *</label>
            <textarea required value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="w-4 h-4" />
                Pin to top
              </label>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
              Visible to (leave blank for everyone in the branch)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_ROLES.map((role) => (
                <button
                  type="button"
                  key={role}
                  onClick={() => toggleRole(role)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                    targetRoles.includes(role)
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition disabled:opacity-50 mt-2">
            {isSubmitting ? 'Posting...' : 'Post Announcement'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NoticeboardModule;
