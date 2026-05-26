import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AudioTrack {
  id: string;
  name: string;
  uri: string;
  duration: number;
  sourceUrl?: string;
  createdAt: number;
  savedSettings?: EditSettings;
}

export interface EditSettings {
  speed: number;
  pitch: number;
  loopStart: number | null;
  loopEnd: number | null;
  loopEnabled: boolean;
}

export interface LyricsHistoryItem {
  id: string;
  title: string;
  artist: string;
  lyrics: string;
  savedAt: number;
}

interface AudioState {
  tracks: AudioTrack[];
  currentTrackId: string | null;
  editSettings: EditSettings;
  lyrics: string;
  lyricsHistory: LyricsHistoryItem[];
  isPlaying: boolean;
  currentPosition: number;
  hasUnsavedChanges: boolean;
}

interface AudioActions {
  addTrack: (track: AudioTrack) => void;
  removeTrack: (id: string) => void;
  setCurrentTrack: (id: string | null) => void;
  updateEditSettings: (settings: Partial<EditSettings>) => void;
  resetEditSettings: () => void;
  saveEditSettings: () => void;
  loadSavedSettings: (trackId: string) => void;
  setLyrics: (lyrics: string) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentPosition: (position: number) => void;
  getCurrentTrack: () => AudioTrack | undefined;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  addToLyricsHistory: (item: Omit<LyricsHistoryItem, "id" | "savedAt">) => void;
  removeFromLyricsHistory: (id: string) => void;
  clearLyricsHistory: () => void;
  loadFromLyricsHistory: (id: string) => void;
}

export const defaultEditSettings: EditSettings = {
  speed: 1.0,
  pitch: 0,
  loopStart: null,
  loopEnd: null,
  loopEnabled: false,
};

export const useAudioStore = create<AudioState & AudioActions>()(
  persist(
    (set, get) => ({
      tracks: [],
      currentTrackId: null,
      editSettings: defaultEditSettings,
      lyrics: "",
      lyricsHistory: [],
      isPlaying: false,
      currentPosition: 0,
      hasUnsavedChanges: false,

      addTrack: (track) =>
        set((state) => ({
          tracks: [track, ...state.tracks],
          currentTrackId: track.id,
        })),

      removeTrack: (id) =>
        set((state) => ({
          tracks: state.tracks.filter((t) => t.id !== id),
          currentTrackId: state.currentTrackId === id ? null : state.currentTrackId,
        })),

      setCurrentTrack: (id) => {
        const state = get();
        // Load saved settings when switching tracks
        if (id) {
          const track = state.tracks.find((t) => t.id === id);
          if (track?.savedSettings) {
            set({
              currentTrackId: id,
              editSettings: track.savedSettings,
              hasUnsavedChanges: false,
            });
            return;
          }
        }
        set({
          currentTrackId: id,
          editSettings: defaultEditSettings,
          hasUnsavedChanges: false,
        });
      },

      updateEditSettings: (settings) =>
        set((state) => ({
          editSettings: { ...state.editSettings, ...settings },
          hasUnsavedChanges: true,
        })),

      resetEditSettings: () =>
        set({
          editSettings: defaultEditSettings,
          hasUnsavedChanges: true,
        }),

      saveEditSettings: () => {
        const state = get();
        if (!state.currentTrackId) return;

        set((state) => ({
          tracks: state.tracks.map((track) =>
            track.id === state.currentTrackId
              ? { ...track, savedSettings: { ...state.editSettings } }
              : track
          ),
          hasUnsavedChanges: false,
        }));
      },

      loadSavedSettings: (trackId: string) => {
        const state = get();
        const track = state.tracks.find((t) => t.id === trackId);
        if (track?.savedSettings) {
          set({
            editSettings: track.savedSettings,
            hasUnsavedChanges: false,
          });
        } else {
          set({
            editSettings: defaultEditSettings,
            hasUnsavedChanges: false,
          });
        }
      },

      setLyrics: (lyrics) => set({ lyrics }),

      setIsPlaying: (playing) => set({ isPlaying: playing }),

      setCurrentPosition: (position) => set({ currentPosition: position }),

      getCurrentTrack: () => {
        const state = get();
        return state.tracks.find((t) => t.id === state.currentTrackId);
      },

      setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),

      addToLyricsHistory: (item) =>
        set((state) => {
          // Check if this song already exists in history
          const exists = state.lyricsHistory.some(
            (h) => h.title === item.title && h.artist === item.artist
          );
          if (exists) {
            // Update existing entry
            return {
              lyricsHistory: state.lyricsHistory.map((h) =>
                h.title === item.title && h.artist === item.artist
                  ? { ...h, lyrics: item.lyrics, savedAt: Date.now() }
                  : h
              ),
            };
          }
          // Add new entry at the beginning
          return {
            lyricsHistory: [
              {
                id: `lyrics-${Date.now()}`,
                ...item,
                savedAt: Date.now(),
              },
              ...state.lyricsHistory,
            ].slice(0, 50), // Keep max 50 items
          };
        }),

      removeFromLyricsHistory: (id) =>
        set((state) => ({
          lyricsHistory: state.lyricsHistory.filter((h) => h.id !== id),
        })),

      clearLyricsHistory: () => set({ lyricsHistory: [] }),

      loadFromLyricsHistory: (id) => {
        const state = get();
        const item = state.lyricsHistory.find((h) => h.id === id);
        if (item) {
          set({ lyrics: item.lyrics });
        }
      },
    }),
    {
      name: "audio-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tracks: state.tracks,
        lyrics: state.lyrics,
        lyricsHistory: state.lyricsHistory,
      }),
    }
  )
);
