import React, { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
// Deliberately not using drei's <Text> (troika-three-text): it fetches a
// default font from a remote CDN at runtime, which fails hard (blank
// canvas) on any restricted or flaky network. <Html> labels below cover
// every bit of text this scene needs without that dependency.
import { Building2, Grid3x3, RotateCcw, X } from 'lucide-react';

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
  building?: string;
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

const WALL_BLUE = '#2563eb';
const WALL_WHITE = '#f8fafc';
const DESK_TAN = '#d6b98c';
const BOARD_GREEN = '#166534';

// ---------------------------------------------------------------------------
// A single classroom: floor slab, three walls (open toward the corridor so
// the desk grid is visible from above, matching an architectural cutaway),
// a blackboard + teacher table against the back wall, a desk/bench grid
// sized to the room's actual benches x seats-per-bench, a status accent
// stripe over the doorway, and a floating name label.
// ---------------------------------------------------------------------------
function ClassroomBlock({
  room, x, z, width, depth, faceSign, onClick
}: {
  room: FloorRoom; x: number; z: number; width: number; depth: number;
  // faceSign: +1 if the room's open side faces +z (corridor is in front),
  // -1 if it faces -z (room is mirrored on the far side of the corridor).
  faceSign: 1 | -1;
  onClick: () => void;
}) {
  const wallH = 1.1;
  const wallT = 0.08;
  const color = STATUS_COLOR[room.status];
  const backZ = -faceSign * (depth / 2 - wallT / 2);
  const doorZ = faceSign * (depth / 2 - wallT / 2);

  const benches = Math.max(1, Math.min(room.benches, 10));
  const seatsPerBench = Math.max(1, Math.min(room.seatsPerBench, 6));
  const deskAreaW = width * 0.78;
  const deskAreaD = depth * 0.55;
  const deskW = deskAreaW / seatsPerBench;
  const deskD = deskAreaD / benches;

  const desks: React.ReactNode[] = [];
  for (let b = 0; b < benches; b++) {
    for (let s = 0; s < seatsPerBench; s++) {
      const dx = -deskAreaW / 2 + deskW * (s + 0.5);
      const dz = faceSign * (-depth / 2 + deskAreaD * 0.18 + deskD * (b + 0.5));
      desks.push(
        <mesh key={`d-${b}-${s}`} position={[dx, 0.16, dz]}>
          <boxGeometry args={[deskW * 0.8, 0.08, deskD * 0.55]} />
          <meshStandardMaterial color={DESK_TAN} />
        </mesh>
      );
    }
  }

  return (
    <group position={[x, 0, z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Floor slab */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[width, 0.04, depth]} />
        <meshStandardMaterial color={WALL_WHITE} />
      </mesh>
      {/* Status accent stripe across the doorway threshold */}
      <mesh position={[0, 0.045, doorZ - faceSign * 0.02]}>
        <boxGeometry args={[width * 0.9, 0.02, 0.08]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Back wall + blackboard */}
      <mesh position={[0, wallH / 2, backZ]}>
        <boxGeometry args={[width, wallH, wallT]} />
        <meshStandardMaterial color={WALL_BLUE} />
      </mesh>
      <mesh position={[0, wallH * 0.62, backZ - faceSign * (wallT / 2 + 0.01)]}>
        <boxGeometry args={[width * 0.45, wallH * 0.32, 0.02]} />
        <meshStandardMaterial color={BOARD_GREEN} />
      </mesh>
      {/* Teacher table */}
      <mesh position={[0, 0.14, backZ - faceSign * depth * 0.14]}>
        <boxGeometry args={[width * 0.22, 0.12, depth * 0.12]} />
        <meshStandardMaterial color={DESK_TAN} />
      </mesh>
      {/* Side walls (door side left open toward the corridor) */}
      <mesh position={[-width / 2 + wallT / 2, wallH / 2, 0]}>
        <boxGeometry args={[wallT, wallH, depth]} />
        <meshStandardMaterial color={WALL_BLUE} />
      </mesh>
      <mesh position={[width / 2 - wallT / 2, wallH / 2, 0]}>
        <boxGeometry args={[wallT, wallH, depth]} />
        <meshStandardMaterial color={WALL_BLUE} />
      </mesh>
      {desks}
      {/* Room label pinned near the doorway, like a door plaque */}
      <Html position={[0, 0, doorZ]} center distanceFactor={9} occlude style={{ pointerEvents: 'none' }}>
        <div style={{
          fontSize: 10, fontWeight: 800, color: '#0f172a', background: 'rgba(255,255,255,0.92)',
          padding: '2px 7px', borderRadius: 6, border: `1px solid ${color}`, whiteSpace: 'nowrap'
        }}>
          {room.roomNumber}
        </div>
      </Html>
      <Html position={[0, wallH + 0.22, 0]} center distanceFactor={9} occlude style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>{room.roomNumber}</div>
      </Html>
      <Html position={[0, wallH + 0.02, 0]} center distanceFactor={10} occlude style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
          {room.studentsAssigned}/{room.capacity}
        </div>
      </Html>
    </group>
  );
}

// A decorative (non-clickable) end block — stairs on one side, toilets on
// the other — purely to frame the corridor the way a real floor plan does.
function EndBlock({ x, depth, label, kind }: { x: number; depth: number; label: string; kind: 'stairs' | 'toilets' }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[1.4, 0.04, depth]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <mesh position={[0, 0.5, -depth / 2 + 0.05]}>
        <boxGeometry args={[1.4, 1, 0.08]} />
        <meshStandardMaterial color={WALL_BLUE} />
      </mesh>
      <mesh position={[-0.62, 0.5, 0]}>
        <boxGeometry args={[0.08, 1, depth]} />
        <meshStandardMaterial color={WALL_BLUE} />
      </mesh>
      <mesh position={[0.62, 0.5, 0]}>
        <boxGeometry args={[0.08, 1, depth]} />
        <meshStandardMaterial color={WALL_BLUE} />
      </mesh>
      {kind === 'stairs' ? (
        [0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[0, 0.05 + i * 0.08, -depth / 2 + 0.3 + i * 0.28]}>
            <boxGeometry args={[1.1, 0.08, 0.26]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
        ))
      ) : (
        <>
          <mesh position={[-0.3, 0.35, 0]}><boxGeometry args={[0.06, 0.7, depth * 0.7]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
          <mesh position={[0.15, 0.3, -depth * 0.15]}><boxGeometry args={[0.35, 0.05, 0.3]} /><meshStandardMaterial color="#f1f5f9" /></mesh>
          <mesh position={[0.15, 0.3, depth * 0.15]}><boxGeometry args={[0.35, 0.05, 0.3]} /><meshStandardMaterial color="#f1f5f9" /></mesh>
        </>
      )}
      <Html position={[0, 1.2, 0]} center distanceFactor={10} occlude style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: '#475569', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{label}</div>
      </Html>
    </group>
  );
}

// A little cone-and-trunk tree / rounded bush, purely decorative landscaping
// in front of the facade, echoing the reference render.
function Greenery({ x, z, kind }: { x: number; z: number; kind: 'tree' | 'bush' }) {
  if (kind === 'tree') {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.18, 0]}><cylinderGeometry args={[0.04, 0.05, 0.36, 6]} /><meshStandardMaterial color="#78350f" /></mesh>
        <mesh position={[0, 0.5, 0]}><coneGeometry args={[0.28, 0.55, 8]} /><meshStandardMaterial color="#16a34a" /></mesh>
      </group>
    );
  }
  return (
    <mesh position={[x, 0.14, z]}>
      <sphereGeometry args={[0.16, 8, 8]} />
      <meshStandardMaterial color="#22c55e" />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Full building scene: two rows of classrooms flanking a labeled corridor,
// stairs + toilets bookending the rows, and a front facade with an entrance
// and signage — an isometric-style layout modeled on the reference render.
// ---------------------------------------------------------------------------
function BuildingScene({ rooms, onSelectRoom }: { rooms: FloorRoom[]; onSelectRoom: (id: string) => void }) {
  const width = 1.9;
  const depth = 1.7;
  const gap = 0.12;
  const corridorDepth = 1.5;

  const rows = rooms.length > 4 ? 2 : 1;
  const perRow = Math.ceil(rooms.length / rows);
  const rowA = rooms.slice(0, perRow); // far row (faces -z, toward the back)
  const rowB = rooms.slice(perRow); // near row (faces +z, toward the corridor/entrance)

  const cellW = width + gap;
  const rowAWidth = rowA.length * cellW - gap;
  const rowBWidth = rowB.length * cellW - gap;
  const totalWidth = Math.max(rowAWidth, rowBWidth, width);

  const zA = rows === 2 ? -(corridorDepth / 2 + depth / 2) : 0;
  const zB = rows === 2 ? corridorDepth / 2 + depth / 2 : 0;

  const half = totalWidth / 2;
  const facadeZ = zB + depth / 2 + 0.9;

  return (
    <group>
      {/* Ground plaza */}
      <mesh position={[0, -0.02, facadeZ * 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[totalWidth + 4, Math.abs(facadeZ) + Math.abs(zA) + depth + 4]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>

      {/* Corridor strip + label */}
      {rows === 2 && (
        <>
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[totalWidth, 0.02, corridorDepth]} />
            <meshStandardMaterial color="#f1f5f9" />
          </mesh>
          <Html position={[0, 0.05, 0]} center distanceFactor={12} occlude style={{ pointerEvents: 'none' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 2, whiteSpace: 'nowrap' }}>CORRIDOR</div>
          </Html>
        </>
      )}

      {rowA.map((r, i) => (
        <ClassroomBlock
          key={r.roomId} room={r} faceSign={-1}
          x={-((rowA.length * cellW - gap) / 2) + cellW * i + width / 2}
          z={zA} width={width} depth={depth}
          onClick={() => onSelectRoom(r.roomId)}
        />
      ))}
      {rowB.map((r, i) => (
        <ClassroomBlock
          key={r.roomId} room={r} faceSign={1}
          x={-((rowB.length * cellW - gap) / 2) + cellW * i + width / 2}
          z={zB} width={width} depth={depth}
          onClick={() => onSelectRoom(r.roomId)}
        />
      ))}

      {rows === 2 && (
        <>
          <EndBlock x={-half - 1.0} depth={depth * 2 + corridorDepth} label="Stairs" kind="stairs" />
          <EndBlock x={half + 1.0} depth={depth * 2 + corridorDepth} label="Toilets" kind="toilets" />
        </>
      )}

      {/* Facade: front wall of the building with an entrance + signage */}
      <mesh position={[0, 0.55, facadeZ]}>
        <boxGeometry args={[totalWidth + 3, 1.1, 0.15]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 1.15, facadeZ]}>
        <boxGeometry args={[totalWidth + 3, 0.1, 0.16]} />
        <meshStandardMaterial color={WALL_BLUE} />
      </mesh>
      <mesh position={[0, 0.42, facadeZ - 0.35]}>
        <boxGeometry args={[1.3, 0.75, 0.5]} />
        <meshStandardMaterial color="#dbeafe" />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.05 + i * 0.06, facadeZ - 0.4 - i * 0.22]}>
          <boxGeometry args={[1.5, 0.06, 0.2]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
      ))}
      <Html position={[0, 1.15, facadeZ]} center distanceFactor={9} occlude style={{ pointerEvents: 'none' }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: '#ffffff', background: WALL_BLUE,
          padding: '3px 10px', borderRadius: 4, whiteSpace: 'nowrap', letterSpacing: 0.5
        }}>
          COLLEGE BUILDING
        </div>
      </Html>

      {/* Landscaping along the front edge */}
      {Array.from({ length: Math.max(3, Math.floor(totalWidth / 1.4)) }).map((_, i) => {
        const n = Math.max(3, Math.floor(totalWidth / 1.4));
        const gx = -half + (i + 0.5) * (totalWidth / n);
        return Math.abs(gx) < 0.9
          ? <Greenery key={i} x={gx} z={facadeZ + 0.55} kind="bush" />
          : <Greenery key={i} x={gx} z={facadeZ + 0.6} kind="tree" />;
      })}
    </group>
  );
}

