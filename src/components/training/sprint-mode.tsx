"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { db } from "@/lib/db";
import type { Word } from "@/types";
import { getLeitnerNextReview } from "@/types";
import { Check, X, RotateCcw, Zap } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeQuestion(idx: number, currentWords: Word[], isEsToRu: boolean): { word: Word; shownText: string; proposedTranslation: string; isCorrect: boolean } | null {
  if (idx >= currentWords.length || idx < 0) return null;
  const word = currentWords[idx];
  const shownText = isEsToRu ? word.esWord : word.ruTranslation;
  const correctTranslation = isEsToRu ? word.ruTranslation : word.esWord;
  const isCorrect = Math.random() > 0.5;

  if (isCorrect) {
    return { word, shownText, proposedTranslation: correctTranslation, isCorrect: true };
  }

  const otherWords = currentWords.filter(w => w.id !== word.id);
  if (otherWords.length > 0) {
    const wrongWord = otherWords[Math.floor(Math.random() * otherWords.length)];
    const wrongTranslation = isEsToRu ? wrongWord.ruTranslation : wrongWord.esWord;
    return { word, shownText, proposedTranslation: wrongTranslation, isCorrect: false };
  }

  return { word, shownText, proposedTranslation: correctTranslation, isCorrect: true };
}

