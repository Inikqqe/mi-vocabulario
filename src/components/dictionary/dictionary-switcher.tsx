"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useActiveDictionary } from "@/hooks/use-active-dictionary";
import { LANGUAGES, DEFAULT_LANGUAGE_CODE, getLanguage } from "@/lib/languages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

// Переключатель словарей: выбор активного, создание (с выбором языка) и удаление
export function DictionarySwitcher() {
  const { dictionaries, active, setActiveDictionaryId } = useActiveDictionary();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLanguage, setNewLanguage] = useState(DEFAULT_LANGUAGE_CODE);

  const wordCounts = useLiveQuery(async () => {
    const counts: Record<string, number> = {};
    for (const d of await db.dictionaries.toArray()) {
      counts[d.id] = await db.words.where('dictionaryId').equals(d.id).count();
    }
    return counts;
  }) || {};

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const exists = dictionaries.some(
      (d) => d.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      toast.error("Словарь с таким названием уже есть");
      return;
    }

    const id = uuidv4();
    await db.dictionaries.add({
      id,
      name: trimmed,
      language: newLanguage,
      createdAt: new Date(),
    });
    setActiveDictionaryId(id);
    setCreateOpen(false);
    setNewName("");
    setNewLanguage(DEFAULT_LANGUAGE_CODE);
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

  const activeLang = getLanguage(active?.language);

  return (
    <>
      {/* modal={false}: иначе меню и диалог создания конфликтуют за
          pointer-events на body, и приложение перестаёт кликаться */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 max-w-[220px]">
            <span className="shrink-0">{activeLang.emoji}</span>
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
              <span className="shrink-0 mr-1.5">{getLanguage(d.language).emoji}</span>
              <span className="truncate flex-1">{d.name}</span>
              <span className="text-xs text-muted-foreground ml-2 shrink-0">
                {wordCounts[d.id] ?? 0}
              </span>
              {d.id === active?.id && <Check className="w-4 h-4 ml-1.5 shrink-0 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Новый словарь
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Удалить текущий
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Диалог создания словаря */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новый словарь</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dictName" className="text-sm font-medium">Название</Label>
              <Input
                id="dictName"
                placeholder="Например: Английский для работы"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoComplete="off"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Изучаемый язык</Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <Badge
                    key={lang.code}
                    variant={newLanguage === lang.code ? "default" : "outline"}
                    className={`cursor-pointer text-sm py-1.5 px-3 ${
                      newLanguage === lang.code
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => setNewLanguage(lang.code)}
                  >
                    {lang.emoji} {lang.name}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Перевод всегда на русский. Язык влияет на подписи, озвучку и проверку через ИИ.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" disabled={!newName.trim()} onClick={handleCreate}>
              Создать словарь
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
