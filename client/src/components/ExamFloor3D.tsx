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
import { Building2, Grid3x3, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';

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
// The stairs/toilet wings bookending each row, and the gap that separates
// them from the nearest classroom — sized narrower than a classroom so they
// read as end-of-corridor fixtures, not another room.
const WING_WIDTH = CUBE_SIZE * 0.62;
const WING_GAP = 0.3;

// A row holds at most this many rooms before a new row starts, leaving a
// corridor gap behind it — matches a real floor plan, where a corridor run
// only stays legible up to so many doors before it needs a cross-aisle.
const ROOMS_PER_ROW = 6;

interface RoomLayout { room: FloorRoom; x: number; z: number; rowIndex: number; }
interface SceneLayout {
  rooms: RoomLayout[];
  rows: number;
  totalWidth: number;
  plazaDepth: number;
  hasCorridor: boolean;
  rowZs: number[];
}

// Shared by BuildingScene (to place the actual meshes) and by the label
// overlay (to know where to project the "TOILET"/"COLLEGE BUILDING" tags) —
// kept in one place so the two never drift apart.
function computeWings(layout: SceneLayout) {
  const minZ = layout.rowZs[0];
  const maxZ = layout.rowZs[layout.rowZs.length - 1];
  const wingCenterZ = (minZ + maxZ) / 2;
  const wingDepth = (maxZ - minZ) + CUBE_SIZE;
  const leftX = -(layout.totalWidth / 2) - WING_GAP - WING_WIDTH / 2;
  const rightX = layout.totalWidth / 2 + WING_GAP + WING_WIDTH / 2;
  const extendedWidth = layout.totalWidth + (WING_WIDTH + WING_GAP) * 2;
  const facadeZ = maxZ + CUBE_SIZE / 2 + 0.32;
  return { minZ, maxZ, wingCenterZ, wingDepth, leftX, rightX, extendedWidth, facadeZ };
}

// Chunks rooms into rows of up to ROOMS_PER_ROW, stacking additional rows
// further back (in +z) with a corridor gap between every adjacent pair —
// so a 7th, 13th, 19th... room starts a new row instead of just widening
// the existing one indefinitely.
function computeLayout(rooms: FloorRoom[]): SceneLayout {
  const rowCount = Math.max(1, Math.ceil(rooms.length / ROOMS_PER_ROW));
  const rowRooms: FloorRoom[][] = [];
  for (let i = 0; i < rowCount; i++) rowRooms.push(rooms.slice(i * ROOMS_PER_ROW, (i + 1) * ROOMS_PER_ROW));

  const cellW = CUBE_SIZE + CUBE_GAP;
  const totalWidth = Math.max(...rowRooms.map((r) => r.length * cellW - CUBE_GAP), CUBE_SIZE);

  const rowPitch = CUBE_SIZE + CORRIDOR_DEPTH;
  const startZ = rowCount === 1 ? 0 : -((rowCount - 1) * rowPitch) / 2;
  const rowZs = rowRooms.map((_, i) => (rowCount === 1 ? 0 : startZ + i * rowPitch));

  const placed: RoomLayout[] = [];
  rowRooms.forEach((rs, ri) => {
    const w = rs.length * cellW - CUBE_GAP;
    rs.forEach((r, i) => {
      placed.push({ room: r, x: -(w / 2) + cellW * i + CUBE_SIZE / 2, z: rowZs[ri], rowIndex: ri });
    });
  });

  const plazaDepth = rowCount * CUBE_SIZE + (rowCount - 1) * CORRIDOR_DEPTH + 2;

  return { rooms: placed, rows: rowCount, totalWidth, plazaDepth, hasCorridor: rowCount > 1, rowZs };
}

// ---------------------------------------------------------------------------
// A single classroom, modeled as an open-roof floor-plan block — floor,
// walls, a door standing ajar, a blackboard + teacher's table, and a grid
// of benches — rather than a single solid-color cube. The status color
// still reads at a glance as the floor tint, so the allocation-status
// legend below the scene stays meaningful. The room number / bench-count
// label lives outside the canvas (see LabelOverlay) — keeping it there
// avoids drei's <Html>, which is unreliable when several instances mount in
// the same tick (see the import comment above). Full detail (benches,
// seats/bench, occupancy, room ID) is shown in the detail panel on click
// rather than crammed into the 3D scene.
// ---------------------------------------------------------------------------
function ClassroomBlock({
  room, x, z, facing, onClick
}: {
  room: FloorRoom; x: number; z: number; facing: 1 | -1;
  onClick: () => void;
}) {
  const color = STATUS_COLOR[room.status];
  const half = CUBE_SIZE / 2;
  const wallColor = '#f8fafc';
  const doorGap = CUBE_SIZE * 0.34;
  const segWidth = (CUBE_SIZE - doorGap) / 2;

  const rows = Math.min(3, Math.max(1, Math.ceil(Math.min(room.benches, 9) / 3)));
  const rowOffsets = [0.4, 0.75, 1.1].slice(0, rows);
  const colXs = [-0.42, 0, 0.42];

  return (
    <group position={[x, 0, z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Floor — the at-a-glance status color */}
      <mesh position={[0, 0.012, 0]} receiveShadow>
        <boxGeometry args={[CUBE_SIZE - 0.02, 0.024, CUBE_SIZE - 0.02]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Back wall, opposite the doorway, carries the blackboard */}
      <mesh position={[0, CUBE_HEIGHT / 2, -facing * (half - 0.025)]} castShadow>
        <boxGeometry args={[CUBE_SIZE, CUBE_HEIGHT, 0.05]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      {/* Side walls */}
      <mesh position={[-half + 0.025, CUBE_HEIGHT / 2, 0]} castShadow>
        <boxGeometry args={[0.05, CUBE_HEIGHT, CUBE_SIZE]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[half - 0.025, CUBE_HEIGHT / 2, 0]} castShadow>
        <boxGeometry args={[0.05, CUBE_HEIGHT, CUBE_SIZE]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      {/* Front wall, split either side of the doorway (facing the corridor) */}
      <mesh position={[-(doorGap / 2 + segWidth / 2), CUBE_HEIGHT / 2, facing * (half - 0.025)]} castShadow>
        <boxGeometry args={[segWidth, CUBE_HEIGHT, 0.05]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[doorGap / 2 + segWidth / 2, CUBE_HEIGHT / 2, facing * (half - 0.025)]} castShadow>
        <boxGeometry args={[segWidth, CUBE_HEIGHT, 0.05]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      {/* Door, standing ajar */}
      <mesh position={[doorGap / 2 + 0.03, CUBE_HEIGHT * 0.4, facing * (half - doorGap * 0.35)]} rotation={[0, facing * 0.9, 0]}>
        <boxGeometry args={[doorGap * 0.85, CUBE_HEIGHT * 0.78, 0.025]} />
        <meshStandardMaterial color="#92400e" />
      </mesh>

      {/* Blackboard */}
      <mesh position={[0, CUBE_HEIGHT * 0.58, -facing * (half - 0.06)]}>
        <boxGeometry args={[CUBE_SIZE * 0.5, 0.2, 0.02]} />
        <meshStandardMaterial color="#14532d" />
      </mesh>
      {/* Teacher's table, just in front of the board */}
      <mesh position={[0, 0.065, facing * (0.2 - half)]}>
        <boxGeometry args={[0.26, 0.09, 0.14]} />
        <meshStandardMaterial color="#a16207" />
      </mesh>

      {/* Student benches, a simple grid — reads clearly rather than trying
          to render the exact bench count. */}
      {rowOffsets.map((off, r) => (
        <React.Fragment key={r}>
          {colXs.map((cx, c) => (
            <mesh key={c} position={[cx, 0.05, facing * (off - half)]}>
              <boxGeometry args={[0.22, 0.1, 0.14]} />
              <meshStandardMaterial color="#c58f4a" />
            </mesh>
          ))}
        </React.Fragment>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// A simple stylised staircase filling the wing at one end of the corridor.
// ---------------------------------------------------------------------------
function StairsWing({ x, zCenter, depth }: { x: number; zCenter: number; depth: number }) {
  const steps = 5;
  const runDepth = depth * 0.72;
  return (
    <group position={[x, 0, zCenter]}>
      <mesh position={[0, 0.012, 0]} receiveShadow>
        <boxGeometry args={[WING_WIDTH, 0.024, depth]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      {Array.from({ length: steps }).map((_, i) => (
        <mesh key={i} position={[0, 0.03 + i * 0.05, -runDepth / 2 + (runDepth / steps) * (i + 0.5)]}>
          <boxGeometry args={[WING_WIDTH * 0.8, 0.06, runDepth / steps]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      ))}
      <mesh position={[-WING_WIDTH / 2 + 0.025, CUBE_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.05, CUBE_HEIGHT, depth]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// A washroom wing — a small walled block (no door drawn, matches the plan
// view in the reference image) tinted to distinguish boys/girls.
// ---------------------------------------------------------------------------
function ToiletWing({ x, z, depth, color }: { x: number; z: number; depth: number; color: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.012, 0]} receiveShadow>
        <boxGeometry args={[WING_WIDTH, 0.024, depth - 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, CUBE_HEIGHT / 2, -depth / 2 + 0.025]}>
        <boxGeometry args={[WING_WIDTH, CUBE_HEIGHT, 0.05]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[-WING_WIDTH / 2 + 0.025, CUBE_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.05, CUBE_HEIGHT, depth]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[WING_WIDTH / 2 - 0.025, CUBE_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.05, CUBE_HEIGHT, depth]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// The building's front elevation — a ground-floor podium with a blue
// fascia band, an entrance canopy and steps, and a line of trees either
// side — shown only on the lowest floor, matching a real building where
// only the ground floor meets the plaza.
// ---------------------------------------------------------------------------
function BuildingFacade({ width, z }: { width: number; z: number }) {
  const treeSpacing = 1.15;
  const count = Math.max(1, Math.floor(width / treeSpacing / 2) - 1);
  const treeXs: number[] = [];
  for (let i = 1; i <= count; i++) { treeXs.push(-i * treeSpacing, i * treeSpacing); }

  return (
    <group position={[0, 0, z]}>
      {/* Ground-floor podium */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.44, 0.5]} />
        <meshStandardMaterial color="#f1f5f9" />
      </mesh>
      {/* Blue fascia band along the top, and signage panel — this is where
          the "COLLEGE BUILDING" label is projected (see labelPoints). */}
      <mesh position={[0, 0.46, 0.24]}>
        <boxGeometry args={[width, 0.1, 0.04]} />
        <meshStandardMaterial color="#2563eb" />
      </mesh>
      <mesh position={[0, 0.34, 0.42]}>
        <boxGeometry args={[1.3, 0.22, 0.03]} />
        <meshStandardMaterial color="#2563eb" />
      </mesh>
      {/* Entrance canopy */}
      <mesh position={[0, 0.5, 0.45]}>
        <boxGeometry args={[1.4, 0.06, 0.5]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Steps down to the plaza */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.06 - i * 0.05, 0.5 + i * 0.16]}>
          <boxGeometry args={[1.0 - i * 0.08, 0.05, 0.16]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
      ))}
      {/* Trees along the front */}
      {treeXs.map((tx, i) => (
        <group key={i} position={[tx, 0, 0.6]}>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.16, 6]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.11, 8, 8]} />
            <meshStandardMaterial color="#16a34a" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Full building scene: two rows of open-roof classrooms flanking a labeled
// corridor, a staircase wing at one end, washrooms at the other, and (on
// the ground floor) the building's front elevation — matching the
// reference floor-plan render rather than a row of plain colored blocks.
// ---------------------------------------------------------------------------
function BuildingScene({ layout, onSelectRoom, isGroundFloor }: { layout: SceneLayout; onSelectRoom: (id: string) => void; isGroundFloor: boolean }) {
  const wings = computeWings(layout);

  return (
    <group>
      {/* Ground plaza — deliberately excluded from the camera auto-fit
          (userData.excludeFromFit) so the frame hugs the building instead
          of stretching out to include the whole floor plate. */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow userData={{ excludeFromFit: true }}>
        <planeGeometry args={[wings.extendedWidth + 2.5, layout.plazaDepth + (isGroundFloor ? 1.6 : 0)]} />
        <meshStandardMaterial color="#e7e9ee" />
      </mesh>

      {/* One corridor strip between every adjacent pair of rows — runs the
          full width, connecting the stairs to the washrooms */}
      {layout.rowZs.slice(0, -1).map((z, i) => (
        <mesh key={i} position={[0, 0.005, (z + layout.rowZs[i + 1]) / 2]} receiveShadow>
          <boxGeometry args={[wings.extendedWidth, 0.01, CORRIDOR_DEPTH]} />
          <meshStandardMaterial color="#f1f5f9" />
        </mesh>
      ))}

      {layout.rooms.map(({ room, x, z, rowIndex }) => (
        <ClassroomBlock
          key={room.roomId}
          room={room}
          x={x}
          z={z}
          facing={rowIndex === layout.rows - 1 && layout.rows > 1 ? -1 : 1}
          onClick={() => onSelectRoom(room.roomId)}
        />
      ))}

      <StairsWing x={wings.leftX} zCenter={wings.wingCenterZ} depth={wings.wingDepth} />
      {layout.hasCorridor ? (
        <>
          <ToiletWing x={wings.rightX} z={wings.minZ} depth={CUBE_SIZE} color="#bae6fd" />
          <ToiletWing x={wings.rightX} z={wings.maxZ} depth={CUBE_SIZE} color="#fbcfe8" />
        </>
      ) : (
        <ToiletWing x={wings.rightX} z={wings.wingCenterZ} depth={CUBE_SIZE} color="#bae6fd" />
      )}

      {isGroundFloor && <BuildingFacade width={wings.extendedWidth} z={wings.facadeZ} />}
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

// OrbitControls sets the canvas's CSS touch-action to 'none' the moment it
// connects (three.js does this itself, to guarantee it gets every touch
// event uncontested) — which as a side effect stops a one-finger swipe over
// the model from ever reaching the page as a scroll. Since the touches prop
// above already makes a one-finger touch a no-op for the controls, there's
// nothing left that needs 'none' here; re-assert 'pan-y' every frame so a
// single finger scrolls the page while two fingers still reach the canvas
// for pinch-to-zoom.
function TouchActionFix() {
  const { gl } = useThree();
  useFrame(() => {
    if (gl.domElement.style.touchAction !== 'pan-y') {
      gl.domElement.style.touchAction = 'pan-y';
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
  // The building's front elevation (steps, canopy, trees) only makes sense
  // on the lowest floor — an upper floor has no ground-level entrance.
  const isGroundFloor = floors.length > 0 && activeFloor === floors[0];
  const labelPoints = useMemo<LabelPoint[]>(() => {
    const points: LabelPoint[] = layout.rooms.map(({ room, x, z }) => ({
      id: room.roomId, position: [x, CUBE_HEIGHT + 0.32, z]
    }));
    // One "CORRIDOR" label per corridor gap — there's one whenever there's
    // more than one row, and more than one gap once there are 3+ rows.
    layout.rowZs.slice(0, -1).forEach((z, i) => {
      points.push({ id: `__corridor_${i}`, position: [0, 0.02, (z + layout.rowZs[i + 1]) / 2] });
    });
    if (activeRooms.length > 0) {
      const wings = computeWings(layout);
      if (layout.hasCorridor) {
        points.push({ id: '__toilet_boys', position: [wings.rightX, 0.3, wings.minZ] });
        points.push({ id: '__toilet_girls', position: [wings.rightX, 0.3, wings.maxZ] });
      } else {
        points.push({ id: '__toilet', position: [wings.rightX, 0.3, wings.wingCenterZ] });
      }
      if (isGroundFloor) {
        points.push({ id: '__facade', position: [0, 0.5, wings.facadeZ] });
      }
    }
    return points;
  }, [layout, isGroundFloor, activeRooms.length]);
  const [screenPositions, setScreenPositions] = useState<Record<string, ScreenPos>>({});

  // Manual zoom via the magnifier buttons — mouse-wheel scroll is blocked
  // separately (onWheelCapture below) so it never zooms the model; touch
  // pinch is handled by OrbitControls itself (see the touches prop).
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
          {mode === '3D' && (
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => zoomBy(0.8)} title="Zoom in" className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => zoomBy(1.25)} title="Zoom out" className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2 text-xs">
        <span className="text-slate-500">Benches open on this floor:</span>
        <span className={`font-bold ${totalAvailableBenches > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{totalAvailableBenches} / {totalBenches}</span>
      </div>

      {mode === '3D' ? (
        <div
          style={{ height: 380, touchAction: 'pan-y' }}
          className="bg-gradient-to-b from-slate-100 to-slate-200 relative"
          // Mouse-wheel / trackpad scroll over the model must not zoom or
          // pan it — it should just keep scrolling the page underneath,
          // same as anywhere else. Only stopping propagation (never
          // preventDefault) means the browser's native scroll still
          // happens; only OrbitControls' own wheel-zoom handler is skipped.
          onWheelCapture={(e) => e.stopPropagation()}
        >
          {activeRooms.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">No rooms on this floor yet.</div>
          ) : (
            <Canvas shadows camera={{ position: [0, 8, 8.5], fov: 42 }}>
              <ambientLight intensity={0.8} />
              <directionalLight position={[6, 10, 4]} intensity={0.85} castShadow shadow-mapSize={[1024, 1024]} />
              <directionalLight position={[-6, 6, -4]} intensity={0.3} />
              <Suspense fallback={null}>
                <group ref={groupRef}>
                  <BuildingScene layout={layout} onSelectRoom={onSelectRoom} isGroundFloor={isGroundFloor} />
                </group>
              </Suspense>
              <FitCameraToScene groupRef={groupRef} controlsRef={controlsRef} signature={sceneSignature} />
              <LabelProjector points={labelPoints} onUpdate={setScreenPositions} />
              <TouchActionFix />
              <OrbitControls
                ref={controlsRef}
                enablePan enableRotate makeDefault
                enableZoom
                // A one-finger touch does nothing at all (no ROTATE/PAN
                // mapping), so a swipe over the model just scrolls the
                // page like normal. Two fingers still pinch to zoom
                // (DOLLY) or drag to pan — that's the only touch gesture
                // that moves the model.
                touches={{ ONE: undefined as any, TWO: THREE.TOUCH.DOLLY_PAN }}
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
              {layout.rowZs.slice(0, -1).map((_, i) => {
                const pos = screenPositions[`__corridor_${i}`];
                if (!pos || pos.behind) return null;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute', left: 0, top: 0,
                      transform: `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`,
                      fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 2, whiteSpace: 'nowrap'
                    }}
                  >
                    CORRIDOR
                  </div>
                );
              })}
              {(['__toilet_boys', '__toilet_girls', '__toilet'] as const).map((id) => {
                const pos = screenPositions[id];
                if (!pos || pos.behind) return null;
                const text = id === '__toilet_boys' ? 'TOILET (BOYS)' : id === '__toilet_girls' ? 'TOILET (GIRLS)' : 'TOILET';
                return (
                  <div
                    key={id}
                    style={{
                      position: 'absolute', left: 0, top: 0,
                      transform: `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`,
                      fontSize: 9, fontWeight: 800, color: '#0f172a', background: 'rgba(255,255,255,0.9)',
                      padding: '2px 6px', borderRadius: 5, whiteSpace: 'nowrap', textAlign: 'center', lineHeight: 1.2
                    }}
                  >
                    {text}
                  </div>
                );
              })}
              {screenPositions.__facade && !screenPositions.__facade.behind && (
                <div
                  style={{
                    position: 'absolute', left: 0, top: 0,
                    transform: `translate3d(${screenPositions.__facade.x}px, ${screenPositions.__facade.y}px, 0) translate(-50%, -50%)`,
                    fontSize: 11, fontWeight: 800, color: '#ffffff', background: '#2563eb',
                    padding: '3px 10px', borderRadius: 5, whiteSpace: 'nowrap', letterSpacing: 0.5,
                    boxShadow: '0 2px 6px rgba(15,23,42,0.25)'
                  }}
                >
                  COLLEGE BUILDING
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
