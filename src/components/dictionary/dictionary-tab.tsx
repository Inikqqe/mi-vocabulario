"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAppStore } from "@/store/app-store";
import { WordCard } from "./word-card";
import { SearchFilterBar } from "./search-filter-bar";
import { WordDetail } from "./word-detail";
import { DictionarySwitcher } from "./dictionary-switcher";
import { EmptyState } from "@/components/shared/empty-state";
import { useActiveDictionary } from "@/hooks/use-active-dictionary";
import { BookOpen } from "lucide-react";
import type { Word } from "@/types";

export function DictionaryTab() {
  const {
    searchQuery, activeFilter, sortOption,
    selectedWordId, setSelectedWordId, setActiveTab,
  } = useAppStore();

  const { activeDictionaryId } = useActiveDictionary();

  const allWords = useLiveQuery(
    () => activeDictionaryId
      ? db.words.where('dictionaryId').equals(activeDictionaryId).toArray()
      : db.words.toArray(),
    [activeDictionaryId]
  ) as Word[] | undefined;

  if (selectedWordId) {
    return <WordDetail />;
  }

  // Apply filters
  let filtered = allWords || [];

  // Search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (w) =>
        w.esWord.toLowerCase().includes(q) ||
        w.ruTranslation.toLowerCase().includes(q)
    );
  }

  // Filter by part of speech or favorites
  if (activeFilter === 'favorites') {
    filtered = filtered.filter((w) => w.isFavorite);
  } else if (activeFilter !== 'all') {
    filtered = filtered.filter((w) => w.partOfSpeech === activeFilter);
  }

  // Sort
  switch (sortOption) {
    case 'date-desc':
      filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'date-asc':
      filtered = [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;
    case 'es-asc':
      filtered = [...filtered].sort((a, b) => a.esWord.localeCompare(b.esWord, 'es'));
      break;
    case 'ru-asc':
      filtered = [...filtered].sort((a, b) => a.ruTranslation.localeCompare(b.ruTranslation, 'ru'));
      break;
    case 'favorites-first':
      filtered = [...filtered].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
      break;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pb-2 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Словарь</h1>
          {allWords && (
            <p className="text-xs text-muted-foreground">{allWords.length} слов</p>
          )}
        </div>
        <DictionarySwitcher />
      </div>

      <SearchFilterBar />

      <div className="flex-1 overflow-y-auto custom-scrollbar mt-2 space-y-2">
        {filtered.length === 0 ? (
          allWords && allWords.length === 0 ? (
            <EmptyState
              title="Словарь пуст"
              description="Добавьте первое слово на испанском, чтобы начать обучение"
              actionLabel="Добавить слово"
              onAction={() => setActiveTab('add')}
              icon={<BookOpen className="w-10 h-10 text-muted-foreground" />}
            />
          ) : (
            <EmptyState
              title="Ничего не найдено"
              description="Попробуйте изменить фильтры или поисковый запрос"
              actionLabel="Добавить слово"
              onAction={() => setActiveTab('add')}
              icon={<BookOpen className="w-10 h-10 text-muted-foreground" />}
            />
          )
        ) : (
          filtered.map((word) => (
            <WordCard
              key={word.id}
              word={word}
              onClick={() => setSelectedWordId(word.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
