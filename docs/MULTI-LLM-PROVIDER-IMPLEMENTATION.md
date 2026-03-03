# Multi-LLM Provider Implementation Guide

## Overview

This document outlines the implementation strategy for adding multi-LLM provider support to the Brain Dump app, allowing users to choose between Gemini, OpenRouter, and Sarvam AI providers with their own API keys.

## Current Implementation Analysis

### Existing Architecture

The app currently uses Google Gemini API with the following structure:

- **Model**: `gemini-3-flash-preview`
- **Service Layer**: `services/geminiService.ts` - Low-level API wrapper
- **AI Service**: `services/aiService.ts` - High-level classification and processing
- **API Key Storage**: Environment variable `EXPO_PUBLIC_GEMINI_API_KEY` in `.env`
- **Database**: SQLite via `expo-sqlite` for local persistence
- **State Management**: Zustand stores (chatStore, libraryStore, noteStore, taskStore)

### Key Features Using LLM

1. **Message Classification**: Categorizes user input into tasks, notes, reminders, or library items
2. **Daily Digest Generation**: Creates summaries of user activity
3. **Classification Correction**: Re-parses user corrections
4. **Local Fallback**: Keyword-based classification when API fails

## Provider Research Summary

### 1. Google Gemini API

**Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`

**Authentication**: API key in URL query parameter

**Request Format**:
```json
{
  "contents": [{ "role": "user", "parts": [{ "text": "message" }] }],
  "systemInstruction": { "parts": [{ "text": "system prompt" }] },
  "generationConfig": {
    "temperature": 0.2,
    "maxOutputTokens": 1024,
    "responseMimeType": "application/json"
  }
}
```

**Response Format**:
```json
{
  "candidates": [{
    "content": { "parts": [{ "text": "response" }], "role": "model" },
    "finishReason": "STOP"
  }],
  "usageMetadata": { "promptTokenCount": 10, "candidatesTokenCount": 20 }
}
```

**Pros**:
- Already implemented and working
- Good JSON mode support
- Fast response times
- Reliable for production use

**Cons**:
- Requires Google account
- Regional availability limitations
- Single provider lock-in

---

### 2. OpenRouter API

**Endpoint**: `https://openrouter.ai/api/v1/chat/completions`

**Authentication**: Bearer token in Authorization header

**Request Format** (OpenAI-compatible):
```json
{
  "model": "google/gemini-flash-1.5",
  "messages": [
    { "role": "system", "content": "system prompt" },
    { "role": "user", "content": "user message" }
  ],
  "temperature": 0.2,
  "max_tokens": 1024,
  "response_format": { "type": "json_object" }
}
```

**Response Format** (OpenAI-compatible):
```json
{
  "id": "gen-abc123",
  "model": "google/gemini-flash-1.5",
  "choices": [{
    "message": { "role": "assistant", "content": "response" },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30 }
}
```

**Available Models**:
- `google/gemini-flash-1.5` - Fast, cost-effective
- `anthropic/claude-3.5-sonnet` - High quality reasoning
- `openai/gpt-4o` - Latest OpenAI model
- `meta-llama/llama-3.1-70b-instruct` - Open source option
- 400+ other models from various providers

**Pros**:
- Access to 400+ models through single API
- OpenAI-compatible schema (easy migration)
- Automatic fallbacks and load balancing
- Cost optimization across providers
- No need for multiple API keys

**Cons**:
- Additional abstraction layer
- Requires OpenRouter account
- Pricing varies by model


---

### 3. Sarvam AI API

**Endpoint**: `https://api.sarvam.ai/v1/chat/completions`

**Authentication**: API key in `api-subscription-key` header

**Request Format**:
```json
{
  "model": "sarvam-m",
  "messages": [
    { "role": "user", "content": "message" }
  ],
  "temperature": 0.2,
  "max_tokens": 1024,
  "reasoning_effort": "medium"
}
```

