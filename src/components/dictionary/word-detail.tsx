"use client";

import { ArrowLeft, Star, Pencil, Trash2, Volume2, Calendar, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PosBadge } from "@/components/shared/pos-badge";
import { useAppStore } from "@/store/app-store";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";

export function WordDetail() {
  const { selectedWordId, setSelectedWordId, setEditingWordId, setDeleteWordId, setActiveTab } = useAppStore();

  const word = useLiveQuery(
    () => selectedWordId ? db.words.get(selectedWordId) : undefined,
    [selectedWordId]
  );

  const wordTags = useLiveQuery(
    () => selectedWordId
      ? db.wordTags.where('wordId').equals(selectedWordId).toArray()
      : [],
    [selectedWordId]
  );

  const tags = useLiveQuery(async () => {
    if (!wordTags?.length) return [];
    const tagIds = wordTags.map(wt => wt.tagId);
    return db.tags.where('id').anyOf(tagIds).toArray();
  }, [wordTags]);

  if (!word) return null;

  const handleToggleFavorite = async () => {
    await db.words.update(word.id, { isFavorite: !word.isFavorite, updatedAt: new Date() });
    toast.success(word.isFavorite ? "Убрано из избранного" : "Добавлено в избранное");
  };

  const handleEdit = () => {
    setEditingWordId(word.id);
    setActiveTab('add');
  };

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.esWord);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  const accuracy = word.correctCount + word.wrongCount > 0
    ? Math.round((word.correctCount / (word.correctCount + word.wrongCount)) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-1 pb-3">
        <Button variant="ghost" size="icon" onClick={() => setSelectedWordId(null)} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-medium flex-1">Карточка слова</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
        {/* Main word card */}
        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <PosBadge pos={word.partOfSpeech} />
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSpeak}>
                <Volume2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleToggleFavorite}>
                <Star className={`w-4 h-4 ${word.isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="mb-1">
            <h1 className="text-3xl font-semibold text-foreground">{word.esWord}</h1>
            {word.transcription && (
              <p className="text-base text-muted-foreground mt-0.5">[{word.transcription}]</p>
            )}
          </div>

          <p className="text-xl text-foreground/90 mt-2">{word.ruTranslation}</p>
        </Card>

        {/* Example */}
        {(word.exampleEs || word.exampleRu) && (
          <Card className="p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Пример</h3>
            {word.exampleEs && (
              <p className="text-sm text-foreground italic mb-1">{word.exampleEs}</p>
            )}
            {word.exampleRu && (
              <p className="text-sm text-muted-foreground">{word.exampleRu}</p>
            )}
          </Card>
        )}

        {/* Note */}
        {word.note && (
          <Card className="p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Заметка</h3>
            <p className="text-sm text-foreground">{word.note}</p>
          </Card>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <Card className="p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Теги</h3>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: tag.colorHex + '20',
                    color: tag.colorHex,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Stats */}
        <Card className="p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Статистика</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Точность</p>
                <p className="text-sm font-medium">{accuracy}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Добавлено</p>
                <p className="text-sm font-medium">
                  {new Date(word.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-success flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">✓</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Правильно</p>
                <p className="text-sm font-medium">{word.correctCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">✗</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ошибки</p>
                <p className="text-sm font-medium">{word.wrongCount}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ящик Leitner:</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((box) => (
                <div
                  key={box}
                  className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${
                    box <= word.leitnerBox
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {box}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom actions */}
      <div className="flex gap-2 pt-3 pb-safe">
        <Button variant="outline" className="flex-1" onClick={handleEdit}>
          <Pencil className="w-4 h-4 mr-1" />
          Редактировать
        </Button>
        <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteWordId(word.id)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
