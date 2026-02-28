# DUMP — Product Requirements Document
**Version:** 1.0 | **Platform:** Android (React Native / Expo) | **Date:** February 2026

---

## 1. Overview

DUMP is an AI-native "Semantic Inbox" for frictionless personal capture. The user types (or speaks) anything — a task, a thought, a reminder — and the AI categorizes it automatically. No folders, no tags, no decisions at capture time.

**Built for:** Solo developer + close friend group  
**Not:** A mass-market app. Opinionated, fast, uncluttered.

---

## 2. Core Design Principles

- **Zero friction at capture** — Inbox is always the first screen, always focused
- **AI absorbs complexity** — User never manually picks a category
- **Correct via chat** — Miscategorizations are fixed by replying, not navigating
- **Local-first** — Data lives on device; cloud backup is opt-in

---

## 3. Technical Stack

| Layer | Choice |
|---|---|
| Framework | React Native (Expo managed) + TypeScript |
| State | Zustand |
| Local DB | SQLite via `expo-sqlite` |
| Cloud Backup | Supabase (opt-in) |
| AI Provider | Flexible — abstracted behind `AIService` layer (GPT-4o-mini or Claude Haiku) |
| Notifications | `expo-notifications` (local scheduling) |
| Navigation | React Navigation v6 — Drawer root → Bottom Tab → Native Stacks |
| Icons | Lucide React Native |

### Navigation Tree
```
Drawer (Settings, Archive)
└── Bottom Tabs
    ├── Inbox (Chat)
    ├── Tasks → TaskList → TaskDetail
    └── Notes → NoteList → NoteDetail
```

### SQLite Schema
| Table | Key Fields |
|---|---|
| `entries` | id, raw_text, created_at |
| `tasks` | id, entry_id, title, due_date, priority, is_completed |
| `notes` | id, entry_id, title, body, category |
| `reminders` | id, entry_id, title, remind_at, notification_id |
| `chat_messages` | id, role, content, linked_entry_id, created_at |

---

## 4. Features

### 4.1 Inbox (Chat Interface) — **Must Have**
The default screen. A persistent chat log where every dump and AI response lives.

- User types freely; AI responds with a structured card (task / note / reminder)
- Three-dot thinking animation while AI processes
- Tapping a task card's checkbox marks it complete inline
- Quick-fill hint chips above keyboard (e.g. "remind me", "add task")
- Chat history persists across sessions

**Correction flow:** User replies in chat (e.g. *"no, make that a reminder for 9am tomorrow"*). App re-calls AI with original text + correction. Old card is replaced in chat and DB.

### 4.2 Tasks View — **Must Have**
Flat list of all task entries. Filter pills: All / Today / This Week / Overdue. Tap to complete; long-press to delete. Detail view shows original raw dump text.

### 4.3 Notes View — **Must Have**
Masonry 2-column grid. Most recent note spans full width. Tap to open full body. AI auto-assigns a category label (e.g. "Idea", "Meeting").

### 4.4 Reminders & Push Notifications — **Must Have**
- On reminder creation → `scheduleNotificationAsync` fires immediately
- `notification_id` stored in DB for later cancellation
- If reminder is corrected or deleted → old notification cancelled, new one scheduled
- Permissions requested on first launch; graceful degradation if denied

### 4.5 Daily Digest — **Must Have**
- Triggered **manually** by tapping the banner at top of Inbox — no scheduled push
- Summarises: tasks added + completed today, reminders due tomorrow
- AI returns 2–4 sentences of conversational prose (no bullet points)
- Rendered as a special Digest bubble in the chat (distinct green border + star icon)

---

## 5. AI Prompt Contracts

### Categorization (called on every dump)
```
SYSTEM:
  You are a semantic inbox parser. Current datetime: {ISO8601}. Timezone: {tz}.
  Return ONLY valid JSON. No prose. No markdown.
  Schema: { type, title, due_date?, remind_at?, priority?, category? }
  Rules: time-related → reminder | action-required → task | else → note
  On ambiguity default to type: "note"

USER: {raw_text}
-- or for corrections --
USER: Original: {original_text} | Correction: {correction_text}. Re-parse with correction applied.
```

### Daily Digest
```
Input:  { tasks_added: [], tasks_completed: [], reminders_tomorrow: [] }
Output: 2–4 sentence prose summary. Friendly, direct. No lists.
Empty state: "Quiet day — nothing logged yet."
```

---

## 6. Error Handling

| Failure | Handling |
|---|---|
| AI timeout (>10s) | Save as raw note; show error card in chat |
| Malformed JSON response | Client try/catch; fallback to raw note |
| Rate limit (429) | Exponential backoff × 2 retries; then fallback |
| No network | Save locally immediately; queue re-parse for when online |
| Miscategorization | User corrects via chat (see §4.1) |
| Notification scheduling fails | Reminder saved; in-app indicator warns user |

All deletes are **soft deletes** (`is_deleted` flag). No permanent data loss in v1.

---

## 7. Sprint Plan

| Sprint | Focus |
|---|---|
| 1 | Expo scaffold, navigation skeleton, SQLite schema, Zustand store, mock chat UI |
| 2 | Live AI categorization, card rendering, chat history persistence |
| 3 | Tasks + Notes views, reminder scheduling, notification permissions |
| 4 | Correction flow, Daily Digest, AI error handling |
| 5 | Settings screen, Supabase opt-in cloud sync, soft deletes |
| 6 | Polish — haptics, animations, performance, distribution to friends |

**Total:** ~6 weeks solo

---

## 8. Out of Scope (v1)

- Collaboration / shared inboxes
- Any third-party integrations
- iOS / Web / Desktop
- Monetization
- Voice-to-text (v2 backlog)
- Semantic search / embedding-based note linking (v2 backlog)

---

## 9. Open Decisions (Pre-Sprint 1)

1. **SQLite library** — `expo-sqlite` (simpler) vs WatermelonDB (better at scale). *Recommend: start with expo-sqlite.*
2. **AI provider** — OpenAI GPT-4o-mini vs Anthropic Claude Haiku. Defer; abstraction layer built first.
3. **Cloud backend** — Supabase vs Firebase. *Recommend: Supabase for SQL control.*
4. **Friend distribution** — Expo Go vs internal APK vs Google Play internal testing.

---

## 10. Success Metrics

| Metric | Target |
|---|---|
| Cold launch → first keystroke | < 3 seconds |
| AI categorization accuracy | > 85% (correction rate < 15%) |
| Missed reminder notifications | 0 in test conditions |
| Digest render time (≤50 entries) | < 5 seconds |
| 7-day retention (friend group) | ≥ 60% |
| Crash-free rate | > 99% |
