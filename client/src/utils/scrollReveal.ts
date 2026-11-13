// Boxes that start below the visible area fade and rise into place when they are scrolled to.
// Everything already on screen shows at once, so nothing is held back on first paint.
const SEL = 'main .grid > *, main [class*="rounded-2xl"][class*="bg-white"], main [class*="rounded-3xl"][class*="bg-white"], main .mt-tile-card';
const seen = new WeakSet<Element>();

export const initScrollReveal = () => {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('mt-sr-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });

  const scan = () => {
    document.querySelectorAll(SEL).forEach((el) => {
      if (seen.has(el)) return; seen.add(el);
      const h = el as HTMLElement;
      if (h.closest('.mt-sr') || h.querySelector('canvas') || h.closest('[style*="preserve-3d"]')) return;   // keep 3D scenes and nested boxes still
      if (h.getBoundingClientRect().top < window.innerHeight * 0.98) return;                                       // already on screen: no animation
      h.classList.add('mt-sr'); io.observe(h);
    });
  };
  let t = 0; const queue = () => { window.clearTimeout(t); t = window.setTimeout(scan, 60); };
  new MutationObserver(queue).observe(document.body, { childList: true, subtree: true });
  scan();
  // safety: never leave a box hidden if the observer does not fire
  window.setInterval(() => document.querySelectorAll('.mt-sr:not(.mt-sr-in)').forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('mt-sr-in'); }), 1500);
};