export const ExamFloor3D: React.FC<{
  roomsByFloor: Record<number, FloorRoom[]>;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
}> = ({ roomsByFloor, selectedRoomId, onSelectRoom }) => {
  const floors = useMemo(() => Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b), [roomsByFloor]);
  // Ground floor may be numbered 0 — `floors[0] || 1` would wrongly fall
  // through to 1 in that case since 0 is falsy. Check length instead.
  const [activeFloor, setActiveFloor] = useState<number>(floors.length > 0 ? floors[0] : 1);

  // If the room list arrives after mount (e.g. an async fetch resolving
  // later) and the previously-picked floor no longer exists in the new
  // data, snap back to the first real floor rather than showing an
  // empty room grid.
  React.useEffect(() => {
    if (floors.length > 0 && !floors.includes(activeFloor)) {
      setActiveFloor(floors[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floors]);

  const [mode, setMode] = useState<'3D' | '2D'>('3D');

  const activeRooms = roomsByFloor[activeFloor] || [];
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
                {f === 0 ? 'Ground Floor' : `Floor ${f}`}
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
        <div style={{ height: 420 }} className="bg-slate-100 relative">
          <Canvas camera={{ position: [0, 8, 8.5], fov: 42 }}>
            <ambientLight intensity={0.9} />
            <directionalLight position={[6, 10, 4]} intensity={0.7} />
            <directionalLight position={[-6, 6, -4]} intensity={0.25} />
            <Suspense fallback={null}>
              <BuildingScene rooms={activeRooms} onSelectRoom={onSelectRoom} />
            </Suspense>
            <OrbitControls
              enablePan enableZoom enableRotate makeDefault
              minPolarAngle={0.3}
              maxPolarAngle={Math.PI / 2.3}
              target={[0, 0, 1]}
            />
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
        <div className="p-4 border-t border-slate-200 bg-violet-50/50 relative">
          <button
            onClick={() => onSelectRoom('')}
            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/70"
            aria-label="Close details"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-slate-900">Room {selectedRoom.roomNumber} — Floor {selectedRoom.floor === 0 ? 'Ground' : selectedRoom.floor}</div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${STATUS_COLOR[selectedRoom.status]}22`, color: STATUS_COLOR[selectedRoom.status] }}>
              {STATUS_LABEL[selectedRoom.status]}
            </span>
          </div>
          {selectedRoom.building && <div className="text-[11px] text-slate-400 mt-0.5">{selectedRoom.building}</div>}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs text-slate-600">
            <div><span className="text-slate-400 block">Benches</span>{selectedRoom.benches}</div>
            <div><span className="text-slate-400 block">Seats / Bench</span>{selectedRoom.seatsPerBench}</div>
            <div><span className="text-slate-400 block">Total Capacity</span>{selectedRoom.capacity}</div>
            <div><span className="text-slate-400 block">Students Assigned</span>{selectedRoom.studentsAssigned}</div>
            <div><span className="text-slate-400 block">Seats Available</span>{Math.max(0, selectedRoom.capacity - selectedRoom.studentsAssigned)}</div>
            <div><span className="text-slate-400 block">Occupancy</span>{selectedRoom.capacity > 0 ? Math.round((selectedRoom.studentsAssigned / selectedRoom.capacity) * 100) : 0}%</div>
            <div className="col-span-2 sm:col-span-2"><span className="text-slate-400 block">Room ID</span><span className="font-mono text-[10px]">{selectedRoom.roomId}</span></div>
          </div>

          <div className="mt-3 h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${selectedRoom.capacity > 0 ? Math.min(100, (selectedRoom.studentsAssigned / selectedRoom.capacity) * 100) : 0}%`,
                background: STATUS_COLOR[selectedRoom.status]
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
