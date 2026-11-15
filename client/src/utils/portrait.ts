// Generated portraits: a small illustrated head-and-shoulders picture that fits a person's
// gender, role and age. Same inputs always give the same picture. A real uploaded photo
// always takes priority over this (see Avatar).
export type PortraitRole = 'student' | 'parent' | 'teacher' | 'hod' | 'staff' | 'admin';
export interface PortraitSpec { seed: string; gender: 'Male' | 'Female'; age: number; role: PortraitRole }

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const pick = <T,>(a: T[], h: number, shift = 0): T => a[((h >>> shift) & 0xffff) % a.length];

const SKIN = ['#e9c09b', '#dba983', '#c98f67', '#b97c53', '#a56a42', '#8f5a37'];
const BG = [['#fbeedd', '#f2d3b5'], ['#fde8e4', '#f3c4bd'], ['#eef2f7', '#cfd9e6'], ['#f6efdc', '#e6d3a2'], ['#efe7f3', '#d6c3e0']];
const HAIR_YOUNG = ['#1c1410', '#241a14', '#2d2018', '#3a2a1e'];

const cache = new Map<string, string>();

export function portraitSvg({ seed, gender, age, role }: PortraitSpec): string {
  const h = hash(`${seed}|${gender}|${role}`);
  const female = gender === 'Female';
  const skin = pick(SKIN, h);
  const [bg1, bg2] = pick(BG, h, 3);
  const grey = age >= 58 ? 1 : age >= 48 ? 0.55 : age >= 40 ? 0.2 : 0;
  const hairBase = pick(HAIR_YOUNG, h, 5);
  const hair = grey >= 1 ? '#d9d6d2' : grey >= 0.5 ? '#8d8984' : grey > 0 ? '#4b4038' : hairBase;
  const young = age < 22;
  const faceW = young ? 31 : 32 + Math.min(4, (age - 22) / 10);
  const faceH = young ? 38 : 39;
  const lines = age >= 40;
  const glasses = (h >> 9) % 100 < (age >= 40 ? 42 : 18);
  const mustache = !female && age >= 28 && (h >> 12) % 100 < 45;
  const beardStubble = !female && age >= 22 && !young && (h >> 15) % 100 < 20;
  const smile = 3 + ((h >> 7) % 3);
  const out: string[] = [];
  const push = (s: string) => out.push(s);

  push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient><clipPath id="c"><circle cx="64" cy="64" r="64"/></clipPath></defs><g clip-path="url(#c)"><rect width="128" height="128" fill="url(#g)"/>`);

  // back hair for long styles
  const longHair = female && (role !== 'staff' || age < 55) && (h >> 4) % 5 !== 0 && age < 50;
  const bun = female && !longHair;
  if (longHair) push(`<path d="M30 62 C26 28 50 14 64 14 C78 14 102 28 98 62 C100 86 94 104 90 112 L38 112 C34 104 28 86 30 62Z" fill="${hair}"/>`);
  if (bun) push(`<circle cx="64" cy="19" r="11" fill="${hair}"/>`);

  // shoulders / clothing
  const clothes = (() => {
    if (role === 'student') return female ? ['#a3161b', '#ffffff'] : ['#ffffff', '#a3161b'];
    if (role === 'admin') return female ? ['#4a1d3d', '#c28535'] : ['#1f2a44', '#ffffff'];
    if (role === 'hod' || role === 'teacher') return female ? [pick(['#7a2a4a', '#2c5f6e', '#8a5a1f', '#3d5a3a'], h, 2), '#e9c38b'] : [pick(['#e8eef6', '#dfe8dd', '#f2ece1'], h, 2), '#26324a'];
    if (role === 'parent') return female ? [pick(['#b4443a', '#6b3f8c', '#2f7a64', '#b9822b'], h, 2), '#e9c38b'] : [pick(['#d9e2ee', '#e7dfd0', '#cfd8cf'], h, 2), '#3a3f4b'];
    return female ? ['#2f6f73', '#e9c38b'] : ['#5e7ea1', '#f1f5f9'];
  })();
  push(`<path d="M8 128 C10 100 34 92 64 92 C94 92 118 100 120 128Z" fill="${clothes[0]}"/>`);
  if (female && role !== 'student') push(`<path d="M30 128 C38 104 56 96 64 96 C58 108 56 118 58 128Z" fill="${clothes[1]}" opacity=".85"/><path d="M64 96 C90 100 104 112 108 128 L90 128 C86 112 76 102 64 96Z" fill="${clothes[0]}" opacity=".7"/>`);
  else push(`<path d="M50 94 L64 112 L78 94 L72 92 L64 100 L56 92Z" fill="${clothes[1]}"/>`);
  if (!female && (role === 'student')) push(`<rect x="62" y="104" width="4" height="22" rx="1.5" fill="#a3161b"/>`);

  // neck + ears + face
  push(`<rect x="54" y="76" width="20" height="22" rx="8" fill="${skin}"/><path d="M54 90 C58 96 70 96 74 90 L74 94 C70 100 58 100 54 94Z" fill="#000" opacity=".08"/>`);
  push(`<ellipse cx="${64 - faceW + 1}" cy="58" rx="4.5" ry="7" fill="${skin}"/><ellipse cx="${64 + faceW - 1}" cy="58" rx="4.5" ry="7" fill="${skin}"/>`);
  push(`<ellipse cx="64" cy="56" rx="${faceW}" ry="${faceH}" fill="${skin}"/>`);

  // front hair
  if (female) {
    push(`<path d="M${64 - faceW - 2} 52 C${64 - faceW} 22 ${64 - 12} 17 64 17 C${64 + 12} 17 ${64 + faceW} 22 ${64 + faceW + 2} 52 C${64 + faceW - 4} 38 ${64 + 14} 31 64 31 C${64 - 14} 31 ${64 - faceW + 4} 38 ${64 - faceW - 2} 52Z" fill="${hair}"/>`);
  } else if (young || age < 40) {
    push(`<path d="M${64 - faceW - 1} 50 C${64 - faceW - 2} 22 ${64 - 14} 16 64 16 C${64 + 14} 16 ${64 + faceW + 2} 22 ${64 + faceW + 1} 50 C${64 + faceW - 3} 36 ${64 + 12} 31 ${64 + 2} 30 C${64 - 10} 30 ${64 - faceW + 4} 36 ${64 - faceW - 1} 50Z" fill="${hair}"/>`);
  } else {
    // receding with side hair for older men
    push(`<path d="M${64 - faceW - 1} 52 C${64 - faceW - 3} 30 ${64 - 16} 20 64 20 C${64 + 16} 20 ${64 + faceW + 3} 30 ${64 + faceW + 1} 52 C${64 + faceW - 2} 40 ${64 + 18} 34 ${64 + 4} 33 C${64 - 8} 32 ${64 - faceW + 3} 40 ${64 - faceW - 1} 52Z" fill="${hair}"/>`);
  }

  // brows, eyes, nose, mouth
  const brow = female ? 1.6 : 2.3;
  push(`<path d="M44 47 Q50 ${44} 57 47" stroke="${hair === '#d9d6d2' ? '#a8a39d' : hairBase}" stroke-width="${brow}" fill="none" stroke-linecap="round"/><path d="M71 47 Q78 44 84 47" stroke="${hair === '#d9d6d2' ? '#a8a39d' : hairBase}" stroke-width="${brow}" fill="none" stroke-linecap="round"/>`);
  push(`<ellipse cx="50.5" cy="54" rx="3.6" ry="${female ? 2.9 : 2.5}" fill="#fff"/><ellipse cx="77.5" cy="54" rx="3.6" ry="${female ? 2.9 : 2.5}" fill="#fff"/><circle cx="51" cy="54.2" r="2" fill="#2a1a12"/><circle cx="78" cy="54.2" r="2" fill="#2a1a12"/>`);
  if (female) push(`<path d="M46 52 Q50.5 49.5 55 52M73 52 Q77.5 49.5 82 52" stroke="#2a1a12" stroke-width="1.1" fill="none"/>`);
  push(`<path d="M64 56 C62 63 61 66 63.5 68 C65 69 67 69 68 67" stroke="#000" stroke-opacity=".22" stroke-width="1.6" fill="none" stroke-linecap="round"/>`);
  if (mustache) push(`<path d="M52 72 C58 67 70 67 76 72 C70 71 58 71 52 72Z" fill="${hair === '#d9d6d2' ? '#bdb8b2' : hairBase}"/>`);
  push(`<path d="M55 76 Q64 ${76 + smile} 73 76" stroke="${female ? '#b23a48' : '#8a3b32'}" stroke-width="${female ? 2.6 : 2.1}" fill="none" stroke-linecap="round"/>`);
  if (beardStubble) push(`<path d="M42 70 C46 90 82 90 86 70 C80 82 48 82 42 70Z" fill="${hairBase}" opacity=".22"/>`);
  if (female && role !== 'student' && age >= 24) push(`<circle cx="64" cy="40" r="1.7" fill="#b3141a"/>`);
  if (lines) push(`<path d="M44 64 Q47 66 50 64M78 64 Q81 66 84 64M52 38 Q64 35 76 38" stroke="#000" stroke-opacity=".12" stroke-width="1.1" fill="none"/>`);
  if (glasses) push(`<g fill="none" stroke="#3b3b44" stroke-width="1.7"><rect x="42" y="48" width="18" height="13" rx="5"/><rect x="68" y="48" width="18" height="13" rx="5"/><path d="M60 54 H68"/></g>`);
  push(`</g></svg>`);
  return out.join('');
}

export function portraitUrl(spec: PortraitSpec): string {
  const key = `${spec.seed}|${spec.gender}|${spec.age}|${spec.role}`;
  let url = cache.get(key);
  if (!url) { url = `data:image/svg+xml;utf8,${encodeURIComponent(portraitSvg(spec))}`; cache.set(key, url); }
  return url;
}
