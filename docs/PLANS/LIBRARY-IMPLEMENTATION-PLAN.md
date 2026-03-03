# Library Tab Implementation Plan

## Overview
Add a Library tab to store and display books, videos (YouTube/Instagram), and articles with metadata fetching and local caching.

## Technical Decisions

### APIs & Services
- **Books**: Google Books API (free, no key required for basic queries) + Open Library as fallback
- **YouTube**: YouTube Data API v3 (requires free API key) or oEmbed API (no key, limited data)
- **Instagram**: Store URL only, no metadata fetching (API restrictions)
- **Articles**: Basic URL metadata extraction (title from HTML meta tags)

### Data Storage
- New SQLite table: `library_resources`
- Local file cache for book covers: `FileSystem.documentDirectory + 'library_covers/'`
- Fallback: Book emoji (📚) when cover unavailable

### AI Integration
- Extend AI categorization to detect library resources
- New type: `library` with subtype: `book | video | article`
- Manual add option in Library tab UI

---

## Phase 1: Database & Core Types

### 1.1 Update Database Schema
**File**: `services/database.ts`

Add new table:
```sql
CREATE TABLE IF NOT EXISTS library_resources (
  id TEXT PRIMARY KEY,
  entry_id TEXT REFERENCES entries(id),
  type TEXT NOT NULL, -- 'book' | 'video' | 'article'
  title TEXT NOT NULL,
  
  -- Book fields
  author TEXT,
  cover_url TEXT,
  cover_local_path TEXT,
  isbn TEXT,
  
  -- Video fields
  video_url TEXT,
  video_platform TEXT, -- 'youtube' | 'instagram'
  thumbnail_url TEXT,
  duration TEXT,
  
  -- Article fields
  article_url TEXT,
  domain TEXT,
  
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
)
```

Add CRUD functions:
- `saveLibraryResource()`
- `getLibraryResources()`
- `updateLibraryResource()`
- `deleteLibraryResource()`

### 1.2 Update AI Service Types
**File**: `services/aiService.ts`

Extend `ParsedEntry` type:
```typescript
export interface ParsedEntry {
  type: 'task' | 'note' | 'reminder' | 'library';
  title: string;
  
  // Existing fields...
  
  // Library fields
  libraryType?: 'book' | 'video' | 'article';
  author?: string;
  url?: string;
  platform?: 'youtube' | 'instagram';
}
```

---

## Phase 2: Metadata Fetching Services

### 2.1 Create Library Service
**File**: `services/libraryService.ts`

Functions:
- `fetchBookMetadata(title: string)` - Google Books API
- `fetchYouTubeMetadata(url: string)` - YouTube oEmbed or Data API
- `fetchArticleMetadata(url: string)` - Basic HTML parsing
- `downloadAndCacheImage(url: string, id: string)` - Local storage
- `extractVideoId(url: string)` - Parse YouTube/Instagram URLs
- `getYouTubeThumbnail(videoId: string)` - Direct URL construction

### 2.2 Update AI Prompt
**File**: `services/aiService.ts`

Extend categorization prompt:
```
Rules:
- Book mention (e.g., "read X", "book: X") → type: "library", libraryType: "book"
- YouTube/Instagram URL → type: "library", libraryType: "video"
- Article URL (http/https) → type: "library", libraryType: "article"
- Extract book title from natural language
```

Update response schema to include library fields.

---

## Phase 3: Store & State Management

### 3.1 Create Library Store
**File**: `store/libraryStore.ts`

State:
- `getBooks()` - Filter library resources by type
- `getVideos()`
- `getArticles()`
- `getStats()` - Count by type

Derive from `chatStore.messages` (same pattern as taskStore/noteStore).

---

## Phase 4: UI Components

### 4.1 Library Tab Screen
**File**: `app/(drawer)/(tabs)/library.tsx`

Layout:
- Header with stats (total resources)
- Filter chips (All/Books/Videos/Articles) - same pattern as tasks
- Scrollable sections for each type
- Manual add button (floating action button)

### 4.2 Book Components
**Files**: 
- `components/library/BookCard.tsx` - Horizontal scroll card
- `components/library/BookDetailModal.tsx` - Edit/view details

Display:
- Cover image (cached local or fallback emoji 📚)
- Title + Author
- Tap to view details

### 4.3 Video Components
**Files**:
- `components/library/VideoCard.tsx` - List item
- `components/library/VideoDetailModal.tsx`

Display:
- Thumbnail (YouTube) or platform icon (Instagram)
- Title + Duration (YouTube only)
- Platform badge
- Tap to open URL in browser using `Linking.openURL()`

