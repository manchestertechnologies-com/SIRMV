// Deterministic color assignment for an exam "batch" (a class+section
// combination), used to color-code seats in the 3D seating visualization.
// No color is ever stored in the database — every caller (this server
// response, and the client's 3D component) derives the same color from the
// same key by running the identical hash + palette lookup below, so batches
// always render consistently without any schema for it.
//
// IMPORTANT: keep this file byte-for-byte in sync with
// client/src/utils/batchColor.ts — the hash and palette must match exactly,
// otherwise the server-reported `batch_color` and the client's own
// recomputed color for the same class/section would disagree.

const PALETTE = [
  '#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2',
  '#db2777', '#65a30d', '#ea580c', '#4f46e5', '#059669', '#c026d3',
  '#0d9488', '#b45309', '#4338ca', '#be123c', '#0369a1', '#15803d'
];

export function getBatchColor(key: string): string {
  if (!key) return '#64748b';
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

// Convenience for the common case of a class_id + section_id pair.
export function batchKey(classId: string | null | undefined, sectionId: string | null | undefined): string {
  return `${classId || ''}_${sectionId || ''}`;
}
