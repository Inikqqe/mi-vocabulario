"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PART_OF_SPEECH_LABELS, type PartOfSpeech } from "@/types";
import { toast } from "sonner";
import { Plus, X, Save, Sparkles, Tag } from "lucide-react";

const POS_OPTIONS: PartOfSpeech[] = ['verb', 'noun', 'adj', 'adv', 'phrase', 'other'];

export function AddWordForm() {
  const { editingWordId, setEditingWordId, setActiveTab } = useAppStore();

  const existingWord = useLiveQuery(
    () => editingWordId ? db.words.get(editingWordId) : undefined,
    [editingWordId]
  );

  const allTags = useLiveQuery(() => db.tags.toArray());

  const [esWord, setEsWord] = useState("");
  const [ruTranslation, setRuTranslation] = useState("");
  const [transcription, setTranscription] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech>("noun");
  const [exampleEs, setExampleEs] = useState("");
  const [exampleRu, setExampleRu] = useState("");
  const [note, setNote] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");

  // Fill form when editing
  useEffect(() => {
    if (existingWord) {
      setEsWord(existingWord.esWord);
      setRuTranslation(existingWord.ruTranslation);
      setTranscription(existingWord.transcription);
      setPartOfSpeech(existingWord.partOfSpeech);
      setExampleEs(existingWord.exampleEs);
      setExampleRu(existingWord.exampleRu);
      setNote(existingWord.note);
      // Load tags
      db.wordTags.where('wordId').equals(existingWord.id).toArray().then((wts) => {
        setSelectedTagIds(wts.map(wt => wt.tagId));
      });
    } else {
      setEsWord("");
      setRuTranslation("");
      setTranscription("");
      setPartOfSpeech("noun");
      setExampleEs("");
      setExampleRu("");
      setNote("");
      setSelectedTagIds([]);
    }
  }, [existingWord]);

  const isFormValid = esWord.trim() && ruTranslation.trim() && partOfSpeech;

  const handleSubmit = async () => {
    if (!isFormValid) return;

    try {
      if (editingWordId && existingWord) {
        // Update
        await db.words.update(editingWordId, {
          esWord: esWord.trim(),
          ruTranslation: ruTranslation.trim(),
          transcription: transcription.trim(),
          partOfSpeech,
          exampleEs: exampleEs.trim(),
          exampleRu: exampleRu.trim(),
          note: note.trim(),
          updatedAt: new Date(),
        });

        // Update tags
        await db.wordTags.where('wordId').equals(editingWordId).delete();
        for (const tagId of selectedTagIds) {
          await db.wordTags.add({ wordId: editingWordId, tagId });
        }

        toast.success("Слово обновлено");
        setEditingWordId(null);
        setActiveTab('dictionary');
      } else {
        // Create
        const { v4: uuidv4 } = await import('uuid');
        const wordId = uuidv4();
        const now = new Date();

        await db.words.add({
          id: wordId,
          esWord: esWord.trim(),
          ruTranslation: ruTranslation.trim(),
          transcription: transcription.trim(),
          partOfSpeech,
          exampleEs: exampleEs.trim(),
          exampleRu: exampleRu.trim(),
          note: note.trim(),
          isFavorite: false,
          leitnerBox: 1,
          nextReviewAt: now,
          correctCount: 0,
          wrongCount: 0,
          createdAt: now,
          updatedAt: now,
        });

        // Add tags
        for (const tagId of selectedTagIds) {
          await db.wordTags.add({ wordId, tagId });
        }

        toast.success("Слово добавлено");

        // Reset form
        setEsWord("");
        setRuTranslation("");
        setTranscription("");
        setPartOfSpeech("noun");
        setExampleEs("");
        setExampleRu("");
        setNote("");
        setSelectedTagIds([]);
      }
    } catch {
      toast.error("Ошибка при сохранении");
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    const { v4: uuidv4 } = await import('uuid');
    const tagId = uuidv4();

    // Generate a random color for the tag
    const hue = Math.floor(Math.random() * 360);
    const colorHex = `hsl(${hue}, 60%, 50%)`;

    await db.tags.add({
      id: tagId,
      name: newTagName.trim(),
      colorHex,
      createdAt: new Date(),
    });

    setSelectedTagIds([...selectedTagIds, tagId]);
    setNewTagName("");
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(
      selectedTagIds.includes(tagId)
        ? selectedTagIds.filter(id => id !== tagId)
        : [...selectedTagIds, tagId]
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pb-3">
        <h1 className="text-xl font-semibold text-foreground">
          {editingWordId ? "Редактировать слово" : "Новое слово"}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
        {/* Spanish word */}
        <div className="space-y-1.5">
          <Label htmlFor="esWord" className="text-sm font-medium">
            Испанское слово <span className="text-destructive">*</span>
          </Label>
          <Input
            id="esWord"
            placeholder="hola"
            value={esWord}
            onChange={(e) => setEsWord(e.target.value)}
            className="text-lg"
            autoComplete="off"
          />
        </div>

        {/* Russian translation */}
        <div className="space-y-1.5">
          <Label htmlFor="ruTranslation" className="text-sm font-medium">
            Перевод (рус.) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ruTranslation"
            placeholder="привет"
            value={ruTranslation}
            onChange={(e) => setRuTranslation(e.target.value)}
            className="text-lg"
            autoComplete="off"
          />
        </div>

        {/* Transcription */}
        <div className="space-y-1.5">
          <Label htmlFor="transcription" className="text-sm font-medium">
            Транскрипция (IPA)
          </Label>
          <Input
            id="transcription"
            placeholder="ˈo.la"
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Part of speech */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Часть речи <span className="text-destructive">*</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {POS_OPTIONS.map((pos) => (
              <Badge
                key={pos}
                variant={partOfSpeech === pos ? "default" : "outline"}
                className={`cursor-pointer text-sm py-1.5 px-3 ${
                  partOfSpeech === pos
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
                onClick={() => setPartOfSpeech(pos)}
              >
                {PART_OF_SPEECH_LABELS[pos]}
              </Badge>
            ))}
          </div>
        </div>

        {/* Example */}
        <Card className="p-4 space-y-3">
          <Label className="text-sm font-medium">Пример</Label>
          <div className="space-y-2">
            <Input
              placeholder="Пример на испанском..."
              value={exampleEs}
              onChange={(e) => setExampleEs(e.target.value)}
              autoComplete="off"
            />
            <Input
              placeholder="Перевод примера..."
              value={exampleRu}
              onChange={(e) => setExampleRu(e.target.value)}
              autoComplete="off"
            />
          </div>
        </Card>

        {/* Note */}
        <div className="space-y-1.5">
          <Label htmlFor="note" className="text-sm font-medium">Заметка</Label>
          <Textarea
            id="note"
            placeholder="Личные комментарии, мнемоники..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Теги</Label>
          {allTags && allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  style={selectedTagIds.includes(tag.id) ? {
                    backgroundColor: tag.colorHex,
                    color: 'white',
                  } : {}}
                  onClick={() => toggleTag(tag.id)}
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Новый тег..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="flex-1"
              autoComplete="off"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <Button variant="outline" size="icon" onClick={handleAddTag} disabled={!newTagName.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="pt-3 pb-safe">
        <Button
          className="w-full h-12 text-base"
          disabled={!isFormValid}
          onClick={handleSubmit}
        >
          <Save className="w-4 h-4 mr-2" />
          {editingWordId ? "Сохранить изменения" : "Добавить слово"}
        </Button>
        {editingWordId && (
          <Button
            variant="ghost"
            className="w-full mt-2"
            onClick={() => {
              setEditingWordId(null);
              setActiveTab('dictionary');
            }}
          >
            Отмена
          </Button>
        )}
      </div>
    </div>
  );
}
