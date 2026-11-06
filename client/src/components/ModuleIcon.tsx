import React, { useEffect, useState } from 'react';
import { IconNotifications } from './ModuleIcons';

// Optional drop-in artwork: put image files in client/public/icons/tiles/ and list
// them in manifest.json ({ "students": "students.png", ... }). Any tile without a
// file keeps its built-in icon, so this is safe to leave empty.
let manifestPromise: Promise<Record<string, string>> | null = null;
const loadManifest = () => {
  if (!manifestPromise) {
    manifestPromise = fetch('/icons/tiles/manifest.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((j) => (j && typeof j === 'object' ? (j as Record<string, string>) : {}))
      .catch(() => ({}));
  }
  return manifestPromise;
};

interface NavLike { id: string; icon: any }

export const ModuleIcon: React.FC<{ item: NavLike; className?: string }> = ({ item, className = 'w-10 h-10' }) => {
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => { let on = true; loadManifest().then((m) => on && setMap(m)); return () => { on = false; }; }, []);
  const key = item.icon === IconNotifications ? 'notifications' : item.id;
  const file = map[key];
  const Fallback = item.icon;
  if (file) return <img src={`/icons/tiles/${file}`} alt="" className={`${className} object-contain`} draggable={false} />;
  return <Fallback className={className} />;
};

export default ModuleIcon;
