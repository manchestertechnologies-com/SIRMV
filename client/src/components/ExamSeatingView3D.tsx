import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { getBatchColor, batchKey } from '../utils/batchColor';

// ---------------------------------------------------------------------------
// A per-seat, per-room 3D seating view — one classroom rendered large enough
// to click individual seats, color-coded by batch (class+section) and, when
// attendance has been taken, absentees in red. Deliberately a separate
// component from ExamFloor3D: that one draws a whole building of small
// room "blocks" for the room/allocation overview; this one draws a single
// room's exact bench/seat layout for the seating + attendance experience
// (during live allocation, at exam time for the invigilator, and
// persistently afterwards for Admin/Exam Dept review).
// ---------------------------------------------------------------------------

export interface SeatInfo {
  allocationId?: string;
  benchNumber: number;
  seatNumber: number;
  rowNumber?: number | null;
  studentId?: string | null;
  studentName?: string | null;
  registerNumber?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  className?: string | null;
  sectionName?: string | null;
  attendanceStatus?: 'PENDING' | 'PRESENT' | 'ABSENT' | null;
  markedByName?: string | null;
  markedAt?: string | null;
}

const EMPTY_SEAT_COLOR = '#cbd5e1';
const ABSENT_COLOR = '#dc2626';
const UNBATCHED_COLOR = '#7c3aed';

const SEAT_W = 0.44;
const SEAT_D = 0.42;
const BENCH_GAP_X = 0.22;
const ROW_GAP_Z = 0.55;
const SEAT_HEIGHT = 0.18;

export function seatFillColor(seat: SeatInfo | undefined, showAttendance: boolean): string {
  if (!seat || !seat.studentId) return EMPTY_SEAT_COLOR;
  if (showAttendance && seat.attendanceStatus === 'ABSENT') return ABSENT_COLOR;
  if (seat.classId || seat.sectionId) return getBatchColor(batchKey(seat.classId, seat.sectionId));
  return UNBATCHED_COLOR;
}

function Seat({
  seat, x, z, showAttendance, onClick
}: { seat: SeatInfo | undefined; x: number; z: number; showAttendance: boolean; onClick?: (seat: SeatInfo) => void }) {
  const color = seatFillColor(seat, showAttendance);
  const clickable = !!(seat && seat.studentId && onClick);
  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => { if (clickable) { e.stopPropagation(); onClick!(seat!); } }}
      onPointerOver={(e) => { if (clickable) { e.stopPropagation(); document.body.style.cursor = 'pointer'; } }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* seat pan */}
      <mesh position={[0, SEAT_HEIGHT / 2, 0]} castShadow>
        <boxGeometry args={[SEAT_W * 0.82, SEAT_HEIGHT, SEAT_D * 0.78]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* backrest */}
      <mesh position={[0, SEAT_HEIGHT * 1.55, -SEAT_D * 0.34]}>
        <boxGeometry args={[SEAT_W * 0.82, SEAT_HEIGHT * 1.5, 0.035]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* legs */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * SEAT_W * 0.34, SEAT_HEIGHT * 0.25, sz * SEAT_D * 0.3]}>
          <boxGeometry args={[0.03, SEAT_HEIGHT * 0.5, 0.03]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}
    </group>
  );
}

