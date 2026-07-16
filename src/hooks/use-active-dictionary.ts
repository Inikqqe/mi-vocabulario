"use client";

import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useAppStore } from '@/store/app-store';

// Возвращает список словарей и активный словарь.
// Если активный не выбран или был удалён — выбирает первый доступный.
export function useActiveDictionary() {
  const { activeDictionaryId, setActiveDictionaryId } = useAppStore();

  const dictionaries = useLiveQuery(
    () => db.dictionaries.orderBy('createdAt').toArray()
  );

  useEffect(() => {
    if (!dictionaries || dictionaries.length === 0) return;
    const exists = dictionaries.some((d) => d.id === activeDictionaryId);
    if (!exists) {
      setActiveDictionaryId(dictionaries[0].id);
    }
  }, [dictionaries, activeDictionaryId, setActiveDictionaryId]);

  const active = dictionaries?.find((d) => d.id === activeDictionaryId) || null;

  return { dictionaries: dictionaries || [], active, activeDictionaryId, setActiveDictionaryId };
}
