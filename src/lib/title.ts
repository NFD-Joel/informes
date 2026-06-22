// Derive a readable display title from an informe's filename/slug when the
// markdown file has no `title` frontmatter (e.g. older files). Underscores
// become spaces; the first letter is capitalized. Accents can't be recovered
// from a slug, so prefer a `title:` in frontmatter for proper spelling.
export function humanize(slug: string): string {
  const s = slug.replace(/_/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
