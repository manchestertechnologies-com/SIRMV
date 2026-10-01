import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Building2, ZoomIn, ZoomOut } from 'lucide-react';
import { TouchActionFix } from './three/TouchActionFix';

// ---------------------------------------------------------------------------
// A lightweight 3D hostel-floor view: one box per room, sized by its bed
// count (2/3/4-sharing all look visibly different), with small bed cubes on
// top colored green (available) or indigo (occupied) so a Warden can see
// filled vs. available at a glance and click a room to allocate into it.
//
// Deliberately NOT reusing ExamFloor3D/RoomShell — those model a classroom
// (benches, blackboard, corridor + stairs/toilet wings) which doesn't fit a
// dorm room. This is its own, much simpler scene, but follows the same
// proven conventions used there: plain box/plane primitives (no drei <Text>,
// which needs a font fetched from a remote CDN that can fail on a
// restricted network), labels as an outer-React-tree HTML overlay positioned
// by projecting each room's 3D center every frame (no drei <Html>, which
// races across many simultaneous instances under React 19), and the shared
// TouchActionFix so one-finger touch scrolls the page while two fingers
// orbit the model.
// ---------------------------------------------------------------------------

export type HostelRoomStatus = 'AVAILABLE' | 'PARTIALLY_ALLOCATED' | 'FULL' | 'SELECTED';

export interface Hostel3DBed {
  bedId: string;
  bedNumber: string;
  studentName?: string | null;
}

export interface Hostel3DRoom {
  roomId: string;
  roomNumber: string;
  floor: number;
  capacity: number; // 2, 3 or 4 — drives both room width and bed count drawn
  beds: Hostel3DBed[];
  status: HostelRoomStatus;
}

const STATUS_COLOR: Record<HostelRoomStatus, string> = {
  AVAILABLE: '#10b981',
  PARTIALLY_ALLOCATED: '#f59e0b',
  FULL: '#ef4444',
  SELECTED: '#4f46e5'
};

export const STATUS_LABEL: Record<HostelRoomStatus, string> = {
  AVAILABLE: 'Available',
  PARTIALLY_ALLOCATED: 'Partially Filled',
  FULL: 'Full',
  SELECTED: 'Selected'
};

const BED_COLOR_OCCUPIED = '#4338ca';
const BED_COLOR_AVAILABLE = '#86efac';
const BED_WIDTH = 0.6;
const BED_DEPTH = 0.9;
const BED_HEIGHT = 0.3;
const BED_GAP = 0.18;
const ROOM_WALL_H = 1.1;

function roomFootprint(capacity: number) {
  const beds = Math.max(1, capacity);
  const width = beds * BED_WIDTH + (beds - 1) * BED_GAP + 0.6;
  const depth = BED_DEPTH + 0.8;
  return { width, depth };
}

