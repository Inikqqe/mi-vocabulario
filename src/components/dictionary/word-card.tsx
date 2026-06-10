"use client";

import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PosBadge } from "@/components/shared/pos-badge";
import type { Word } from "@/types";
import { motion } from "framer-motion";
import { db } from "@/lib/db";
import { toast } from "sonner";

interface WordCardProps {
  word: Word;
  onClick: () => void;
}

export function WordCard({ word, onClick }: WordCardProps) {
  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await db.words.update(word.id, {
      isFavorite: !word.isFavorite,
      updatedAt: new Date(),
    });
    toast.success(word.isFavorite ? "Убрано из избранного" : "Добавлено в избранное");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="p-3.5 cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.98] duration-100 border-border/60"
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <PosBadge pos={word.partOfSpeech} />
              <span className="text-[11px] text-muted-foreground">
                Ящик {word.leitnerBox}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {word.esWord}
              </h3>
              {word.transcription && (
                <span className="text-xs text-muted-foreground truncate">
                  [{word.transcription}]
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {word.ruTranslation}
            </p>
            {word.exampleEs && (
              <p className="text-xs text-muted-foreground/70 truncate mt-1 italic">
                {word.exampleEs}
              </p>
            )}
          </div>
          <button
            className="shrink-0 p-1"
            onClick={handleToggleFavorite}
            aria-label={word.isFavorite ? "Убрать из избранного" : "В избранное"}
          >
            <Star
              className={`w-5 h-5 ${
                word.isFavorite
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/40"
              }`}
            />
          </button>
        </div>
      </Card>
    </motion.div>
  );
}
