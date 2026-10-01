import React, { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Search,
  Bed,
  Building,
  Plus,
  UserPlus,
  UserMinus,
  X,
  Loader2
} from 'lucide-react';
import { HostelFloor3D, Hostel3DRoom } from '../components/HostelFloor3D';

// Night roll-call (the old per-student PRESENT/ABSENT/OUTPASS marking table
// that used to live on this page) has been removed per request — this page
// is now purely Room Allotment: real room/bed inventory, a 3D filled-vs-
// available view, and adding rooms / allocating or vacating students.
export const HostelDashboard: React.FC = () => {
  const { user, currentBranch } = useAuth();
  const [floor, setFloor] = useState<number>(2);

  // Real hostel hierarchy (hostels -> blocks -> rooms -> beds).
  const [hierarchy, setHierarchy] = useState<{ hostels: any[]; blocks: any[]; rooms: any[]; beds: any[] }>({
    hostels: [],
    blocks: [],
    rooms: [],
    beds: []
  });
  const [hierarchyLoading, setHierarchyLoading] = useState(true);

  // Room Allotment — add rooms (2/3/4 sharing) and allocate/vacate students
  // into beds, with a 3D view of filled vs. available rooms.
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [addRoomForm, setAddRoomForm] = useState({ block_id: '', room_number: '', floor: 1, capacity: 2 });
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [allocatingBedId, setAllocatingBedId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [unallocatedStudents, setUnallocatedStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [bedActionBusy, setBedActionBusy] = useState<string | null>(null);

  const loadHierarchy = async () => {
    setHierarchyLoading(true);
    try {
      const res = await apiFetch<any>(`/hostel/hierarchy?branch_id=${currentBranch?.id || ''}`);
      setHierarchy({
        hostels: res.hostels || [],
        blocks: res.blocks || [],
        rooms: res.rooms || [],
        beds: res.beds || []
      });
    } catch (err: any) {
      console.error('Failed to load hostel hierarchy', err);
    } finally {
      setHierarchyLoading(false);
    }
  };

  const loadUnallocatedStudents = async (search: string) => {
    setStudentsLoading(true);
    try {
      const res = await apiFetch<any>(
        `/hostel/unallocated-students?branch_id=${currentBranch?.id || ''}&search=${encodeURIComponent(search)}`
      );
      setUnallocatedStudents(res.students || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleOpenAllocate = (bedId: string) => {
    setAllocatingBedId(bedId);
    setStudentSearch('');
    loadUnallocatedStudents('');
  };

  const handleAllocate = async (studentId: string) => {
    if (!allocatingBedId) return;
    setBedActionBusy(allocatingBedId);
    try {
      await apiFetch(`/hostel/beds/${allocatingBedId}/allocate`, {
        method: 'POST',
        body: JSON.stringify({ student_id: studentId })
      });
      showToast('Student allocated to the room.', 'success');
      setAllocatingBedId(null);
      loadHierarchy();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setBedActionBusy(null);
    }
  };

  const handleVacate = async (bedId: string) => {
    setBedActionBusy(bedId);
    try {
      await apiFetch(`/hostel/beds/${bedId}/vacate`, { method: 'POST' });
      showToast('Bed vacated.', 'success');
      loadHierarchy();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setBedActionBusy(null);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addRoomForm.block_id) {
      showToast('Select a hostel block first.', 'error');
      return;
    }
    setIsCreatingRoom(true);
    try {
      await apiFetch('/hostel/rooms', {
        method: 'POST',
        body: JSON.stringify(addRoomForm)
      });
      showToast(`Room ${addRoomForm.room_number} created (${addRoomForm.capacity}-sharing).`, 'success');
      setShowAddRoom(false);
      setAddRoomForm({ block_id: addRoomForm.block_id, room_number: '', floor: addRoomForm.floor, capacity: 2 });
      loadHierarchy();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  useEffect(() => {
    loadHierarchy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBranch]);

  // Rooms on the currently-selected floor, each with its real occupied/available
  // bed breakdown computed from the hierarchy.
  const roomsOnFloor = hierarchy.rooms
    .filter((r) => r.floor === floor)
    .map((r) => {
      const bedsInRoom = hierarchy.beds.filter((b) => b.room_id === r.id);
      const occupied = bedsInRoom.filter((b) => b.student_id);
      const available = r.capacity - occupied.length;
      return { ...r, bedsInRoom, occupiedCount: occupied.length, availableCount: Math.max(available, 0) };
    });
  const totalCapacityOnFloor = roomsOnFloor.reduce((sum, r) => sum + r.capacity, 0);
  const totalOccupiedOnFloor = roomsOnFloor.reduce((sum, r) => sum + r.occupiedCount, 0);
  const totalAvailableOnFloor = roomsOnFloor.reduce((sum, r) => sum + r.availableCount, 0);

  // Same floor rooms, reshaped for the 3D view / allocation panel.
  const rooms3D: Hostel3DRoom[] = roomsOnFloor.map((r) => ({
    roomId: r.id,
    roomNumber: r.room_number,
    floor: r.floor,
    capacity: r.capacity,
    beds: r.bedsInRoom.map((b: any) => ({ bedId: b.id, bedNumber: b.bed_number, studentName: b.student_name })),
    status: r.occupiedCount === 0 ? 'AVAILABLE' : r.occupiedCount >= r.capacity ? 'FULL' : 'PARTIALLY_ALLOCATED'
  }));
  const selectedRoom = roomsOnFloor.find((r) => r.id === selectedRoomId) || null;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Home className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Room Allotment</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Hostel hierarchy: Block ➔ Floor ➔ Room ➔ Bed allocation — add rooms and allocate or vacate students.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Floor Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[1, 2, 3].map((f) => (
              <button
                key={f}
                onClick={() => setFloor(f)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  floor === f ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Floor {f}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setAddRoomForm((f) => ({ ...f, floor }));
              setShowAddRoom(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-400 block font-medium">Total Beds — Floor {floor}</span>
          <span className="text-2xl font-bold text-slate-900 mt-1">{totalCapacityOnFloor}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-400 block font-medium">Allocated</span>
          <span className="text-2xl font-bold text-emerald-600 mt-1">{totalOccupiedOnFloor}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-400 block font-medium">Available</span>
          <span className="text-2xl font-bold text-amber-600 mt-1">{totalAvailableOnFloor}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {hierarchyLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center text-slate-400 text-xs">
              Loading room data...
            </div>
          ) : (
            <HostelFloor3D
              rooms={rooms3D}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
              heading={`Floor ${floor} — Filled & Available Rooms`}
            />
          )}
        </div>

        {/* Selected room detail / allocation panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
          {!selectedRoom ? (
            <div className="h-full flex items-center justify-center text-center text-xs text-slate-400 py-12">
              Click a room in the 3D view to allocate or vacate students.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Room {selectedRoom.room_number}</h3>
                  <p className="text-[11px] text-slate-500">
                    Floor {selectedRoom.floor} • {selectedRoom.capacity}-Sharing • {selectedRoom.occupiedCount}/{selectedRoom.capacity} Filled
                  </p>
                </div>
                <button onClick={() => setSelectedRoomId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {selectedRoom.bedsInRoom.map((b: any) => (
                  <div key={b.id} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400">{b.bed_number}</div>
                      {b.student_id ? (
                        <>
                          <div className="text-sm font-bold text-slate-900">{b.student_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{b.register_number}</div>
                        </>
                      ) : (
                        <div className="text-sm font-semibold text-emerald-700">Available</div>
                      )}
                    </div>
                    {b.student_id ? (
                      <button
                        onClick={() => handleVacate(b.id)}
                        disabled={bedActionBusy === b.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 transition disabled:opacity-50"
                      >
                        {bedActionBusy === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                        Vacate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenAllocate(b.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Allocate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ADD ROOM MODAL */}
      {showAddRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Add Hostel Room</h3>
              <button onClick={() => setShowAddRoom(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateRoom} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1.5">Hostel Block</label>
                <select
                  required
                  value={addRoomForm.block_id}
                  onChange={(e) => setAddRoomForm((f) => ({ ...f, block_id: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                >
                  <option value="">Select a block...</option>
                  {hierarchy.blocks.map((b: any) => {
                    const hostel = hierarchy.hostels.find((h: any) => h.id === b.hostel_id);
                    return (
                      <option key={b.id} value={b.id}>
                        {hostel ? `${hostel.name} — ` : ''}{b.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Room Number</label>
                  <input
                    required
                    type="text"
                    value={addRoomForm.room_number}
                    onChange={(e) => setAddRoomForm((f) => ({ ...f, room_number: e.target.value }))}
                    placeholder="e.g. 303"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Floor</label>
                  <select
                    value={addRoomForm.floor}
                    onChange={(e) => setAddRoomForm((f) => ({ ...f, floor: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                  >
                    {[1, 2, 3].map((f) => <option key={f} value={f}>Floor {f}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1.5">Sharing (Capacity)</label>
                <div className="flex gap-2">
                  {[2, 3, 4].map((cap) => (
                    <button
                      type="button"
                      key={cap}
                      onClick={() => setAddRoomForm((f) => ({ ...f, capacity: cap }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                        addRoomForm.capacity === cap
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cap}-Sharing
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={isCreatingRoom}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
              >
                {isCreatingRoom ? 'Creating...' : 'Create Room'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ALLOCATE STUDENT MODAL */}
      {allocatingBedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Allocate a Student</h3>
              <button onClick={() => setAllocatingBedId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  autoFocus
                  type="text"
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    loadUnallocatedStudents(e.target.value);
                  }}
                  placeholder="Search by name or register number..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>
            </div>
            <div className="overflow-y-auto p-2 flex-1">
              {studentsLoading ? (
                <div className="p-8 text-center text-slate-400 text-xs">Loading students...</div>
              ) : unallocatedStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No unallocated students found{studentSearch ? ' matching your search' : ''}.
                </div>
              ) : (
                unallocatedStudents.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleAllocate(s.id)}
                    disabled={bedActionBusy === allocatingBedId}
                    className="w-full text-left p-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between gap-2 disabled:opacity-50"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {s.register_number} • {s.class_name} {s.section_name} • {s.batch_name}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      Allocate
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
