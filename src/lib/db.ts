import Dexie, { type EntityTable } from 'dexie';
import type { Word, Dictionary, Tag, WordTag, TrainingRecord, TrainingSession } from '@/types';

// ID словаря, в который переносятся слова пользователей со старой версии базы
export const DEFAULT_DICTIONARY_ID = 'default';

const db = new Dexie('MiVocabularioDB') as Dexie & {
  words: EntityTable<Word, 'id'>;
  dictionaries: EntityTable<Dictionary, 'id'>;
  tags: EntityTable<Tag, 'id'>;
  wordTags: EntityTable<WordTag, ''>;
  trainingRecords: EntityTable<TrainingRecord, 'id'>;
  trainingSessions: EntityTable<TrainingSession, 'id'>;
};

db.version(1).stores({
  words: 'id, esWord, ruTranslation, partOfSpeech, isFavorite, leitnerBox, nextReviewAt, createdAt',
  tags: 'id, name, createdAt',
  wordTags: '[wordId+tagId], wordId, tagId',
  trainingRecords: 'id, wordId, mode, sessionId, createdAt',
  trainingSessions: 'id, mode, startedAt',
});

db.version(2).stores({
  words: 'id, dictionaryId, esWord, ruTranslation, partOfSpeech, isFavorite, leitnerBox, nextReviewAt, createdAt',
  dictionaries: 'id, name, createdAt',
  tags: 'id, name, createdAt',
  wordTags: '[wordId+tagId], wordId, tagId',
  trainingRecords: 'id, wordId, mode, sessionId, createdAt',
  trainingSessions: 'id, mode, startedAt',
}).upgrade(async (tx) => {
  // Существующие слова переносим в словарь «Мой словарь»
  const wordCount = await tx.table('words').count();
  if (wordCount > 0) {
    await tx.table('dictionaries').add({
      id: DEFAULT_DICTIONARY_ID,
      name: 'Мой словарь',
      createdAt: new Date(),
    });
    await tx.table('words').toCollection().modify((w) => {
      w.dictionaryId = DEFAULT_DICTIONARY_ID;
    });
  }
});

export { db };
