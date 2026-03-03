import { create } from 'zustand';
import { useChatStore } from './chatStore';
import type { ParsedEntry } from '@/services/aiService';

export interface LibraryEntry extends ParsedEntry {
    messageId: string;
    entryIndex: number;
    createdAt: Date;
}

type LibraryFilter = 'all' | 'books' | 'videos' | 'articles';

interface LibraryStore {
    filter: LibraryFilter;
    setFilter: (filter: LibraryFilter) => void;
    getLibraryEntries: () => LibraryEntry[];
    getBooks: () => LibraryEntry[];
    getVideos: () => LibraryEntry[];
    getArticles: () => LibraryEntry[];
    getFilteredEntries: () => LibraryEntry[];
    getStats: () => { total: number; books: number; videos: number; articles: number };
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
    filter: 'all',

    setFilter: (filter) => set({ filter }),

    getLibraryEntries: () => {
        const messages = useChatStore.getState().messages;
        const entries: LibraryEntry[] = [];

        messages.forEach((msg) => {
            if (msg.entries) {
                msg.entries.forEach((entry, idx) => {
                    if (entry.type === 'library' && !entry.isDeleted) {
                        entries.push({
                            ...entry,
                            messageId: msg.id,
                            entryIndex: idx,
                            createdAt: msg.createdAt,
                        });
                    }
                });
            }
        });

        return entries.reverse(); // Most recent first
    },

    getBooks: () => {
        return get()
            .getLibraryEntries()
            .filter((entry) => entry.libraryType === 'book');
    },

    getVideos: () => {
        return get()
            .getLibraryEntries()
            .filter((entry) => entry.libraryType === 'video');
    },

    getArticles: () => {
        return get()
            .getLibraryEntries()
            .filter((entry) => entry.libraryType === 'article');
    },

    getFilteredEntries: () => {
        const filter = get().filter;
        const entries = get().getLibraryEntries();

        switch (filter) {
            case 'books':
                return entries.filter((e) => e.libraryType === 'book');
            case 'videos':
                return entries.filter((e) => e.libraryType === 'video');
            case 'articles':
                return entries.filter((e) => e.libraryType === 'article');
            default:
                return entries;
        }
    },

    getStats: () => {
        const entries = get().getLibraryEntries();
        return {
            total: entries.length,
            books: entries.filter((e) => e.libraryType === 'book').length,
            videos: entries.filter((e) => e.libraryType === 'video').length,
            articles: entries.filter((e) => e.libraryType === 'article').length,
        };
    },
}));
