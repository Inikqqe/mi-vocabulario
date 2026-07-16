"use client";

import { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PART_OF_SPEECH_LABELS, type PartOfSpeech } from "@/types";
import { suggestTranslation, getApiKey } from "@/lib/ai";
import { hasCyrillic, hasLatin, findSuggestion } from "@/lib/spellcheck";
import { SEED_WORDS } from "@/lib/seed-words";
import { useActiveDictionary } from "@/hooks/use-active-dictionary";
import { toast } from "sonner";
import { Save, Sparkles, Loader2, AlertTriangle, Lightbulb } from "lucide-react";

const POS_OPTIONS: PartOfSpeech[] = ['verb', 'noun', 'adj', 'adv', 'phrase', 'other'];

export function AddWordForm() {
  const { editingWordId, setEditingWordId, setActiveTab } = useAppStore();
  const { active: activeDictionary, activeDictionaryId } = useActiveDictionary();

  const existingWord = useLiveQuery(
    () => editingWordId ? db.words.get(editingWordId) : undefined,
    [editingWordId]
  );

  const allWords = useLiveQuery(() => db.words.toArray());

  const [esWord, setEsWord] = useState("");
  const [ruTranslation, setRuTranslation] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech>("noun");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCorrection, setAiCorrection] = useState<string | null>(null);

  // Fill form when editing
  useEffect(() => {
    if (existingWord) {
      setEsWord(existingWord.esWord);
      setRuTranslation(existingWord.ruTranslation);
      setPartOfSpeech(existingWord.partOfSpeech);
    } else {
      setEsWord("");
      setRuTranslation("");
      setPartOfSpeech("noun");
    }
    setAiCorrection(null);
  }, [existingWord]);

  const isFormValid = esWord.trim() && ruTranslation.trim() && partOfSpeech;

  // --- Живые проверки написания (без ИИ) ---
  const esHasCyrillic = hasCyrillic(esWord);
  const ruHasLatin = hasLatin(ruTranslation);

  // Дубликаты ищем в пределах активного словаря
  const duplicateWord = useMemo(() => {
    if (!allWords || !esWord.trim()) return null;
    const q = esWord.trim().toLowerCase();
    const targetDictId = editingWordId && existingWord
      ? existingWord.dictionaryId
      : activeDictionaryId;
    return allWords.find(
      (w) =>
        w.dictionaryId === targetDictId &&
        w.esWord.trim().toLowerCase() === q &&
        w.id !== editingWordId
    ) || null;
  }, [allWords, esWord, editingWordId, existingWord, activeDictionaryId]);

  // Подсказка «возможно, вы имели в виду» — сравнение с базовым словарём
  // и словами пользователя
  const spellHint = useMemo(() => {
    if (!esWord.trim() || esHasCyrillic || duplicateWord) return null;
    const known = [
      ...SEED_WORDS.map((s) => s.es),
      ...(allWords?.map((w) => w.esWord) || []),
    ];
    return findSuggestion(esWord, known);
  }, [esWord, esHasCyrillic, duplicateWord, allWords]);

  const applySuggestion = (suggestion: string) => {
    setEsWord(suggestion);
    setAiCorrection(null);
  };

  const handleAiFill = async () => {
    if (!esWord.trim()) {
      toast.error("Сначала введите испанское слово");
      return;
    }
    if (!getApiKey()) {
      toast.error("Добавьте API-ключ в Профиль → Настройки, чтобы использовать ИИ");
      return;
    }

    setAiLoading(true);
    setAiCorrection(null);
    try {
      const suggestion = await suggestTranslation(esWord);
      setRuTranslation(suggestion.ruTranslation);
      setPartOfSpeech(suggestion.partOfSpeech);

      if (!suggestion.isSpelledCorrectly && suggestion.correctedEs &&
          suggestion.correctedEs.trim().toLowerCase() !== esWord.trim().toLowerCase()) {
        setAiCorrection(suggestion.correctedEs.trim());
        toast.warning(`В слове есть ошибка. Правильно: «${suggestion.correctedEs.trim()}»`);
      } else {
        toast.success("Перевод заполнен с помощью ИИ");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('401') || message.toLowerCase().includes('auth')) {
        toast.error("Неверный API-ключ. Проверьте его в Профиль → Настройки");
      } else {
        toast.error("Не удалось получить перевод. Проверьте интернет и API-ключ");
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;

    if (duplicateWord) {
      toast.error(`Слово «${duplicateWord.esWord}» уже есть в словаре`);
      return;
    }

    try {
      if (editingWordId && existingWord) {
        await db.words.update(editingWordId, {
          esWord: esWord.trim(),
          ruTranslation: ruTranslation.trim(),
          partOfSpeech,
          updatedAt: new Date(),
        });

        toast.success("Слово обновлено");
        setEditingWordId(null);
        setActiveTab('dictionary');
      } else {
        if (!activeDictionaryId) {
          toast.error("Сначала выберите словарь");
          return;
        }
        const { v4: uuidv4 } = await import('uuid');
        const now = new Date();

        await db.words.add({
          id: uuidv4(),
          dictionaryId: activeDictionaryId,
          esWord: esWord.trim(),
          ruTranslation: ruTranslation.trim(),
          transcription: "",
          partOfSpeech,
          exampleEs: "",
          exampleRu: "",
          note: "",
          isFavorite: false,
          leitnerBox: 1,
          nextReviewAt: now,
          correctCount: 0,
          wrongCount: 0,
          createdAt: now,
          updatedAt: now,
        });

        toast.success("Слово добавлено");

        setEsWord("");
        setRuTranslation("");
        setPartOfSpeech("noun");
        setAiCorrection(null);
      }
    } catch {
      toast.error("Ошибка при сохранении");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pb-3">
        <h1 className="text-xl font-semibold text-foreground">
          {editingWordId ? "Редактировать слово" : "Новое слово"}
        </h1>
        {!editingWordId && activeDictionary && (
          <p className="text-xs text-muted-foreground">
            В словарь «{activeDictionary.name}»
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
        {/* Spanish word */}
        <div className="space-y-1.5">
          <Label htmlFor="esWord" className="text-sm font-medium">
            Испанское слово <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              id="esWord"
              placeholder="hola"
              value={esWord}
              onChange={(e) => {
                setEsWord(e.target.value);
                setAiCorrection(null);
              }}
              className="text-lg flex-1"
              autoComplete="off"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={handleAiFill}
              disabled={aiLoading || !esWord.trim()}
              aria-label="Заполнить с помощью ИИ"
              title="Проверить слово и заполнить перевод с помощью ИИ"
            >
              {aiLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Предупреждения о написании */}
          {esHasCyrillic && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              В испанском слове есть русские буквы
            </p>
          )}
          {duplicateWord && (
            <p className="text-xs text-warning flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              Это слово уже есть в словаре
            </p>
          )}
          {aiCorrection && (
            <button
              type="button"
              className="text-xs text-warning flex items-center gap-1 hover:underline text-left"
              onClick={() => applySuggestion(aiCorrection)}
            >
              <AlertTriangle className="w-3 h-3 shrink-0" />
              ИИ: слово написано с ошибкой. Исправить на «{aiCorrection}»?
            </button>
          )}
          {!aiCorrection && spellHint && (
            <button
              type="button"
              className="text-xs text-primary flex items-center gap-1 hover:underline text-left"
              onClick={() => applySuggestion(spellHint.suggestion)}
            >
              <Lightbulb className="w-3 h-3 shrink-0" />
              {spellHint.accentOnly
                ? `Правильное написание: «${spellHint.suggestion}». Нажмите, чтобы исправить`
                : `Возможно, вы имели в виду «${spellHint.suggestion}»? Нажмите, чтобы исправить`}
            </button>
          )}
          {!esHasCyrillic && !duplicateWord && !spellHint && !aiCorrection && (
            <p className="text-xs text-muted-foreground">
              ✨ — проверка слова и перевод с помощью ИИ (нужен API-ключ в настройках)
            </p>
          )}
        </div>

        {/* Russian translation */}
        <div className="space-y-1.5">
          <Label htmlFor="ruTranslation" className="text-sm font-medium">
            Перевод (рус.) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ruTranslation"
            placeholder="привет"
            value={ruTranslation}
            onChange={(e) => setRuTranslation(e.target.value)}
            className="text-lg"
            autoComplete="off"
          />
          {ruHasLatin && (
            <p className="text-xs text-warning flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              В переводе есть латинские буквы — проверьте, что это русский текст
            </p>
          )}
        </div>

        {/* Part of speech */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Часть речи <span className="text-destructive">*</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {POS_OPTIONS.map((pos) => (
              <Badge
                key={pos}
                variant={partOfSpeech === pos ? "default" : "outline"}
                className={`cursor-pointer text-sm py-1.5 px-3 ${
                  partOfSpeech === pos
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
                onClick={() => setPartOfSpeech(pos)}
              >
                {PART_OF_SPEECH_LABELS[pos]}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="pt-3 pb-safe">
        <Button
          className="w-full h-12 text-base"
          disabled={!isFormValid || !!duplicateWord}
          onClick={handleSubmit}
        >
          <Save className="w-4 h-4 mr-2" />
          {editingWordId ? "Сохранить изменения" : "Добавить слово"}
        </Button>
        {editingWordId && (
          <Button
            variant="ghost"
            className="w-full mt-2"
            onClick={() => {
              setEditingWordId(null);
              setActiveTab('dictionary');
            }}
          >
            Отмена
          </Button>
        )}
      </div>
    </div>
  );
}
