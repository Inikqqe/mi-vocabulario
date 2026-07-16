import { db } from '@/lib/db';
import { WORD_PACKS } from '@/lib/packs';
import type { Word } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Находит словарь по имени или создаёт новый. Возвращает его id.
export async function ensureDictionary(name: string): Promise<string> {
  const existing = await db.dictionaries.where('name').equals(name).first();
  if (existing) return existing.id;

  const id = uuidv4();
  await db.dictionaries.add({ id, name, createdAt: new Date() });
  return id;
}

// Загружает тематический набор в одноимённый словарь (создаёт его при
// необходимости), пропуская слова, которые в этом словаре уже есть.
export async function loadPack(packId: string): Promise<{ added: number; dictionaryId: string }> {
  const pack = WORD_PACKS.find((p) => p.id === packId);
  if (!pack) throw new Error(`Unknown pack: ${packId}`);

  const dictionaryId = await ensureDictionary(pack.name);

  const existing = await db.words.where('dictionaryId').equals(dictionaryId).toArray();
  const existingWords = new Set(existing.map((w) => w.esWord.trim().toLowerCase()));

  const now = new Date();
  const toAdd: Word[] = pack.words
    .filter((s) => !existingWords.has(s.es.toLowerCase()))
    .map((s) => ({
      id: uuidv4(),
      dictionaryId,
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
  return { added: toAdd.length, dictionaryId };
}

// При первом запуске (нет ни одного словаря) загружает базовый набор.
export async function autoSeedIfEmpty(): Promise<void> {
  if (typeof window === 'undefined') return;

  const dictCount = await db.dictionaries.count();
  const wordCount = await db.words.count();
  if (dictCount === 0 && wordCount === 0) {
    await loadPack('base200');
  }
}
