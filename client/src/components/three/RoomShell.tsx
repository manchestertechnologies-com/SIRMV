import React from 'react';

// ---------------------------------------------------------------------------
// The one shared "room box" — floor, back wall, two side walls (open on the
// near/front side, no door), plus a blackboard and teacher's table — used by
// every 3D scene that draws an actual classroom: the dedicated per-room
// seating/attendance view (ExamSeatingView3D) and each room "block" in the
// whole-building overview (ExamFloor3D). Both pass in the same
// roomWidth/roomDepth, computed the same way (see computeRoomFootprint in
// ./Bench), so a room is always exactly the same shape, colors and
// proportions wherever it's drawn — they can never drift apart.
//
// Positioned in local room space: x=0 is the room's horizontal center,
// z=0..roomDepth is the bench area (the blackboard/teacher's table sit just
// in front of z=0, at small negative z), matching how ExamSeatingView3D's
// benches are placed. A caller that needs this centered on its own local
// origin (e.g. ExamFloor3D, laying rooms out in a grid) wraps it in a group
// offset by -(roomDepth / 2 - 0.4).
// ---------------------------------------------------------------------------
export const ROOM_FLOOR_COLOR = '#f8fafc';
export const ROOM_WALL_COLOR = '#e2e8f0';
export const ROOM_BLACKBOARD_COLOR = '#14532d';
export const ROOM_TABLE_COLOR = '#a16207';

export function RoomShell({ roomWidth, roomDepth }: { roomWidth: number; roomDepth: number }) {
  return (
    <group>
      {/* Floor */}
      <mesh position={[0, -0.01, roomDepth / 2 - 0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[roomWidth + 0.6, roomDepth + 0.8]} />
        <meshStandardMaterial color={ROOM_FLOOR_COLOR} />
      </mesh>

      {/* Back wall (behind the last row) */}
      <mesh position={[0, 1.1, roomDepth - 0.2]} castShadow>
        <boxGeometry args={[roomWidth + 0.6, 2.2, 0.06]} />
        <meshStandardMaterial color={ROOM_WALL_COLOR} />
      </mesh>
      {/* Side walls */}
      <mesh position={[-roomWidth / 2 - 0.3, 1.1, roomDepth / 2 - 0.4]} castShadow>
        <boxGeometry args={[0.06, 2.2, roomDepth + 0.8]} />
        <meshStandardMaterial color={ROOM_WALL_COLOR} />
      </mesh>
      <mesh position={[roomWidth / 2 + 0.3, 1.1, roomDepth / 2 - 0.4]} castShadow>
        <boxGeometry args={[0.06, 2.2, roomDepth + 0.8]} />
        <meshStandardMaterial color={ROOM_WALL_COLOR} />
      </mesh>

      {/* Blackboard + teacher's table at the front */}
      <mesh position={[0, 1.0, -0.75]}>
        <boxGeometry args={[Math.min(2.4, roomWidth * 0.6), 0.9, 0.04]} />
        <meshStandardMaterial color={ROOM_BLACKBOARD_COLOR} />
      </mesh>
      <mesh position={[0, 0.28, -0.35]}>
        <boxGeometry args={[0.9, 0.35, 0.45]} />
        <meshStandardMaterial color={ROOM_TABLE_COLOR} />
      </mesh>
    </group>
  );
}