**Response Format** (OpenAI-compatible):
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "model": "sarvam-m",
  "choices": [{
    "message": { "role": "assistant", "content": "response" },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 15, "completion_tokens": 25, "total_tokens": 40 }
}
```

**Available Models**:
- `sarvam-m` - Multilingual model with Indian language support
- `sarvam-2b` - Lightweight model for faster responses

**Unique Features**:
- Native support for 11+ Indian languages (Hindi, Tamil, Telugu, etc.)
- Romanized language support (Hinglish, Tanglish)
- Wiki grounding for factual queries
- Thinking mode for complex reasoning
- Cultural context understanding for India

**Pros**:
- Excellent for Indian language support
- Culturally grounded responses
- ISO certified and SOC 2 Type II compliant
- Competitive pricing for Indian market
- Built on sovereign compute infrastructure

**Cons**:
- Smaller model selection compared to OpenRouter
- Primarily focused on Indian languages/context
- Newer platform (less established)


---

## Implementation Strategy

### Phase 1: Database Schema Updates

Add new tables to store user preferences and API keys:

```sql
-- Provider configuration table
CREATE TABLE IF NOT EXISTS llm_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  provider TEXT NOT NULL DEFAULT 'gemini',
  gemini_api_key TEXT,
  openrouter_api_key TEXT,
  sarvam_api_key TEXT,
  selected_model TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- User onboarding status
CREATE TABLE IF NOT EXISTS app_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  is_onboarded INTEGER DEFAULT 0,
  onboarded_at TEXT,
  created_at TEXT NOT NULL
);
```

**Database Service Functions** (`services/database.ts`):

```typescript
export interface LLMConfig {
  provider: 'gemini' | 'openrouter' | 'sarvam';
  gemini_api_key?: string;
  openrouter_api_key?: string;
  sarvam_api_key?: string;
  selected_model?: string;
}

export async function getLLMConfig(): Promise<LLMConfig | null>;
export async function saveLLMConfig(config: LLMConfig): Promise<void>;
export async function getOnboardingStatus(): Promise<boolean>;
export async function setOnboardingComplete(): Promise<void>;
```


### Phase 2: Unified LLM Service Layer

Create a provider-agnostic service that abstracts different LLM APIs:

**File**: `services/llmService.ts`

```typescript
// Unified request/response types
export interface LLMRequest {
  systemPrompt: string;
  userMessage: string;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Provider interface
interface LLMProvider {
  call(request: LLMRequest): Promise<LLMResponse>;
  callWithRetry(request: LLMRequest, maxRetries?: number): Promise<LLMResponse>;
}

// Provider implementations
class GeminiProvider implements LLMProvider { /* ... */ }
class OpenRouterProvider implements LLMProvider { /* ... */ }
class SarvamProvider implements LLMProvider { /* ... */ }

// Factory function
export async function getLLMProvider(): Promise<LLMProvider> {
  const config = await getLLMConfig();
  
  switch (config?.provider) {
    case 'gemini':
      return new GeminiProvider(config.gemini_api_key);
    case 'openrouter':
      return new OpenRouterProvider(config.openrouter_api_key, config.selected_model);
    case 'sarvam':
      return new SarvamProvider(config.sarvam_api_key);
    default:
      throw new Error('No LLM provider configured');
  }
}
```


### Phase 3: Provider Implementations

#### Gemini Provider

```typescript
class GeminiProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private model = 'gemini-3-flash-preview';

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('Gemini API key is required');
    this.apiKey = apiKey;
  }

  async call(request: LLMRequest): Promise<LLMResponse> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    const body = {
      contents: [{ role: 'user', parts: [{ text: request.userMessage }] }],
      systemInstruction: { parts: [{ text: request.systemPrompt }] },
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxTokens ?? 1024,
        ...(request.jsonMode && { responseMimeType: 'application/json' }),
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.candidates[0].content.parts[0].text,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
      },
    };
  }
}
```


#### OpenRouter Provider

```typescript
class OpenRouterProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  private model: string;

  constructor(apiKey: string, model: string = 'google/gemini-flash-1.5') {
    if (!apiKey) throw new Error('OpenRouter API key is required');
    this.apiKey = apiKey;
    this.model = model;
  }

  async call(request: LLMRequest): Promise<LLMResponse> {
    const url = `${this.baseUrl}/chat/completions`;
    
    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userMessage },
      ],
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 1024,
      ...(request.jsonMode && { response_format: { type: 'json_object' } }),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://brain-dump.app',
        'X-Title': 'Brain Dump',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    };
  }
}
```


#### Sarvam AI Provider

```typescript
class SarvamProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl = 'https://api.sarvam.ai/v1';
  private model = 'sarvam-m';

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('Sarvam API key is required');
    this.apiKey = apiKey;
  }

  async call(request: LLMRequest): Promise<LLMResponse> {
    const url = `${this.baseUrl}/chat/completions`;
    
    // Sarvam doesn't support system messages in the same way
    // Combine system prompt with user message
    const combinedMessage = `${request.systemPrompt}\n\nUser: ${request.userMessage}`;
    
    const body = {
      model: this.model,
      messages: [{ role: 'user', content: combinedMessage }],
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 1024,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-subscription-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Sarvam API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    };
  }
}
```


### Phase 4: Update AI Service

Modify `services/aiService.ts` to use the unified LLM service:

```typescript
import { getLLMProvider } from './llmService';

