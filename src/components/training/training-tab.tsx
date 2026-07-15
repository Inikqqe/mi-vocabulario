"use client";

import { useAppStore } from "@/store/app-store";
import { TrainingModeSelect } from "./training-mode-select";
import { LearnMode } from "./learn-mode";
import { FlashcardMode } from "./flashcard-mode";
import { QuizMode } from "./quiz-mode";
import { SprintMode } from "./sprint-mode";
import { TrainingResults } from "./training-results";

export function TrainingTab() {
  const { trainingMode, trainingWords, showTrainingResults } = useAppStore();

  // Show results
  if (showTrainingResults) {
    return <TrainingResults />;
  }

  // Show active training
  if (trainingMode && trainingWords.length > 0) {
    switch (trainingMode) {
      case 'learn':
        return <LearnMode />;
      case 'flashcard':
        return <FlashcardMode />;
      case 'quiz':
        return <QuizMode />;
      case 'sprint':
        return <SprintMode />;
    }
  }

  // Show mode selection
  return <TrainingModeSelect />;
}
