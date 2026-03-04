import { create } from 'zustand';
import { classifyMessage, type ParsedEntry, type AIResponse } from '@/services/aiService';
import * as db from '@/services/database';
import { scheduleReminder, cancelReminder } from '@/services/notificationService';
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
    lastUsedProvider: string | null;
    loadMessages: () => Promise<void>;
    addUserMessage: (text: string) => Promise<void>;
    toggleTaskComplete: (messageId: string, entryIndex: number) => void;
    editTask: (messageId: string, entryIndex: number, updates: Partial<ParsedEntry>) => void;
    deleteTask: (messageId: string, entryIndex: number) => Promise<void>;
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
async function handleLibraryResource(entry: ParsedEntry, entryId: string): Promise<Partial<ParsedEntry>> {
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

            // Return updated fields
            return {
                title: metadata?.title || entry.title,
                author: metadata?.author || entry.author,
            };
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

                // Return updated title
                return {
                    title: metadata?.title || entry.title,
                };
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

                // Return updated title
                return {
                    title: metadata.title,
                };
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

            // Return updated title
            return {
                title: metadata?.title || entry.title,
            };
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

    return {}; // Return empty object if no updates
}

export const useChatStore = create<ChatStore>((set, get) => ({
    messages: [],
    isProcessing: false,
    isLoaded: false,
    lastUsedProvider: null,

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

            // Check if provider changed and add system message if needed
            const currentProvider = response.usedProvider;
            const lastProvider = get().lastUsedProvider;

            if (currentProvider && lastProvider && currentProvider !== lastProvider) {
                // Provider changed - add system message
                const systemMsgId = generateId();
                const providerName = response.usedModel
                    ? `${currentProvider} (${response.usedModel})`
                    : currentProvider;

                const systemMsg: ChatMessage = {
                    id: systemMsgId,
                    role: 'system',
                    content: `Switched to ${providerName} — ${lastProvider} unavailable.`,
                    createdAt: new Date(),
                };

                await db.saveChatMessage({
                    id: systemMsg.id,
                    role: systemMsg.role,
                    content: systemMsg.content,
                    createdAt: systemMsg.createdAt,
                });

                set((state) => ({
                    messages: [
                        ...state.messages.map((msg) => (msg.id === thinkingId ? aiMsg : msg)),
                        systemMsg,
                    ],
                    isProcessing: false,
                    lastUsedProvider: currentProvider,
                }));
            } else {
                set((state) => ({
                    messages: state.messages.map((msg) => (msg.id === thinkingId ? aiMsg : msg)),
                    isProcessing: false,
                    lastUsedProvider: currentProvider || lastProvider,
                }));
            }

            // Save entries to their respective tables and update with fetched metadata
            const entryId = await db.saveEntry(text);
            const updatedEntries = [...response.entries];

            for (let i = 0; i < response.entries.length; i++) {
                const entry = response.entries[i];

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
                    // Handle library resources and get updated metadata
                    const updates = await handleLibraryResource(entry, entryId);

                    // Update the entry with fetched metadata
                    if (updates && Object.keys(updates).length > 0) {
                        updatedEntries[i] = { ...entry, ...updates };
                    }
                }
            }

            // Update the AI message with the updated entries (including fetched metadata)
            if (updatedEntries.some((e, i) => e !== response.entries[i])) {
                aiMsg.entries = updatedEntries;

                // Update in database
                await db.updateChatMessage(aiMsg.id, {
                    entriesJson: entriesToJson(updatedEntries) || undefined,
                });

                // Update in state
                set((state) => ({
                    messages: state.messages.map((msg) =>
                        msg.id === aiMsg.id ? { ...msg, entries: updatedEntries } : msg
                    ),
                }));
            }
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

    deleteTask: async (messageId: string, entryIndex: number) => {
        // Grab the current state so we can inspect the entry before mutating
        const messages = get().messages;
        const msg = messages.find((m) => m.id === messageId);
        const entry = msg?.entries?.[entryIndex];

        // For reminder entries: cancel the OS-level notification before soft-deleting.
        // Without this the notification fires even though the item is gone from the UI.
        if (entry?.type === 'reminder') {
            try {
                const reminderRow = await db.getReminderRow(
                    entry.title,
                    entry.remindAt
                );
                if (reminderRow?.notification_id) {
                    await cancelReminder(reminderRow.notification_id);
                    console.log('[chatStore] Cancelled notification for deleted reminder:', entry.title);
                }
                // Soft-delete the reminders table row using its real DB id
                if (reminderRow?.id) {
                    await db.softDelete('reminders', reminderRow.id);
                }
            } catch (err) {
                // Non-fatal: state soft-delete still runs below
                console.warn('[chatStore] Could not cancel notification for reminder:', err);
            }
        }

        set((state) => ({
            messages: state.messages.map((m) => {
                if (m.id === messageId && m.entries) {
                    const newEntries = [...m.entries];
                    newEntries[entryIndex] = { ...newEntries[entryIndex], isDeleted: true };
                    db.updateChatMessage(m.id, { entriesJson: entriesToJson(newEntries) || undefined });
                    return { ...m, entries: newEntries };
                }
                return m;
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
