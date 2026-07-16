"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAppStore } from "@/store/app-store";
import { db } from "@/lib/db";
import { getLeitnerNextReview } from "@/types";
import { useActiveDictionary } from "@/hooks/use-active-dictionary";
import { getLanguage } from "@/lib/languages";
import { motion } from "framer-motion";
import { Check, X, RotateCcw } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildOptions(word: { esWord: string; ruTranslation: string; id: string }, allWords: { esWord: string; ruTranslation: string; id: string }[], isEsToRu: boolean): string[] {
  const correctAnswer = isEsToRu ? word.ruTranslation : word.esWord;
  const otherWords = allWords.filter(w => w.id !== word.id);
  const shuffled = shuffleArray(otherWords).slice(0, 3);
  const wrongAnswers = shuffled.map(w => isEsToRu ? w.ruTranslation : w.esWord);
  return shuffleArray([correctAnswer, ...wrongAnswers]);
}

export function QuizMode() {
  const {
    trainingWords, setTrainingWords,
    trainingDirection, trainingSessionId,
    setShowTrainingResults, setTrainingMode,
  } = useAppStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<string>('');
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { active: activeDictionary } = useActiveDictionary();
  const language = getLanguage(activeDictionary?.language);

  const words = trainingWords;
  const currentWord = words[currentIndex];
  const isEsToRu = trainingDirection === 'es-ru';

  // Determine if selection belongs to current word
  const isSelectionCurrent = selectedWordId === currentWord?.id;
  const effectiveSelectedOption = isSelectionCurrent ? selectedOption : null;

  // Compute options based on current word - no effect needed
  const options = useMemo(() => {
    if (!currentWord) return [];
    return buildOptions(currentWord, words, isEsToRu);
  }, [currentWord, words, isEsToRu]);

  const progress = words.length > 0 ? ((currentIndex) / words.length) * 100 : 0;

  const finishSession = useCallback(async (finalCorrect: number, finalWrong: number) => {
    if (!trainingSessionId) return;
    await db.trainingSessions.add({
      id: trainingSessionId,
      mode: 'quiz',
      direction: trainingDirection,
      source: 'all',
      totalWords: words.length,
      correctCount: finalCorrect,
      wrongCount: finalWrong,
      skippedCount: 0,
      startedAt: new Date(),
      completedAt: new Date(),
    });
    setShowTrainingResults(true);
  }, [trainingSessionId, trainingDirection, words.length, setShowTrainingResults]);

  const handleSelect = useCallback(async (optionIndex: number) => {
    if (effectiveSelectedOption !== null || !currentWord || !trainingSessionId) return;

    setSelectedOption(optionIndex);
    setSelectedWordId(currentWord.id);
    const correctAnswer = isEsToRu ? currentWord.ruTranslation : currentWord.esWord;
    const isCorrect = options[optionIndex] === correctAnswer;

    let newBox = currentWord.leitnerBox;
    if (isCorrect) {
      newBox = Math.min(currentWord.leitnerBox + 1, 5);
      setCorrectCount(c => c + 1);
    } else {
      newBox = Math.max(1, currentWord.leitnerBox - 1);
      setWrongCount(c => c + 1);
    }

    const nextReview = getLeitnerNextReview(newBox);

    await db.words.update(currentWord.id, {
      leitnerBox: newBox,
      nextReviewAt: nextReview,
      correctCount: currentWord.correctCount + (isCorrect ? 1 : 0),
      wrongCount: currentWord.wrongCount + (isCorrect ? 0 : 1),
      updatedAt: new Date(),
    });

    await db.trainingRecords.add({
      id: uuidv4(),
      wordId: currentWord.id,
      mode: 'quiz',
      result: isCorrect ? 'correct' : 'wrong',
      leitnerBox: newBox,
      nextReviewAt: nextReview,
      sessionId: trainingSessionId,
      createdAt: new Date(),
    });

    // Auto next after 1.5s
    autoNextTimerRef.current = setTimeout(() => {
      if (currentIndex + 1 < words.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Use functional updates to get latest counts
        setCorrectCount(latestCorrect => {
          setWrongCount(latestWrong => {
            finishSession(latestCorrect, latestWrong);
            return latestWrong;
          });
          return latestCorrect;
        });
      }
    }, 1500);
  }, [effectiveSelectedOption, currentWord, trainingSessionId, isEsToRu, options, currentIndex, words.length, finishSession]);

  const correctAnswer = currentWord ? (isEsToRu ? currentWord.ruTranslation : currentWord.esWord) : '';

  if (!currentWord) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-1 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm text-muted-foreground">
            {currentIndex + 1} / {words.length}
          </p>
          <div className="flex gap-3 text-sm">
            <span className="text-success">✓ {correctCount}</span>
            <span className="text-destructive">✗ {wrongCount}</span>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <Card className="w-full max-w-sm p-8 text-center mb-6">
          <p className="text-xs text-muted-foreground mb-2">
            {isEsToRu ? 'Как переводится?' : language.quizQuestion}
          </p>
          <h2 className="text-3xl font-semibold text-foreground">
            {isEsToRu ? currentWord.esWord : currentWord.ruTranslation}
          </h2>
        </Card>

        {/* Options */}
        <div className="w-full max-w-sm space-y-2.5">
          {options.map((option, idx) => {
            const isThis = effectiveSelectedOption === idx;
            const isCorrectOption = option === correctAnswer;
            let bgClass = "bg-card hover:bg-accent border-border";
            if (effectiveSelectedOption !== null) {
              if (isCorrectOption) bgClass = "bg-success/20 border-success";
              else if (isThis && !isCorrectOption) bgClass = "bg-destructive/20 border-destructive";
            }

            return (
              <motion.button
                key={idx}
                className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${bgClass} ${
                  effectiveSelectedOption !== null ? "pointer-events-none" : "cursor-pointer"
                }`}
                onClick={() => handleSelect(idx)}
                whileTap={effectiveSelectedOption === null ? { scale: 0.98 } : {}}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-base font-medium">{option}</span>
                  {effectiveSelectedOption !== null && isCorrectOption && (
                    <Check className="w-5 h-5 text-success ml-auto" />
                  )}
                  {effectiveSelectedOption !== null && isThis && !isCorrectOption && (
                    <X className="w-5 h-5 text-destructive ml-auto" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Reset */}
      <div className="pt-2 pb-safe flex justify-center">
        <Button variant="ghost" size="sm" onClick={() => {
          if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
          setTrainingMode(null);
          setTrainingWords([]);
        }}>
          <RotateCcw className="w-3 h-3 mr-1" />
          Выйти
        </Button>
      </div>
    </div>
  );
}
