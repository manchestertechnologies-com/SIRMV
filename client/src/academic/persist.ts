import { useCallback, useState } from 'react';

// Screen state kept in sessionStorage so a refresh, or coming back from another page, lands in the same place.
const P = 'mt-ps:';
const read = <T,>(k: string): T | undefined => { try { const v = sessionStorage.getItem(P + k); return v === null ? undefined : (JSON.parse(v) as T); } catch { return undefined; } };
const write = (k: string, v: unknown) => { try { sessionStorage.setItem(P + k, JSON.stringify(v)); } catch { /* ignore */ } };

export function usePS<T>(tab: string, name: string, init: T, force?: T): [T, (v: T | ((p: T) => T)) => void] {
  const key = `${tab}:${name}`;
  const [val, setVal] = useState<T>(() => { if (force !== undefined) { write(key, force); return force; } const s = read<T>(key); return s === undefined ? init : s; });
  const set = useCallback((v: T | ((p: T) => T)) => { setVal((prev) => { const n = typeof v === 'function' ? (v as (p: T) => T)(prev) : v; write(key, n); return n; }); }, [key]);
  return [val, set];
}
export const clearTabState = (tab: string) => { try { Object.keys(sessionStorage).filter((k) => k.startsWith(`${P}${tab}:`)).forEach((k) => sessionStorage.removeItem(k)); } catch { /* ignore */ } };
export const clearAllState = () => { try { Object.keys(sessionStorage).filter((k) => k.startsWith('mt-')).forEach((k) => sessionStorage.removeItem(k)); } catch { /* ignore */ } };

// Jumping to another screen's detail page (faculty or student) and coming back to exactly where you were.
export type DetailKind = 'staff' | 'student';
const OPEN: Record<DetailKind, string> = { staff: 'mt-open-staff', student: 'mt-open-student' };
const TAB: Record<DetailKind, string> = { staff: 'staffs', student: 'students' };
export const gotoDetail = (kind: DetailKind, id: string) => window.dispatchEvent(new CustomEvent('mt-goto', { detail: { tab: TAB[kind], key: OPEN[kind], id } }));
export const peekOpen = (kind: DetailKind): string | undefined => { try { return sessionStorage.getItem(OPEN[kind]) || undefined; } catch { return undefined; } };
export const doneOpen = (kind: DetailKind) => { try { sessionStorage.removeItem(OPEN[kind]); } catch { /* ignore */ } };
export const hasReturn = () => { try { return !!sessionStorage.getItem('mt-return'); } catch { return false; } };
export const returnBack = () => window.dispatchEvent(new CustomEvent('mt-return'));
