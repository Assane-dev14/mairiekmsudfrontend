// Recherche globale du portail public (§4.1) : pages, services, démarches, actualités et FAQ.
// Insensible à la casse et aux accents (« demarche » trouve « démarche »).

export type SearchType = 'page' | 'service' | 'procedure' | 'news' | 'faq';

export interface Searchable {
  type: SearchType;
  title: string;
  text: string;
  url: string;
}

export interface SearchHit {
  type: SearchType;
  title: string;
  excerpt: string;
  url: string;
}

const MAX_TERMS = 8;

/** Minuscules sans accents, en conservant un caractère par caractère d'origine (pour découper l'extrait). */
export function fold(text: string): string {
  return Array.from(text, (c) => c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()[0] ?? ' ').join('');
}

/** Mots de la requête, sans doublon ; les mots d'une lettre sont ignorés. */
export function searchTerms(query: string): string[] {
  const words = fold(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2);
  return [...new Set(words)].slice(0, MAX_TERMS);
}

/** Retire la mise en forme légère des textes (« ## », « - ») et compacte les espaces. */
export function plainText(body: string): string {
  return body
    .replace(/^\s*(##\s+|-\s+)/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extrait d'environ `radius` caractères de part et d'autre de la première occurrence. */
export function excerptAround(text: string, terms: string[], radius = 90): string {
  const chars = Array.from(text);
  const folded = fold(text);
  const positions = terms.map((t) => folded.indexOf(t)).filter((i) => i >= 0);
  const at = positions.length ? Math.min(...positions) : 0;
  const start = Math.max(0, at - radius);
  const end = Math.min(chars.length, at + radius);
  const slice = chars.slice(start, end).join('').trim();
  return `${start > 0 ? '…' : ''}${slice}${end < chars.length ? '…' : ''}`;
}

/**
 * Garde les éléments contenant tous les mots de la requête, les plus pertinents en premier :
 * un mot trouvé dans le titre compte plus qu'un mot trouvé dans le texte.
 */
export function search(items: Searchable[], query: string, limit = 30): SearchHit[] {
  const terms = searchTerms(query);
  if (!terms.length) return [];

  const scored: { hit: SearchHit; score: number }[] = [];
  for (const item of items) {
    const title = fold(item.title);
    const text = plainText(item.text);
    const body = fold(text);
    if (!terms.every((t) => title.includes(t) || body.includes(t))) continue;

    const score = terms.reduce((sum, t) => sum + (title.includes(t) ? 3 : 0) + (body.includes(t) ? 1 : 0), 0);
    scored.push({
      score,
      hit: { type: item.type, title: item.title, url: item.url, excerpt: excerptAround(text, terms) },
    });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.hit.title.localeCompare(b.hit.title, 'fr'))
    .slice(0, limit)
    .map((s) => s.hit);
}
