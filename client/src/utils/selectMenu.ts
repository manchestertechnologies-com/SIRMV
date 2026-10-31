// Replaces the browser's plain <select> popup with a themed menu on devices that
// have a mouse. Touch devices keep the native picker (better on phones); their
// closed control is still themed through CSS. The <select> stays the source of
// truth: choosing an item sets its value and fires a normal "change" event, so
// React-controlled selects keep working.

const CHECK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

interface Entry { el: HTMLDivElement; opt: HTMLOptionElement }

let menu: HTMLDivElement | null = null;
let current: HTMLSelectElement | null = null;
let entries: Entry[] = [];
let hot = -1;
let typed = '';
let typedTimer = 0;

function close() {
  menu?.remove();
  menu = null;
  current = null;
  entries = [];
  hot = -1;
}

function choose(opt: HTMLOptionElement) {
  const sel = current;
  if (!sel || opt.disabled) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!;
  const changed = sel.value !== opt.value;
  setter.call(sel, opt.value);
  close();
  sel.focus();
  if (changed) {
    sel.dispatchEvent(new Event('input', { bubbles: true }));
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function setHot(i: number) {
  if (!entries.length) return;
  let n = i;
  // skip disabled
  for (let k = 0; k < entries.length && entries[n]?.opt.disabled; k++) n = (n + (i >= hot ? 1 : -1) + entries.length) % entries.length;
  entries.forEach((e, idx) => (e.el.dataset.hot = String(idx === n)));
  hot = n;
  entries[n]?.el.scrollIntoView({ block: 'nearest' });
}

function open(sel: HTMLSelectElement) {
  close();
  current = sel;
  const rect = sel.getBoundingClientRect();
  const m = document.createElement('div');
  m.className = 'mt-menu';
  m.setAttribute('role', 'listbox');

  const addOption = (opt: HTMLOptionElement) => {
    const row = document.createElement('div');
    row.className = 'mt-menu-item';
    row.setAttribute('role', 'option');
    row.dataset.selected = String(opt.selected);
    row.dataset.disabled = String(opt.disabled);
    const label = document.createElement('span');
    label.textContent = opt.textContent || '';
    row.appendChild(label);
    if (opt.selected) row.insertAdjacentHTML('beforeend', CHECK);
    row.addEventListener('mousedown', (e) => e.preventDefault());
    row.addEventListener('click', () => choose(opt));
    row.addEventListener('mousemove', () => { const i = entries.findIndex((x) => x.el === row); if (i !== hot) setHot(i); });
    m.appendChild(row);
    entries.push({ el: row, opt });
  };

  Array.from(sel.children).forEach((child) => {
    if (child instanceof HTMLOptGroupElement) {
      const g = document.createElement('div');
      g.className = 'mt-menu-group';
      g.textContent = child.label;
      m.appendChild(g);
      Array.from(child.children).forEach((o) => addOption(o as HTMLOptionElement));
    } else if (child instanceof HTMLOptionElement) {
      addOption(child);
    }
  });

  document.body.appendChild(m);
  menu = m;

  const vh = window.innerHeight;
  const below = vh - rect.bottom - 12;
  const above = rect.top - 12;
  const up = below < 200 && above > below;
  const maxH = Math.max(140, Math.min(320, up ? above : below));
  m.style.maxHeight = `${maxH}px`;
  m.style.minWidth = `${Math.max(rect.width, 140)}px`;
  m.style.left = `${Math.min(rect.left, window.innerWidth - Math.max(rect.width, 140) - 8)}px`;
  if (up) { m.style.bottom = `${vh - rect.top + 6}px`; m.classList.add('mt-up'); }
  else m.style.top = `${rect.bottom + 6}px`;

  const sIdx = entries.findIndex((e) => e.opt.selected);
  setHot(sIdx >= 0 ? sIdx : 0);
}

export function initSelectMenu() {
  if (typeof document === 'undefined') return;
  const fine = () => window.matchMedia('(pointer: fine)').matches;

  document.addEventListener(
    'mousedown',
    (e) => {
      const t = e.target as HTMLElement;
      if (menu && !menu.contains(t)) { const sel = t.closest?.('select'); if (sel === current) { e.preventDefault(); close(); return; } close(); }
      const sel = t.closest?.('select') as HTMLSelectElement | null;
      if (!sel || !fine() || sel.multiple || sel.disabled || (sel.size && sel.size > 1)) return;
      e.preventDefault();
      sel.focus();
      open(sel);
    },
    true
  );

  document.addEventListener(
    'keydown',
    (e) => {
      if (menu) {
        if (e.key === 'Escape') { e.preventDefault(); const s = current; close(); s?.focus(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); setHot((hot + 1) % entries.length); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHot((hot - 1 + entries.length) % entries.length); }
        else if (e.key === 'Home') { e.preventDefault(); setHot(0); }
        else if (e.key === 'End') { e.preventDefault(); setHot(entries.length - 1); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (entries[hot]) choose(entries[hot].opt); }
        else if (e.key === 'Tab') close();
        else if (e.key.length === 1) {
          typed += e.key.toLowerCase();
          window.clearTimeout(typedTimer);
          typedTimer = window.setTimeout(() => (typed = ''), 700);
          const i = entries.findIndex((x) => (x.opt.textContent || '').trim().toLowerCase().startsWith(typed));
          if (i >= 0) setHot(i);
        }
        return;
      }
      const sel = (e.target as HTMLElement)?.closest?.('select') as HTMLSelectElement | null;
      if (sel && fine() && !sel.multiple && !sel.disabled && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        open(sel);
      }
    },
    true
  );

  const away = (e: Event) => { if (menu && !(e.target instanceof Node && menu.contains(e.target))) close(); };
  window.addEventListener('scroll', away, true);
  window.addEventListener('resize', close);
  window.addEventListener('blur', close);
}
