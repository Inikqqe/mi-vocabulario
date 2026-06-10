"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/store/app-store";
import { PART_OF_SPEECH_LABELS, type FilterOption, type SortOption, type PartOfSpeech } from "@/types";
import { useCallback, useEffect, useRef } from "react";

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "verb", label: PART_OF_SPEECH_LABELS.verb },
  { value: "noun", label: PART_OF_SPEECH_LABELS.noun },
  { value: "adj", label: PART_OF_SPEECH_LABELS.adj },
  { value: "adv", label: PART_OF_SPEECH_LABELS.adv },
  { value: "phrase", label: PART_OF_SPEECH_LABELS.phrase },
  { value: "other", label: PART_OF_SPEECH_LABELS.other },
  { value: "favorites", label: "★ Избранное" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Новые сначала" },
  { value: "date-asc", label: "Старые сначала" },
  { value: "es-asc", label: "А → Я (исп.)" },
  { value: "ru-asc", label: "А → Я (рус.)" },
  { value: "favorites-first", label: "Сначала избранные" },
];

export function SearchFilterBar() {
  const {
    searchQuery, setSearchQuery,
    activeFilter, setActiveFilter,
    sortOption, setSortOption,
  } = useAppStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback((value: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 150);
  }, [setSearchQuery]);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2 space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Поиск слов..."
            className="pl-9 pr-8 h-10 bg-card"
            onChange={(e) => handleSearch(e.target.value)}
            defaultValue={searchQuery}
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => {
                setSearchQuery("");
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SORT_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => setSortOption(opt.value)}
                className={sortOption === opt.value ? "bg-accent" : ""}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {FILTER_OPTIONS.map((opt) => (
          <Badge
            key={opt.value}
            variant={activeFilter === opt.value ? "default" : "outline"}
            className={`cursor-pointer whitespace-nowrap text-xs shrink-0 ${
              activeFilter === opt.value
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "hover:bg-accent"
            }`}
            onClick={() => setActiveFilter(opt.value)}
          >
            {opt.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