export function SprintMode() {
  const {
    trainingWords, setTrainingWords,
    trainingDirection, trainingSessionId,
    setShowTrainingResults, setTrainingMode,
  } = useAppStore();

  const [timeLeft, setTimeLeft] = useState(60);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const [questionSeed, setQuestionSeed] = useState(0); // to force re-generate

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isEsToRu = trainingDirection === 'es-ru';

  // Derive the current question from index and words
  const currentQuestion = useMemo(() => {
    if (!gameStarted || gameOver) return null;
    return makeQuestion(currentWordIndex % trainingWords.length, trainingWords, isEsToRu);
  }, [currentWordIndex, trainingWords, isEsToRu, gameStarted, gameOver, questionSeed]);

  // Timer effect - only handles the countdown
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted, gameOver]);

  const handleStart = () => {
    setGameStarted(true);
    setCurrentWordIndex(0);
    setQuestionSeed(Date.now());
  };

  const handleAnswer = async (userSaysCorrect: boolean) => {
    if (isAnswered || !currentQuestion || !trainingSessionId) return;
    setIsAnswered(true);

    const userIsRight = userSaysCorrect === currentQuestion.isCorrect;

    if (userIsRight) {
      const newStreak = streak + 1;
      const points = 10 + (newStreak - 1) * 5;
      setScore(s => s + points);
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setCorrectCount(c => c + 1);
    } else {
      setStreak(0);
      setWrongCount(c => c + 1);
      setShowCorrect(true);
    }

    // Update word stats
    let newBox = currentQuestion.word.leitnerBox;
    if (userIsRight) {
      newBox = Math.min(newBox + 1, 5);
    } else {
      newBox = Math.max(1, newBox - 1);
    }
    const nextReview = getLeitnerNextReview(newBox);

    await db.words.update(currentQuestion.word.id, {
      leitnerBox: newBox,
      nextReviewAt: nextReview,
      correctCount: currentQuestion.word.correctCount + (userIsRight ? 1 : 0),
      wrongCount: currentQuestion.word.wrongCount + (userIsRight ? 0 : 1),
      updatedAt: new Date(),
    });

    // Next question after brief pause
    setTimeout(() => {
      setCurrentWordIndex(prev => prev + 1);
      setIsAnswered(false);
      setShowCorrect(false);
      setQuestionSeed(Date.now());
    }, userIsRight ? 200 : 800);
  };

  const finishSprint = async () => {
    if (!trainingSessionId) return;
    await db.trainingSessions.add({
      id: trainingSessionId,
      mode: 'sprint',
      direction: trainingDirection,
      source: 'all',
      totalWords: correctCount + wrongCount,
      correctCount,
      wrongCount,
      skippedCount: 0,
      startedAt: new Date(),
      completedAt: new Date(),
    });
    setShowTrainingResults(true);
  };

  // Timer ring
  const timerRadius = 30;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerProgress = (timeLeft / 60) * timerCircumference;

  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="w-24 h-24 rounded-full bg-chart-3/20 flex items-center justify-center mb-6 animate-pulse-ring">
          <Zap className="w-12 h-12 text-chart-3" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Спринт</h2>
        <p className="text-muted-foreground mb-8">60 секунд. Отвечай быстро. Серия правильных ответов даёт больше очков!</p>
        <Button size="lg" className="h-14 px-8 text-lg" onClick={handleStart}>
          <Zap className="w-5 h-5 mr-2" />
          Начать!
        </Button>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-6">
          <Zap className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-1">Время вышло!</h2>
        <p className="text-4xl font-bold text-primary my-4">{score} очков</p>
        <div className="grid grid-cols-3 gap-4 mb-8 text-center">
          <div>
            <p className="text-2xl font-bold text-success">{correctCount}</p>
            <p className="text-xs text-muted-foreground">Правильно</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-destructive">{wrongCount}</p>
            <p className="text-xs text-muted-foreground">Ошибки</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-chart-3">{bestStreak}</p>
            <p className="text-xs text-muted-foreground">Лучшая серия</p>
          </div>
        </div>
        <Button className="w-full max-w-xs" onClick={finishSprint}>
          Подробнее
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with timer and score */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <svg width="40" height="40" viewBox="0 0 70 70" className="transform -rotate-90">
            <circle cx="35" cy="35" r={timerRadius} fill="none" stroke="currentColor" className="text-muted" strokeWidth="4" />
            <circle
              cx="35" cy="35" r={timerRadius} fill="none"
              stroke="currentColor"
              className={timeLeft > 10 ? "text-primary" : "text-destructive"}
              strokeWidth="4"
              strokeDasharray={timerCircumference}
              strokeDashoffset={timerCircumference - timerProgress}
              strokeLinecap="round"
            />
          </svg>
          <span className={`text-lg font-bold ${timeLeft <= 10 ? 'text-destructive' : ''}`}>{timeLeft}с</span>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{score} очков</p>
          {streak > 1 && (
            <p className="text-xs text-chart-3 font-medium">Серия x{streak}</p>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {currentQuestion && (
          <>
            <Card className="w-full max-w-sm p-6 text-center mb-4">
              <p className="text-xs text-muted-foreground mb-1">{isEsToRu ? 'Испанское слово' : 'Русский перевод'}</p>
              <h2 className="text-2xl font-semibold text-foreground mb-3">
                {currentQuestion.shownText}
              </h2>
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-1">{isEsToRu ? 'Это перевод?' : 'Это испанское слово?'}</p>
                <p className={`text-xl font-medium ${
                  showCorrect && !currentQuestion.isCorrect
                    ? 'line-through text-muted-foreground'
                    : showCorrect && currentQuestion.isCorrect
                      ? 'text-success'
                      : ''
                }`}>
                  {currentQuestion.proposedTranslation}
                </p>
              </div>
            </Card>

            <div className="flex gap-4 w-full max-w-sm">
              <Button
                className={`flex-1 h-14 text-base ${
                  isAnswered
                    ? ''
                    : 'bg-destructive text-white hover:bg-destructive/90'
                }`}
                variant={isAnswered ? "outline" : "default"}
                onClick={() => handleAnswer(false)}
                disabled={isAnswered}
              >
                <X className="w-5 h-5 mr-2" />
                Неверно
              </Button>
              <Button
                className={`flex-1 h-14 text-base ${
                  isAnswered
                    ? ''
                    : 'bg-success text-white hover:bg-success/90'
                }`}
                variant={isAnswered ? "outline" : "default"}
                onClick={() => handleAnswer(true)}
                disabled={isAnswered}
              >
                <Check className="w-5 h-5 mr-2" />
                Верно
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Reset */}
      <div className="pt-2 pb-safe flex justify-center">
        <Button variant="ghost" size="sm" onClick={() => {
          if (timerRef.current) clearInterval(timerRef.current);
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
