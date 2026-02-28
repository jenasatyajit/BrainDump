# DUMP — Backend Implementation Plan

> **Scope**: Replace the local keyword-matching AI service with live Gemini API calls, add SQLite persistence, and wire up local notifications.

---

## Gemini API Details

| Key      | Value                                                     |
| -------- | --------------------------------------------------------- |
| Model    | `gemini-3-flash-preview` (or alias `gemini-flash-latest`) |
| Base URL | `https://generativelanguage.googleapis.com/v1beta`        |
| Endpoint | `POST /models/{model}:generateContent`                    |
| Auth     | API key via query param `?key={API_KEY}`                  |
| Env Var  | `EXPO_PUBLIC_GEMINI_API_KEY`                              |

---

## Phase 1 — Gemini AI Service

### 1.1 Create `services/geminiService.ts`

Core function that calls the Gemini API:
```ts
async function callGemini(systemPrompt: string, userMessage: string): Promise<string>
```

- POST to `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`
- Request body: `{ contents: [{ role: "user", parts: [{ text }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json" } }`
- Parse `response.candidates[0].content.parts[0].text`
- 10s timeout via `AbortController`

### 1.2 Update `services/aiService.ts`

Replace `classifyMessage()` internals:
- Build system prompt from PRD §5 contract (inject current datetime + timezone)
- Call `callGemini()` with the system prompt + user's raw text
- Parse returned JSON into `ParsedEntry[]`
- If multiple entries detected by AI, handle array response
- Keep the existing `ParsedEntry` / `AIResponse` interfaces unchanged

Replace `generateDigest()`:
- Build digest prompt from PRD §5
- Call `callGemini()` with task/completion/reminder data
- Return prose string

### 1.3 Keep local fallback
- If API call fails (timeout, malformed JSON, network error, 429) → fall back to the existing keyword-matching logic
- Log errors for debugging

### 1.4 Error handling (per PRD §6)

| Failure          | Handling                                                   |
| ---------------- | ---------------------------------------------------------- |
| Timeout (>10s)   | `AbortController` + save as raw note                       |
| Malformed JSON   | `try/catch` on `JSON.parse` → fallback to local classifier |
| Rate limit (429) | Exponential backoff × 2 retries → then fallback            |
| No network       | Save locally, queue for re-parse when online               |

### 1.5 Correction flow
- When user sends a correction, call Gemini with: `Original: {original_text} | Correction: {correction_text}. Re-parse with correction applied.`
- Replace old card in chat and update store

---

## Phase 2 — SQLite Persistence

### 2.1 Install + configure
```bash
npx expo install expo-sqlite
```

### 2.2 Create `services/database.ts`

Tables (from PRD schema):
```sql
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  raw_text TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  entry_id TEXT REFERENCES entries(id),
  title TEXT NOT NULL,
  due_date TEXT,
  priority TEXT,
  is_completed INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  entry_id TEXT REFERENCES entries(id),
  title TEXT NOT NULL,
  body TEXT,
  category TEXT,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  entry_id TEXT REFERENCES entries(id),
  title TEXT NOT NULL,
  remind_at TEXT,
  notification_id TEXT,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  linked_entry_id TEXT,
  is_digest INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
```

CRUD functions:
- `initDatabase()` — create tables on app start
- `saveChatMessage()` / `getChatMessages()`
- `saveEntry()` / `saveTask()` / `saveNote()` / `saveReminder()`
- `getTasksFiltered(filter)` / `getNotes()`
- `softDelete(table, id)` — set `is_deleted = 1`
- `toggleTaskComplete(id)`

### 2.3 Update Zustand stores

Modify `chatStore`, `taskStore`, `noteStore` to:
- Load initial data from SQLite on app start
- Write to SQLite on every mutation (addMessage, toggleTask, etc.)
- Remove seed data — real data comes from DB

---

## Phase 3 — Notifications

### 3.1 Install + configure
```bash
npx expo install expo-notifications
```

### 3.2 Create `services/notificationService.ts`

- `requestPermissions()` — called on first launch
- `scheduleReminder(title, remindAt)` → returns `notification_id`
- `cancelReminder(notificationId)`
- Stores `notification_id` in reminders table

### 3.3 Wire into chat flow
- When AI returns type `reminder` → schedule notification
- When reminder corrected → cancel old, schedule new
- When reminder deleted → cancel notification

---

## Phase 4 — Supabase Cloud Sync (Opt-in)

### 4.1 Already have `utils/supabase.ts` configured

### 4.2 Create `services/syncService.ts`
- `syncToCloud()` — push local SQLite data to Supabase
- `syncFromCloud()` — pull remote data, merge with local
- Triggered manually from Settings screen
- Conflict resolution: last-write-wins by `updated_at`

### 4.3 Settings screen
- Toggle for cloud sync on/off
- "Sync Now" button
- Display last sync timestamp

---

## Verification Plan

### Manual Testing
1. Add `EXPO_PUBLIC_GEMINI_API_KEY` to `.env`
2. Run `npx expo start`, open on device/emulator
3. **Categorization**: Type "remind me to call dentist tomorrow morning" → should return a reminder card (not keyword-based, AI-classified)
4. **Multiple entries**: Type "finish report and also update branding" → should return 2 task cards
5. **Notes**: Type "interesting idea about vector databases" → should return a note with category "Idea"
6. **Fallback**: Temporarily use an invalid API key → should fall back to local keyword matching, show error in console
7. **Digest**: Tap digest banner → should generate prose summary via Gemini
8. **Persistence** (Phase 2): Close and reopen app → chat history should persist
9. **Notifications** (Phase 3): Create a reminder 1 minute from now → notification should fire
