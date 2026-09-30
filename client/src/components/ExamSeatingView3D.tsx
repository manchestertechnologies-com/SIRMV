import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { getBatchColor, batchKey } from '../utils/batchColor';
import { TouchActionFix } from './three/TouchActionFix';
import {
  Bench, SeatInfo, EMPTY_SEAT_COLOR, ABSENT_SEAT_COLOR,
  computeRoomFootprint, RoomFootprint, SEAT_SIZE, BENCH_SUBROW_GAP
} from './three/Bench';
import { RoomShell } from './three/RoomShell';

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

function Room({
  benches, seatsPerBench, seatsByBench, footprint, showAttendance, onSeatClick
}: {
  benches: number; seatsPerBench: number; seatsByBench: Map<number, Map<number, SeatInfo>>;
  footprint: RoomFootprint; showAttendance: boolean; onSeatClick?: (seat: SeatInfo) => void;
}) {
  const { roomWidth, roomDepth, benchPositions } = footprint;

  return (
    <group>
      <RoomShell roomWidth={roomWidth} roomDepth={roomDepth} />

      {/* Benches */}
      {Array.from({ length: benches }).map((_, idx) => {
        const benchNumber = idx + 1;
        const pos = benchPositions[idx];
        return (
          <Bench
            key={benchNumber}
            seatsPerBench={seatsPerBench}
            seatsByNumber={seatsByBench.get(benchNumber) || new Map()}
            x={pos.x}
            z={pos.z}
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

  // A real classroom is 3 columns of benches wide (a center aisle and two
  // side aisles) — rows scale with however many benches the room actually
  // has, matching the building-overview scene's grid instead of a
  // count-derived guess. Same footprint math used by every 3D scene in the
  // app (see computeRoomFootprint), so this view and the building overview
  // never size a room differently.
  const footprint = useMemo(() => computeRoomFootprint(benchCount, seatsPerBenchN), [benchCount, seatsPerBenchN]);
  const { roomWidth, roomDepth } = footprint;

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
              footprint={footprint}
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
