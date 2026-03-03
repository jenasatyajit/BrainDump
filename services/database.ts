/**
 * SQLite Database Service
 *
 * Uses expo-sqlite for local persistence.
 * Provides CRUD operations for all tables from the PRD schema.
 */

import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

// ── Initialize ──

export async function initDatabase(): Promise<void> {
    // Prevent double init (React StrictMode / concurrent calls)
    if (db) return;
    if (initPromise) return initPromise;

    initPromise = _doInit();
    return initPromise;
}

async function _doInit(): Promise<void> {
    try {
        db = await SQLite.openDatabaseAsync('braindump.db');

        await db.execAsync('PRAGMA journal_mode = WAL;');

        await db.execAsync(`CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      raw_text TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )`);

        await db.execAsync(`CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      entry_id TEXT REFERENCES entries(id),
      title TEXT NOT NULL,
      due_date TEXT,
      priority TEXT DEFAULT 'low',
      is_completed INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )`);

        await db.execAsync(`CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      entry_id TEXT REFERENCES entries(id),
      title TEXT NOT NULL,
      body TEXT,
      category TEXT DEFAULT 'General',
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )`);

        await db.execAsync(`CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      entry_id TEXT REFERENCES entries(id),
      title TEXT NOT NULL,
      remind_at TEXT,
      notification_id TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )`);

        await db.execAsync(`CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      entries_json TEXT,
      is_thinking INTEGER DEFAULT 0,
      is_digest INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )`);

        await db.execAsync(`CREATE TABLE IF NOT EXISTS library_resources (
      id TEXT PRIMARY KEY,
      entry_id TEXT REFERENCES entries(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT,
      cover_url TEXT,
      cover_local_path TEXT,
      isbn TEXT,
      video_url TEXT,
      video_platform TEXT,
      thumbnail_url TEXT,
      duration TEXT,
      article_url TEXT,
      domain TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )`);
    } catch (error) {
        db = null;
        initPromise = null;
        throw error;
    }
}

function getDb(): SQLite.SQLiteDatabase {
    if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
    return db;
}

// ── Helpers ──

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// ── Chat Messages ──

export interface DbChatMessage {
    id: string;
    role: string;
    content: string;
    entries_json: string | null;
    is_thinking: number;
    is_digest: number;
    created_at: string;
}

