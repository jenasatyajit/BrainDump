/**
 * AI Service — Gemini-powered intent detection with local fallback
 *
 * Primary: Calls Gemini 3.5 Flash to classify user text
 * Fallback: Local keyword/pattern matching if API fails
 */

import { callGeminiWithRetry, GeminiError } from './geminiService';

// ── Types (unchanged, used by the rest of the app) ──

export interface ParsedEntry {
    type: 'task' | 'note' | 'reminder';
    title: string;
    dueDate?: string;
    remindAt?: string;
    priority?: 'high' | 'medium' | 'low';
    category?: string;
    isCompleted: boolean;
}

export interface AIResponse {
    reply: string;
    entries: ParsedEntry[];
}

// ── Gemini Prompt Builder ──

function buildCategorizationPrompt(): string {
    const now = new Date();
    const iso = now.toISOString();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return `You are a semantic inbox parser. Current datetime: ${iso}. Timezone: ${tz}.

Return ONLY valid JSON. No prose. No markdown fences.

Response schema:
{
  "entries": [
    {
      "type": "task" | "note" | "reminder",
      "title": "string — concise title extracted from user text",
      "due_date": "YYYY-MM-DD or null",
      "remind_at": "ISO8601 datetime or null",
      "priority": "high" | "medium" | "low",
      "category": "string — e.g. Idea, Meeting, Work, Personal, General (for notes only, null for tasks/reminders)"
    }
  ],
  "reply": "string — short 1-sentence conversational response to the user about what you parsed"
}

Classification rules:
- If the text mentions a specific time, deadline, or "remind me" → type: "reminder"
- If the text describes an action the user needs to take → type: "task"
- Otherwise → type: "note"
- On ambiguity, default to type: "note"
- If multiple items are present in the text, return multiple entries in the array
- For due_date, parse relative dates (tomorrow, friday, next week) into absolute YYYY-MM-DD
- For remind_at, parse time expressions into full ISO8601 datetime
- For priority: urgent/asap/critical → high, this week/soon → medium, else → low
- For category on notes: detect the theme (Idea, Meeting, Reading, Goal, Project, Research, General)
- reply should be short and conversational — e.g. "Got it. Parsed as a reminder." or "Two tasks detected."`;
}

function buildDigestPrompt(): string {
    return `You are a daily digest summarizer for a personal productivity app.

Given the user's activity data, write a 2–4 sentence prose summary. Friendly and direct tone. No bullet points or lists.

If there is no activity data, respond with exactly: "Quiet day — nothing logged yet."

Return ONLY the prose text, no JSON, no markdown.`;
}

function buildCorrectionPrompt(): string {
    const now = new Date();
    const iso = now.toISOString();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return `You are a semantic inbox parser. Current datetime: ${iso}. Timezone: ${tz}.

The user is correcting a previous classification. Re-parse with the correction applied.

Return ONLY valid JSON. No prose. No markdown fences.

Response schema:
{
  "entries": [
    {
      "type": "task" | "note" | "reminder",
      "title": "string",
      "due_date": "YYYY-MM-DD or null",
      "remind_at": "ISO8601 datetime or null",
      "priority": "high" | "medium" | "low",
      "category": "string or null"
    }
  ],
  "reply": "string — short confirmation of the correction"
}`;
}

// ── Gemini Response Parser ──

interface GeminiCategorizeResponse {
    entries: {
        type: 'task' | 'note' | 'reminder';
        title: string;
        due_date?: string | null;
        remind_at?: string | null;
        priority?: 'high' | 'medium' | 'low';
        category?: string | null;
    }[];
    reply: string;
}

function parseGeminiResponse(raw: string): AIResponse {
    const parsed: GeminiCategorizeResponse = JSON.parse(raw);

    if (!parsed.entries || !Array.isArray(parsed.entries) || parsed.entries.length === 0) {
        throw new Error('Invalid response: no entries array');
    }

    const entries: ParsedEntry[] = parsed.entries.map((e) => ({
        type: e.type || 'note',
        title: e.title || 'Untitled',
        dueDate: e.due_date || undefined,
        remindAt: e.remind_at || undefined,
        priority: e.priority || 'low',
        category: e.category || undefined,
        isCompleted: false,
    }));

    return {
        reply: parsed.reply || generateFallbackReply(entries),
        entries,
    };
}

function generateFallbackReply(entries: ParsedEntry[]): string {
    if (entries.length === 0) return "Saved as a note. I'll look for related entries.";
    if (entries.length > 1) {
        return `${entries.length} items detected. Added all to your queue.`;
    }
    switch (entries[0].type) {
        case 'task':
            return 'Detected a task. Added to your queue.';
        case 'reminder':
            return 'Got it. Saved as a reminder.';
        case 'note':
            return "Saved as a note. I'll look for related entries.";
    }
}

