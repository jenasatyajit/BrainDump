import { create } from 'zustand';
import { useChatStore } from './chatStore';
import type { ParsedEntry } from '@/services/aiService';

export interface TaskEntry extends ParsedEntry {
    messageId: string;
    entryIndex: number;
    createdAt: Date;
}

type TaskFilter = 'all' | 'today' | 'thisWeek' | 'overdue';

interface TaskStore {
    filter: TaskFilter;
    setFilter: (filter: TaskFilter) => void;
    getTasks: () => TaskEntry[];
    getFilteredTasks: () => TaskEntry[];
    getStats: () => { pending: number; completedToday: number };
}

export const useTaskStore = create<TaskStore>((set, get) => ({
    filter: 'all',

    setFilter: (filter) => set({ filter }),

    getTasks: () => {
        const messages = useChatStore.getState().messages;
        const tasks: TaskEntry[] = [];

        messages.forEach((msg) => {
            if (msg.entries) {
                msg.entries.forEach((entry, idx) => {
                    if (entry.type === 'task') {
                        tasks.push({
                            ...entry,
                            messageId: msg.id,
                            entryIndex: idx,
                            createdAt: msg.createdAt,
                        });
                    }
                });
            }
        });

        return tasks;
    },

    getFilteredTasks: () => {
        const tasks = get().getTasks();
        const filter = get().filter;
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        switch (filter) {
            case 'today':
                return tasks.filter((t) => t.dueDate === todayStr);
            case 'thisWeek': {
                const endOfWeek = new Date(today);
                const dayOfWeek = endOfWeek.getDay();
                const daysUntilSunday = 7 - dayOfWeek;
                endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
                const endStr = endOfWeek.toISOString().split('T')[0];
                return tasks.filter((t) => t.dueDate && t.dueDate >= todayStr && t.dueDate <= endStr);
            }
            case 'overdue':
                return tasks.filter((t) => t.dueDate && t.dueDate < todayStr && !t.isCompleted);
            default:
                return tasks;
        }
    },

    getStats: () => {
        const tasks = get().getTasks();
        const pending = tasks.filter((t) => !t.isCompleted).length;
        const completedToday = tasks.filter((t) => {
            if (!t.isCompleted) return false;
            const todayStr = new Date().toISOString().split('T')[0];
            return t.createdAt.toISOString().split('T')[0] === todayStr;
        }).length;
        return { pending, completedToday };
    },
}));