export async function saveChatMessage(msg: {
    id: string;
    role: string;
    content: string;
    entriesJson?: string | null;
    isThinking?: boolean;
    isDigest?: boolean;
    createdAt: Date;
}): Promise<void> {
    await getDb().runAsync(
        `INSERT OR REPLACE INTO chat_messages (id, role, content, entries_json, is_thinking, is_digest, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        msg.id,
        msg.role,
        msg.content,
        msg.entriesJson || null,
        msg.isThinking ? 1 : 0,
        msg.isDigest ? 1 : 0,
        msg.createdAt.toISOString()
    );
}

export async function updateChatMessage(
    id: string,
    updates: { content?: string; entriesJson?: string; isThinking?: boolean }
): Promise<void> {
    const sets: string[] = [];
    const values: (string | number)[] = [];

    if (updates.content !== undefined) {
        sets.push('content = ?');
        values.push(updates.content);
    }
    if (updates.entriesJson !== undefined) {
        sets.push('entries_json = ?');
        values.push(updates.entriesJson);
    }
    if (updates.isThinking !== undefined) {
        sets.push('is_thinking = ?');
        values.push(updates.isThinking ? 1 : 0);
    }

    if (sets.length === 0) return;

    values.push(id);
    await getDb().runAsync(`UPDATE chat_messages SET ${sets.join(', ')} WHERE id = ?`, ...values);
}

export async function getChatMessages(): Promise<DbChatMessage[]> {
    return await getDb().getAllAsync<DbChatMessage>(
        'SELECT * FROM chat_messages ORDER BY created_at ASC'
    );
}

// ── Entries ──

export async function saveEntry(rawText: string): Promise<string> {
    const id = generateId();
    await getDb().runAsync(
        'INSERT INTO entries (id, raw_text, created_at) VALUES (?, ?, ?)',
        id,
        rawText,
        new Date().toISOString()
    );
    return id;
}

// ── Tasks ──

export interface DbTask {
    id: string;
    entry_id: string | null;
    title: string;
    due_date: string | null;
    priority: string;
    is_completed: number;
    is_deleted: number;
    created_at: string;
}

export async function saveTask(task: {
    entryId?: string;
    title: string;
    dueDate?: string;
    priority?: string;
}): Promise<string> {
    const id = generateId();
    await getDb().runAsync(
        'INSERT INTO tasks (id, entry_id, title, due_date, priority, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        id,
        task.entryId || null,
        task.title,
        task.dueDate || null,
        task.priority || 'low',
        new Date().toISOString()
    );
    return id;
}

export async function getTasks(includeDeleted = false): Promise<DbTask[]> {
    const where = includeDeleted ? '' : 'WHERE is_deleted = 0';
    return await getDb().getAllAsync<DbTask>(`SELECT * FROM tasks ${where} ORDER BY created_at DESC`);
}

export async function toggleTaskComplete(id: string): Promise<void> {
    await getDb().runAsync(
        'UPDATE tasks SET is_completed = CASE WHEN is_completed = 0 THEN 1 ELSE 0 END WHERE id = ?',
        id
    );
}

// ── Notes ──

export interface DbNote {
    id: string;
    entry_id: string | null;
    title: string;
    body: string | null;
    category: string;
    is_deleted: number;
    created_at: string;
}

export async function saveNote(note: {
    entryId?: string;
    title: string;
    body?: string;
    category?: string;
}): Promise<string> {
    const id = generateId();
    await getDb().runAsync(
        'INSERT INTO notes (id, entry_id, title, body, category, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        id,
        note.entryId || null,
        note.title,
        note.body || null,
        note.category || 'General',
        new Date().toISOString()
    );
    return id;
}

export async function getNotes(includeDeleted = false): Promise<DbNote[]> {
    const where = includeDeleted ? '' : 'WHERE is_deleted = 0';
    return await getDb().getAllAsync<DbNote>(`SELECT * FROM notes ${where} ORDER BY created_at DESC`);
}

// ── Reminders ──

export interface DbReminder {
    id: string;
    entry_id: string | null;
    title: string;
    remind_at: string | null;
    notification_id: string | null;
    is_deleted: number;
    created_at: string;
}

export async function saveReminder(reminder: {
    entryId?: string;
    title: string;
    remindAt?: string;
    notificationId?: string;
}): Promise<string> {
    const id = generateId();
    await getDb().runAsync(
        'INSERT INTO reminders (id, entry_id, title, remind_at, notification_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        id,
        reminder.entryId || null,
        reminder.title,
        reminder.remindAt || null,
        reminder.notificationId || null,
        new Date().toISOString()
    );
    return id;
}

export async function updateReminderNotificationId(id: string, notificationId: string): Promise<void> {
    await getDb().runAsync(
        'UPDATE reminders SET notification_id = ? WHERE id = ?',
        notificationId,
        id
    );
}

export async function getReminders(includeDeleted = false): Promise<DbReminder[]> {
    const where = includeDeleted ? '' : 'WHERE is_deleted = 0';
    return await getDb().getAllAsync<DbReminder>(
        `SELECT * FROM reminders ${where} ORDER BY remind_at ASC`
    );
}

// ── Library Resources ──

export interface DbLibraryResource {
    id: string;
    entry_id: string | null;
    type: 'book' | 'video' | 'article';
    title: string;
    author: string | null;
    cover_url: string | null;
    cover_local_path: string | null;
    isbn: string | null;
    video_url: string | null;
    video_platform: string | null;
    thumbnail_url: string | null;
    duration: string | null;
    article_url: string | null;
    domain: string | null;
    is_deleted: number;
    created_at: string;
}

export async function saveLibraryResource(resource: {
    entryId?: string;
    type: 'book' | 'video' | 'article';
    title: string;
    author?: string;
    coverUrl?: string;
    coverLocalPath?: string;
    isbn?: string;
    videoUrl?: string;
    videoPlatform?: string;
    thumbnailUrl?: string;
    duration?: string;
    articleUrl?: string;
    domain?: string;
}): Promise<string> {
    const id = generateId();
    await getDb().runAsync(
        `INSERT INTO library_resources (
      id, entry_id, type, title, author, cover_url, cover_local_path, isbn,
      video_url, video_platform, thumbnail_url, duration, article_url, domain, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        resource.entryId || null,
        resource.type,
        resource.title,
        resource.author || null,
        resource.coverUrl || null,
        resource.coverLocalPath || null,
        resource.isbn || null,
        resource.videoUrl || null,
        resource.videoPlatform || null,
        resource.thumbnailUrl || null,
        resource.duration || null,
        resource.articleUrl || null,
        resource.domain || null,
        new Date().toISOString()
    );
    return id;
}

export async function getLibraryResources(includeDeleted = false): Promise<DbLibraryResource[]> {
    const where = includeDeleted ? '' : 'WHERE is_deleted = 0';
    return await getDb().getAllAsync<DbLibraryResource>(
        `SELECT * FROM library_resources ${where} ORDER BY created_at DESC`
    );
}

export async function updateLibraryResource(
    id: string,
    updates: {
        title?: string;
        author?: string;
        coverUrl?: string;
        coverLocalPath?: string;
        isbn?: string;
        videoUrl?: string;
        videoPlatform?: string;
        thumbnailUrl?: string;
        duration?: string;
        articleUrl?: string;
        domain?: string;
    }
): Promise<void> {
    const sets: string[] = [];
    const values: (string | null)[] = [];

    if (updates.title !== undefined) {
        sets.push('title = ?');
        values.push(updates.title);
    }
    if (updates.author !== undefined) {
        sets.push('author = ?');
        values.push(updates.author);
    }
    if (updates.coverUrl !== undefined) {
        sets.push('cover_url = ?');
        values.push(updates.coverUrl);
    }
    if (updates.coverLocalPath !== undefined) {
        sets.push('cover_local_path = ?');
        values.push(updates.coverLocalPath);
    }
    if (updates.isbn !== undefined) {
        sets.push('isbn = ?');
        values.push(updates.isbn);
    }
    if (updates.videoUrl !== undefined) {
        sets.push('video_url = ?');
        values.push(updates.videoUrl);
    }
    if (updates.videoPlatform !== undefined) {
        sets.push('video_platform = ?');
        values.push(updates.videoPlatform);
    }
    if (updates.thumbnailUrl !== undefined) {
        sets.push('thumbnail_url = ?');
        values.push(updates.thumbnailUrl);
    }
    if (updates.duration !== undefined) {
        sets.push('duration = ?');
        values.push(updates.duration);
    }
    if (updates.articleUrl !== undefined) {
        sets.push('article_url = ?');
        values.push(updates.articleUrl);
    }
    if (updates.domain !== undefined) {
        sets.push('domain = ?');
        values.push(updates.domain);
    }

    if (sets.length === 0) return;

    values.push(id);
    await getDb().runAsync(
        `UPDATE library_resources SET ${sets.join(', ')} WHERE id = ?`,
        ...values
    );
}

export async function deleteLibraryResource(id: string): Promise<void> {
    await getDb().runAsync('UPDATE library_resources SET is_deleted = 1 WHERE id = ?', id);
}

// ── Soft Delete ──

export async function softDelete(table: 'entries' | 'tasks' | 'notes' | 'reminders' | 'library_resources', id: string): Promise<void> {
    await getDb().runAsync(`UPDATE ${table} SET is_deleted = 1 WHERE id = ?`, id);
}

// ── Export all data (for cloud sync) ──

export async function exportAllData(): Promise<{
    entries: any[];
    tasks: DbTask[];
    notes: DbNote[];
    reminders: DbReminder[];
    chatMessages: DbChatMessage[];
    libraryResources: DbLibraryResource[];
}> {
    const d = getDb();
    return {
        entries: await d.getAllAsync('SELECT * FROM entries'),
        tasks: await d.getAllAsync<DbTask>('SELECT * FROM tasks'),
        notes: await d.getAllAsync<DbNote>('SELECT * FROM notes'),
        reminders: await d.getAllAsync<DbReminder>('SELECT * FROM reminders'),
        chatMessages: await d.getAllAsync<DbChatMessage>('SELECT * FROM chat_messages'),
        libraryResources: await d.getAllAsync<DbLibraryResource>('SELECT * FROM library_resources'),
    };
}

// ── Clear all data ──

export async function clearAllData(): Promise<void> {
    const d = getDb();
    await d.execAsync('DELETE FROM chat_messages');
    await d.execAsync('DELETE FROM tasks');
    await d.execAsync('DELETE FROM notes');
    await d.execAsync('DELETE FROM reminders');
    await d.execAsync('DELETE FROM library_resources');
    await d.execAsync('DELETE FROM entries');
}
