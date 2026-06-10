"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/app-store";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { TrainingMode, TrainingDirection, Word } from "@/types";
import { Brain, Zap, RotateCcw, ArrowRight, ArrowLeft, Star, AlertTriangle, BookOpen } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useState } from "react";

const MODES: { value: TrainingMode; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  { value: "flashcard", label: "Карточки", description: "Интервальное повторение по алгоритму Leitner. Переворачивайте карточки и оценивайте знание.", icon: <RotateCcw className="w-6 h-6" />, color: "bg-primary" },
  { value: "quiz", label: "Викторина", description: "Выберите правильный перевод из четырёх вариантов. Тренирует точность распознавания.", icon: <Brain className="w-6 h-6" />, color: "bg-chart-2" },
  { value: "sprint", label: "Спринт", description: "60 секунд на максимум правильных ответов. Быстро выбирайте: верный или неверный перевод.", icon: <Zap className="w-6 h-6" />, color: "bg-chart-3" },
];

const DIRECTIONS: { value: TrainingDirection; label: string }[] = [
  { value: "es-ru", label: "Исп. → Рус." },
  { value: "ru-es", label: "Рус. → Исп." },
];

const SIZES = [10, 20, 30];

export function TrainingModeSelect() {
  const {
    trainingMode, setTrainingMode,
    trainingDirection, setTrainingDirection,
    trainingSource, setTrainingSource,
    setTrainingWords, setTrainingSessionId,
    setShowTrainingResults,
  } = useAppStore();

  const [sessionSize, setSessionSize] = useState(10);

  const allWords = useLiveQuery(() => db.words.toArray());
  const totalWords = allWords?.length || 0;
  const favoriteWords = allWords?.filter(w => w.isFavorite).length || 0;
  const weakWords = allWords?.filter(w => w.leitnerBox <= 2).length || 0;

  const getSourceCount = () => {
    switch (trainingSource) {
      case 'favorites': return favoriteWords;
      case 'weak': return weakWords;
      default: return totalWords;
    }
  };

  const getFilteredWords = (): Word[] => {
    if (!allWords) return [];
    let words = [...allWords];

    switch (trainingSource) {
      case 'favorites':
        words = words.filter(w => w.isFavorite);
        break;
      case 'weak':
        words = words.filter(w => w.leitnerBox <= 2);
        break;
    }

    // Shuffle
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }

    return words.slice(0, sessionSize);
  };

  const handleStart = async () => {
    const words = getFilteredWords();
    if (words.length === 0) return;

    const sessionId = uuidv4();
    setTrainingSessionId(sessionId);
    setTrainingWords(words);
    setShowTrainingResults(false);
    // Mode is already set by the selection
  };

  if (totalWords === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Brain className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">Нет слов для тренировки</h3>
        <p className="text-sm text-muted-foreground mb-4">Добавьте слова в словарь, чтобы начать тренировку</p>
        <Button onClick={() => useAppStore.getState().setActiveTab('add')}>
          Добавить слово
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pb-3">
        <h1 className="text-xl font-semibold text-foreground">Тренировка</h1>
        <p className="text-xs text-muted-foreground">{totalWords} слов в словаре</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
        {/* Mode selection */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Режим</h3>
          {MODES.map((mode) => (
            <Card
              key={mode.value}
              className={`p-4 cursor-pointer transition-all ${
                trainingMode === mode.value
                  ? "ring-2 ring-primary bg-accent/50"
                  : "hover:bg-accent/30"
              }`}
              onClick={() => setTrainingMode(mode.value)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg ${mode.color} text-white flex items-center justify-center shrink-0`}>
                  {mode.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{mode.label}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{mode.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Direction */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Направление</h3>
          <div className="flex gap-2">
            {DIRECTIONS.map((dir) => (
              <Badge
                key={dir.value}
                variant={trainingDirection === dir.value ? "default" : "outline"}
                className={`cursor-pointer py-2 px-4 ${
                  trainingDirection === dir.value
                    ? "bg-primary text-primary-foreground"
                    : ""
                }`}
                onClick={() => setTrainingDirection(dir.value)}
              >
                {dir.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Source */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Источник слов</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'all' as const, label: 'Все', count: totalWords, icon: <BookOpen className="w-4 h-4" /> },
              { value: 'favorites' as const, label: '★ Избр.', count: favoriteWords, icon: <Star className="w-4 h-4" /> },
              { value: 'weak' as const, label: 'Слабые', count: weakWords, icon: <AlertTriangle className="w-4 h-4" /> },
            ].map((src) => (
              <Card
                key={src.value}
                className={`p-3 cursor-pointer text-center transition-all ${
                  trainingSource === src.value ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setTrainingSource(src.value)}
              >
                <div className="flex justify-center mb-1 text-muted-foreground">{src.icon}</div>
                <p className="text-xs font-medium">{src.label}</p>
                <p className="text-[10px] text-muted-foreground">{src.count} слов</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Session size */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Количество слов</h3>
          <div className="flex gap-2">
            {SIZES.map((size) => (
              <Badge
                key={size}
                variant={sessionSize === size ? "default" : "outline"}
                className={`cursor-pointer py-2 px-4 ${
                  sessionSize === size ? "bg-primary text-primary-foreground" : ""
                }`}
                onClick={() => setSessionSize(size)}
              >
                {size}
              </Badge>
            ))}
            <Badge
              variant={sessionSize === 0 ? "default" : "outline"}
              className={`cursor-pointer py-2 px-4 ${
                sessionSize === 0 ? "bg-primary text-primary-foreground" : ""
              }`}
              onClick={() => setSessionSize(0)}
            >
              Все
            </Badge>
          </div>
        </div>
      </div>

      {/* Start button */}
      <div className="pt-3 pb-safe">
        <Button
          className="w-full h-12 text-base"
          disabled={!trainingMode || getSourceCount() === 0}
          onClick={handleStart}
        >
          Начать тренировку
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
