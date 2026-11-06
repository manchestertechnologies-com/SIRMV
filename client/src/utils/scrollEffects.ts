// Engagement effects that run once for the whole app (see main.tsx):
//   - scroll-reveal: cards / tiles fade + rise into view as they enter the
//     viewport, staggered when several appear together
//   - thin scroll-progress bar at the top and a back-to-top button
// Everything is skipped when the user prefers reduced motion.

const REVEAL_SELECTOR =
  'main [class*="rounded-2xl"][class*="border"], main button[class*="rounded-2xl"], main [class*="rounded-3xl"][class*="border"], main [class*="rounded-xl"][class*="border"][class*="bg-white"], main h2, main h3';
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
            el.style.setProperty('--d', `${Math.min(batch, 6) * 90}ms`);
            batch += 1;
            el.classList.add('mt-in');
            io.unobserve(el);
            // drop the hidden-state class once the transition has finished
            window.setTimeout(() => {
              el.classList.remove('mt-pre', 'mt-in');
              el.style.removeProperty('--d');
            }, 1700);
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
      const isHeading = /^H[23]$/.test(el.tagName);
      if (!isHeading && el.offsetHeight < 56) return;
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

  // ---------------- count-up numbers + growing bars ----------------
  initLiveData(reduce);

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


// ---------------------------------------------------------------------------
// Live data: statistics count up from zero to their real value when they scroll
// into view (and again, from the old value, whenever the data changes), and
// progress / percentage bars grow from empty to their width.
// The numbers are changed in place on the existing text node, so React keeps
// working normally.
// ---------------------------------------------------------------------------
const NUM_RE = /^(\s*)([₹$€+-]?)(\d{1,3}(?:,\d{2,3})*|\d+)(\.\d+)?(\s?(?:%|\+|k|K|L|Cr)?)(\s*)$/;
const NUM_SKIP = 'table, input, select, textarea, option, time, [data-no-count], .font-mono';
const BAR_SELECTOR =
  'main [style*="width"][class*="rounded"], main [style*="width"][class*="h-1"], main [style*="width"][class*="h-2"], main [style*="width"][class*="h-3"]';

interface CountState { target: number; shown: number; text: string; raf: number; fmt: (n: number) => string }
const counts = new WeakMap<Text, CountState>();

function parseNumber(text: string) {
  const m = NUM_RE.exec(text);
  if (!m) return null;
  const [, lead, sym, int, dec, suffix, trail] = m;
  const plain = int.replace(/,/g, '');
  if (plain.length > 8) return null; // phone numbers, ids
  if (!dec && !suffix.trim() && !sym && /^(19|20|21)\d\d$/.test(plain)) return null; // years
  const decimals = dec ? dec.length - 1 : 0;
  const value = parseFloat(plain + (dec || ''));
  const grouped = int.includes(',');
  const fmt = (n: number) => {
    const body = grouped
      ? n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : n.toFixed(decimals);
    return `${lead}${sym}${body}${suffix}${trail}`;
  };
  return { value, fmt };
}

function initLiveData(reduce: boolean) {
  if (reduce) return;

  const animate = (node: Text, st: CountState, from: number) => {
    cancelAnimationFrame(st.raf);
    const dur = 900;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      st.shown = from + (st.target - from) * eased;
      st.text = k >= 1 ? st.fmt(st.target) : st.fmt(st.shown);
      node.nodeValue = st.text;
      if (k < 1) st.raf = requestAnimationFrame(step);
    };
    st.raf = requestAnimationFrame(step);
  };

  const countIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        countIO.unobserve(el);
        const node = el.firstChild as Text | null;
        const st = node && counts.get(node);
        if (node && st) animate(node, st, 0);
      });
    },
    { threshold: 0.2 }
  );

  const tagCount = (el: HTMLElement) => {
    if (el.dataset.mtCount) return;
    if (el.childNodes.length !== 1 || el.firstChild!.nodeType !== 3) return;
    if (el.closest(NUM_SKIP)) return;
    const cls = el.className && typeof el.className === 'string' ? el.className : '';
    if (!/font-(semibold|bold|extrabold|black)/.test(cls)) return;
    const node = el.firstChild as Text;
    const parsed = parseNumber(node.nodeValue || '');
    if (!parsed) return;
    el.dataset.mtCount = '1';
    const st: CountState = { target: parsed.value, shown: 0, text: '', raf: 0, fmt: parsed.fmt };
    counts.set(node, st);
    node.nodeValue = st.fmt(0); // start at zero before the first paint
    st.text = node.nodeValue;
    countIO.observe(el);
  };

  // bars grow from empty (scaleX keeps React's inline width untouched)
  const barIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        barIO.unobserve(el);
        const delay = Number(el.dataset.mtBarDelay || 0);
        el.style.setProperty('--bd', `${delay}ms`);
        el.classList.remove('mt-bar-pre');
        el.classList.add('mt-bar-grow');
        window.setTimeout(() => el.classList.remove('mt-bar-grow'), 1800 + delay);
      });
    },
    { threshold: 0.1 }
  );
  let barSeq = 0;
  const tagBar = (el: HTMLElement) => {
    if (el.dataset.mtBar) return;
    const w = el.style.width;
    if (!/%$/.test(w) || w === '100%') return;
    const parent = el.parentElement;
    if (!parent || el.offsetHeight > 20 || parent.offsetHeight > 24 || el.closest(NUM_SKIP)) return;
    el.dataset.mtBar = '1';
    el.dataset.mtBarDelay = String(Math.min(barSeq++, 8) * 50);
    el.classList.add('mt-bar-pre');
    barIO.observe(el);
    window.setTimeout(() => { barSeq = 0; }, 200);
  };

  const scanAll = (root: ParentNode) => {
    root.querySelectorAll?.('main *').forEach((n) => {
      const el = n as HTMLElement;
      if (el.children.length === 0) tagCount(el);
    });
    if (root instanceof HTMLElement && root.matches('main *')) {
      if (root.children.length === 0) tagCount(root);
    }
    if (root instanceof HTMLElement && root.matches(BAR_SELECTOR)) tagBar(root);
    root.querySelectorAll?.(BAR_SELECTOR).forEach((n) => tagBar(n as HTMLElement));
  };

  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'childList') {
        m.addedNodes.forEach((n) => { if (n.nodeType === 1) scanAll(n as HTMLElement); });
      } else if (m.type === 'characterData') {
        // data changed (e.g. API response replaced the placeholder) -> count to the new value
        const node = m.target as Text;
        const st = counts.get(node);
        if (!st || node.nodeValue === st.text) continue; // our own write
        const parsed = parseNumber(node.nodeValue || '');
        if (!parsed) { counts.delete(node); continue; }
        const from = st.shown;
        st.target = parsed.value;
        st.fmt = parsed.fmt;
        node.nodeValue = parsed.fmt(from);
        st.text = node.nodeValue;
        animate(node, st, from);
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  scanAll(document.body);
}
