// Engagement effects that run once for the whole app (see main.tsx):
//   - scroll-reveal: cards / tiles fade + rise into view as they enter the
//     viewport, staggered when several appear together
//   - cursor spotlight on cards (sets --cx/--cy for the CSS glow)
//   - thin scroll-progress bar at the top and a back-to-top button
// Everything is skipped when the user prefers reduced motion.

const REVEAL_SELECTOR =
  'main [class*="rounded-2xl"][class*="border"], main button[class*="rounded-2xl"], main [class*="rounded-3xl"][class*="border"]';
const SKIP_ANCESTOR = '[class*="fixed"], [class*="absolute"], [role="dialog"], table, [data-static], [data-no-reveal]';

export function initScrollEffects() {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------- scroll reveal ----------------
  if (!reduce) {
    let batch = 0;
    let batchTimer: number | null = null;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        visible
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
          .forEach((e) => {
            const el = e.target as HTMLElement;
            el.style.setProperty('--d', `${Math.min(batch, 10) * 70}ms`);
            batch += 1;
            el.classList.add('mt-in');
            io.unobserve(el);
            // drop the hidden-state class once the transition has finished
            window.setTimeout(() => {
              el.classList.remove('mt-pre', 'mt-in', 'mt-from-left', 'mt-from-right');
              el.style.removeProperty('--d');
            }, 1900);
          });
        if (batchTimer) window.clearTimeout(batchTimer);
        batchTimer = window.setTimeout(() => { batch = 0; }, 160);
      },
      { threshold: 0.04, rootMargin: '0px' }
    );

    const tag = (el: HTMLElement) => {
      if (el.dataset.mtSeen) return;
      el.dataset.mtSeen = '1';
      if (el.classList.contains('mt-pop') || el.classList.contains('mt-reveal')) return; // has its own entrance
      if (el.closest(SKIP_ANCESTOR) && !el.matches('main button')) return;
      if (el.parentElement?.closest('.mt-pre')) return; // nested inside a hidden card
      if (el.offsetHeight < 48) return;
      if (el.getBoundingClientRect().bottom < 0) return; // already scrolled past — don't hide it
      el.classList.add('mt-pre');
      io.observe(el);
    };

    const scan = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches(REVEAL_SELECTOR)) tag(root);
      root.querySelectorAll?.(REVEAL_SELECTOR).forEach((n) => tag(n as HTMLElement));
    };

    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1) scan(n as HTMLElement);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    scan(document.body);
  }

  // ---------------- cursor spotlight ----------------
  let raf = 0;
  document.addEventListener(
    'pointermove',
    (ev) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const card = (ev.target as HTMLElement | null)?.closest?.('main [class*="rounded-2xl"][class*="border"]') as HTMLElement | null;
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--cx', `${ev.clientX - r.left}px`);
        card.style.setProperty('--cy', `${ev.clientY - r.top}px`);
      });
    },
    { passive: true }
  );

  // ---------------- scroll progress + back to top ----------------
  const bar = document.createElement('div');
  bar.id = 'mt-progress';
  const top = document.createElement('button');
  top.id = 'mt-top';
  top.type = 'button';
  top.setAttribute('aria-label', 'Back to top');
  top.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.append(bar, top);

  let current: HTMLElement | null = null;
  const onScroll = (e: Event) => {
    const t = e.target as HTMLElement | Document;
    const el = (t instanceof Document ? document.scrollingElement : t) as HTMLElement | null;
    if (!el || (el !== document.scrollingElement && el.tagName !== 'MAIN')) return;
    current = el;
    const max = el.scrollHeight - el.clientHeight;
    const p = max > 0 ? el.scrollTop / max : 0;
    bar.style.transform = `scaleX(${p})`;
    top.classList.toggle('show', el.scrollTop > 420);
  };
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
  top.addEventListener('click', () => {
    (current || document.scrollingElement)?.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
