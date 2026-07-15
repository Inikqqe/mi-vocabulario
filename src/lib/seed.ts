import { db } from '@/lib/db';
import { SEED_WORDS } from '@/lib/seed-words';
import type { Word } from '@/types';
import { v4 as uuidv4 } from 'uuid';

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

// Если словарь пуст, автоматически загружает базовый словарь (200 слов).
export async function autoSeedIfEmpty(): Promise<void> {
  if (typeof window === 'undefined') return;

  const count = await db.words.count();
  if (count === 0) {
    await loadBaseDictionary();
  }
}
