import React, { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, X, Users, Layers, Trash2, DoorOpen, GraduationCap } from 'lucide-react';

const CUSTOM_OPTION = '__CUSTOM__';

// Preset batch name/code pairs offered on the "Add Batch" dropdown.
const BATCH_PRESETS = [
  { name: 'NEET Batch', code: 'NEET' },
  { name: 'JEE Batch', code: 'JEE' },
  { name: 'KCET Batch', code: 'KCET' },
  { name: 'Regular PU', code: 'REG' }
];

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

  const [showAddBatch, setShowAddBatch] = useState(false);
  const [newBatchChoice, setNewBatchChoice] = useState('');
  const [newBatchCustomName, setNewBatchCustomName] = useState('');
  const [newBatchCustomCode, setNewBatchCustomCode] = useState('');
  const [batchError, setBatchError] = useState<string | null>(null);

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

  // Batch name presets not already in use for this branch
  const availableBatchPresets = BATCH_PRESETS.filter((p) => !batches.some((b) => b.code === p.code));

  const createBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError(null);
    const preset = availableBatchPresets.find((p) => p.code === newBatchChoice);
    const name = newBatchChoice === CUSTOM_OPTION ? newBatchCustomName.trim() : preset?.name || '';
    const code = newBatchChoice === CUSTOM_OPTION ? newBatchCustomCode.trim() : preset?.code || '';
    if (!name || !code) {
      setBatchError('Please choose or enter a batch name and code.');
      return;
    }
    try {
      await apiFetch(`/batches`, { method: 'POST', body: JSON.stringify({ name, code, branch_id: branchId }) });
      setNewBatchChoice('');
      setNewBatchCustomName('');
      setNewBatchCustomCode('');
      setShowAddBatch(false);
      load();
    } catch (err: any) {
      setBatchError(err.message);
    }
  };

  const deleteBatch = async (id: string) => {
    if (!confirm('Delete this batch?')) return;
    try { await apiFetch(`/batches/${id}`, { method: 'DELETE' }); load(); } catch (err: any) { showToast(err.message, 'error'); }
  };

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

      {/* ===================== BATCHES ===================== */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4 text-indigo-500" />
          Competitive Batches
        </h2>
        <button onClick={() => setShowAddBatch(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">
          <Plus className="w-3.5 h-3.5" /> Add Batch
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{b.name}</h3>
              <span className="text-[10px] font-mono font-bold text-slate-400">{b.code}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" /> {b.studentCount}</span>
              <button onClick={() => deleteBatch(b.id)}><Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-rose-500" /></button>
            </div>
          </div>
        ))}
        {batches.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-10">No batches yet. Add one to get started.</p>}
      </div>

      {showAddBatch && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Add Batch</h3>
              <button onClick={() => setShowAddBatch(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            {batchError && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{batchError}</div>}
            <form onSubmit={createBatch} className="space-y-3">
              <select
                required
                value={newBatchChoice}
                onChange={(e) => setNewBatchChoice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
              >
                <option value="">-- Select Batch --</option>
                {availableBatchPresets.map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
                <option value={CUSTOM_OPTION}>Other (type your own)</option>
              </select>
              {newBatchChoice === CUSTOM_OPTION && (
                <>
                  <input
                    required
                    autoFocus
                    value={newBatchCustomName}
                    onChange={(e) => setNewBatchCustomName(e.target.value)}
                    placeholder="e.g. CET Batch"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
                  />
                  <input
                    required
                    value={newBatchCustomCode}
                    onChange={(e) => setNewBatchCustomCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CET"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
                  />
                </>
              )}
              <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">Save Batch</button>
            </form>
          </div>
        </div>
      )}

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
