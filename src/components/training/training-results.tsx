"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Check, X, Minus, ArrowRight, RotateCcw, BookOpen } from "lucide-react";

export function TrainingResults() {
  const {
    trainingSessionId, setTrainingSessionId,
    setTrainingMode, setTrainingWords,
    setShowTrainingResults, setActiveTab,
    setSelectedWordId,
  } = useAppStore();

  const session = useLiveQuery(
    () => trainingSessionId ? db.trainingSessions.get(trainingSessionId) : undefined,
    [trainingSessionId]
  );

  const records = useLiveQuery(
    () => trainingSessionId
      ? db.trainingRecords.where('sessionId').equals(trainingSessionId).toArray()
      : [],
    [trainingSessionId]
  );

  const weakWords = useLiveQuery(async () => {
    if (!records) return [];
    const wrongRecords = records.filter(r => r.result === 'dont_know' || r.result === 'wrong');
    const wordIds = [...new Set(wrongRecords.map(r => r.wordId))];
    if (wordIds.length === 0) return [];
    return db.words.where('id').anyOf(wordIds).toArray();
  }, [records]);

  if (!session) return null;

  const total = session.totalWords;
  const correct = session.correctCount;
  const wrong = session.wrongCount;
  const skipped = session.skippedCount || 0;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Ring chart
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const correctArc = (correct / total) * circumference;
  const wrongArc = (wrong / total) * circumference;

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pb-3">
        <h1 className="text-xl font-semibold text-foreground">Результаты</h1>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
        {/* Accuracy ring */}
        <Card className="p-6 flex flex-col items-center">
          <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90 mb-3">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" className="text-muted" strokeWidth="10" />
            <circle
              cx="60" cy="60" r={radius} fill="none"
              stroke="currentColor" className="text-success" strokeWidth="10"
              strokeDasharray={`${correctArc} ${circumference - correctArc}`}
              strokeLinecap="round"
            />
            {wrong > 0 && (
              <circle
                cx="60" cy="60" r={radius} fill="none"
                stroke="currentColor" className="text-destructive" strokeWidth="10"
                strokeDasharray={`${wrongArc} ${circumference - wrongArc}`}
                strokeDashoffset={`-${correctArc}`}
                strokeLinecap="round"
              />
            )}
          </svg>
          <p className="text-3xl font-bold">{accuracy}%</p>
          <p className="text-sm text-muted-foreground">Точность</p>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <Check className="w-5 h-5 text-success mx-auto mb-1" />
            <p className="text-xl font-bold">{correct}</p>
            <p className="text-[10px] text-muted-foreground">Правильно</p>
          </Card>
          <Card className="p-3 text-center">
            <X className="w-5 h-5 text-destructive mx-auto mb-1" />
            <p className="text-xl font-bold">{wrong}</p>
            <p className="text-[10px] text-muted-foreground">Ошибки</p>
          </Card>
          <Card className="p-3 text-center">
            <Minus className="w-5 h-5 text-warning mx-auto mb-1" />
            <p className="text-xl font-bold">{skipped}</p>
            <p className="text-[10px] text-muted-foreground">Пропущено</p>
          </Card>
        </div>

        {/* Weak words */}
        {weakWords && weakWords.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Сложные слова</h3>
            {weakWords.map((word) => (
              <Card
                key={word.id}
                className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => {
                  setSelectedWordId(word.id);
                  setActiveTab('dictionary');
                  setShowTrainingResults(false);
                  setTrainingMode(null);
                  setTrainingWords([]);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{word.esWord}</p>
                    <p className="text-xs text-muted-foreground">{word.ruTranslation}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-3 pb-safe space-y-2">
        <Button className="w-full" onClick={() => {
          setShowTrainingResults(false);
          // Keep mode, regenerate words
          setTrainingWords([]);
          setTrainingMode(null);
        }}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Новая тренировка
        </Button>
        <Button variant="outline" className="w-full" onClick={() => {
          setShowTrainingResults(false);
          setTrainingMode(null);
          setTrainingWords([]);
          setActiveTab('dictionary');
        }}>
          <BookOpen className="w-4 h-4 mr-2" />
          В словарь
        </Button>
      </div>
    </div>
  );
}
