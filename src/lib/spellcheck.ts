// Офлайн-проверка написания испанских слов:
// сравнение с базовым словарём и словами пользователя.

export function hasCyrillic(s: string): boolean {
  return /[а-яё]/i.test(s);
}

export function hasLatin(s: string): boolean {
  return /[a-z]/i.test(s);
}

// Убирает диакритику для сравнения: café → cafe, ñ → n
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[n];
}

export interface SpellSuggestion {
  suggestion: string;
  // true — слово совпадает с известным с точностью до акцентов (cafe → café)
  accentOnly: boolean;
}

// Ищет ближайшее известное слово. Возвращает null, если input сам является
// известным словом или ничего похожего не найдено.
export function findSuggestion(input: string, knownWords: string[]): SpellSuggestion | null {
  const raw = input.trim().toLowerCase();
  if (raw.length < 3) return null;

  const norm = normalize(raw);

  // Точное совпадение (с учётом акцентов) — ошибки нет
  if (knownWords.some((w) => w.trim().toLowerCase() === raw)) return null;

  // Совпадение без учёта акцентов: предлагаем правильное написание
  const accentMatch = knownWords.find(
    (w) => normalize(w) === norm && w.trim().toLowerCase() !== raw
  );
  if (accentMatch) {
    return { suggestion: accentMatch.trim(), accentOnly: true };
  }

  // Поиск по расстоянию Левенштейна
  const maxDist = raw.length <= 4 ? 1 : 2;
  let best: string | null = null;
  let bestDist = maxDist + 1;

  for (const w of knownWords) {
    const candidate = normalize(w);
    if (Math.abs(candidate.length - norm.length) > maxDist) continue;
    const d = levenshtein(norm, candidate);
    if (d > 0 && d < bestDist) {
      bestDist = d;
      best = w.trim();
    }
  }

  return best ? { suggestion: best, accentOnly: false } : null;
}
