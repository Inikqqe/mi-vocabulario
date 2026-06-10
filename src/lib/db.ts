import Dexie, { type EntityTable } from 'dexie';
import type { Word, Tag, WordTag, TrainingRecord, TrainingSession } from '@/types';

const db = new Dexie('MiVocabularioDB') as Dexie & {
  words: EntityTable<Word, 'id'>;
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

export { db };
