import { create } from 'zustand';
import { classifyMessage, type ParsedEntry, type AIResponse } from '@/services/aiService';
import * as db from '@/services/database';
import { scheduleReminder } from '@/services/notificationService';
import * as libraryService from '@/services/libraryService';

export interface ChatMessage {
    id: string;
    role: 'user' | 'ai' | 'system';
    content: string;
    entries?: ParsedEntry[];
    isThinking?: boolean;
    isDigest?: boolean;
    createdAt: Date;
}

interface ChatStore {
    messages: ChatMessage[];
    isProcessing: boolean;
    isLoaded: boolean;
    loadMessages: () => Promise<void>;
    addUserMessage: (text: string) => Promise<void>;
    toggleTaskComplete: (messageId: string, entryIndex: number) => void;
    editTask: (messageId: string, entryIndex: number, updates: Partial<ParsedEntry>) => void;
    deleteTask: (messageId: string, entryIndex: number) => void;
    addDigestMessage: (content: string) => void;
    clearMessages: () => void;
}

let idCounter = Date.now();
const generateId = () => String(++idCounter);

// ── Welcome message shown on first launch ──
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
}

const WELCOME_MESSAGE: ChatMessage = {
    id: 'welcome-1',
    role: 'ai',
    content: `${getGreeting()}. What's on your mind? Dump anything — I'll sort it out.`,
    createdAt: new Date(),
};

function entriesToJson(entries?: ParsedEntry[]): string | null {
    if (!entries || entries.length === 0) return null;
    return JSON.stringify(entries);
}

function jsonToEntries(json: string | null): ParsedEntry[] | undefined {
    if (!json) return undefined;
    try {
        return JSON.parse(json);
    } catch {
        return undefined;
    }
}

// ── Library Resource Handler ──
async function handleLibraryResource(entry: ParsedEntry, entryId: string): Promise<void> {
    try {
        if (entry.libraryType === 'book') {
            // Fetch book metadata
            const metadata = await libraryService.fetchBookMetadata(entry.title);
            
            let coverLocalPath: string | undefined;
            
            // Download and cache cover image if available
            if (metadata?.coverUrl) {
                const cachedPath = await libraryService.downloadAndCacheImage(metadata.coverUrl, entryId);
                if (cachedPath) {
                    coverLocalPath = cachedPath;
                }
            }
            
            await db.saveLibraryResource({
                entryId,
                type: 'book',
                title: metadata?.title || entry.title,
                author: metadata?.author || entry.author,
                coverUrl: metadata?.coverUrl,
                coverLocalPath,
                isbn: metadata?.isbn,
            });
        } else if (entry.libraryType === 'video' && entry.url) {
            // Fetch video metadata
            if (entry.platform === 'youtube') {
                const metadata = await libraryService.fetchYouTubeMetadata(entry.url);
                await db.saveLibraryResource({
                    entryId,
                    type: 'video',
                    title: metadata?.title || entry.title,
                    videoUrl: entry.url,
                    videoPlatform: 'youtube',
                    thumbnailUrl: metadata?.thumbnailUrl,
                    duration: metadata?.duration,
                });
            } else if (entry.platform === 'instagram') {
                // Instagram: just save URL
                const metadata = libraryService.createInstagramMetadata(entry.url);
                await db.saveLibraryResource({
                    entryId,
                    type: 'video',
                    title: metadata.title,
                    videoUrl: entry.url,
                    videoPlatform: 'instagram',
                });
            }
        } else if (entry.libraryType === 'article' && entry.url) {
            // Fetch article metadata
            const metadata = await libraryService.fetchArticleMetadata(entry.url);
            await db.saveLibraryResource({
                entryId,
                type: 'article',
                title: metadata?.title || entry.title,
                articleUrl: entry.url,
                domain: metadata?.domain,
            });
        }
    } catch (error) {
        console.error('[chatStore] Failed to handle library resource:', error);
        // Fallback: save with minimal data
        await db.saveLibraryResource({
            entryId,
            type: entry.libraryType || 'article',
            title: entry.title,
            videoUrl: entry.url,
            articleUrl: entry.url,
            videoPlatform: entry.platform,
        });
    }
}