### 4.4 Article Components
**Files**:
- `components/library/ArticleCard.tsx` - Compact list
- `components/library/ArticleDetailModal.tsx`

Display:
- Favicon/emoji
- Title + Domain
- Tap to open URL in browser using `Linking.openURL()`

### 4.5 Manual Add Modal
**File**: `components/library/AddResourceModal.tsx`

Three tabs: Book / Video / Article
- Book: Title input → fetch metadata button
- Video: URL input → auto-detect platform
- Article: URL input → fetch title

### 4.6 Library Header
**File**: `components/library/LibraryHeader.tsx`

Display:
- Total count
- Search icon (future)
- Add button

---

## Phase 5: Chat Integration

### 5.1 Update ParsedCard Component
**File**: `components/chat/ParsedCard.tsx`

Add library card rendering:
- Book: Mini card with cover + title + author (tap to view details)
- Video: Thumbnail + title + platform badge (tap to open URL)
- Article: Compact link preview (tap to open URL)

Use React Native's `Linking.openURL()` for external links.

### 5.2 Update Chat Store
**File**: `store/chatStore.ts`

After AI categorization:
- If type === 'library', call `libraryService.fetchMetadata()`
- Save to `library_resources` table
- Cache images if applicable
- Handle fetch errors gracefully (save with minimal data)

---

## Phase 6: Navigation & Tab Bar

### 6.1 Update Tab Bar
**File**: `components/TabBar.tsx`

Add 4th tab:
```typescript
{ 
  name: 'library', 
  label: 'Library', 
  icon: 'book-outline', 
  activeIcon: 'book' 
}
```

### 6.2 Add Library Route
**File**: `app/(drawer)/(tabs)/_layout.tsx`

Add:
```typescript
<Tabs.Screen name="library" options={{ title: 'Library' }} />
```

---

## Phase 7: Error Handling & Edge Cases

### 7.1 API Failures
- Google Books API down → save book with title only, show 📚 emoji
- YouTube API rate limit → save with URL only, fetch later
- Network offline → queue metadata fetch for later

### 7.2 Invalid URLs
- Validate URL format before fetching
- Show error toast if invalid
- Allow manual correction

### 7.3 Duplicate Detection
- Check if resource already exists (by URL or title)
- Show warning, allow user to confirm

---

## Phase 8: Polish & Testing

### 8.1 Animations
- Staggered fade-in for cards (same as notes/tasks)
- Smooth transitions for modals
- Loading states during metadata fetch

### 8.2 Haptics
- Feedback on card tap
- Success haptic on resource added

### 8.3 Empty States
- "No books yet" with helpful message
- Suggest adding via chat or manual button

---

## Implementation Order

1. **Phase 1** - Database schema + types (30 min)
2. **Phase 2** - Metadata services (2 hours)
3. **Phase 3** - Library store (30 min)
4. **Phase 6** - Navigation setup (15 min)
5. **Phase 4** - UI components (3 hours)
6. **Phase 5** - Chat integration (1 hour)
7. **Phase 7** - Error handling (1 hour)
8. **Phase 8** - Polish (1 hour)

**Total Estimate**: ~9 hours

---

## Dependencies to Install

```bash
npm install @react-native-async-storage/async-storage
# Already have: expo-file-system (for caching)
```

---

## API Keys Required

### YouTube Data API (Optional - can use oEmbed without key)
1. Go to Google Cloud Console
2. Enable YouTube Data API v3
3. Create API key
4. Add to `.env`: `YOUTUBE_API_KEY=your_key`

**Alternative**: Use YouTube oEmbed (no key required, limited data)

---

## Testing Checklist

- [ ] Add book via chat ("read Atomic Habits")
- [ ] Add YouTube video via URL
- [ ] Add Instagram video via URL (stores URL only)
- [ ] Add article via URL
- [ ] Manual add via Library tab
- [ ] Book cover caching works
- [ ] Fallback emoji shows when cover unavailable
- [ ] Tap video card opens URL in browser
- [ ] Tap article card opens URL in browser
- [ ] Tap book card shows detail modal
- [ ] Edit library resource
- [ ] Delete library resource
- [ ] Filter by type works
- [ ] Empty states display correctly
- [ ] Offline mode handles gracefully
- [ ] API failures don't crash app
- [ ] External links open correctly on Android

---

## Future Enhancements (Out of Scope)

- Reading progress tracking for books
- Watch later / read later status
- Tags/collections
- Search within library
- Export library as CSV
- Article reading time calculation
- Instagram metadata (if API access obtained)
- Book recommendations based on library
