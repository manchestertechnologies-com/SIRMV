import React from 'react';

interface MathRendererProps {
  text: string;
  className?: string;
}

/**
 * Clean scientific/mathematical text formatter for academic questions,
 * formulas, super/subscripts, fractions, and Greek symbols.
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = '' }) => {
  if (!text) return null;

  // Process text to clean common LaTeX artifacts and format nicely
  const formatText = (raw: string) => {
    let formatted = raw;

    // Replace common LaTeX syntax with clean HTML representations
    formatted = formatted
      // Dollar math delimiters
      .replace(/\$\$([^$]+)\$\$/g, '<span class="font-serif italic text-slate-900">$1</span>')
      .replace(/\$([^$]+)\$/g, '<span class="font-serif italic text-slate-900">$1</span>')
      // Common symbols
      .replace(/\\times/g, ' × ')
      .replace(/\\div/g, ' ÷ ')
      .replace(/\\pm/g, ' ± ')
      .replace(/\\approx/g, ' ≈ ')
      .replace(/\\neq/g, ' ≠ ')
      .replace(/\\leq/g, ' ≤ ')
      .replace(/\\geq/g, ' ≥ ')
      .replace(/\\infty/g, ' ∞ ')
      .replace(/\\rightarrow|\\to/g, ' → ')
      .replace(/\\leftarrow/g, ' ← ')
      .replace(/\\leftrightarrow/g, ' ↔ ')
      .replace(/\\degree/g, '°')
      .replace(/\\circ/g, '°')
      .replace(/\\theta/g, 'θ')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\gamma/g, 'γ')
      .replace(/\\delta/g, 'δ')
      .replace(/\\lambda/g, 'λ')
      .replace(/\\mu/g, 'μ')
      .replace(/\\pi/g, 'π')
      .replace(/\\sigma/g, 'σ')
      .replace(/\\omega/g, 'ω')
      .replace(/\\Omega/g, 'Ω')
      .replace(/\\Delta/g, 'Δ')
      .replace(/\\int/g, '∫')
      .replace(/\\sum/g, '∑')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\mathrm\{([^}]+)\}/g, '$1')
      .replace(/\\mathbf\{([^}]+)\}/g, '<b>$1</b>')
      // Superscripts & Subscripts: e.g. x^{2} or x^2
      .replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>')
      .replace(/\^([0-9a-zA-Z+-]+)/g, '<sup>$1</sup>')
      .replace(/_\{([^}]+)\}/g, '<sub>$1</sub>')
      .replace(/_([0-9a-zA-Z+-]+)/g, '<sub>$1</sub>')
      // Clean up stray slashes
      .replace(/\\([a-zA-Z]+)/g, '$1');

    return formatted;
  };

  return (
    <span
      className={`leading-relaxed inline-block ${className}`}
      dangerouslySetInnerHTML={{ __html: formatText(text) }}
    />
  );
};
