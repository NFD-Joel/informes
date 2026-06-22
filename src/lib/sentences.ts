// Split an informe's flowing text into individual sentences for tap-to-mark.
//
// Splits only at whitespace that is preceded by sentence-ending punctuation
// (. ! ?) AND followed by the start of a new sentence (optional opening
// punctuation + an uppercase letter). Because the split requires whitespace
// after the punctuation, decimals like "2.5" and codes like "R-410A" stay
// intact. Lookbehind runs at build time in Node, which supports it.
export function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  return normalized
    .split(/(?<=[.!?])\s+(?=[¿¡"'(]?[A-ZÁÉÍÓÚÑ])/)
    .map((s) => s.trim())
    .filter(Boolean);
}