function Bench({
  seatsPerBench, seatsByNumber, x, z, showAttendance, onSeatClick
}: {
  seatsPerBench: number; seatsByNumber: Map<number, SeatInfo>; x: number; z: number;
  showAttendance: boolean; onSeatClick?: (seat: SeatInfo) => void;
}) {
  const width = seatsPerBench * SEAT_W;
  return (
    <group position={[x, 0, z]}>
      {/* desk top, spanning the whole bench */}
      <mesh position={[0, SEAT_HEIGHT * 1.75, SEAT_D * 0.26]} castShadow>
        <boxGeometry args={[width - 0.03, 0.035, SEAT_D * 0.5]} />
        <meshStandardMaterial color="#8a5a2b" />
      </mesh>
      {/* desk legs */}
      {[-1, 1].map((sx, i) => (
        <mesh key={i} position={[sx * (width / 2 - 0.04), SEAT_HEIGHT * 0.9, SEAT_D * 0.26]}>
          <boxGeometry args={[0.035, SEAT_HEIGHT * 1.7, 0.035]} />
          <meshStandardMaterial color="#4b3312" />
        </mesh>
      ))}
      {Array.from({ length: seatsPerBench }).map((_, i) => {
        const seatNo = i + 1;
        const seat = seatsByNumber.get(seatNo);
        const sx = -width / 2 + SEAT_W / 2 + i * SEAT_W;
        return <Seat key={seatNo} seat={seat} x={sx} z={0} showAttendance={showAttendance} onClick={onSeatClick} />;
      })}
    </group>
  );
}

