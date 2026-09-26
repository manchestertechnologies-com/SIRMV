import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  sheetTitle?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Drop-in replacement for a native <select>. Renders as:
 *   - a bottom sheet on mobile (< sm), portaled to <body> so it escapes any
 *     ancestor's stacking context (same fix applied to Navbar's dropdowns)
 *   - an anchored dropdown on tablet/desktop (>= sm)
 *
 * Usage mirrors a controlled native select:
 *   <Select value={x} onChange={setX} options={[{value:'A', label:'Option A'}]} />
 */
export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  sheetTitle,
  className = '',
  required,
  disabled
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.value === value);

  // Lock background scroll while the mobile sheet is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prevOverflow; };
    }
  }, [isOpen]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`press w-full flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${className || 'bg-white border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold outline-none'}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`truncate text-left ${!selected ? 'text-slate-400 font-normal' : ''}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Hidden native select keeps this accessible for form validation / autofill,
          and gives screen readers + `required` semantics a real fallback. */}
      {required && (
        <select
          value={value}
          onChange={() => {}}
          required
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}

      {isOpen && (
        <>
          {/* Mobile: backdrop + bottom sheet, portaled to <body> */}
          {createPortal(
            <div className="sm:hidden">
              <div
                className="fixed inset-0 bg-black/40 z-[100] animate-backdrop-in"
                onClick={() => setIsOpen(false)}
              />
              <div className="fixed inset-x-0 bottom-0 z-[101] bg-white rounded-t-3xl shadow-2xl border-t border-[#ded8cb] animate-sheet-up safe-bottom max-h-[70dvh] flex flex-col">
                <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                  <div className="w-9 h-1 rounded-full bg-slate-300" />
                </div>
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <span className="text-sm font-bold text-slate-800">{sheetTitle || placeholder}</span>
                  <button onClick={() => setIsOpen(false)} className="press p-1 text-slate-400">
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
                <div className="overflow-y-auto py-1 flex-1">
                  {options.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => handleSelect(o.value)}
                      className={`press w-full text-left px-4 py-3 active:bg-slate-100 flex items-center justify-between ${o.value === value ? 'bg-blue-50/50' : ''}`}
                    >
                      <span className="text-sm text-slate-800 font-medium">{o.label}</span>
                      {o.value === value && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Desktop / tablet: backdrop (click-away) + anchored dropdown */}
          <div className="hidden sm:block fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="hidden sm:block absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-[#ded8cb] py-1 z-50 overflow-hidden animate-scale-in origin-top max-h-72 overflow-y-auto">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleSelect(o.value)}
                className={`press w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center justify-between transition ${o.value === value ? 'bg-blue-50/50 font-semibold text-blue-700' : 'text-slate-700'}`}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Select;