// ══════════════════════════════════════════════════
// LOCAL FALLBACK — keyword-matching (kept for offline/error scenarios)
// ══════════════════════════════════════════════════

const REMINDER_PATTERNS = [
    /\bremind\s*(me)?\b/i, /\btomorrow\b/i, /\btmr\b/i, /\btonight\b/i,
    /\bmorning\b/i, /\bevening\b/i, /\bappointment\b/i, /\bschedule\b/i,
    /\bdon'?t\s+forget\b/i,
];

const TASK_PATTERNS = [
    /\b(need\s+to|have\s+to|must|should|gotta)\b/i,
    /\b(finish|complete|submit|send|fix|update|write|review|check|prepare|create|make|build|do|buy|get|clean|pay|call)\b/i,
    /\btask\b/i, /\btodo\b/i, /\bdeadline\b/i, /\basap\b/i, /\burgent\b/i,
];

function localClassify(text: string): ParsedEntry[] {
    const isReminder = REMINDER_PATTERNS.some((p) => p.test(text));
    const isTask = TASK_PATTERNS.some((p) => p.test(text));

    const title = text.charAt(0).toUpperCase() + text.slice(1);
    const shortTitle = title.length > 80 ? title.substring(0, 77) + '...' : title;

    if (isReminder) {
        return [{ type: 'reminder', title: shortTitle, priority: 'medium', isCompleted: false }];
    }
    if (isTask) {
        return [{ type: 'task', title: shortTitle, priority: 'medium', isCompleted: false }];
    }
    return [{ type: 'note', title: shortTitle, category: 'General', isCompleted: false }];
}

// ══════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════

/**
 * Classify user text via Gemini API, falling back to local classifier on failure.
 */
export async function classifyMessage(text: string): Promise<AIResponse> {
    try {
        const raw = await callGeminiWithRetry({
            systemPrompt: buildCategorizationPrompt(),
            userMessage: text,
            jsonMode: true,
        });

        return parseGeminiResponse(raw);
    } catch (error) {
        console.warn('[aiService] Gemini failed, using local fallback:', error instanceof Error ? error.message : error);

        // Local fallback
        const entries = localClassify(text);
        return {
            reply: generateFallbackReply(entries),
            entries,
        };
    }
}

/**
 * Correct a previous classification via Gemini.
 */
export async function correctClassification(
    originalText: string,
    correctionText: string
): Promise<AIResponse> {
    try {
        const raw = await callGeminiWithRetry({
            systemPrompt: buildCorrectionPrompt(),
            userMessage: `Original: ${originalText} | Correction: ${correctionText}. Re-parse with correction applied.`,
            jsonMode: true,
        });

        return parseGeminiResponse(raw);
    } catch (error) {
        console.warn('[aiService] Correction via Gemini failed:', error instanceof Error ? error.message : error);
        // On correction failure, just reclassify the correction text
        return classifyMessage(correctionText);
    }
}

/**
 * Generate a daily digest summary via Gemini.
 */
export async function generateDigest(data: {
    tasksAdded: string[];
    tasksCompleted: string[];
    remindersTomorrow: string[];
}): Promise<string> {
    const { tasksAdded, tasksCompleted, remindersTomorrow } = data;

    if (tasksAdded.length === 0 && tasksCompleted.length === 0 && remindersTomorrow.length === 0) {
        return 'Quiet day — nothing logged yet.';
    }

    const userMessage = `Today's activity:
- Tasks added: ${tasksAdded.length > 0 ? tasksAdded.join(', ') : 'none'}
- Tasks completed: ${tasksCompleted.length > 0 ? tasksCompleted.join(', ') : 'none'}
- Reminders for tomorrow: ${remindersTomorrow.length > 0 ? remindersTomorrow.join(', ') : 'none'}`;

    try {
        const digest = await callGeminiWithRetry({
            systemPrompt: buildDigestPrompt(),
            userMessage,
            jsonMode: false,
        });

        return digest.trim();
    } catch (error) {
        console.warn('[aiService] Digest via Gemini failed:', error instanceof Error ? error.message : error);

        // Local fallback digest
        const parts: string[] = [];
        if (tasksAdded.length > 0) parts.push(`You added ${tasksAdded.length} task${tasksAdded.length > 1 ? 's' : ''} today`);
        if (tasksCompleted.length > 0) parts.push(`completed ${tasksCompleted.length}`);
        if (remindersTomorrow.length > 0) parts.push(`have ${remindersTomorrow.length} reminder${remindersTomorrow.length > 1 ? 's' : ''} tomorrow`);
        return parts.join(', ') + '. Keep the momentum going!';
    }
}
