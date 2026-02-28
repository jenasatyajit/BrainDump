/**
 * Supabase Cloud Sync Service
 *
 * Opt-in sync of local SQLite data to Supabase.
 * Last-write-wins conflict resolution via updated_at.
 */

import { supabase } from '@/utils/supabase';
import * as db from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SYNC_KEY = 'dump_last_sync_at';

// ── Sync Status ──

export async function getLastSyncTime(): Promise<string | null> {
    return AsyncStorage.getItem(LAST_SYNC_KEY);
}

async function setLastSyncTime(time: string): Promise<void> {
    await AsyncStorage.setItem(LAST_SYNC_KEY, time);
}

// ── Check auth ──

async function getUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
}

// ── Push local data to cloud ──

export async function syncToCloud(): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await getUserId();
        if (!userId) {
            return { success: false, error: 'Not authenticated. Please sign in first.' };
        }

        const data = await db.exportAllData();

        // Upsert entries
        if (data.entries.length > 0) {
            const { error } = await supabase.from('entries').upsert(
                data.entries.map((e: any) => ({
                    id: e.id,
                    user_id: userId,
                    raw_text: e.raw_text,
                    is_deleted: e.is_deleted === 1,
                    created_at: e.created_at,
                })),
                { onConflict: 'id' }
            );
            if (error) throw error;
        }

        // Upsert tasks
        if (data.tasks.length > 0) {
            const { error } = await supabase.from('tasks').upsert(
                data.tasks.map((t) => ({
                    id: t.id,
                    user_id: userId,
                    entry_id: t.entry_id,
                    title: t.title,
                    due_date: t.due_date,
                    priority: t.priority,
                    is_completed: t.is_completed === 1,
                    is_deleted: t.is_deleted === 1,
                    created_at: t.created_at,
                })),
                { onConflict: 'id' }
            );
            if (error) throw error;
        }

        // Upsert notes
        if (data.notes.length > 0) {
            const { error } = await supabase.from('notes').upsert(
                data.notes.map((n) => ({
                    id: n.id,
                    user_id: userId,
                    entry_id: n.entry_id,
                    title: n.title,
                    body: n.body,
                    category: n.category,
                    is_deleted: n.is_deleted === 1,
                    created_at: n.created_at,
                })),
                { onConflict: 'id' }
            );
            if (error) throw error;
        }

        // Upsert reminders
        if (data.reminders.length > 0) {
            const { error } = await supabase.from('reminders').upsert(
                data.reminders.map((r) => ({
                    id: r.id,
                    user_id: userId,
                    entry_id: r.entry_id,
                    title: r.title,
                    remind_at: r.remind_at,
                    notification_id: r.notification_id,
                    is_deleted: r.is_deleted === 1,
                    created_at: r.created_at,
                })),
                { onConflict: 'id' }
            );
            if (error) throw error;
        }

        // Upsert chat messages
        if (data.chatMessages.length > 0) {
            const { error } = await supabase.from('chat_messages').upsert(
                data.chatMessages.map((m) => ({
                    id: m.id,
                    user_id: userId,
                    role: m.role,
                    content: m.content,
                    entries_json: m.entries_json ? JSON.parse(m.entries_json) : null,
                    is_digest: m.is_digest === 1,
                    created_at: m.created_at,
                })),
                { onConflict: 'id' }
            );
            if (error) throw error;
        }

        const syncTime = new Date().toISOString();
        await setLastSyncTime(syncTime);

        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown sync error';
        console.error('[syncService] Push failed:', message);
        return { success: false, error: message };
    }
}

// ── Pull cloud data to local ──

export async function syncFromCloud(): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await getUserId();
        if (!userId) {
            return { success: false, error: 'Not authenticated. Please sign in first.' };
        }

        // Get last sync time for incremental sync
        const lastSync = await getLastSyncTime();
        const since = lastSync || '1970-01-01T00:00:00Z';

        // Pull chat messages updated since last sync
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('user_id', userId)
            .gte('updated_at', since)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Save pulled messages to local DB
        if (messages && messages.length > 0) {
            for (const m of messages) {
                await db.saveChatMessage({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    entriesJson: m.entries_json ? JSON.stringify(m.entries_json) : null,
                    isDigest: m.is_digest,
                    createdAt: new Date(m.created_at),
                });
            }
        }

        const syncTime = new Date().toISOString();
        await setLastSyncTime(syncTime);

        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown sync error';
        console.error('[syncService] Pull failed:', message);
        return { success: false, error: message };
    }
}

// ── Full sync (push then pull) ──

export async function fullSync(): Promise<{ success: boolean; error?: string }> {
    const pushResult = await syncToCloud();
    if (!pushResult.success) return pushResult;

    const pullResult = await syncFromCloud();
    return pullResult;
}
