// Поддерживаемые языки изучения (перевод всегда на русский)
export interface Language {
  code: string;
  // Название языка: «Испанский»
  name: string;
  // Короткая метка для направлений тренировки: «Исп.»
  short: string;
  // Подпись поля ввода слова: «Испанское слово»
  wordLabel: string;
  // Вопрос в викторине (направление Рус. → язык): «Как по-испански?»
  quizQuestion: string;
  // Пример слова для placeholder
  example: string;
  // Локаль для озвучки (Web Speech API)
  tts: string;
  // Название языка в родительном падеже для промпта ИИ: «испанского»
  aiName: string;
  emoji: string;
}

export const LANGUAGES: Language[] = [
  { code: 'es', name: 'Испанский', short: 'Исп.', wordLabel: 'Испанское слово', quizQuestion: 'Как по-испански?', example: 'hola', tts: 'es-ES', aiName: 'испанского', emoji: '🇪🇸' },
  { code: 'en', name: 'Английский', short: 'Англ.', wordLabel: 'Английское слово', quizQuestion: 'Как по-английски?', example: 'hello', tts: 'en-US', aiName: 'английского', emoji: '🇬🇧' },
  { code: 'fr', name: 'Французский', short: 'Франц.', wordLabel: 'Французское слово', quizQuestion: 'Как по-французски?', example: 'bonjour', tts: 'fr-FR', aiName: 'французского', emoji: '🇫🇷' },
  { code: 'de', name: 'Немецкий', short: 'Нем.', wordLabel: 'Немецкое слово', quizQuestion: 'Как по-немецки?', example: 'hallo', tts: 'de-DE', aiName: 'немецкого', emoji: '🇩🇪' },
  { code: 'it', name: 'Итальянский', short: 'Итал.', wordLabel: 'Итальянское слово', quizQuestion: 'Как по-итальянски?', example: 'ciao', tts: 'it-IT', aiName: 'итальянского', emoji: '🇮🇹' },
  { code: 'pt', name: 'Португальский', short: 'Порт.', wordLabel: 'Португальское слово', quizQuestion: 'Как по-португальски?', example: 'olá', tts: 'pt-PT', aiName: 'португальского', emoji: '🇵🇹' },
  { code: 'other', name: 'Другой язык', short: 'Иностр.', wordLabel: 'Иностранное слово', quizQuestion: 'Как на изучаемом языке?', example: 'слово', tts: '', aiName: 'иностранного (определи язык сам)', emoji: '🌍' },
];

export const DEFAULT_LANGUAGE_CODE = 'es';

export function getLanguage(code: string | undefined | null): Language {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}
