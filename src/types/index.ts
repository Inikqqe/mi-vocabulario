export type PartOfSpeech = 'verb' | 'noun' | 'adj' | 'adv' | 'phrase' | 'other';

export const PART_OF_SPEECH_LABELS: Record<PartOfSpeech, string> = {
  verb: 'Глагол',
  noun: 'Существ.',
  adj: 'Прил.',
  adv: 'Наречие',
  phrase: 'Фраза',
  other: 'Другое',
};

export const PART_OF_SPEECH_COLORS: Record<PartOfSpeech, { bg: string; text: string; darkBg: string; darkText: string }> = {
  verb: { bg: '#EEF2FF', text: '#4338CA', darkBg: '#312E81', darkText: '#A5B4FC' },
  noun: { bg: '#ECFDF5', text: '#065F46', darkBg: '#064E3B', darkText: '#6EE7B7' },
  adj: { bg: '#FFFBEB', text: '#92400E', darkBg: '#78350F', darkText: '#FCD34D' },
  adv: { bg: '#FDF4FF', text: '#7E22CE', darkBg: '#581C87', darkText: '#D8B4FE' },
  phrase: { bg: '#FFF1F2', text: '#9F1239', darkBg: '#881337', darkText: '#FDA4AF' },
  other: { bg: '#F8FAFC', text: '#475569', darkBg: '#334155', darkText: '#94A3B8' },
};

export type TrainingMode = 'learn' | 'flashcard' | 'quiz' | 'sprint';
export type TrainingResult = 'know' | 'doubt' | 'dont_know' | 'correct' | 'wrong';
export type TrainingDirection = 'es-ru' | 'ru-es';

export interface Word {
  id: string;
  esWord: string;
  ruTranslation: string;
  transcription: string;
  partOfSpeech: PartOfSpeech;
  exampleEs: string;
  exampleRu: string;
  note: string;
  isFavorite: boolean;
  leitnerBox: number;
  nextReviewAt: Date;
  correctCount: number;
  wrongCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  colorHex: string;
  createdAt: Date;
}

export interface WordTag {
  wordId: string;
  tagId: string;
}

export interface TrainingRecord {
  id: string;
  wordId: string;
  mode: TrainingMode;
  result: TrainingResult;
  leitnerBox: number;
  nextReviewAt: Date;
  sessionId: string;
  createdAt: Date;
}

export interface TrainingSession {
  id: string;
  mode: TrainingMode;
  direction: TrainingDirection;
  source: 'all' | 'new' | 'favorites' | 'weak' | 'pos' | 'tag';
  sourceFilter?: string;
  totalWords: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  startedAt: Date;
  completedAt?: Date;
}

export type SortOption = 'date-desc' | 'date-asc' | 'es-asc' | 'ru-asc' | 'favorites-first';
export type FilterOption = 'all' | PartOfSpeech | 'favorites';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'ru' | 'en' | 'es';
  fontSize: 'S' | 'M' | 'L';
  animationsEnabled: boolean;
  notificationsEnabled: boolean;
  notificationTime: string;
  notificationDays: number[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  language: 'ru',
  fontSize: 'M',
  animationsEnabled: true,
  notificationsEnabled: false,
  notificationTime: '09:00',
  notificationDays: [1, 2, 3, 4, 5],
};

export const LEITNER_INTERVALS = [0, 1, 3, 7, 21]; // days for boxes 1-5

export function getLeitnerNextReview(box: number): Date {
  const days = LEITNER_INTERVALS[Math.min(box - 1, LEITNER_INTERVALS.length - 1)];
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next;
}
