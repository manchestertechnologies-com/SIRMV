import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { getBatchColor, batchKey } from '../utils/batchColor';
import { TouchActionFix } from './three/TouchActionFix';
import {
  Bench, SeatInfo, EMPTY_SEAT_COLOR, ABSENT_SEAT_COLOR, MAX_SEATS_PER_BENCH_ROW
} from './three/Bench';

// ---------------------------------------------------------------------------
// A per-seat, per-room 3D seating view — one classroom rendered large enough
// to click individual seats, color-coded by batch (class+section) and, when
// attendance has been taken, absentees in red. Deliberately a separate
// component from ExamFloor3D: that one draws a whole building of small
// room "blocks" for the room/allocation overview; this one draws a single
// room's exact bench/seat layout for the seating + attendance experience
// (during live allocation, at exam time for the invigilator, and
// persistently afterwards for Admin/Exam Dept review). Both share the same
// desk/seat design and coloring logic from ./three/Bench, and the same
// touch/scroll behavior from ./three/TouchActionFix, so the two never
// visually drift apart.
// ---------------------------------------------------------------------------

export type { SeatInfo };

const SEAT_SIZE = 0.44;
const BENCH_GAP_X = 0.22;
const ROW_GAP_Z = 0.55;
// Gap between a bench's own sub-rows, when seatsPerBench exceeds the
// 3-per-row cap and wraps onto a second desk right behind the first.
const BENCH_SUBROW_GAP = 0.5;

function Room({
  benches, seatsPerBench, seatsByBench, cols, rows, roomWidth, roomDepth, showAttendance, onSeatClick
}: {
  benches: number; seatsPerBench: number; seatsByBench: Map<number, Map<number, SeatInfo>>;
  cols: number; rows: number; roomWidth: number; roomDepth: number;
  showAttendance: boolean; onSeatClick?: (seat: SeatInfo) => void;
}) {
  const benchRowCount = Math.ceil(Math.max(1, seatsPerBench) / MAX_SEATS_PER_BENCH_ROW);
  const benchWidth = Math.min(seatsPerBench, MAX_SEATS_PER_BENCH_ROW) * SEAT_SIZE;
  const cellWidth = benchWidth + BENCH_GAP_X;
  const rowWidth = cols * cellWidth - BENCH_GAP_X;
  const startX = -rowWidth / 2 + benchWidth / 2;
  const frontMargin = 1.0; // space for the blackboard + teacher's table
  // Each logical bench row now needs enough depth for its own sub-rows
  // (almost always just 1, since real configs use <= 3 seats/bench).
  const effectiveRowGap = ROW_GAP_Z + (benchRowCount - 1) * BENCH_SUBROW_GAP;

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
        const z = frontMargin + r * (effectiveRowGap + SEAT_SIZE * 0.7);
        return (
          <Bench
            key={benchNumber}
            seatsPerBench={seatsPerBench}
            seatsByNumber={seatsByBench.get(benchNumber) || new Map()}
            x={x}
            z={z}
            seatSize={SEAT_SIZE}
            rowGap={BENCH_SUBROW_GAP}
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
  const benchRowCount = Math.ceil(seatsPerBenchN / MAX_SEATS_PER_BENCH_ROW);
  const benchWidth = Math.min(seatsPerBenchN, MAX_SEATS_PER_BENCH_ROW) * SEAT_SIZE;
  const roomWidth = cols * (benchWidth + BENCH_GAP_X) - BENCH_GAP_X;
  const effectiveRowGap = ROW_GAP_Z + (benchRowCount - 1) * BENCH_SUBROW_GAP;
  const roomDepth = 1.0 + rows * (effectiveRowGap + SEAT_SIZE * 0.7);

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
          <TouchActionFix />
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
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ABSENT_SEAT_COLOR }} />
            Absent ({absentCount})
          </div>
        )}
      </div>
    </div>
  );
};
