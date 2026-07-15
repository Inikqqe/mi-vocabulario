import { db } from '@/lib/db';
import { SEED_WORDS } from '@/lib/seed-words';
import type { Word } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const SEED_FLAG_KEY = 'mi-vocabulario-seeded';

// Добавляет слова базового словаря, пропуская уже существующие.
// Возвращает число добавленных слов.
export async function loadBaseDictionary(): Promise<number> {
  const existing = await db.words.toArray();
  const existingWords = new Set(existing.map((w) => w.esWord.trim().toLowerCase()));

  const now = new Date();
  const toAdd: Word[] = SEED_WORDS.filter(
    (s) => !existingWords.has(s.es.toLowerCase())
  ).map((s) => ({
    id: uuidv4(),
    esWord: s.es,
    ruTranslation: s.ru,
    transcription: '',
    partOfSpeech: s.pos,
    exampleEs: '',
    exampleRu: '',
    note: '',
    isFavorite: false,
    leitnerBox: 1,
    nextReviewAt: now,
    correctCount: 0,
    wrongCount: 0,
    createdAt: now,
    updatedAt: now,
  }));

  if (toAdd.length > 0) {
    await db.words.bulkAdd(toAdd);
  }
  return toAdd.length;
}

// При первом запуске (пустая база) автоматически загружает базовый словарь.
export async function autoSeedIfEmpty(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(SEED_FLAG_KEY)) return;

  const count = await db.words.count();
  if (count === 0) {
    await loadBaseDictionary();
  }
  localStorage.setItem(SEED_FLAG_KEY, '1');
}
