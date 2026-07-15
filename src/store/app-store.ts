import { create } from 'zustand';
import type { PartOfSpeech, FilterOption, SortOption, TrainingMode, TrainingDirection, Word } from '@/types';

export type AppTab = 'dictionary' | 'add' | 'training' | 'profile';

interface AppState {
  // Navigation
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;

  // Dictionary
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeFilter: FilterOption;
  setActiveFilter: (f: FilterOption) => void;
  sortOption: SortOption;
  setSortOption: (s: SortOption) => void;
  selectedWordId: string | null;
  setSelectedWordId: (id: string | null) => void;
  editingWordId: string | null;
  setEditingWordId: (id: string | null) => void;

  // Training
  trainingMode: TrainingMode | null;
  setTrainingMode: (m: TrainingMode | null) => void;
  trainingDirection: TrainingDirection;
  setTrainingDirection: (d: TrainingDirection) => void;
  trainingSource: 'all' | 'new' | 'favorites' | 'weak' | 'pos';
  setTrainingSource: (s: 'all' | 'new' | 'favorites' | 'weak' | 'pos') => void;
  trainingSourceFilter: string;
  setTrainingSourceFilter: (f: string) => void;
  trainingSessionId: string | null;
  setTrainingSessionId: (id: string | null) => void;
  trainingWords: Word[];
  setTrainingWords: (w: Word[]) => void;
  showTrainingResults: boolean;
  setShowTrainingResults: (v: boolean) => void;

  // Onboarding
  showOnboarding: boolean;
  setShowOnboarding: (v: boolean) => void;

  // Delete confirmation
  deleteWordId: string | null;
  setDeleteWordId: (id: string | null) => void;

  // Tag management
  tagFilterId: string | null;
  setTagFilterId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  activeTab: 'dictionary',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Dictionary
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  activeFilter: 'all',
  setActiveFilter: (f) => set({ activeFilter: f }),
  sortOption: 'date-desc',
  setSortOption: (s) => set({ sortOption: s }),
  selectedWordId: null,
  setSelectedWordId: (id) => set({ selectedWordId: id }),
  editingWordId: null,
  setEditingWordId: (id) => set({ editingWordId: id }),

  // Training
  trainingMode: null,
  setTrainingMode: (m) => set({ trainingMode: m }),
  trainingDirection: 'es-ru',
  setTrainingDirection: (d) => set({ trainingDirection: d }),
  trainingSource: 'all',
  setTrainingSource: (s) => set({ trainingSource: s }),
  trainingSourceFilter: '',
  setTrainingSourceFilter: (f) => set({ trainingSourceFilter: f }),
  trainingSessionId: null,
  setTrainingSessionId: (id) => set({ trainingSessionId: id }),
  trainingWords: [],
  setTrainingWords: (w) => set({ trainingWords: w }),
  showTrainingResults: false,
  setShowTrainingResults: (v) => set({ showTrainingResults: v }),

  // Onboarding
  showOnboarding: false,
  setShowOnboarding: (v) => set({ showOnboarding: v }),

  // Delete confirmation
  deleteWordId: null,
  setDeleteWordId: (id) => set({ deleteWordId: id }),

  // Tag management
  tagFilterId: null,
  setTagFilterId: (id) => set({ tagFilterId: id }),
}));
