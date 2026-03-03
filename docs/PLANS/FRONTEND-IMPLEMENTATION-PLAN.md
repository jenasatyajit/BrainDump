# DUMP — Frontend Implementation Plan

> **Scope**: Frontend UI + AI service placeholder (no SQLite, no notifications).  
> Data is mocked with Zustand stores. AI service uses a placeholder that auto-detects user intent.

---

## Phase 0 — Foundation & Design System

### 0.1 Install dependencies
```bash
npx expo install expo-haptics
```
> Icons: use existing `@expo/vector-icons` (Ionicons/MaterialIcons/Feather).  
> NativeWind v4.2.2 already configured.

### 0.2 Tailwind theme — extend `tailwind.config.js`
Add the color palette:
```js
colors: {
  bg:        '#0a0a0f',
  surface:   '#111118',
  surface2:  '#18181f',
  border:    '#222230',
  text:      '#e8e8f0',
  muted:     '#5a5a70',
  accent:    '#7fff9e',
  accent2:   '#ff7eb3',
  accent3:   '#7eb8ff',
  task:      '#7eb8ff',
  note:      '#ffd97e',
  reminder:  '#ff7eb3',
}
```

---

## Phase 1 — Navigation Skeleton

### 1.1 Target directory layout
```
app/
  _layout.tsx              ← Root Stack
  modal.tsx                ← keep
  (drawer)/
    _layout.tsx            ← Drawer (Settings, Archive)
    settings.tsx           ← placeholder
    archive.tsx            ← placeholder
    (tabs)/
      _layout.tsx          ← Bottom Tabs: Inbox | Tasks | Notes
      index.tsx            ← Inbox (Chat)
      tasks.tsx            ← Tasks
      notes.tsx            ← Notes
```

### 1.2 Root layout — dark background on `GestureHandlerRootView`

### 1.3 Drawer layout
- Remove standalone `index.tsx`. Drawer opens directly into `(tabs)`.
- Items: Settings, Archive (placeholders).
- Hide drawer header for `(tabs)`.
- Custom dark-themed drawer content.

### 1.4 Bottom Tabs layout
- 3 tabs: Inbox, Tasks, Notes
- Custom `TabBar.tsx` component matching HTML reference dark theme
- Icons from `@expo/vector-icons` (Ionicons): `chatbubble-outline`, `checkbox-outline`, `document-text-outline`
- Active = accent green, badge dot on Tasks tab

### 1.5 Delete old files
- `app/(drawer)/index.tsx`
- `app/(drawer)/(tabs)/two.tsx`
- Remove unused template components (`EditScreenInfo`, `ScreenContent`, `Container`)

---

## Phase 2 — Zustand Stores + AI Service

### 2.1 AI Service — `services/aiService.ts`
Placeholder that auto-detects intent from user text:
- Keyword / pattern matching for task, reminder, note classification
- Returns typed `ParsedEntry` JSON (matching PRD §5 contract)
- Simulates network delay (800ms)
- Easy to swap with real API later (abstraction layer)

### 2.2 Chat Store — `store/chatStore.ts`
Types: `ChatMessage`, `ParsedEntry`  
Actions: `addUserMessage(text)`, `toggleTaskComplete(entryId)`, `getDigest()`  
Seeded with sample conversations from HTML reference.

### 2.3 Task Store — `store/taskStore.ts`
Derived flat list from chat entries. Filters: all, today, thisWeek, overdue.

### 2.4 Note Store — `store/noteStore.ts`
Derived note list. Fields: id, title, body, category, emoji, createdAt.

---

## Phase 3 — Inbox (Chat) Screen

### Components (`components/chat/`)

| Component               | Description                                   |
| ----------------------- | --------------------------------------------- |
| `ChatHeader.tsx`        | "DUMP" title + mic btn + drawer hamburger btn |
| `DigestBanner.tsx`      | Gradient banner: "Daily Digest Ready"         |
| `DateDivider.tsx`       | Centered date label                           |
| `AIGreeting.tsx`        | Green gradient bubble with AI badge           |
| `UserBubble.tsx`        | Right-aligned dark bubble                     |
| `AIBubble.tsx`          | Left-aligned bubble + ParsedCard              |
| `ParsedCard.tsx`        | Color-coded card (task/note/reminder)         |
| `TaskCard.tsx`          | ParsedCard + checkbox                         |
| `ThinkingIndicator.tsx` | 3-dot pulse animation                         |
| `ChatInput.tsx`         | TextInput + hint chips + send + mic           |
| `HintChip.tsx`          | Chip ("remind me", "add task", etc.)          |

### Behavior
- FlatList, auto-scroll on new messages
- Send → user msg → thinking dots → AI response with parsed card
- Task cards: tappable checkbox toggles completion inline
- Hint chips fill input text

---

## Phase 4 — Tasks Screen

### Components (`components/tasks/`)

| Component         | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `TasksHeader.tsx` | Title + subtitle counter                             |
| `FilterPills.tsx` | Horizontal scroll: All / Today / This Week / Overdue |
| `TaskItem.tsx`    | Checkbox + title + detail + priority dot             |

### Behavior
- FlatList from taskStore, filter pills toggle filter
- Tap checkbox → toggle complete (haptic)
- Completed: reduced opacity + strikethrough

---

## Phase 5 — Notes Screen

### Components (`components/notes/`)

| Component         | Description                    |
| ----------------- | ------------------------------ |
| `NotesHeader.tsx` | Title + subtitle counter       |
| `NoteCard.tsx`    | Emoji + title + preview + date |

### Layout
- 2-column FlatList, first note full-width
- Press effect on cards

---

## Phase 6 — Drawer Placeholders
- `settings.tsx` — title centered
- `archive.tsx` — title centered

---

## Phase 7 — Polish
- `expo-haptics` on task toggle and send
- Card slide-up animation via Reanimated
- Safe area insets (StatusBar, bottom bar)
- Dark status bar via `expo-status-bar`
