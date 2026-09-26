import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
// Deliberately not using drei's <Text> (troika-three-text): it fetches a
// default font from a remote CDN at runtime, which fails hard (blank
// canvas) on any restricted or flaky network.
// Also deliberately not using drei's <Html>: with several instances
// mounting at once (one per room), its per-instance `ReactDOM.createRoot`
// races under React 19's concurrent scheduler and some labels silently
// never render their content (confirmed by inspecting the mounted DOM —
// the wrapper element exists but is empty). `LabelOverlay` below reimplements
// the same "project a 3D point onto the 2D canvas" idea as one normal
// overlay in the outer React tree, so there's only ever one root involved.
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
  // The class/section this room belongs to — its regular teaching-timetable
  // occupant (e.g. "1 PUC - A"), or for a specific exam session, the
  // exam-conducting batch(es) this room is the priority room for. Shown as
  // a label under the room number so exam staff can see at a glance which
  // class/section each classroom is, not just its floor/number.
  homeClassLabel?: string;
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

function benchAvailability(room: FloorRoom) {
  const benches = Math.max(1, room.benches);
  const seatsPerBench = Math.max(1, room.seatsPerBench);
  const occupiedBenches = Math.min(benches, Math.ceil(room.studentsAssigned / seatsPerBench));
  return { occupiedBenches, availableBenches: benches - occupiedBenches };
}

// ---------------------------------------------------------------------------
// Shared layout math: where each room's cube sits (two rows flanking a
// corridor once there are more than 4 rooms), and where the ground plaza
// and corridor strip go. Used both to place the actual 3D meshes and,
// outside the canvas, to know where each label should be projected.
// ---------------------------------------------------------------------------
const CUBE_SIZE = 1.5;
const CUBE_GAP = 0.7; // wide enough that neighboring room labels never overlap on screen
const CUBE_HEIGHT = 0.85;
const CORRIDOR_DEPTH = 1.3;

interface RoomLayout { room: FloorRoom; x: number; z: number; }
interface SceneLayout {
  rooms: RoomLayout[];
  rows: number;
  totalWidth: number;
  plazaDepth: number;
  hasCorridor: boolean;
}

function computeLayout(rooms: FloorRoom[]): SceneLayout {
  const rows = rooms.length > 4 ? 2 : 1;
  const perRow = Math.ceil(rooms.length / rows);
  const rowA = rooms.slice(0, perRow);
  const rowB = rooms.slice(perRow);

  const cellW = CUBE_SIZE + CUBE_GAP;
  const rowAWidth = rowA.length * cellW - CUBE_GAP;
  const rowBWidth = rowB.length * cellW - CUBE_GAP;
  const totalWidth = Math.max(rowAWidth, rowBWidth, CUBE_SIZE);

  const zA = rows === 2 ? -(CORRIDOR_DEPTH / 2 + CUBE_SIZE / 2) : 0;
  const zB = rows === 2 ? CORRIDOR_DEPTH / 2 + CUBE_SIZE / 2 : 0;
  const plazaDepth = rows === 2 ? CUBE_SIZE * 2 + CORRIDOR_DEPTH + 2 : CUBE_SIZE + 2;

  const placed: RoomLayout[] = [
    ...rowA.map((r, i) => ({ room: r, x: -((rowA.length * cellW - CUBE_GAP) / 2) + cellW * i + CUBE_SIZE / 2, z: zA })),
    ...rowB.map((r, i) => ({ room: r, x: -((rowB.length * cellW - CUBE_GAP) / 2) + cellW * i + CUBE_SIZE / 2, z: zB }))
  ];

  return { rooms: placed, rows, totalWidth, plazaDepth, hasCorridor: rows === 2 };
}

