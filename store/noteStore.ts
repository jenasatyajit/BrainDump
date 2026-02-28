import { create } from 'zustand';
import { useChatStore } from './chatStore';
import type { ParsedEntry } from '@/services/aiService';

export interface NoteEntry extends ParsedEntry {
    messageId: string;
    entryIndex: number;
    emoji: string;
    body: string;
    createdAt: Date;
}

interface NoteStore {
    getNotes: () => NoteEntry[];
    getStats: () => { total: number; ideas: number };
}

const CATEGORY_EMOJI: Record<string, string> = {
    Idea: '💡',
    Meeting: '☕',
    Reading: '📖',
    Goal: '🎯',
    Project: '🏗️',
    Research: '🔬',
    General: '📝',
};

export const useNoteStore = create<NoteStore>(() => ({
    getNotes: () => {
        const messages = useChatStore.getState().messages;
        const notes: NoteEntry[] = [];

        messages.forEach((msg) => {
            if (msg.entries) {
                msg.entries.forEach((entry, idx) => {
                    if (entry.type === 'note') {
                        // Find the user message that triggered this note
                        const msgIndex = messages.indexOf(msg);
                        const userMsg = msgIndex > 0 ? messages[msgIndex - 1] : null;

                        notes.push({
                            ...entry,
                            messageId: msg.id,
                            entryIndex: idx,
                            emoji: CATEGORY_EMOJI[entry.category || 'General'] || '📝',
                            body: userMsg?.role === 'user' ? userMsg.content : entry.title,
                            createdAt: msg.createdAt,
                        });
                    }
                });
            }
        });

        return notes.reverse(); // Most recent first
    },

    getStats: () => {
        const messages = useChatStore.getState().messages;
        let total = 0;
        let ideas = 0;

        messages.forEach((msg) => {
            if (msg.entries) {
                msg.entries.forEach((entry) => {
                    if (entry.type === 'note') {
                        total++;
                        if (entry.category === 'Idea') ideas++;
                    }
                });
            }
        });

        return { total, ideas };
    },
}));
