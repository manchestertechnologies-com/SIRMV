import React, { useMemo } from 'react';
import { SectionDef } from './sampleData';
import { Classroom, floorName, roomCapacity } from './classrooms';
import { Blueprint3D, Floor3D } from './Blueprint3D';
import { Card } from './ui';

// 3D model of the halls from the Blueprint; halls used by this exam are green
export const HallModel: React.FC<{ rooms: Classroom[]; sections: SectionDef[]; halls: Record<string, string>; title?: string }> = ({ rooms, sections, halls, title }) => {
  const floors: Floor3D[] = useMemo(() => {
    const n = Math.max(1, ...rooms.map((r) => r.floor + 1)); const use = new Map(Object.entries(halls).map(([sid, rid]) => [rid, sections.find((s) => s.id === sid)!]));
    return [...Array(n).keys()].map((f) => ({ name: floorName(f), boxes: rooms.filter((r) => r.floor === f).map((r) => { const s = use.get(r.id); return { id: r.id, label: r.name.replace(/^Room\s*/i, ''), sub: s ? s.code : `${roomCapacity(r)} seats`, color: s ? '#2e9e62' : '#b9ad98' }; }) }));
  }, [rooms, sections, halls]);
  return <Card title={title || "Halls in the building (green = used for this exam)"}><Blueprint3D floors={floors} height={380} /></Card>;
};