// One room: floor slab, low perimeter walls, and a row of bed cubes colored
// by occupancy. Clicking anywhere on the room calls onSelectRoom.
function RoomBlock({ room, isSelected, onSelectRoom }: { room: Hostel3DRoom; isSelected: boolean; onSelectRoom: (id: string) => void }) {
  const { width, depth } = roomFootprint(room.capacity);
  const color = STATUS_COLOR[isSelected ? 'SELECTED' : room.status];
  const beds = room.beds.length > 0
    ? room.beds
    : Array.from({ length: room.capacity }, (_, i) => ({ bedId: `${room.roomId}-ghost-${i}`, bedNumber: String(i + 1), studentName: null }));

  const startX = -((beds.length - 1) * (BED_WIDTH + BED_GAP)) / 2;

  return (
    <group
      onClick={(e) => { e.stopPropagation(); onSelectRoom(room.roomId); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* Floor slab */}
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      {/* Low perimeter wall, tinted by status, so the room reads at a
          glance even before you look at the beds themselves. */}
      <mesh position={[0, ROOM_WALL_H / 2 - 0.03, -depth / 2]}>
        <boxGeometry args={[width, ROOM_WALL_H, 0.05]} />
        <meshStandardMaterial color={color} transparent opacity={0.85} />
      </mesh>
      <mesh position={[-width / 2, ROOM_WALL_H / 2 - 0.03, 0]}>
        <boxGeometry args={[0.05, ROOM_WALL_H, depth]} />
        <meshStandardMaterial color={color} transparent opacity={0.55} />
      </mesh>
      <mesh position={[width / 2, ROOM_WALL_H / 2 - 0.03, 0]}>
        <boxGeometry args={[0.05, ROOM_WALL_H, depth]} />
        <meshStandardMaterial color={color} transparent opacity={0.55} />
      </mesh>
      {/* Beds */}
      {beds.map((bed, i) => {
        const occupied = !!bed.studentName;
        return (
          <mesh
            key={bed.bedId}
            castShadow
            position={[startX + i * (BED_WIDTH + BED_GAP), BED_HEIGHT / 2, 0.1]}
          >
            <boxGeometry args={[BED_WIDTH, BED_HEIGHT, BED_DEPTH]} />
            <meshStandardMaterial color={occupied ? BED_COLOR_OCCUPIED : BED_COLOR_AVAILABLE} />
          </mesh>
        );
      })}
    </group>
  );
}

interface PlacedRoom { room: Hostel3DRoom; x: number; z: number; width: number; depth: number; }

// Simple wrapping grid: rooms laid left-to-right, wrapping to a new row once
// a row gets too wide, each row's depth = the tallest room placed in it.
function layoutRooms(rooms: Hostel3DRoom[]): { placed: PlacedRoom[]; totalWidth: number; totalDepth: number } {
  const MAX_ROW_WIDTH = 11;
  const ROW_GAP = 1.1;
  const COL_GAP = 0.7;

  const placed: PlacedRoom[] = [];
  let rowX = 0;
  let rowZ = 0;
  let rowDepth = 0;
  let maxRowWidth = 0;

  for (const room of rooms) {
    const { width, depth } = roomFootprint(room.capacity);
    if (rowX > 0 && rowX + width > MAX_ROW_WIDTH) {
      maxRowWidth = Math.max(maxRowWidth, rowX - COL_GAP);
      rowZ += rowDepth + ROW_GAP;
      rowX = 0;
      rowDepth = 0;
    }
    placed.push({ room, x: rowX + width / 2, z: rowZ, width, depth });
    rowX += width + COL_GAP;
    rowDepth = Math.max(rowDepth, depth);
  }
  maxRowWidth = Math.max(maxRowWidth, rowX - COL_GAP);
  const totalDepth = rowZ + rowDepth;

  // Center everything around the origin.
  const centered = placed.map((p) => ({ ...p, x: p.x - maxRowWidth / 2, z: p.z - totalDepth / 2 }));
  return { placed: centered, totalWidth: maxRowWidth, totalDepth };
}

interface LabelPoint { id: string; position: [number, number, number]; }
interface ScreenPos { x: number; y: number; behind: boolean; }

// Projects each room's label anchor to 2D screen space every frame — see the
// file header for why this replaces drei's <Html>.
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

// Frames the whole floor in view automatically whenever the room set changes.
function FitCameraToScene({ groupRef, controlsRef, signature }: { groupRef: React.RefObject<THREE.Object3D | null>; controlsRef: React.RefObject<any>; signature: string }) {
  const { camera } = useThree();
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const box = new THREE.Box3();
    group.traverse((obj) => { if ((obj as any).isMesh) box.expandByObject(obj); });
    if (box.isEmpty()) return;
    box.max.y += 0.6;
    const center = box.getCenter(new THREE.Vector3());

    const persp = camera as THREE.PerspectiveCamera;
    const vFov = (persp.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (persp.aspect || 1));
    const dir = new THREE.Vector3(0.2, 0.95, 0.9).normalize();
    const forward = dir.clone().negate();
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
    let dist = 1.8;
    for (const corner of corners) {
      const rel = corner.clone().sub(center);
      const k = rel.dot(dir);
      const x = rel.dot(right);
      const y = rel.dot(up);
      dist = Math.max(dist, k + Math.abs(x) / tanH, k + Math.abs(y) / tanV);
    }
    dist *= 1.15;
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

function FloorScene({ placed, selectedRoomId, onSelectRoom }: { placed: PlacedRoom[]; selectedRoomId?: string | null; onSelectRoom: (id: string) => void }) {
  return (
    <>
      {placed.map(({ room, x, z }) => (
        <group key={room.roomId} position={[x, 0, z]}>
          <RoomBlock room={room} isSelected={room.roomId === selectedRoomId} onSelectRoom={onSelectRoom} />
        </group>
      ))}
    </>
  );
}

export const HostelFloor3D: React.FC<{
  rooms: Hostel3DRoom[];
  selectedRoomId?: string | null;
  onSelectRoom: (roomId: string) => void;
  heading?: string;
}> = ({ rooms, selectedRoomId, onSelectRoom, heading }) => {
  const groupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);
  const [screenPositions, setScreenPositions] = useState<Record<string, ScreenPos>>({});

  const { placed } = useMemo(() => layoutRooms(rooms), [rooms]);
  const labelPoints: LabelPoint[] = useMemo(
    () => placed.map(({ room, x, z, depth }) => ({ id: room.roomId, position: [x, ROOM_WALL_H + 0.1, z - depth / 2] })),
    [placed]
  );
  const sceneSignature = useMemo(() => rooms.map((r) => `${r.roomId}:${r.capacity}:${r.beds.map((b) => b.bedId + (b.studentName ? '1' : '0')).join(',')}`).join('|'), [rooms]);

  const zoomBy = (factor: number) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const camera = controls.object as THREE.PerspectiveCamera;
    const offset = camera.position.clone().sub(controls.target);
    offset.multiplyScalar(factor);
    camera.position.copy(controls.target.clone().add(offset));
    controls.update();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-bold text-slate-900">{heading || 'Hostel Rooms — 3D View'}</span>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <button onClick={() => zoomBy(0.8)} title="Zoom in" className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => zoomBy(1.25)} title="Zoom out" className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        style={{ height: 360, touchAction: 'pan-y' }}
        className="bg-gradient-to-b from-slate-100 to-slate-200 relative"
        onWheelCapture={(e) => e.stopPropagation()}
      >
        {rooms.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">No rooms on this floor yet.</div>
        ) : (
          <Canvas shadows camera={{ position: [0, 7, 7.5], fov: 42 }}>
            <ambientLight intensity={0.85} />
            <directionalLight position={[6, 10, 4]} intensity={0.8} castShadow shadow-mapSize={[1024, 1024]} />
            <directionalLight position={[-6, 6, -4]} intensity={0.3} />
            <Suspense fallback={null}>
              <group ref={groupRef}>
                <FloorScene placed={placed} selectedRoomId={selectedRoomId} onSelectRoom={onSelectRoom} />
              </group>
            </Suspense>
            <FitCameraToScene groupRef={groupRef} controlsRef={controlsRef} signature={sceneSignature} />
            <LabelProjector points={labelPoints} onUpdate={setScreenPositions} />
            <TouchActionFix />
            <OrbitControls
              ref={controlsRef}
              enablePan enableRotate makeDefault enableZoom
              touches={{ ONE: undefined as any, TWO: THREE.TOUCH.DOLLY_PAN }}
              minPolarAngle={0.3}
              maxPolarAngle={Math.PI / 2.3}
            />
          </Canvas>
        )}
        {rooms.length > 0 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {placed.map(({ room }) => {
              const pos = screenPositions[room.roomId];
              if (!pos || pos.behind) return null;
              const occupied = room.beds.filter((b) => b.studentName).length;
              const color = STATUS_COLOR[room.roomId === selectedRoomId ? 'SELECTED' : room.status];
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
                  <div>Room {room.roomNumber}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: occupied >= room.capacity ? '#dc2626' : '#059669' }}>
                    {occupied}/{room.capacity} filled
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[11px]">
        {(Object.keys(STATUS_COLOR) as HostelRoomStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />
            <span className="text-slate-600 font-semibold">{STATUS_LABEL[s]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: BED_COLOR_OCCUPIED }} />
          <span className="text-slate-600 font-semibold">Occupied Bed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: BED_COLOR_AVAILABLE }} />
          <span className="text-slate-600 font-semibold">Available Bed</span>
        </div>
        <span className="text-slate-400 ml-auto">Click a room to allocate a student into it.</span>
      </div>
    </div>
  );
};