export async function classifyMessage(text: string): Promise<AIResponse> {
  try {
    const provider = await getLLMProvider();
    
    const raw = await provider.callWithRetry({
      systemPrompt: buildCategorizationPrompt(),
      userMessage: text,
      jsonMode: true,
    });

    return parseGeminiResponse(raw.text);
  } catch (error) {
    console.warn('[aiService] LLM failed, using local fallback:', error);
    
    // Local fallback remains unchanged
    const entries = localClassify(text);
    return {
      reply: generateFallbackReply(entries),
      entries,
    };
  }
}

// Similar updates for correctClassification() and generateDigest()
```

### Phase 5: Onboarding Flow

Create an onboarding screen that appears on first launch:

**File**: `app/onboarding.tsx`

```typescript
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { saveLLMConfig, setOnboardingComplete } from '@/services/database';

type Provider = 'gemini' | 'openrouter' | 'sarvam';

export default function OnboardingScreen() {
  const [selectedProvider, setSelectedProvider] = useState<Provider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  const handleComplete = async () => {
    await saveLLMConfig({
      provider: selectedProvider,
      [`${selectedProvider}_api_key`]: apiKey,
      selected_model: selectedModel || undefined,
    });
    
    await setOnboardingComplete();
    router.replace('/(drawer)/(tabs)');
  };

  return (
    <ScrollView className="flex-1 bg-[#0a0a0f] p-6">
      <Text className="text-white text-3xl font-bold mb-4">Welcome to Brain Dump</Text>
      <Text className="text-gray-400 mb-8">
        Choose your AI provider to get started
      </Text>

      {/* Provider selection cards */}
      {/* API key input */}
      {/* Model selection (for OpenRouter) */}
      {/* Complete button */}
    </ScrollView>
  );
}
```


### Phase 6: Settings Screen Updates

Add LLM configuration to the existing settings screen:

**File**: `app/(drawer)/settings.tsx`

```typescript
import { useState, useEffect } from 'react';
import { getLLMConfig, saveLLMConfig } from '@/services/database';

