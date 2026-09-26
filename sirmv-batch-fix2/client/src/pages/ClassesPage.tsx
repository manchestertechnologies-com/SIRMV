import React, { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, X, Users, Layers, Trash2, DoorOpen, Target } from 'lucide-react';

const CUSTOM_OPTION = '__CUSTOM__';

export const ClassesPage: React.FC = () => {
  const { currentBranch } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [namePresets, setNamePresets] = useState<string[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassChoice, setNewClassChoice] = useState('');
  const [newClassCustomName, setNewClassCustomName] = useState('');

  const [addingSectionFor, setAddingSectionFor] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionRoomId, setNewSectionRoomId] = useState('');

  const [error, setError] = useState<string | null>(null);

  const branchId = currentBranch?.id || '';

  const load = async () => {
    try {
      const [classesRes, roomsRes, presetsRes, batchesRes] = await Promise.all([
        apiFetch<any>(`/classes?branch_id=${branchId}`),
        apiFetch<any>(`/classes/rooms?branch_id=${branchId}`).catch(() => ({ rooms: [] })),
        apiFetch<any>(`/classes/name-presets?branch_id=${branchId}`).catch(() => ({ presets: [] })),
        apiFetch<any>(`/batches?branch_id=${branchId}`).catch(() => ({ batches: [] }))
      ]);
      setClasses(classesRes.classes || []);
      setRooms(roomsRes.rooms || []);
      setNamePresets(presetsRes.presets || []);
      setBatches(batchesRes.batches || []);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => { if (branchId) load(); }, [branchId]);

  const roomLabel = (room: any) => `Room ${room.room_number} (Floor ${room.floor})`;

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = newClassChoice === CUSTOM_OPTION ? newClassCustomName.trim() : newClassChoice;
    if (!name) {
      setError('Please choose or enter a class name.');
      return;
    }
    try {
      await apiFetch(`/classes`, { method: 'POST', body: JSON.stringify({ name, branch_id: branchId }) });
      setNewClassChoice('');
      setNewClassCustomName('');
      setShowAddClass(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const addSection = async (classId: string) => {
    if (!newSectionName) return;
    try {
      await apiFetch(`/classes/${classId}/sections`, {
        method: 'POST',
        body: JSON.stringify({ name: newSectionName, room_id: newSectionRoomId || null })
      });
      setNewSectionName('');
      setNewSectionRoomId('');
      setAddingSectionFor(null);
      load();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const assignRoom = async (sectionId: string, roomId: string) => {
    try {
      await apiFetch(`/classes/sections/${sectionId}/room`, {
        method: 'PUT',
        body: JSON.stringify({ room_id: roomId || null })
      });
      load();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const assignDefaultBatch = async (classId: string, batchId: string) => {
    try {
      await apiFetch(`/classes/${classId}/default-batch`, {
        method: 'PUT',
        body: JSON.stringify({ batch_id: batchId || null })
      });
      load();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const deleteClass = async (id: string) => {
    if (!confirm('Delete this class?')) return;
    try { await apiFetch(`/classes/${id}`, { method: 'DELETE' }); load(); } catch (err: any) { showToast(err.message, 'error'); }
  };

  const deleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section?')) return;
    try { await apiFetch(`/classes/sections/${sectionId}`, { method: 'DELETE' }); load(); } catch (err: any) { showToast(err.message, 'error'); }
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

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50/60 border border-emerald-100 rounded-lg text-[11px]">
              <Target className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="font-semibold text-slate-500 shrink-0">Default Batch:</span>
              <select
                value={c.default_batch_id || ''}
                onChange={(e) => assignDefaultBatch(c.id, e.target.value)}
                className="bg-white border border-slate-200 rounded-md px-1.5 py-1 text-[10px] text-slate-700 outline-none flex-1 min-w-0"
                title="Optional safety-net default — the batch actually chosen at student registration can still override this."
              >
                <option value="">-- None --</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              {c.sections.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px]">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-600 shrink-0">
                    Sec {s.name} ({s.studentCount})
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                    <DoorOpen className="w-3 h-3 text-slate-400 shrink-0" />
                    <select
                      value={s.room_id || ''}
                      onChange={(e) => assignRoom(s.id, e.target.value)}
                      className="bg-white border border-slate-200 rounded-md px-1.5 py-1 text-[10px] text-slate-700 outline-none max-w-[130px]"
                    >
                      <option value="">-- No Classroom --</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>{roomLabel(r)}</option>
                      ))}
                    </select>
                    <button onClick={() => deleteSection(s.id)}><X className="w-3 h-3 text-slate-300 hover:text-rose-500 shrink-0" /></button>
                  </div>
                </div>
              ))}

              {addingSectionFor === c.id ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <input
                    autoFocus
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="A/B/C"
                    className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] outline-none"
                  />
                  <select
                    value={newSectionRoomId}
                    onChange={(e) => setNewSectionRoomId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 outline-none"
                  >
                    <option value="">-- No Classroom --</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>{roomLabel(r)}</option>
                    ))}
                  </select>
                  <button onClick={() => addSection(c.id)} className="text-[11px] font-bold text-indigo-600">Add</button>
                  <button
                    onClick={() => { setAddingSectionFor(null); setNewSectionName(''); setNewSectionRoomId(''); }}
                    className="text-[11px] font-bold text-slate-400"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setAddingSectionFor(c.id)} className="self-start px-2.5 py-1 border border-dashed border-slate-300 rounded-lg text-[11px] text-slate-400 hover:text-indigo-600 hover:border-indigo-300">
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
              <select
                required
                value={newClassChoice}
                onChange={(e) => setNewClassChoice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
              >
                <option value="">-- Select Class --</option>
                {namePresets.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
                <option value={CUSTOM_OPTION}>Other (type your own)</option>
              </select>
              {newClassChoice === CUSTOM_OPTION && (
                <input
                  required
                  autoFocus
                  value={newClassCustomName}
                  onChange={(e) => setNewClassCustomName(e.target.value)}
                  placeholder="e.g. Bridge Course"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
                />
              )}
              <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">Save Class</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
