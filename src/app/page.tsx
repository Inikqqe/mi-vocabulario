"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { BookOpen, PlusCircle, Brain, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ONBOARDING_STEPS = [
  {
    icon: <BookOpen className="w-16 h-16 text-primary" />,
    title: "Mi Vocabulario",
    description: "Ваш персональный словарь иностранных слов. Добавляйте слова, тренируйтесь и запоминайте легко.",
  },
  {
    icon: <PlusCircle className="w-16 h-16 text-success" />,
    title: "Добавляйте слова",
    description: "Ведите отдельные словари для разных языков — испанского, английского и других. Перевод и проверку ошибок подскажет ИИ.",
  },
  {
    icon: <Brain className="w-16 h-16 text-chart-3" />,
    title: "Тренируйтесь",
    description: "Карточки с интервальным повторением, викторины и спринты помогут закрепить лексику навсегда.",
  },
];

function getIsFirstVisit(): boolean {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem('mi_vocab_visited');
}

export default function Home() {
  const [showOnboarding, setShowOnboarding] = useState(getIsFirstVisit);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const handleFinishOnboarding = () => {
    localStorage.setItem('mi_vocab_visited', 'true');
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    const step = ONBOARDING_STEPS[onboardingStep];
    const isLast = onboardingStep === ONBOARDING_STEPS.length - 1;

    return (
      <div className="flex flex-col h-dvh bg-background">
        <div className="flex justify-end p-4">
          <Button variant="ghost" size="sm" onClick={handleFinishOnboarding}>
            Пропустить
          </Button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={onboardingStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="w-28 h-28 rounded-full bg-accent/50 flex items-center justify-center mb-8">
                {step.icon}
              </div>
              <h2 className="text-2xl font-bold mb-3">{step.title}</h2>
              <p className="text-muted-foreground text-base max-w-[300px] leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Indicators + button */}
        <div className="p-6 pb-8">
          <div className="flex justify-center gap-2 mb-6">
            {ONBOARDING_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === onboardingStep ? 'bg-primary w-6' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {isLast ? (
            <Button className="w-full h-12 text-base" onClick={handleFinishOnboarding}>
              Начать!
            </Button>
          ) : (
            <Button className="w-full h-12 text-base" onClick={() => setOnboardingStep(prev => prev + 1)}>
              Далее
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return <AppShell />;
}
