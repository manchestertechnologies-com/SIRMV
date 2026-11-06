// Edits and photos are kept on this device until the database is connected.
const read = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };

export const getPhoto = (id?: string): string | undefined => (id ? read<string | undefined>('mt-photo:' + id, undefined) : undefined);
export const savePhoto = (id: string, dataUrl: string) => write('mt-photo:' + id, dataUrl);
export const getEdits = (id: string): Record<string, string> => read('mt-edit:' + id, {});
export const saveEdits = (id: string, edits: Record<string, string>) => write('mt-edit:' + id, edits);

// shrink a picked image to a small JPEG so it is cheap to store with the record
export const compressImage = (file: File, max = 360): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
    img.src = url;
  });
