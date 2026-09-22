import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, X, Users, Layers, Trash2 } from 'lucide-react';

export const ClassesPage: React.FC = () => {
  const { currentBranch } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [addingSectionFor, setAddingSectionFor] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const branchId = currentBranch?.id || '';

  const load = async () => {
    try {
      const res = await apiFetch<any>(`/classes?branch_id=${branchId}`);
      setClasses(res.classes || []);
    } catch (err) { console.error(err); }
  };
  useEffect(() => { if (branchId) load(); }, [branchId]);

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch(`/classes`, { method: 'POST', body: JSON.stringify({ name: newClassName, branch_id: branchId }) });
      setNewClassName(''); setShowAddClass(false); load();
    } catch (err: any) { setError(err.message); }
  };

  const addSection = async (classId: string) => {
    if (!newSectionName) return;
    try {
      await apiFetch(`/classes/${classId}/sections`, { method: 'POST', body: JSON.stringify({ name: newSectionName }) });
      setNewSectionName(''); setAddingSectionFor(null); load();
    } catch (err: any) { alert(err.message); }
  };

  const deleteClass = async (id: string) => {
    if (!confirm('Delete this class?')) return;
    try { await apiFetch(`/classes/${id}`, { method: 'DELETE' }); load(); } catch (err: any) { alert(err.message); }
  };

  const deleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section?')) return;
    try { await apiFetch(`/classes/sections/${sectionId}`, { method: 'DELETE' }); load(); } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setShowAddClass(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">
          <Plus className="w-3.5 h-3.5" /> Add Class
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {classes.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" /> {c.studentCount}</span>
                <button onClick={() => deleteClass(c.id)}><Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-rose-500" /></button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {c.sections.map((s: any) => (
                <span key={s.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600">
                  Sec {s.name} ({s.studentCount})
                  <button onClick={() => deleteSection(s.id)}><X className="w-3 h-3 text-slate-300 hover:text-rose-500" /></button>
                </span>
              ))}
              {addingSectionFor === c.id ? (
                <div className="flex items-center gap-1">
                  <input autoFocus value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} placeholder="A/B/C"
                    className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] outline-none" />
                  <button onClick={() => addSection(c.id)} className="text-[11px] font-bold text-indigo-600">Add</button>
                </div>
              ) : (
                <button onClick={() => setAddingSectionFor(c.id)} className="px-2.5 py-1 border border-dashed border-slate-300 rounded-lg text-[11px] text-slate-400 hover:text-indigo-600 hover:border-indigo-300">
                  + Section
                </button>
              )}
            </div>
          </div>
        ))}
        {classes.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-10">No classes yet. Add one to get started.</p>}
      </div>

      {showAddClass && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Add Class</h3>
              <button onClick={() => setShowAddClass(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            {error && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{error}</div>}
            <form onSubmit={createClass} className="space-y-3">
              <input required value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="e.g. 1 PUC / 2 PUC / Long Term"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none" />
              <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">Save Class</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
