"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useActiveDictionary } from "@/hooks/use-active-dictionary";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookOpen, ChevronDown, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

// Переключатель словарей: выбор активного, создание и удаление
export function DictionarySwitcher() {
  const { dictionaries, active, setActiveDictionaryId } = useActiveDictionary();

  const wordCounts = useLiveQuery(async () => {
    const counts: Record<string, number> = {};
    for (const d of await db.dictionaries.toArray()) {
      counts[d.id] = await db.words.where('dictionaryId').equals(d.id).count();
    }
    return counts;
  }) || {};

  const handleCreate = async () => {
    const name = window.prompt("Название нового словаря:");
    if (!name?.trim()) return;

    const trimmed = name.trim();
    const exists = dictionaries.some(
      (d) => d.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      toast.error("Словарь с таким названием уже есть");
      return;
    }

    const id = uuidv4();
    await db.dictionaries.add({ id, name: trimmed, createdAt: new Date() });
    setActiveDictionaryId(id);
    toast.success(`Словарь «${trimmed}» создан`);
  };

  const handleDelete = async () => {
    if (!active) return;
    if (dictionaries.length <= 1) {
      toast.error("Нельзя удалить последний словарь");
      return;
    }

    const count = wordCounts[active.id] || 0;
    const ok = window.confirm(
      `Удалить словарь «${active.name}»${count > 0 ? ` и все его ${count} слов` : ''}? Это действие нельзя отменить.`
    );
    if (!ok) return;

    await db.words.where('dictionaryId').equals(active.id).delete();
    await db.dictionaries.delete(active.id);
    const next = dictionaries.find((d) => d.id !== active.id);
    setActiveDictionaryId(next?.id || null);
    toast.success(`Словарь «${active.name}» удалён`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 max-w-[220px]">
          <BookOpen className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{active?.name || "Словарь"}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {dictionaries.map((d) => (
          <DropdownMenuItem
            key={d.id}
            onClick={() => setActiveDictionaryId(d.id)}
            className="flex items-center justify-between"
          >
            <span className="truncate flex-1">{d.name}</span>
            <span className="text-xs text-muted-foreground ml-2 shrink-0">
              {wordCounts[d.id] ?? 0}
            </span>
            {d.id === active?.id && <Check className="w-4 h-4 ml-1.5 shrink-0 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Новый словарь
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          Удалить текущий
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