// ---------------------------------------------------------------------------
// A single classroom: a clean, solid cube colored by status. The room
// number / bench-count label lives outside the canvas (see LabelOverlay) —
// keeping it there avoids drei's <Html>, which is unreliable when several
// instances mount in the same tick (see the import comment above). Full
// detail (benches, seats/bench, occupancy, room ID) is shown in the detail
// panel on click rather than crammed into the 3D scene.
// ---------------------------------------------------------------------------
function ClassroomCube({
  room, x, z, onClick
}: {
  room: FloorRoom; x: number; z: number;
  onClick: () => void;
}) {
  const color = STATUS_COLOR[room.status];

  return (
    <group position={[x, 0, z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh position={[0, CUBE_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[CUBE_SIZE, CUBE_HEIGHT, CUBE_SIZE]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* A slightly darker cap so the cube reads as a solid block, not a flat color swatch */}
      <mesh position={[0, CUBE_HEIGHT + 0.015, 0]}>
        <boxGeometry args={[CUBE_SIZE * 0.98, 0.03, CUBE_SIZE * 0.98]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Full building scene: two rows of classroom cubes flanking a labeled
// corridor strip — a clean, simple block layout rather than a detailed
// architectural cutaway.
// ---------------------------------------------------------------------------
function BuildingScene({ layout, onSelectRoom }: { layout: SceneLayout; onSelectRoom: (id: string) => void }) {
  return (
    <group>
      {/* Ground plaza — deliberately excluded from the camera auto-fit
          (userData.excludeFromFit) so the frame hugs the classroom cubes
          instead of stretching out to include the whole floor plate. */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow userData={{ excludeFromFit: true }}>
        <planeGeometry args={[layout.totalWidth + 2.5, layout.plazaDepth]} />
        <meshStandardMaterial color="#e7e9ee" />
      </mesh>

      {/* Corridor strip */}
      {layout.hasCorridor && (
        <mesh position={[0, 0.005, 0]} receiveShadow>
          <boxGeometry args={[layout.totalWidth, 0.01, CORRIDOR_DEPTH]} />
          <meshStandardMaterial color="#f1f5f9" />
        </mesh>
      )}

      {layout.rooms.map(({ room, x, z }) => (
        <ClassroomCube key={room.roomId} room={room} x={x} z={z} onClick={() => onSelectRoom(room.roomId)} />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Projects a set of 3D world points onto 2D canvas-pixel coordinates every
// frame and reports back only when something actually moved (same idea as
// drei's Html, minus the per-label React root). Lives inside the Canvas so
// it can read the live camera; the overlay that consumes its output lives
// outside, in the single outer React tree.
// ---------------------------------------------------------------------------
interface LabelPoint { id: string; position: [number, number, number]; }
interface ScreenPos { x: number; y: number; behind: boolean; }

function LabelProjector({ points, onUpdate }: { points: LabelPoint[]; onUpdate: (pos: Record<string, ScreenPos>) => void }) {
  const { camera, size } = useThree();
  const lastRef = useRef<Record<string, ScreenPos>>({});
  const worldPos = useRef(new THREE.Vector3());
  const camPos = useRef(new THREE.Vector3());
  const camDir = useRef(new THREE.Vector3());

  useFrame(() => {
    camera.updateMatrixWorld();
    camera.getWorldPosition(camPos.current);
    camera.getWorldDirection(camDir.current);
    const next: Record<string, ScreenPos> = {};
    let changed = false;
    for (const p of points) {
      worldPos.current.set(p.position[0], p.position[1], p.position[2]);
      const toPoint = worldPos.current.clone().sub(camPos.current);
      const behind = toPoint.angleTo(camDir.current) > Math.PI / 2;
      const projected = worldPos.current.clone().project(camera);
      const x = projected.x * (size.width / 2) + size.width / 2;
      const y = -(projected.y * (size.height / 2)) + size.height / 2;
      next[p.id] = { x, y, behind };
      const prev = lastRef.current[p.id];
      if (!prev || Math.abs(prev.x - x) > 0.4 || Math.abs(prev.y - y) > 0.4 || prev.behind !== behind) {
        changed = true;
      }
    }
    if (Object.keys(lastRef.current).length !== Object.keys(next).length) changed = true;
    if (changed) {
      lastRef.current = next;
      onUpdate(next);
    }
  });
  return null;
}

// Frames the whole building in view automatically: measures the real
// rendered geometry each time the floor/room set changes and repositions
// the camera + orbit target to fit it, instead of a single hand-tuned
// camera position that only looks right for one particular room count.
function FitCameraToScene({
  groupRef, controlsRef, signature
}: {
  groupRef: React.RefObject<THREE.Object3D | null>;
  controlsRef: React.RefObject<any>;
  signature: string;
}) {
  const { camera } = useThree();
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    // Build the fit box from the classroom cubes (and everything else)
    // except meshes explicitly flagged out, e.g. the wide ground plaza —
    // otherwise the camera zooms out to fit the whole floor plate and the
    // actual rooms shrink to a tiny cluster in the middle of the frame.
    const box = new THREE.Box3();
    group.traverse((obj) => {
      if ((obj as any).isMesh && !obj.userData?.excludeFromFit) {
        box.expandByObject(obj);
      }
    });
    if (box.isEmpty()) return;
    // The room-number/bench-count label is an <Html> overlay anchored above
    // each cube, not a mesh, so it never counts toward the box above. Pad
    // upward so the fit leaves room for it instead of clipping it at the
    // top edge of the canvas.
    box.max.y += 0.55;
    const center = box.getCenter(new THREE.Vector3());

    // A sphere-based fit wastes a lot of a wide canvas: it braces for the
    // object's full diagonal in every direction, so a flat, wide layout
    // like this one (short vertically, wide horizontally) ends up tiny
    // with big empty margins left and right. Instead, fit the camera to
    // the box's actual corners along the camera's own view axes, which
    // hugs the real silhouette from this specific viewing angle.
    const persp = camera as THREE.PerspectiveCamera;
    const vFov = (persp.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (persp.aspect || 1));

    const dir = new THREE.Vector3(0.15, 0.9, 1).normalize(); // camera-from-center direction
    const forward = dir.clone().negate(); // camera-to-center direction
    const worldUp = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    const corners = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z), new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z), new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z), new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z), new THREE.Vector3(box.max.x, box.max.y, box.max.z)
    ];

    const tanH = Math.tan(hFov / 2);
    const tanV = Math.tan(vFov / 2);
    let dist = 1.4; // sane floor for a single small room
    for (const corner of corners) {
      const rel = corner.clone().sub(center);
      const k = rel.dot(dir); // how far this corner sits toward the camera along `dir`
      const x = rel.dot(right);
      const y = rel.dot(up);
      // depth(D) = D - k must satisfy depth*tan >= |x| (and |y|), so
      // D >= k + |x|/tan. Take the strictest requirement over all corners.
      dist = Math.max(dist, k + Math.abs(x) / tanH, k + Math.abs(y) / tanV);
    }
    dist *= 1.12; // small breathing margin

    persp.position.copy(center.clone().add(dir.clone().multiplyScalar(dist)));
    persp.near = Math.max(0.05, dist / 100);
    persp.far = dist * 12;
    persp.lookAt(center);
    persp.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return null;
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
  const groupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);

  const activeRooms = roomsByFloor[activeFloor] || [];
  const selectedRoom = activeRooms.find((r) => r.roomId === selectedRoomId) || null;
  const totalAvailableBenches = activeRooms.reduce((sum, r) => sum + benchAvailability(r).availableBenches, 0);
  const totalBenches = activeRooms.reduce((sum, r) => sum + r.benches, 0);
  // Re-fit the camera whenever the floor changes or the room set on it
  // changes (e.g. a room is added, or rooms load in asynchronously).
  const sceneSignature = `${activeFloor}-${activeRooms.map((r) => r.roomId).join(',')}`;

  const layout = useMemo(() => computeLayout(activeRooms), [sceneSignature]); // eslint-disable-line react-hooks/exhaustive-deps
  const labelPoints = useMemo<LabelPoint[]>(() => {
    const points: LabelPoint[] = layout.rooms.map(({ room, x, z }) => ({
      id: room.roomId, position: [x, CUBE_HEIGHT + 0.32, z]
    }));
    if (layout.hasCorridor) points.push({ id: '__corridor', position: [0, 0.02, 0] });
    return points;
  }, [layout]);
  const [screenPositions, setScreenPositions] = useState<Record<string, ScreenPos>>({});

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

      <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2 text-xs">
        <span className="text-slate-500">Benches open on this floor:</span>
        <span className={`font-bold ${totalAvailableBenches > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{totalAvailableBenches} / {totalBenches}</span>
      </div>

      {mode === '3D' ? (
        <div style={{ height: 380 }} className="bg-gradient-to-b from-slate-100 to-slate-200 relative">
          {activeRooms.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">No rooms on this floor yet.</div>
          ) : (
            <Canvas shadows camera={{ position: [0, 8, 8.5], fov: 42 }}>
              <ambientLight intensity={0.8} />
              <directionalLight position={[6, 10, 4]} intensity={0.85} castShadow shadow-mapSize={[1024, 1024]} />
              <directionalLight position={[-6, 6, -4]} intensity={0.3} />
              <Suspense fallback={null}>
                <group ref={groupRef}>
                  <BuildingScene layout={layout} onSelectRoom={onSelectRoom} />
                </group>
              </Suspense>
              <FitCameraToScene groupRef={groupRef} controlsRef={controlsRef} signature={sceneSignature} />
              <LabelProjector points={labelPoints} onUpdate={setScreenPositions} />
              <OrbitControls
                ref={controlsRef}
                enablePan enableZoom enableRotate makeDefault
                minPolarAngle={0.3}
                maxPolarAngle={Math.PI / 2.3}
              />
            </Canvas>
          )}
          {activeRooms.length > 0 && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {layout.rooms.map(({ room }) => {
                const pos = screenPositions[room.roomId];
                if (!pos || pos.behind) return null;
                const { availableBenches } = benchAvailability(room);
                const color = STATUS_COLOR[room.status];
                return (
                  <div
                    key={room.roomId}
                    style={{
                      position: 'absolute', left: 0, top: 0,
                      transform: `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -100%)`,
                      fontSize: 11, fontWeight: 800, color: '#0f172a', background: 'rgba(255,255,255,0.96)',
                      padding: '3px 9px', borderRadius: 7, border: `1.5px solid ${color}`, whiteSpace: 'nowrap',
                      boxShadow: '0 2px 6px rgba(15,23,42,0.15)', textAlign: 'center', lineHeight: 1.3
                    }}
                  >
                    <div>{room.roomNumber}</div>
                    {room.homeClassLabel && (
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#4338ca' }}>{room.homeClassLabel}</div>
                    )}
                    <div style={{ fontSize: 9, fontWeight: 700, color: availableBenches > 0 ? '#059669' : '#dc2626' }}>
                      {availableBenches > 0 ? `${availableBenches} bench${availableBenches === 1 ? '' : 'es'} open` : 'Full'}
                    </div>
                  </div>
                );
              })}
              {layout.hasCorridor && screenPositions.__corridor && !screenPositions.__corridor.behind && (
                <div
                  style={{
                    position: 'absolute', left: 0, top: 0,
                    transform: `translate3d(${screenPositions.__corridor.x}px, ${screenPositions.__corridor.y}px, 0) translate(-50%, -50%)`,
                    fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 2, whiteSpace: 'nowrap'
                  }}
                >
                  CORRIDOR
                </div>
              )}
            </div>
          )}
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
          {activeRooms.map((r) => {
            const { availableBenches } = benchAvailability(r);
            return (
              <button
                key={r.roomId}
                onClick={() => onSelectRoom(r.roomId)}
                className="text-left p-3 rounded-xl border-2 transition"
                style={{ borderColor: STATUS_COLOR[r.status], background: `${STATUS_COLOR[r.status]}14` }}
              >
                <div className="font-bold text-sm text-slate-900">Room {r.roomNumber}</div>
                <div className="text-[11px] text-slate-500">{STATUS_LABEL[r.status]}</div>
                <div className="text-[11px] text-slate-600 mt-1">{r.studentsAssigned}/{r.capacity} seats</div>
                <div className={`text-[11px] font-semibold mt-0.5 ${availableBenches > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {availableBenches > 0 ? `${availableBenches} bench(es) available` : 'No benches available'}
                </div>
              </button>
            );
          })}
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
          {selectedRoom.homeClassLabel && (
            <div className="text-[11px] font-bold text-indigo-700 mt-1">Class/Section: {selectedRoom.homeClassLabel}</div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs text-slate-600">
            <div><span className="text-slate-400 block">Benches</span>{selectedRoom.benches}</div>
            <div><span className="text-slate-400 block">Seats / Bench</span>{selectedRoom.seatsPerBench}</div>
            <div><span className="text-slate-400 block">Benches Available</span><span className="font-bold text-emerald-600">{benchAvailability(selectedRoom).availableBenches}</span></div>
            <div><span className="text-slate-400 block">Total Capacity</span>{selectedRoom.capacity}</div>
            <div><span className="text-slate-400 block">Students Assigned</span>{selectedRoom.studentsAssigned}</div>
            <div><span className="text-slate-400 block">Seats Available</span>{Math.max(0, selectedRoom.capacity - selectedRoom.studentsAssigned)}</div>
            <div><span className="text-slate-400 block">Occupancy</span>{selectedRoom.capacity > 0 ? Math.round((selectedRoom.studentsAssigned / selectedRoom.capacity) * 100) : 0}%</div>
            <div><span className="text-slate-400 block">Room ID</span><span className="font-mono text-[10px]">{selectedRoom.roomId}</span></div>
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
