"use client";

import { useAppStore } from "@/store/app-store";
import { DictionaryTab } from "@/components/dictionary/dictionary-tab";
import { AddWordForm } from "@/components/dictionary/add-word-form";
import { TrainingTab } from "@/components/training/training-tab";
import { ProfileTab } from "@/components/profile/profile-tab";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm";
import { PwaRegister } from "@/components/shared/pwa-register";
import { autoSeedIfEmpty } from "@/lib/seed";
import { useEffect } from "react";
import { BookOpen, PlusCircle, Brain, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AppTab } from "@/store/app-store";

const TABS: { key: AppTab; label: string; icon: React.ReactNode }[] = [
  { key: "dictionary", label: "Словарь", icon: <BookOpen className="w-5 h-5" /> },
  { key: "add", label: "Добавить", icon: <PlusCircle className="w-5 h-5" /> },
  { key: "training", label: "Тренировка", icon: <Brain className="w-5 h-5" /> },
  { key: "profile", label: "Профиль", icon: <BarChart3 className="w-5 h-5" /> },
];

export function AppShell() {
  const { activeTab, setActiveTab } = useAppStore();

  // Первый запуск: загружаем базовый словарь (200 слов)
  useEffect(() => {
    autoSeedIfEmpty();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "dictionary":
        return <DictionaryTab />;
      case "add":
        return <AddWordForm />;
      case "training":
        return <TrainingTab />;
      case "profile":
        return <ProfileTab />;
    }
  };

  return (
    <div className="flex flex-col h-dvh max-h-dvh bg-background">
      {/* Main content */}
      <main className="flex-1 overflow-hidden px-4 pt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom tab navigation */}
      <nav className="border-t border-border bg-card/95 backdrop-blur-sm pb-safe">
        <div className="flex items-center justify-around h-14">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  // Reset navigation states when switching tabs
                  if (tab.key === 'dictionary') {
                    useAppStore.getState().setSelectedWordId(null);
                    useAppStore.getState().setEditingWordId(null);
                  }
                  if (tab.key === 'add') {
                    useAppStore.getState().setEditingWordId(null);
                  }
                  setActiveTab(tab.key);
                }}
              >
                <div className="relative">
                  {tab.icon}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Global dialogs */}
      <DeleteConfirmDialog />

      {/* PWA install prompt */}
      <PwaRegister />
    </div>
  );
}
