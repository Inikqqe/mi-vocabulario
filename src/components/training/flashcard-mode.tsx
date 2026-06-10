"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAppStore } from "@/store/app-store";
import { db } from "@/lib/db";
import type { TrainingResult } from "@/types";
import { getLeitnerNextReview } from "@/types";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Check, X, HelpCircle, RotateCcw, Eye } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export function FlashcardMode() {
  const {
    trainingWords, setTrainingWords,
    trainingDirection, trainingSessionId,
    setShowTrainingResults, setTrainingMode,
  } = useAppStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [doubtCount, setDoubtCount] = useState(0);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const words = trainingWords;
  const currentWord = words[currentIndex];
  const progress = words.length > 0 ? ((currentIndex) / words.length) * 100 : 0;

  const isEsToRu = trainingDirection === 'es-ru';
  const frontText = isEsToRu ? currentWord?.esWord : currentWord?.ruTranslation;
  const backText = isEsToRu ? currentWord?.ruTranslation : currentWord?.esWord;
  const frontSubtext = isEsToRu ? currentWord?.transcription : '';
  const backSubtext = isEsToRu ? '' : currentWord?.transcription;

  const handleResult = async (result: TrainingResult) => {
    if (!currentWord || !trainingSessionId) return;

    if (result === 'know') setKnownCount(prev => prev + 1);
    else if (result === 'dont_know') setWrongCount(prev => prev + 1);
    else setDoubtCount(prev => prev + 1);

    // Update Leitner box
    let newBox = currentWord.leitnerBox;
    if (result === 'know') {
      newBox = Math.min(currentWord.leitnerBox + 1, 5);
    } else if (result === 'dont_know') {
      newBox = Math.max(1, currentWord.leitnerBox - (currentWord.leitnerBox > 2 ? 2 : currentWord.leitnerBox - 1));
    }

    const nextReview = getLeitnerNextReview(newBox);
    const correctDelta = result === 'know' ? 1 : 0;
    const wrongDelta = result === 'dont_know' ? 1 : 0;

    await db.words.update(currentWord.id, {
      leitnerBox: newBox,
      nextReviewAt: nextReview,
      correctCount: currentWord.correctCount + correctDelta,
      wrongCount: currentWord.wrongCount + wrongDelta,
      updatedAt: new Date(),
    });

    await db.trainingRecords.add({
      id: uuidv4(),
      wordId: currentWord.id,
      mode: 'flashcard',
      result,
      leitnerBox: newBox,
      nextReviewAt: nextReview,
      sessionId: trainingSessionId,
      createdAt: new Date(),
    });

    // Next word or finish
    if (currentIndex + 1 < words.length) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      // Session complete - use current state values + this result
      const finalCorrect = knownCount + (result === 'know' ? 1 : 0);
      const finalWrong = wrongCount + (result === 'dont_know' ? 1 : 0);
      const finalDoubt = doubtCount + (result === 'doubt' ? 1 : 0);

      await db.trainingSessions.add({
        id: trainingSessionId,
        mode: 'flashcard',
        direction: trainingDirection,
        source: 'all',
        totalWords: words.length,
        correctCount: finalCorrect,
        wrongCount: finalWrong,
        skippedCount: finalDoubt,
        startedAt: new Date(),
        completedAt: new Date(),
      });

      setShowTrainingResults(true);
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number } }) => {
    const threshold = 80;
    if (info.offset.x > threshold && isFlipped) {
      handleResult('know');
    } else if (info.offset.x < -threshold && isFlipped) {
      handleResult('dont_know');
    }
  };

  if (!currentWord) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <div className="px-1 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm text-muted-foreground">
            {currentIndex + 1} / {words.length}
          </p>
          <p className="text-sm text-muted-foreground">
            ✓ {knownCount}
          </p>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 perspective-1000">
        <motion.div
          className="w-full max-w-sm"
          style={{ x, rotate, opacity }}
          drag={isFlipped ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          onDragEnd={handleDragEnd}
          whileDrag={{ cursor: "grabbing" }}
        >
          <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
            {/* Front */}
            <Card className="flip-card-front p-8 min-h-[280px] flex flex-col items-center justify-center text-center">
              <div className="mb-4">
                <h2 className="text-3xl font-semibold text-foreground mb-2">{frontText}</h2>
                {frontSubtext && (
                  <p className="text-base text-muted-foreground">[{frontSubtext}]</p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setIsFlipped(true)}
                className="mt-4"
              >
                <Eye className="w-4 h-4 mr-2" />
                Показать перевод
              </Button>
            </Card>

            {/* Back */}
            <Card className="flip-card-back p-8 min-h-[280px] flex flex-col items-center justify-center text-center absolute inset-0">
              <div className="mb-2">
                <h2 className="text-3xl font-semibold text-foreground mb-2">{backText}</h2>
                {backSubtext && (
                  <p className="text-base text-muted-foreground">[{backSubtext}]</p>
                )}
              </div>
              {currentWord.exampleEs && (
                <p className="text-sm text-muted-foreground italic mt-2 line-clamp-2">
                  {currentWord.exampleEs}
                </p>
              )}

              <div className="flex gap-3 mt-6 w-full">
                <Button
                  className="flex-1 bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => handleResult('dont_know')}
                >
                  <X className="w-4 h-4 mr-1" />
                  Не знаю
                </Button>
                <Button
                  className="flex-1 bg-warning text-white hover:bg-warning/90"
                  onClick={() => handleResult('doubt')}
                >
                  <HelpCircle className="w-4 h-4 mr-1" />
                  Сомневаюсь
                </Button>
                <Button
                  className="flex-1 bg-success text-white hover:bg-success/90"
                  onClick={() => handleResult('know')}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Знаю
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground mt-3">
                Свайп влево = не знаю · Свайп вправо = знаю
              </p>
            </Card>
          </div>
        </motion.div>
      </div>

      {/* Reset button */}
      <div className="pt-2 pb-safe flex justify-center">
        <Button variant="ghost" size="sm" onClick={() => {
          setTrainingMode(null);
          setTrainingWords([]);
        }}>
          <RotateCcw className="w-3 h-3 mr-1" />
          Выйти из тренировки
        </Button>
      </div>
    </div>
  );
}
