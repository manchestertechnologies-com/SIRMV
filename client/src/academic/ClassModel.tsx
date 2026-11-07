import React, { useMemo } from 'react';
import { Classroom, floorName, roomCapacity } from './classrooms';
import { Blueprint3D, Floor3D } from './Blueprint3D';
import { Card } from './ui';

// 3D model of the classrooms in the Blueprint. `used` marks rooms taken by the saved exam (roomId -> short note).
export const HallModel: React.FC<{ rooms: Classroom[]; used?: Record<string, string>; title?: string; onSelect?: (id: string) => void; selected?: string | null }> = ({ rooms, used = {}, title, onSelect, selected }) => {
  const floors: Floor3D[] = useMemo(() => {
    const n = Math.max(1, ...rooms.map((r) => r.floor + 1));
    return [...Array(n).keys()].map((f) => ({ name: floorName(f), boxes: rooms.filter((r) => r.floor === f).map((r) => ({ id: r.id, label: r.name.replace(/^Room\s*/i, ''), sub: used[r.id] || `${roomCapacity(r)} seats`, color: used[r.id] ? '#2e9e62' : '#b9ad98' })) }));
  }, [rooms, used]);
  return <Card title={title || 'Classrooms in the building (green = used for this exam)'}><Blueprint3D floors={floors} height={0} selected={selected} onSelect={onSelect} /></Card>;
};
