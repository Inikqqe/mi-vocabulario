"use client";

import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { PartOfSpeech } from "@/types";
import { PART_OF_SPEECH_LABELS, PART_OF_SPEECH_COLORS } from "@/types";
import { getApiKey, setApiKey } from "@/lib/ai";
import { loadBaseDictionary } from "@/lib/seed";
import { useTheme } from "next-themes";
import {
  BookOpen, Target, Flame, TrendingUp,
  Download, Upload, Sun, Moon, Monitor,
  Sparkles, BarChart3, Settings, FolderOpen, BookPlus,
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

export function ProfileTab() {
  const [activeSection, setActiveSection] = useState<'stats' | 'settings' | 'export'>('stats');
  const { resolvedTheme, setTheme } = useTheme();
  const [apiKeyInput, setApiKeyInput] = useState("");

  useEffect(() => {
    setApiKeyInput(getApiKey());
  }, []);

  const words = useLiveQuery(() => db.words.toArray()) || [];
  const trainingRecords = useLiveQuery(() => db.trainingRecords.toArray()) || [];

  // Compute stats
  const totalWords = words.length;
  const learnedWords = words.filter(w => w.leitnerBox >= 4).length;
  const totalCorrect = trainingRecords.filter(r => r.result === 'know' || r.result === 'correct').length;
  const totalWrong = trainingRecords.filter(r => r.result === 'dont_know' || r.result === 'wrong').length;
  const accuracy = totalCorrect + totalWrong > 0
    ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100)
    : 0;

  // Part of speech distribution
  const posDistribution: Record<string, number> = {};
  words.forEach(w => {
    posDistribution[w.partOfSpeech] = (posDistribution[w.partOfSpeech] || 0) + 1;
  });

  // Streak calculation (simplified)
  const getStreak = () => {
    if (trainingRecords.length === 0) return 0;
    const days = new Set(
      trainingRecords.map(r => new Date(r.createdAt).toDateString())
    );
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (days.has(d.toDateString())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  };

  // Top difficult words
  const difficultWords = [...words]
    .sort((a, b) => b.wrongCount - a.wrongCount)
    .filter(w => w.wrongCount > 0)
    .slice(0, 5);

  const handleSaveApiKey = () => {
    setApiKey(apiKeyInput);
    toast.success(apiKeyInput.trim() ? "API-ключ сохранён" : "API-ключ удалён");
  };

  const handleLoadBaseDictionary = async () => {
    const added = await loadBaseDictionary();
    if (added > 0) {
      toast.success(`Добавлено ${added} слов из базового словаря`);
    } else {
      toast.info("Все слова базового словаря уже добавлены");
    }
  };

  // Export to CSV
  const handleExportCSV = useCallback(async () => {
    const allWords = await db.words.toArray();

    const csvData = allWords.map(w => ({
      'Испанское слово': w.esWord,
      'Перевод': w.ruTranslation,
      'Часть речи': w.partOfSpeech,
      'Избранное': w.isFavorite ? 'да' : 'нет',
      'Ящик Leitner': w.leitnerBox,
    }));

    const csv = Papa.unparse(csvData);
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mi_vocabulario_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Словарь экспортирован в CSV");
  }, []);

  // Export to JSON
  const handleExportJSON = useCallback(async () => {
    const data = {
      words: await db.words.toArray(),
      trainingRecords: await db.trainingRecords.toArray(),
      exportedAt: new Date().toISOString(),
      version: '1.1',
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mi_vocabulario_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Резервная копия сохранена");
  }, []);

  // Import from JSON
  const handleImportJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.words) {
          await db.words.bulkPut(data.words);
        }
        toast.success(`Импортировано ${data.words?.length || 0} слов`);
      } catch {
        toast.error("Ошибка при импорте файла");
      }
    };
    input.click();
  }, []);

  // Import from CSV
  const handleImportCSV = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        const { v4: uuidv4 } = await import('uuid');
        const now = new Date();

        const wordsToAdd = (result.data as Record<string, string>[]).map((row) => ({
          id: uuidv4(),
          esWord: row['Испанское слово'] || row['esWord'] || '',
          ruTranslation: row['Перевод'] || row['ruTranslation'] || '',
          transcription: '',
          partOfSpeech: (row['Часть речи'] || row['partOfSpeech'] || 'noun') as PartOfSpeech,
          exampleEs: '',
          exampleRu: '',
          note: '',
          isFavorite: (row['Избранное'] || row['isFavorite']) === 'да',
          leitnerBox: parseInt(row['Ящик Leitner'] || row['leitnerBox'] || '1'),
          nextReviewAt: now,
          correctCount: 0,
          wrongCount: 0,
          createdAt: now,
          updatedAt: now,
        })).filter(w => w.esWord && w.ruTranslation);

        await db.words.bulkPut(wordsToAdd);
        toast.success(`Импортировано ${wordsToAdd.length} слов`);
      } catch {
        toast.error("Ошибка при импорте CSV");
      }
    };
    input.click();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pb-2">
        <h1 className="text-xl font-semibold text-foreground">Профиль</h1>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
        {[
          { key: 'stats' as const, label: 'Статистика', icon: <BarChart3 className="w-4 h-4" /> },
          { key: 'settings' as const, label: 'Настройки', icon: <Settings className="w-4 h-4" /> },
          { key: 'export' as const, label: 'Данные', icon: <FolderOpen className="w-4 h-4" /> },
        ].map((tab) => (
          <Badge
            key={tab.key}
            variant={activeSection === tab.key ? "default" : "outline"}
            className={`cursor-pointer py-1.5 px-3 whitespace-nowrap ${
              activeSection === tab.key ? "bg-primary text-primary-foreground" : ""
            }`}
            onClick={() => setActiveSection(tab.key)}
          >
            {tab.icon}
            <span className="ml-1 text-xs">{tab.label}</span>
          </Badge>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
        {/* STATS */}
        {activeSection === 'stats' && (
          <>
            {/* Main stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Всего слов</span>
                </div>
                <p className="text-2xl font-bold">{totalWords}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-success" />
                  <span className="text-xs text-muted-foreground">Изучено</span>
                </div>
                <p className="text-2xl font-bold text-success">{learnedWords}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-4 h-4 text-chart-3" />
                  <span className="text-xs text-muted-foreground">Серия (streak)</span>
                </div>
                <p className="text-2xl font-bold">{getStreak()} дн.</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Точность</span>
                </div>
                <p className="text-2xl font-bold">{accuracy}%</p>
              </Card>
            </div>

            {/* POS distribution */}
            <Card className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Распределение по частям речи</h3>
              <div className="space-y-2">
                {Object.entries(posDistribution).map(([pos, count]) => {
                  const pct = totalWords > 0 ? (count / totalWords) * 100 : 0;
                  const colors = PART_OF_SPEECH_COLORS[pos as PartOfSpeech];
                  const isDark = resolvedTheme === 'dark';
                  return (
                    <div key={pos} className="flex items-center gap-2">
                      <span className="text-xs w-16 text-muted-foreground">{PART_OF_SPEECH_LABELS[pos as PartOfSpeech]}</span>
                      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: isDark ? colors.darkBg : colors.bg,
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Difficult words */}
            {difficultWords.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Топ сложных слов</h3>
                <div className="space-y-2">
                  {difficultWords.map((word) => (
                    <div key={word.id} className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">{word.esWord}</span>
                        <span className="text-xs text-muted-foreground ml-2">{word.ruTranslation}</span>
                      </div>
                      <span className="text-xs text-destructive font-medium">{word.wrongCount} ошибок</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {/* SETTINGS */}
        {activeSection === 'settings' && (
          <>
            {/* Theme */}
            <Card className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Тема оформления</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'light', label: 'Светлая', icon: <Sun className="w-4 h-4" /> },
                  { value: 'dark', label: 'Тёмная', icon: <Moon className="w-4 h-4" /> },
                  { value: 'system', label: 'Системная', icon: <Monitor className="w-4 h-4" /> },
                ].map((theme) => (
                  <Card
                    key={theme.value}
                    className={`p-3 cursor-pointer text-center transition-all ${
                      resolvedTheme === theme.value || (theme.value === 'system' && !['light', 'dark'].includes(resolvedTheme || ''))
                        ? 'ring-2 ring-primary'
                        : ''
                    }`}
                    onClick={() => setTheme(theme.value)}
                  >
                    <div className="flex justify-center mb-1">{theme.icon}</div>
                    <p className="text-xs font-medium">{theme.label}</p>
                  </Card>
                ))}
              </div>
            </Card>

            {/* AI API key */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-medium">ИИ-помощник (Claude)</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Вставьте API-ключ Anthropic, чтобы кнопка ✨ в форме добавления
                автоматически заполняла перевод и часть речи. Ключ хранится только
                на этом устройстве. Получить ключ: platform.claude.com
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="sk-ant-..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="flex-1"
                  autoComplete="off"
                />
                <Button variant="outline" onClick={handleSaveApiKey}>
                  Сохранить
                </Button>
              </div>
            </Card>
          </>
        )}

        {/* EXPORT/IMPORT */}
        {activeSection === 'export' && (
          <>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Базовый словарь</h3>
              <Button variant="outline" className="w-full justify-start" onClick={handleLoadBaseDictionary}>
                <BookPlus className="w-4 h-4 mr-2" />
                Загрузить базовый словарь (200 слов)
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Добавит 200 основных испанских слов. Уже добавленные слова пропускаются.
              </p>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Экспорт</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={handleExportCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Экспорт в CSV (Excel)
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleExportJSON}>
                  <Download className="w-4 h-4 mr-2" />
                  Экспорт в JSON (резервная копия)
                </Button>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Импорт</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={handleImportCSV}>
                  <Upload className="w-4 h-4 mr-2" />
                  Импорт из CSV
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleImportJSON}>
                  <Upload className="w-4 h-4 mr-2" />
                  Импорт из JSON
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
