# Multi-LLM Provider Implementation Plan

## Overview
Add support for Gemini, OpenRouter, and Sarvam AI providers with auto-fallback, user configuration, and seamless migration.

## Phase 1: Dependencies & Environment Setup

### 1.1 Install expo-secure-store
```bash
npx expo install expo-secure-store
```

### 1.2 Update .env file
Add OpenRouter and Sarvam keys:
```
EXPO_PUBLIC_GEMINI_API_KEY=existing_key
EXPO_PUBLIC_OPENROUTER_API_KEY=your_key
EXPO_PUBLIC_SARVAM_API_KEY=your_key
```

### 1.3 Update app.json
Add expo-secure-store to plugins array if needed

---

## Phase 2: Database Schema

### 2.1 Add LLM config table
In `services/database.ts` - `_doInit()`:
```sql
CREATE TABLE IF NOT EXISTS llm_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  provider TEXT NOT NULL DEFAULT 'gemini',
  gemini_api_key TEXT,
  openrouter_api_key TEXT,
  sarvam_api_key TEXT,
  openrouter_model TEXT DEFAULT 'meta-llama/llama-3.2-3b-instruct:free',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
```

### 2.2 Add app config table
```sql
CREATE TABLE IF NOT EXISTS app_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  has_seen_llm_banner INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
)
```

### 2.3 Add database functions
In `services/database.ts`:
- `getLLMConfig(): Promise<LLMConfig | null>`
- `saveLLMConfig(config: LLMConfig): Promise<void>`
- `getHasSeenLLMBanner(): Promise<boolean>`
- `setHasSeenLLMBanner(): Promise<void>`
- `migrateEnvKeysToDatabase(): Promise<void>` - auto-migrate from .env

### 2.4 Call migration in initDatabase()
Add migration call after table creation

---

## Phase 3: Unified LLM Service

### 3.1 Create services/llmService.ts
- Define `LLMRequest`, `LLMResponse`, `LLMError` interfaces
- Define `LLMProvider` interface with `call()` and `callWithRetry()`
- Implement `GeminiProvider` class
- Implement `OpenRouterProvider` class  
- Implement `SarvamProvider` class
- Implement `getLLMProvider(): Promise<LLMProvider>` factory
- Implement `callWithAutoFallback(request: LLMRequest): Promise<{ response: LLMResponse, usedProvider: string }>`

### 3.2 Auto-fallback logic
In `callWithAutoFallback()`:
- Get all providers with API keys from database
- Try each provider in order: Gemini → OpenRouter → Sarvam
- Return response + provider name used
- Throw error only if all providers fail

---

## Phase 4: Update AI Service

### 4.1 Modify services/aiService.ts
- Replace `callGeminiWithRetry()` with `callWithAutoFallback()`
- Update `classifyMessage()` to use new service
- Update `correctClassification()` to use new service
- Update `generateDigest()` to use new service
- Return provider name in `AIResponse` interface

### 4.2 Update AIResponse interface
Add `usedProvider?: string` field

---

## Phase 5: Chat Store Updates

### 5.1 Modify store/chatStore.ts
- Update `addUserMessage()` to handle `usedProvider` from response
- If provider changed from default, add system message: "Switched to {provider} due to {previous} unavailability"
- Save provider info in chat message metadata

---

## Phase 6: Onboarding Screen

### 6.1 Create app/onboarding.tsx
- Provider selection cards (Gemini, OpenRouter, Sarvam)
- API key inputs (secure text input with show/hide)
- OpenRouter model selector (dropdown with 2 free models)
- "Skip for now" button (uses .env keys)
- "Continue" button (saves to database)
- Links to get API keys

### 6.2 Add route to app/_layout.tsx
Add Stack.Screen for onboarding (modal presentation)

### 6.3 Check onboarding in root layout
In `app/_layout.tsx` bootstrap:
- Check if user has configured LLM (database has keys)
- If no keys in database, check .env and auto-migrate
- Don't show onboarding screen (Option C approach)

---

## Phase 7: Settings Screen Updates

### 7.1 Add LLM Provider section to app/(drawer)/settings.tsx
- Current provider display
- Current model display (for OpenRouter)
- "Change Provider" button
- Provider selection modal
- API key inputs
- Model selector (OpenRouter only)
- "Test Connection" button
- Save changes

### 7.2 Update "About" section
- Change "AI Model" to show current provider + model dynamically
- Read from database instead of hardcoded

---

## Phase 8: Banner Notification

### 8.1 Create components/LLMFeatureBanner.tsx
- One-time dismissible banner
- Message: "New: Choose your AI provider in Settings"
- "Got it" button
- "Go to Settings" button
- Check `has_seen_llm_banner` from database
- Set flag when dismissed

### 8.2 Add banner to main chat screen
In `app/(drawer)/(tabs)/index.tsx`:
- Show banner at top if not seen
- Auto-hide after user dismisses

---

## Phase 9: Error Handling & Logging

### 9.1 Add LLMError class
In `services/llmService.ts`:
- Provider-specific error codes
- Retryable flag
- User-friendly messages

### 9.2 Add error logging
- Log provider failures
- Log fallback attempts
- Log successful provider switches

---

## Phase 10: Testing & Validation

### 10.1 Test scenarios
- Fresh install with .env keys
- Fresh install without .env keys (onboarding)
- Existing user migration
- Provider fallback (simulate API failures)
- Settings changes
- EAS Build compatibility

### 10.2 Validate
- API keys stored securely
- Fallback works correctly
- Chat messages show provider switches
- Settings persist across app restarts
- Banner shows once and dismisses

---

## Phase 11: EAS Build Configuration

### 11.1 Update eas.json (if exists)
- Ensure environment variables are configured
- Test build with secrets

### 11.2 Test EAS Build
- Build with `eas build --platform android --profile preview`
- Verify .env keys are included
- Verify app works after installation

---

## Implementation Order

1. Phase 1: Dependencies
2. Phase 2: Database
3. Phase 3: LLM Service
4. Phase 4: AI Service
5. Phase 5: Chat Store
6. Phase 7: Settings (before onboarding for testing)
7. Phase 6: Onboarding
8. Phase 8: Banner
9. Phase 9: Error Handling
10. Phase 10: Testing
11. Phase 11: EAS Build

---

## Files to Create
- `services/llmService.ts`
- `app/onboarding.tsx`
- `components/LLMFeatureBanner.tsx`

## Files to Modify
- `services/database.ts`
- `services/aiService.ts`
- `store/chatStore.ts`
- `app/(drawer)/settings.tsx`
- `app/_layout.tsx`
- `app/(drawer)/(tabs)/index.tsx`
- `.env`
- `package.json` (dependencies)

## Critical Notes
- Use expo-secure-store for API key storage
- Keep .env keys as fallback defaults
- Auto-migrate existing users silently
- Show banner once about new feature
- Test all providers before deployment
- Ensure EAS Build includes environment variables
