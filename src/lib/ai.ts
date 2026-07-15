import type { PartOfSpeech } from '@/types';

const API_KEY_STORAGE_KEY = 'mi-vocabulario-anthropic-key';

export function getApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
}

export function setApiKey(key: string) {
  if (key.trim()) {
    localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  }
}

export interface AiWordSuggestion {
  ruTranslation: string;
  partOfSpeech: PartOfSpeech;
  isSpelledCorrectly: boolean;
  correctedEs: string;
}

const SUGGESTION_SCHEMA = {
  type: 'object',
  properties: {
    isSpelledCorrectly: {
      type: 'boolean',
      description: 'true, если испанское слово написано без ошибок (правильная орфография и акценты).',
    },
    correctedEs: {
      type: 'string',
      description: 'Правильное написание испанского слова. Если ошибок нет — исходное слово без изменений.',
    },
    ruTranslation: {
      type: 'string',
      description: 'Перевод (исправленного) испанского слова на русский язык. Кратко: 1-3 варианта через запятую.',
    },
    partOfSpeech: {
      type: 'string',
      enum: ['verb', 'noun', 'adj', 'adv', 'phrase', 'other'],
      description: 'Часть речи: verb=глагол, noun=существительное, adj=прилагательное, adv=наречие, phrase=фраза/выражение, other=другое (местоимения, предлоги и т.д.)',
    },
  },
  required: ['isSpelledCorrectly', 'correctedEs', 'ruTranslation', 'partOfSpeech'],
  additionalProperties: false,
} as const;

export async function suggestTranslation(esWord: string): Promise<AiWordSuggestion> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    system:
      'Ты — словарь испанского языка для русскоязычных учеников. ' +
      'Тебе дают испанское слово или фразу. Сначала проверь орфографию: если слово написано с ошибкой ' +
      '(опечатка, пропущенный акцент, неверная буква), укажи isSpelledCorrectly=false и правильное написание в correctedEs. ' +
      'Затем верни перевод исправленного слова на русский и часть речи.',
    output_config: {
      format: {
        type: 'json_schema',
        schema: SUGGESTION_SCHEMA,
      },
    },
    messages: [{ role: 'user', content: esWord.trim() }],
  });

  const textBlock = response.content.find(
    (b): b is Extract<(typeof response.content)[number], { type: 'text' }> => b.type === 'text'
  );
  if (!textBlock) {
    throw new Error('EMPTY_RESPONSE');
  }

  return JSON.parse(textBlock.text) as AiWordSuggestion;
}
