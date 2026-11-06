// Small interaction details used by modern product sites. Started once from
// main.tsx. All of it is skipped for users who prefer reduced motion.

export function initUiEffects() {
  if (typeof window === 'undefined') return;

  // ---- light haptic tick on touch devices ----
  document.addEventListener(
    'pointerdown',
    (e) => {
      const btn = (e.target as HTMLElement).closest?.('button') as HTMLButtonElement | null;
      if (!btn || btn.disabled) return;
      if (e.pointerType === 'touch' && 'vibrate' in navigator) {
        try { navigator.vibrate(6); } catch { /* not supported */ }
      }
    },
    { passive: true }
  );

  // ---- header gains depth once the page content has scrolled ----
  document.addEventListener(
    'scroll',
    (e) => {
      const t = e.target as HTMLElement | Document;
      const el = (t instanceof Document ? document.scrollingElement : t) as HTMLElement | null;
      if (!el || (el !== document.scrollingElement && el.tagName !== 'MAIN')) return;
      document.body.classList.toggle('mt-scrolled', el.scrollTop > 6);
    },
    { capture: true, passive: true }
  );
}
