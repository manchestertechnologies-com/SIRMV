import React, { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import { Building2, Grid3x3, RotateCcw } from 'lucide-react';

export type RoomStatus = 'AVAILABLE' | 'PARTIALLY_ALLOCATED' | 'FULL' | 'SELECTED' | 'UNAVAILABLE' | 'PRIORITY';

export interface FloorRoom {
  roomId: string;
  roomNumber: string;
  floor: number;
  benches: number;
  seatsPerBench: number;
  capacity: number;
  studentsAssigned: number;
  status: RoomStatus;
}

const STATUS_COLOR: Record<RoomStatus, string> = {
  AVAILABLE: '#10b981',
  PARTIALLY_ALLOCATED: '#f59e0b',
  FULL: '#ef4444',
  SELECTED: '#4f46e5',
  UNAVAILABLE: '#94a3b8',
  PRIORITY: '#7c3aed'
};

const STATUS_LABEL: Record<RoomStatus, string> = {
  AVAILABLE: 'Available',
  PARTIALLY_ALLOCATED: 'Partially Allocated',
  FULL: 'Full',
  SELECTED: 'Selected',
  UNAVAILABLE: 'Unavailable',
  PRIORITY: 'Priority Room'
};

type PositionedRoom = FloorRoom & { _x: number; _z: number };

function RoomBox({ room, onClick }: { room: PositionedRoom; onClick: () => void }) {
  const color = STATUS_COLOR[room.status];
  return (
    <group position={[room._x, 0, room._z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.7, 1, 1.7]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text position={[0, 1.15, 0]} fontSize={0.28} color="#1e293b" anchorX="center" anchorY="middle">
        {room.roomNumber}
      </Text>
      <Html position={[0, -0.35, 0]} center distanceFactor={8} occlude style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
          {room.studentsAssigned}/{room.capacity}
        </div>
      </Html>
    </group>
  );
}

export const ExamFloor3D: React.FC<{
  roomsByFloor: Record<number, FloorRoom[]>;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
}> = ({ roomsByFloor, selectedRoomId, onSelectRoom }) => {
  const floors = useMemo(() => Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b), [roomsByFloor]);
  const [activeFloor, setActiveFloor] = useState<number>(floors[0] || 1);
  const [mode, setMode] = useState<'3D' | '2D'>('3D');

  const activeRooms = roomsByFloor[activeFloor] || [];
  const columns = Math.max(3, Math.ceil(Math.sqrt(activeRooms.length)));
  const positioned: PositionedRoom[] = activeRooms.map((r, i) => ({
    ...r,
    _x: (i % columns) * 2.2 - (columns * 2.2) / 2,
    _z: Math.floor(i / columns) * 2.2
  }));

  const selectedRoom = activeRooms.find((r) => r.roomId === selectedRoomId) || null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-violet-600" />
          <span className="text-sm font-bold text-slate-900">Examination Building</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {floors.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFloor(f)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activeFloor === f ? 'bg-violet-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Floor {f}
              </button>
            ))}
          </div>
          <button
            onClick={() => setMode(mode === '3D' ? '2D' : '3D')}
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:text-slate-900"
          >
            <Grid3x3 className="w-3.5 h-3.5" />
            {mode === '3D' ? '2D List View' : '3D View'}
          </button>
        </div>
      </div>

      {mode === '3D' ? (
        <div style={{ height: 340 }} className="bg-slate-50 relative">
          <Canvas camera={{ position: [0, 6, 8], fov: 50 }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 8, 5]} intensity={0.6} />
            <Suspense fallback={null}>
              {positioned.map((r) => (
                <RoomBox key={r.roomId} room={r} onClick={() => onSelectRoom(r.roomId)} />
              ))}
            </Suspense>
            <gridHelper args={[20, 20, '#cbd5e1', '#e2e8f0']} />
            <OrbitControls enablePan enableZoom enableRotate makeDefault />
          </Canvas>
          <button
            onClick={() => onSelectRoom('')}
            title="Reset view"
            className="absolute top-2 right-2 bg-white/90 border border-slate-200 rounded-lg p-1.5 shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {activeRooms.map((r) => (
            <button
              key={r.roomId}
              onClick={() => onSelectRoom(r.roomId)}
              className="text-left p-3 rounded-xl border-2 transition"
              style={{ borderColor: STATUS_COLOR[r.status], background: `${STATUS_COLOR[r.status]}14` }}
            >
              <div className="font-bold text-sm text-slate-900">Room {r.roomNumber}</div>
              <div className="text-[11px] text-slate-500">{STATUS_LABEL[r.status]}</div>
              <div className="text-[11px] text-slate-600 mt-1">{r.studentsAssigned}/{r.capacity} seats</div>
            </button>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-slate-100 flex flex-wrap gap-3">
        {(Object.keys(STATUS_LABEL) as RoomStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: STATUS_COLOR[s] }} />
            {STATUS_LABEL[s]}
          </div>
        ))}
      </div>

      {selectedRoom && (
        <div className="p-4 border-t border-slate-200 bg-violet-50/50">
          <div className="text-sm font-bold text-slate-900">Room {selectedRoom.roomNumber} — Floor {selectedRoom.floor}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 text-xs text-slate-600">
            <div><span className="text-slate-400 block">Benches</span>{selectedRoom.benches}</div>
            <div><span className="text-slate-400 block">Seats/Bench</span>{selectedRoom.seatsPerBench}</div>
            <div><span className="text-slate-400 block">Capacity</span>{selectedRoom.capacity}</div>
            <div><span className="text-slate-400 block">Assigned / Available</span>{selectedRoom.studentsAssigned} / {selectedRoom.capacity - selectedRoom.studentsAssigned}</div>
          </div>
        </div>
      )}
    </div>
  );
};
