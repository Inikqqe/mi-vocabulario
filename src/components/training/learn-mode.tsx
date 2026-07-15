"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PosBadge } from "@/components/shared/pos-badge";
import { useAppStore } from "@/store/app-store";
import { db } from "@/lib/db";
import { getLeitnerNextReview } from "@/types";
import { motion } from "framer-motion";
import { Check, X, RotateCcw, ArrowRight, Volume2, GraduationCap } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Режим «Выучить»: сначала показываем слова с переводом (запоминание),
// затем проверяем те же слова тестом с вариантами ответа.
export function LearnMode() {
  const {
    trainingWords, setTrainingWords,
    trainingSessionId, trainingDirection,
    setShowTrainingResults, setTrainingMode,
  } = useAppStore();

  const [phase, setPhase] = useState<'study' | 'check'>('study');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const words = trainingWords;
  const currentWord = words[currentIndex];

  // Варианты ответа для фазы проверки (перевод всегда ES → RU)
  const options = useMemo(() => {
    if (!currentWord || phase !== 'check') return [];
    const others = shuffleArray(words.filter(w => w.id !== currentWord.id)).slice(0, 3);
    return shuffleArray([currentWord.ruTranslation, ...others.map(w => w.ruTranslation)]);
  }, [currentWord, words, phase]);

  const progress = words.length > 0 ? (currentIndex / words.length) * 100 : 0;

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  const handleStudyNext = () => {
    if (currentIndex + 1 < words.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Переходим к проверке тех же слов
      setPhase('check');
      setCurrentIndex(0);
      setSelectedOption(null);
    }
  };

  const finishSession = useCallback(async (finalCorrect: number, finalWrong: number) => {
    if (!trainingSessionId) return;
    await db.trainingSessions.add({
      id: trainingSessionId,
      mode: 'learn',
      direction: trainingDirection,
      source: 'new',
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
    if (selectedOption !== null || !currentWord || !trainingSessionId) return;

    setSelectedOption(optionIndex);
    const isCorrect = options[optionIndex] === currentWord.ruTranslation;

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
      mode: 'learn',
      result: isCorrect ? 'correct' : 'wrong',
      leitnerBox: newBox,
      nextReviewAt: nextReview,
      sessionId: trainingSessionId,
      createdAt: new Date(),
    });

    autoNextTimerRef.current = setTimeout(() => {
      if (currentIndex + 1 < words.length) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
      } else {
        setCorrectCount(latestCorrect => {
          setWrongCount(latestWrong => {
            finishSession(latestCorrect, latestWrong);
            return latestWrong;
          });
          return latestCorrect;
        });
      }
    }, 1500);
  }, [selectedOption, currentWord, trainingSessionId, options, currentIndex, words.length, finishSession]);

  const handleExit = () => {
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    setTrainingMode(null);
    setTrainingWords([]);
  };

  if (!currentWord) return null;

  // --- Фаза запоминания ---
  if (phase === 'study') {
    return (
      <div className="flex flex-col h-full">
        <div className="px-1 pb-2">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <GraduationCap className="w-4 h-4" />
              Запоминание · {currentIndex + 1} / {words.length}
            </p>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div
            key={currentWord.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-sm"
          >
            <Card className="p-8 min-h-[280px] flex flex-col items-center justify-center text-center">
              <div className="mb-3">
                <PosBadge pos={currentWord.partOfSpeech} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-3xl font-semibold text-foreground">{currentWord.esWord}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => handleSpeak(currentWord.esWord)}
                  aria-label="Озвучить"
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xl text-muted-foreground mb-6">{currentWord.ruTranslation}</p>

              <Button className="w-full h-11" onClick={handleStudyNext}>
                {currentIndex + 1 < words.length ? (
                  <>
                    Запомнил, дальше
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    К проверке
                    <Check className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </Card>
          </motion.div>
        </div>

        <div className="pt-2 pb-safe flex justify-center">
          <Button variant="ghost" size="sm" onClick={handleExit}>
            <RotateCcw className="w-3 h-3 mr-1" />
            Выйти
          </Button>
        </div>
      </div>
    );
  }

  // --- Фаза проверки ---
  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm text-muted-foreground">
            Проверка · {currentIndex + 1} / {words.length}
          </p>
          <div className="flex gap-3 text-sm">
            <span className="text-success">✓ {correctCount}</span>
            <span className="text-destructive">✗ {wrongCount}</span>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <Card className="w-full max-w-sm p-8 text-center mb-6">
          <p className="text-xs text-muted-foreground mb-2">Как переводится?</p>
          <h2 className="text-3xl font-semibold text-foreground">{currentWord.esWord}</h2>
        </Card>

        <div className="w-full max-w-sm space-y-2.5">
          {options.map((option, idx) => {
            const isThis = selectedOption === idx;
            const isCorrectOption = option === currentWord.ruTranslation;
            let bgClass = "bg-card hover:bg-accent border-border";
            if (selectedOption !== null) {
              if (isCorrectOption) bgClass = "bg-success/20 border-success";
              else if (isThis && !isCorrectOption) bgClass = "bg-destructive/20 border-destructive";
            }

            return (
              <motion.button
                key={idx}
                className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${bgClass} ${
                  selectedOption !== null ? "pointer-events-none" : "cursor-pointer"
                }`}
                onClick={() => handleSelect(idx)}
                whileTap={selectedOption === null ? { scale: 0.98 } : {}}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-base font-medium">{option}</span>
                  {selectedOption !== null && isCorrectOption && (
                    <Check className="w-5 h-5 text-success ml-auto" />
                  )}
                  {selectedOption !== null && isThis && !isCorrectOption && (
                    <X className="w-5 h-5 text-destructive ml-auto" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="pt-2 pb-safe flex justify-center">
        <Button variant="ghost" size="sm" onClick={handleExit}>
          <RotateCcw className="w-3 h-3 mr-1" />
          Выйти
        </Button>
      </div>
    </div>
  );
}