export default function SettingsScreen() {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const llmConfig = await getLLMConfig();
    setConfig(llmConfig);
  };

  const handleSave = async () => {
    if (config) {
      await saveLLMConfig(config);
      setIsEditing(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-[#0a0a0f]">
      {/* Existing settings */}
      
      {/* LLM Provider Section */}
      <View className="p-4">
        <Text className="text-white text-xl font-bold mb-4">AI Provider</Text>
        
        <View className="bg-[#1a1a24] rounded-lg p-4 mb-4">
          <Text className="text-gray-400 mb-2">Current Provider</Text>
          <Text className="text-white text-lg capitalize">{config?.provider}</Text>
        </View>

        {isEditing ? (
          <>
            {/* Provider selection */}
            {/* API key inputs */}
            {/* Model selection */}
            <TouchableOpacity onPress={handleSave}>
              <Text>Save Changes</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Text>Change Provider</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
```


### Phase 7: Root Layout Updates

Modify `app/_layout.tsx` to check onboarding status:

```typescript
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { getOnboardingStatus } from '@/services/database';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        await initDatabase();
        
        // Check if user has completed onboarding
        const isOnboarded = await getOnboardingStatus();
        
        if (!isOnboarded) {
          // Redirect to onboarding
          router.replace('/onboarding');
        } else {
          await loadMessages();
        }
      } catch (error) {
        console.warn('[RootLayout] Bootstrap error:', error);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }
    bootstrap();
  }, []);

  // Rest of the component remains the same
}
```

---

## Security Considerations

### API Key Storage

1. **Never commit API keys to version control**
   - Add `.env` to `.gitignore`
   - Use environment variables for development

2. **Secure storage in production**
   - Store API keys in SQLite database (encrypted at rest by OS)
   - Consider using `expo-secure-store` for additional encryption
   - Never expose keys in client-side code

3. **Key validation**
   - Validate API keys before saving
   - Test connection with a simple request
   - Provide clear error messages for invalid keys

### Best Practices

```typescript
// Use expo-secure-store for sensitive data
import * as SecureStore from 'expo-secure-store';

export async function saveAPIKey(provider: string, key: string) {
  await SecureStore.setItemAsync(`${provider}_api_key`, key);
}

export async function getAPIKey(provider: string): Promise<string | null> {
  return await SecureStore.getItemAsync(`${provider}_api_key`);
}
```


---

## Error Handling Strategy

### Provider-Specific Errors

```typescript
export class LLMError extends Error {
  constructor(
    message: string,
    public provider: string,
    public statusCode?: number,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

// Usage in providers
if (response.status === 401) {
  throw new LLMError('Invalid API key', 'gemini', 401, false);
}

if (response.status === 429) {
  throw new LLMError('Rate limit exceeded', 'gemini', 429, true);
}

if (response.status >= 500) {
  throw new LLMError('Server error', 'gemini', response.status, true);
}
```

### User-Friendly Error Messages

```typescript
export function getErrorMessage(error: LLMError): string {
  switch (error.statusCode) {
    case 401:
    case 403:
      return 'Invalid API key. Please check your settings.';
    case 429:
      return 'Rate limit exceeded. Please try again later.';
    case 500:
    case 502:
    case 503:
      return 'Service temporarily unavailable. Using local fallback.';
    default:
      return 'Unable to connect to AI service. Using local fallback.';
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// Test provider implementations
describe('GeminiProvider', () => {
  it('should make successful API call', async () => {
    const provider = new GeminiProvider('test-key');
    const response = await provider.call({
      systemPrompt: 'You are a helpful assistant',
      userMessage: 'Hello',
    });
    expect(response.text).toBeDefined();
  });

  it('should handle invalid API key', async () => {
    const provider = new GeminiProvider('invalid-key');
    await expect(provider.call({ /* ... */ })).rejects.toThrow(LLMError);
  });
});
```

### Integration Tests

1. Test onboarding flow with each provider
2. Test provider switching in settings
3. Test fallback to local classification
4. Test API key validation
5. Test error handling and retry logic


---

## Migration Path for Existing Users

### Handling Existing Installations

```typescript
// In database.ts - migration function
export async function migrateToMultiProvider(): Promise<void> {
  const db = getDb();
  
  // Check if migration is needed
  const tables = await db.getAllAsync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='llm_config'"
  );
  
  if (tables.length === 0) {
    // Create new tables
    await db.execAsync(/* CREATE TABLE statements */);
    
    // Migrate existing Gemini key from env
    const existingKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (existingKey) {
      await saveLLMConfig({
        provider: 'gemini',
        gemini_api_key: existingKey,
      });
      await setOnboardingComplete();
    }
  }
}

// Call in initDatabase()
export async function initDatabase(): Promise<void> {
  // ... existing initialization
  await migrateToMultiProvider();
}
```

---

## UI/UX Recommendations

### Onboarding Screen Design

1. **Provider Cards**
   - Visual cards for each provider
   - Brief description and key features
   - "Recommended" badge for Gemini (default)

2. **API Key Input**
   - Secure text input with show/hide toggle
   - "Get API Key" link to provider's website
   - Real-time validation with loading indicator

3. **Model Selection** (OpenRouter only)
   - Dropdown or searchable list
   - Show pricing information
   - Categorize by use case (fast, balanced, powerful)

4. **Help & Documentation**
   - Link to provider documentation
   - FAQ section
   - Video tutorial (optional)

### Settings Screen Design

1. **Current Provider Display**
   - Show active provider with icon
   - Display current model (if applicable)
   - Show last successful API call timestamp

2. **Change Provider Flow**
   - Confirmation dialog before switching
   - Warning about potential differences in responses
   - Option to test new provider before saving

3. **API Key Management**
   - Masked display of API keys
   - "Test Connection" button
   - "Regenerate" link to provider dashboard


---

## Performance Considerations

### Response Time Comparison

Based on typical usage patterns:

| Provider | Avg Response Time | Best For |
|----------|------------------|----------|
| Gemini Flash | 500-800ms | Fast, general-purpose tasks |
| OpenRouter (Gemini) | 600-900ms | Same as Gemini + fallback options |
| OpenRouter (Claude) | 1000-1500ms | Complex reasoning, longer responses |
| Sarvam AI | 700-1000ms | Indian language support |

### Optimization Strategies

1. **Request Timeout**
   ```typescript
   const TIMEOUT_MS = 10_000; // 10 seconds
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
   ```

2. **Caching**
   - Cache common prompts and responses
   - Use local fallback for repeated queries
   - Implement request deduplication

3. **Retry Logic**
   - Exponential backoff for retryable errors
   - Maximum 2-3 retries
   - Fall back to local classification after retries

---

## Cost Analysis

### Pricing Comparison (Approximate)

**Gemini API**:
- Free tier: 15 requests/minute, 1500 requests/day
- Paid: $0.075 per 1M input tokens, $0.30 per 1M output tokens

**OpenRouter**:
- No free tier (pay-per-use)
- Gemini Flash: ~$0.075 per 1M input tokens
- Claude 3.5 Sonnet: ~$3.00 per 1M input tokens
- Varies by model selection

**Sarvam AI**:
- Free tier: Available (check current limits)
- Paid: Competitive pricing for Indian market
- Specific pricing on request

### Cost Optimization Tips

1. Use faster, cheaper models for simple tasks
2. Implement local fallback to reduce API calls
3. Cache responses for common queries
4. Set appropriate token limits
5. Monitor usage through provider dashboards


---

## Implementation Checklist

### Backend Changes

- [ ] Add `llm_config` and `app_config` tables to database schema
- [ ] Implement database functions for LLM config management
- [ ] Create unified `llmService.ts` with provider interface
- [ ] Implement `GeminiProvider` class
- [ ] Implement `OpenRouterProvider` class
- [ ] Implement `SarvamProvider` class
- [ ] Add retry logic with exponential backoff
- [ ] Update `aiService.ts` to use unified LLM service
- [ ] Implement migration function for existing users
- [ ] Add error handling and user-friendly messages

### Frontend Changes

- [ ] Create onboarding screen (`app/onboarding.tsx`)
- [ ] Design provider selection cards
- [ ] Implement API key input with validation
- [ ] Add model selection for OpenRouter
- [ ] Update settings screen with LLM configuration
- [ ] Add provider switching functionality
- [ ] Implement "Test Connection" feature
- [ ] Update root layout to check onboarding status
- [ ] Add loading states and error messages
- [ ] Create help documentation section

### Security & Testing

- [ ] Implement secure API key storage (consider `expo-secure-store`)
- [ ] Add API key validation before saving
- [ ] Write unit tests for each provider
- [ ] Write integration tests for onboarding flow
- [ ] Test provider switching
- [ ] Test error handling and fallback logic
- [ ] Test migration for existing users
- [ ] Perform security audit of API key handling

### Documentation

- [ ] Update README with multi-provider setup instructions
- [ ] Create user guide for choosing providers
- [ ] Document API key acquisition process for each provider
- [ ] Add troubleshooting guide
- [ ] Update environment variable documentation

---

## Future Enhancements

### Phase 2 Features

1. **Model Comparison**
   - Side-by-side comparison of responses
   - A/B testing different models
   - User feedback on response quality

2. **Advanced Configuration**
   - Custom temperature and token limits per provider
   - Provider-specific settings (e.g., Sarvam reasoning effort)
   - Fallback provider chain

3. **Usage Analytics**
   - Track API usage per provider
   - Cost tracking and budgeting
   - Response time monitoring
   - Success/failure rate dashboard

4. **Smart Provider Selection**
   - Auto-select provider based on query type
   - Language detection for Sarvam AI
   - Cost optimization mode

5. **Offline Mode**
   - Enhanced local classification
   - Queue requests for later processing
   - Sync when connection restored

---

## References

### Official Documentation

- [Google Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [OpenRouter API Reference](https://openrouter.ai/docs)
- [Sarvam AI Documentation](https://docs.sarvam.ai/)

### React Native Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo Secure Store](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [React Navigation](https://reactnavigation.org/)

### Related Articles

- [Building AI Apps with React Native](https://github.com/dabit3/react-native-ai)
- [Expo Router Guide](https://docs.expo.dev/router/introduction/)
- [OpenRouter Integration Guide](https://www.datacamp.com/tutorial/openrouter)

---

## Conclusion

This implementation provides a flexible, user-friendly way to support multiple LLM providers in the Brain Dump app. The unified service layer abstracts provider differences, making it easy to add new providers in the future. The onboarding flow ensures users can get started quickly with their preferred provider, while the settings screen allows easy switching between providers.

Key benefits:
- **User Choice**: Users can select their preferred provider and use their own API keys
- **Flexibility**: Easy to add new providers or models
- **Reliability**: Local fallback ensures app works even when API fails
- **Security**: Secure storage of API keys with proper validation
- **Cost Control**: Users manage their own API usage and costs

Content was rephrased for compliance with licensing restrictions. Sources: [OpenRouter Docs](https://openrouter.ai/docs), [Sarvam AI Docs](https://docs.sarvam.ai/), [Google AI Docs](https://ai.google.dev/).
