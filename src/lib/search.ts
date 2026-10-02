export function normalizeSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .trim();
}

export function matchesSearch(text: string, query: string): boolean {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const normalized = normalizeSearch(text);
  return words.every((word) => normalized.includes(word));
}