function Room({
  benches, seatsPerBench, seatsByBench, cols, rows, roomWidth, roomDepth, showAttendance, onSeatClick
}: {
  benches: number; seatsPerBench: number; seatsByBench: Map<number, Map<number, SeatInfo>>;
  cols: number; rows: number; roomWidth: number; roomDepth: number;
  showAttendance: boolean; onSeatClick?: (seat: SeatInfo) => void;
}) {
  const benchWidth = seatsPerBench * SEAT_W;
  const cellWidth = benchWidth + BENCH_GAP_X;
  const rowWidth = cols * cellWidth - BENCH_GAP_X;
  const startX = -rowWidth / 2 + benchWidth / 2;
  const frontMargin = 1.0; // space for the blackboard + teacher's table

  return (
    <group>
      {/* Floor */}
      <mesh position={[0, -0.01, roomDepth / 2 - 0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[roomWidth + 0.6, roomDepth + 0.8]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* Back wall (behind the last row) */}
      <mesh position={[0, 1.1, roomDepth - 0.2]} castShadow>
        <boxGeometry args={[roomWidth + 0.6, 2.2, 0.06]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      {/* Side walls */}
      <mesh position={[-roomWidth / 2 - 0.3, 1.1, roomDepth / 2 - 0.4]} castShadow>
        <boxGeometry args={[0.06, 2.2, roomDepth + 0.8]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <mesh position={[roomWidth / 2 + 0.3, 1.1, roomDepth / 2 - 0.4]} castShadow>
        <boxGeometry args={[0.06, 2.2, roomDepth + 0.8]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>

      {/* Blackboard + teacher's table at the front */}
      <mesh position={[0, 1.0, -0.75]}>
        <boxGeometry args={[Math.min(2.4, roomWidth * 0.6), 0.9, 0.04]} />
        <meshStandardMaterial color="#14532d" />
      </mesh>
      <mesh position={[0, 0.28, -0.35]}>
        <boxGeometry args={[0.9, 0.35, 0.45]} />
        <meshStandardMaterial color="#a16207" />
      </mesh>

      {/* Benches */}
      {Array.from({ length: benches }).map((_, idx) => {
        const benchNumber = idx + 1;
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        const x = startX + c * cellWidth;
        const z = frontMargin + r * (SEAT_D + ROW_GAP_Z);
        return (
          <Bench
            key={benchNumber}
            seatsPerBench={seatsPerBench}
            seatsByNumber={seatsByBench.get(benchNumber) || new Map()}
            x={x}
            z={z}
            showAttendance={showAttendance}
            onSeatClick={onSeatClick}
          />
        );
      })}
    </group>
  );
}

// Positions the camera to frame the whole room once (and again whenever the
// room's dimensions change, e.g. switching to a room with a different bench
// count) rather than a single hand-tuned camera that only suits one size.
function FitCamera({ width, depth, controlsRef }: { width: number; depth: number; controlsRef: React.RefObject<any>; }) {
  const { camera } = useThree();
  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    const span = Math.max(width, depth, 2);
    const dist = span * 1.05 + 1.6;
    const center = new THREE.Vector3(0, 0, depth / 2);
    persp.position.set(center.x + 0.3, dist * 0.72, center.z + dist * 0.85);
    persp.near = Math.max(0.05, dist / 100);
    persp.far = dist * 10;
    persp.lookAt(center);
    persp.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, depth]);
  return null;
}

export const ExamSeatingView3D: React.FC<{
  benches: number;
  seatsPerBench: number;
  seats: SeatInfo[];
  showAttendance?: boolean;
  onSeatClick?: (seat: SeatInfo) => void;
  heightPx?: number;
}> = ({ benches, seatsPerBench, seats, showAttendance = true, onSeatClick, heightPx = 420 }) => {
  const benchCount = Math.max(1, Math.round(benches));
  const seatsPerBenchN = Math.max(1, Math.round(seatsPerBench));

  const seatsByBench = useMemo(() => {
    const map = new Map<number, Map<number, SeatInfo>>();
    for (const s of seats) {
      if (!map.has(s.benchNumber)) map.set(s.benchNumber, new Map());
      map.get(s.benchNumber)!.set(s.seatNumber, s);
    }
    return map;
  }, [seats]);

  const cols = Math.max(1, Math.round(Math.sqrt(benchCount * 1.6)));
  const rows = Math.ceil(benchCount / cols);
  const benchWidth = seatsPerBenchN * SEAT_W;
  const roomWidth = cols * (benchWidth + BENCH_GAP_X) - BENCH_GAP_X;
  const roomDepth = 1.0 + rows * (SEAT_D + ROW_GAP_Z);

  const controlsRef = useRef<any>(null);

  const legend = useMemo(() => {
    const seen = new Map<string, { label: string; color: string }>();
    for (const s of seats) {
      if (!s.studentId || (!s.classId && !s.sectionId)) continue;
      const key = batchKey(s.classId, s.sectionId);
      if (!seen.has(key)) {
        seen.set(key, { label: `${s.className || ''} ${s.sectionName || ''}`.trim() || key, color: getBatchColor(key) });
      }
    }
    return [...seen.values()];
  }, [seats]);

  const presentCount = seats.filter((s) => s.attendanceStatus === 'PRESENT').length;
  const absentCount = seats.filter((s) => s.attendanceStatus === 'ABSENT').length;
  const anyAttendanceTaken = presentCount + absentCount > 0;

  return (
    <div>
      <div
        style={{ height: heightPx, touchAction: 'pan-y' }}
        className="bg-gradient-to-b from-slate-100 to-slate-200 rounded-xl overflow-hidden relative"
        onWheelCapture={(e) => e.stopPropagation()}
      >
        <Canvas shadows camera={{ position: [0, 5, 6], fov: 45 }}>
          <ambientLight intensity={0.85} />
          <directionalLight position={[4, 8, 3]} intensity={0.85} castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-4, 5, -3]} intensity={0.3} />
          <Suspense fallback={null}>
            <Room
              benches={benchCount}
              seatsPerBench={seatsPerBenchN}
              seatsByBench={seatsByBench}
              cols={cols}
              rows={rows}
              roomWidth={roomWidth}
              roomDepth={roomDepth}
              showAttendance={showAttendance}
              onSeatClick={onSeatClick}
            />
          </Suspense>
          <FitCamera width={roomWidth} depth={roomDepth} controlsRef={controlsRef} />
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enablePan enableRotate enableZoom
            touches={{ ONE: undefined as any, TWO: THREE.TOUCH.DOLLY_PAN }}
            minPolarAngle={0.25}
            maxPolarAngle={Math.PI / 2.2}
          />
        </Canvas>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px]">
        {legend.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: EMPTY_SEAT_COLOR }} />
          Empty
        </div>
        {showAttendance && anyAttendanceTaken && (
          <div className="flex items-center gap-1.5 text-rose-600 font-semibold">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ABSENT_COLOR }} />
            Absent ({absentCount})
          </div>
        )}
      </div>
    </div>
  );
};