export const useChatStore = create<ChatStore>((set, get) => ({
    messages: [],
    isProcessing: false,
    isLoaded: false,

    loadMessages: async () => {
        try {
            const dbMessages = await db.getChatMessages();

            if (dbMessages.length === 0) {
                // First launch — save welcome message to DB
                await db.saveChatMessage({
                    id: WELCOME_MESSAGE.id,
                    role: WELCOME_MESSAGE.role,
                    content: WELCOME_MESSAGE.content,
                    createdAt: WELCOME_MESSAGE.createdAt,
                });
                set({ messages: [WELCOME_MESSAGE], isLoaded: true });
                return;
            }

            // Load from DB
            const messages: ChatMessage[] = dbMessages
                .filter((m) => m.is_thinking === 0)
                .map((m) => ({
                    id: m.id,
                    role: m.role as ChatMessage['role'],
                    content: m.content,
                    entries: jsonToEntries(m.entries_json),
                    isDigest: m.is_digest === 1,
                    createdAt: new Date(m.created_at),
                }));

            set({ messages, isLoaded: true });
        } catch (error) {
            console.warn('[chatStore] Failed to load messages:', error);
            set({ messages: [WELCOME_MESSAGE], isLoaded: true });
        }
    },

    addUserMessage: async (text: string) => {
        const userMsg: ChatMessage = {
            id: generateId(),
            role: 'user',
            content: text,
            createdAt: new Date(),
        };

        const thinkingId = generateId();

        set((state) => ({
            messages: [
                ...state.messages,
                userMsg,
                { id: thinkingId, role: 'ai', content: '', isThinking: true, createdAt: new Date() },
            ],
            isProcessing: true,
        }));

        // Save user message to DB
        await db.saveChatMessage({
            id: userMsg.id,
            role: userMsg.role,
            content: userMsg.content,
            createdAt: userMsg.createdAt,
        });

        try {
            const response: AIResponse = await classifyMessage(text);

            const aiMsg: ChatMessage = {
                id: thinkingId,
                role: 'ai',
                content: response.reply,
                entries: response.entries,
                isThinking: false,
                createdAt: new Date(),
            };

            // Save AI response to DB
            await db.saveChatMessage({
                id: aiMsg.id,
                role: aiMsg.role,
                content: aiMsg.content,
                entriesJson: entriesToJson(aiMsg.entries),
                createdAt: aiMsg.createdAt,
            });

            // Save entries to their respective tables
            const entryId = await db.saveEntry(text);
            for (const entry of response.entries) {
                if (entry.type === 'task') {
                    await db.saveTask({ entryId, title: entry.title, dueDate: entry.dueDate, priority: entry.priority });
                } else if (entry.type === 'note') {
                    await db.saveNote({ entryId, title: entry.title, body: text, category: entry.category });
                } else if (entry.type === 'reminder') {
                    const reminderId = await db.saveReminder({ entryId, title: entry.title, remindAt: entry.remindAt });
                    // Schedule push notification
                    if (entry.remindAt) {
                        scheduleReminder(entry.title, entry.remindAt, reminderId);
                    }
                } else if (entry.type === 'library') {
                    // Handle library resources
                    await handleLibraryResource(entry, entryId);
                }
            }

            set((state) => ({
                messages: state.messages.map((msg) => (msg.id === thinkingId ? aiMsg : msg)),
                isProcessing: false,
            }));
        } catch {
            const errorMsg: ChatMessage = {
                id: thinkingId,
                role: 'ai',
                content: "Couldn't process that. Saved as a raw note.",
                entries: [{ type: 'note', title: text.substring(0, 80), category: 'General', isCompleted: false }],
                isThinking: false,
                createdAt: new Date(),
            };

            await db.saveChatMessage({
                id: errorMsg.id,
                role: errorMsg.role,
                content: errorMsg.content,
                entriesJson: entriesToJson(errorMsg.entries),
                createdAt: errorMsg.createdAt,
            });

            set((state) => ({
                messages: state.messages.map((msg) => (msg.id === thinkingId ? errorMsg : msg)),
                isProcessing: false,
            }));
        }
    },

    toggleTaskComplete: (messageId: string, entryIndex: number) => {
        set((state) => ({
            messages: state.messages.map((msg) => {
                if (msg.id === messageId && msg.entries) {
                    const newEntries = [...msg.entries];
                    newEntries[entryIndex] = { ...newEntries[entryIndex], isCompleted: !newEntries[entryIndex].isCompleted };

                    // Async update DB (fire and forget)
                    db.updateChatMessage(msg.id, { entriesJson: entriesToJson(newEntries) || undefined });

                    return { ...msg, entries: newEntries };
                }
                return msg;
            }),
        }));
    },

    editTask: (messageId: string, entryIndex: number, updates: Partial<ParsedEntry>) => {
        set((state) => ({
            messages: state.messages.map((msg) => {
                if (msg.id === messageId && msg.entries) {
                    const newEntries = [...msg.entries];
                    newEntries[entryIndex] = { ...newEntries[entryIndex], ...updates };
                    db.updateChatMessage(msg.id, { entriesJson: entriesToJson(newEntries) || undefined });
                    return { ...msg, entries: newEntries };
                }
                return msg;
            }),
        }));
    },

    deleteTask: (messageId: string, entryIndex: number) => {
        set((state) => ({
            messages: state.messages.map((msg) => {
                if (msg.id === messageId && msg.entries) {
                    const newEntries = [...msg.entries];
                    newEntries[entryIndex] = { ...newEntries[entryIndex], isDeleted: true };
                    db.updateChatMessage(msg.id, { entriesJson: entriesToJson(newEntries) || undefined });
                    return { ...msg, entries: newEntries };
                }
                return msg;
            }),
        }));
    },

    addDigestMessage: (content: string) => {
        const digestMsg: ChatMessage = {
            id: generateId(),
            role: 'ai',
            content,
            isDigest: true,
            createdAt: new Date(),
        };

        db.saveChatMessage({
            id: digestMsg.id,
            role: digestMsg.role,
            content: digestMsg.content,
            isDigest: true,
            createdAt: digestMsg.createdAt,
        });

        set((state) => ({ messages: [...state.messages, digestMsg] }));
    },

    clearMessages: () => set({ messages: [] }),
}));
