/**
 * Unified LLM Service — Provider-agnostic interface for multiple LLM providers
 *
 * Supports: Gemini, OpenRouter, Sarvam AI
 * Features: Auto-fallback, retry logic, error handling
 */

import { getLLMConfig } from './database';

const TIMEOUT_MS = 10_000;

// ── Types ──

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

export interface LLMFallbackResponse {
    response: LLMResponse;
    usedProvider: string;
    usedModel?: string;
}

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

// ── Provider Interface ──

interface LLMProvider {
    name: string;
    call(request: LLMRequest): Promise<LLMResponse>;
    callWithRetry(request: LLMRequest, maxRetries?: number): Promise<LLMResponse>;
}

// ── Gemini Provider ──

class GeminiProvider implements LLMProvider {
    name = 'Gemini';
    private apiKey: string;
    private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    private model = 'gemini-3-flash-preview';

    constructor(apiKey: string) {
        if (!apiKey) throw new LLMError('Gemini API key is required', 'gemini');
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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.status === 429) {
                throw new LLMError('Rate limited', 'gemini', 429, true);
            }

            if (!response.ok) {
                const errorBody = await response.text().catch(() => 'Unknown error');
                throw new LLMError(
                    `API error: ${response.status} — ${errorBody}`,
                    'gemini',
                    response.status,
                    response.status >= 500
                );
            }

            const data = await response.json();

            if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                throw new LLMError('Empty response', 'gemini');
            }

            return {
                text: data.candidates[0].content.parts[0].text,
                usage: {
                    promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
                    completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
                    totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
                },
            };
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof LLMError) throw error;

            if (error instanceof Error && error.name === 'AbortError') {
                throw new LLMError('Request timed out', 'gemini', undefined, true);
            }

            throw new LLMError(
                `Network error: ${error instanceof Error ? error.message : 'Unknown'}`,
                'gemini',
                undefined,
                true
            );
        }
    }

    async callWithRetry(request: LLMRequest, maxRetries: number = 2): Promise<LLMResponse> {
        let lastError: LLMError | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await this.call(request);
            } catch (error) {
                if (error instanceof LLMError && error.isRetryable && attempt < maxRetries) {
                    lastError = error;
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    continue;
                }
                throw error;
            }
        }

        throw lastError || new LLMError('Max retries exceeded', 'gemini');
    }
}


// ── OpenRouter Provider ──

class OpenRouterProvider implements LLMProvider {
    name = 'OpenRouter';
    private apiKey: string;
    private baseUrl = 'https://openrouter.ai/api/v1';
    private model: string;

    constructor(apiKey: string, model: string = 'meta-llama/llama-3.2-3b-instruct:free') {
        if (!apiKey) throw new LLMError('OpenRouter API key is required', 'openrouter');
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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://brain-dump.app',
                    'X-Title': 'Brain Dump',
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.status === 429) {
                const errorBody = await response.text().catch(() => '');
                console.warn('[OpenRouter] Rate limit response:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorBody.substring(0, 200),
                    model: this.model,
                });
                
                // Check if it's a free model rate limit
                if (errorBody.includes('temporarily rate-limited upstream') || errorBody.includes('rate-limited')) {
                    throw new LLMError(
                        `Free model ${this.model} is temporarily rate-limited. Try again in a few minutes or switch to a different provider.`,
                        'openrouter',
                        429,
                        true
                    );
                }
                
                throw new LLMError('Rate limited', 'openrouter', 429, true);
            }

            if (!response.ok) {
                const errorBody = await response.text().catch(() => 'Unknown error');
                console.error('[OpenRouter] API error:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorBody.substring(0, 500),
                });
                throw new LLMError(
                    `API error: ${response.status} — ${errorBody}`,
                    'openrouter',
                    response.status,
                    response.status >= 500
                );
            }

            const data = await response.json();

            if (!data.choices?.[0]?.message?.content) {
                throw new LLMError('Empty response', 'openrouter');
            }

            return {
                text: data.choices[0].message.content,
                usage: {
                    promptTokens: data.usage?.prompt_tokens ?? 0,
                    completionTokens: data.usage?.completion_tokens ?? 0,
                    totalTokens: data.usage?.total_tokens ?? 0,
                },
            };
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof LLMError) throw error;

            if (error instanceof Error && error.name === 'AbortError') {
                throw new LLMError('Request timed out', 'openrouter', undefined, true);
            }

            throw new LLMError(
                `Network error: ${error instanceof Error ? error.message : 'Unknown'}`,
                'openrouter',
                undefined,
                true
            );
        }
    }

    async callWithRetry(request: LLMRequest, maxRetries: number = 2): Promise<LLMResponse> {
        let lastError: LLMError | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await this.call(request);
            } catch (error) {
                if (error instanceof LLMError && error.isRetryable && attempt < maxRetries) {
                    lastError = error;
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    continue;
                }
                throw error;
            }
        }

        throw lastError || new LLMError('Max retries exceeded', 'openrouter');
    }

    getModelName(): string {
        return this.model;
    }
}


// ── Sarvam AI Provider ──

class SarvamProvider implements LLMProvider {
    name = 'Sarvam';
    private apiKey: string;
    private baseUrl = 'https://api.sarvam.ai/v1';
    private model = 'sarvam-m';

    constructor(apiKey: string) {
        if (!apiKey) throw new LLMError('Sarvam API key is required', 'sarvam');
        this.apiKey = apiKey;
    }

    async call(request: LLMRequest): Promise<LLMResponse> {
        const url = `${this.baseUrl}/chat/completions`;

        // Sarvam doesn't support system messages separately
        // Combine system prompt with user message
        const combinedMessage = `${request.systemPrompt}\n\nUser: ${request.userMessage}`;

        const body = {
            model: this.model,
            messages: [{ role: 'user', content: combinedMessage }],
            temperature: request.temperature ?? 0.2,
            max_tokens: request.maxTokens ?? 1024,
            // Note: Sarvam may not support JSON mode
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            console.log('[Sarvam] Calling API with model:', this.model);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'api-subscription-key': this.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.status === 429) {
                throw new LLMError('Rate limited', 'sarvam', 429, true);
            }

            if (!response.ok) {
                const errorBody = await response.text().catch(() => 'Unknown error');
                console.error('[Sarvam] API error:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorBody.substring(0, 500),
                });
                throw new LLMError(
                    `API error: ${response.status} — ${errorBody}`,
                    'sarvam',
                    response.status,
                    response.status >= 500
                );
            }

            const data = await response.json();
            console.log('[Sarvam] Response structure:', {
                hasChoices: !!data.choices,
                choicesLength: data.choices?.length,
                hasMessage: !!data.choices?.[0]?.message,
                hasContent: !!data.choices?.[0]?.message?.content,
                contentPreview: data.choices?.[0]?.message?.content?.substring(0, 100),
            });

            if (!data.choices?.[0]?.message?.content) {
                console.error('[Sarvam] Invalid response structure:', data);
                throw new LLMError('Empty response', 'sarvam');
            }

            return {
                text: data.choices[0].message.content,
                usage: {
                    promptTokens: data.usage?.prompt_tokens ?? 0,
                    completionTokens: data.usage?.completion_tokens ?? 0,
                    totalTokens: data.usage?.total_tokens ?? 0,
                },
            };
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof LLMError) throw error;

            if (error instanceof Error && error.name === 'AbortError') {
                throw new LLMError('Request timed out', 'sarvam', undefined, true);
            }

            console.error('[Sarvam] Network error:', error);
            throw new LLMError(
                `Network error: ${error instanceof Error ? error.message : 'Unknown'}`,
                'sarvam',
                undefined,
                true
            );
        }
    }

    async callWithRetry(request: LLMRequest, maxRetries: number = 2): Promise<LLMResponse> {
        let lastError: LLMError | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await this.call(request);
            } catch (error) {
                if (error instanceof LLMError && error.isRetryable && attempt < maxRetries) {
                    lastError = error;
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    continue;
                }
                throw error;
            }
        }

        throw lastError || new LLMError('Max retries exceeded', 'sarvam');
    }
}


// ── Factory & Auto-Fallback ──

export async function getLLMProvider(): Promise<LLMProvider> {
    const config = await getLLMConfig();

    if (!config) {
        throw new LLMError('No LLM configuration found', 'system');
    }

    switch (config.provider) {
        case 'gemini':
            if (!config.gemini_api_key) {
                throw new LLMError('Gemini API key not configured', 'gemini');
            }
            return new GeminiProvider(config.gemini_api_key);

        case 'openrouter':
            if (!config.openrouter_api_key) {
                throw new LLMError('OpenRouter API key not configured', 'openrouter');
            }
            return new OpenRouterProvider(config.openrouter_api_key, config.openrouter_model);

        case 'sarvam':
            if (!config.sarvam_api_key) {
                throw new LLMError('Sarvam API key not configured', 'sarvam');
            }
            return new SarvamProvider(config.sarvam_api_key);

        default:
            throw new LLMError('Invalid provider configuration', 'system');
    }
}

/**
 * Call LLM with automatic fallback to other providers if primary fails
 * Returns response + which provider was used
 */
export async function callWithAutoFallback(request: LLMRequest): Promise<LLMFallbackResponse> {
    const config = await getLLMConfig();

    console.log('[llmService] Raw config from database:', config);
    console.log('[llmService] LLM Config loaded:', {
        provider: config?.provider,
        hasGeminiKey: !!config?.gemini_api_key,
        hasOpenrouterKey: !!config?.openrouter_api_key,
        hasSarvamKey: !!config?.sarvam_api_key,
        openrouterModel: config?.openrouter_model,
        geminiKeyType: typeof config?.gemini_api_key,
        openrouterKeyType: typeof config?.openrouter_api_key,
        sarvamKeyType: typeof config?.sarvam_api_key,
        geminiKeyValue: config?.gemini_api_key ? `${config.gemini_api_key.substring(0, 10)}...` : 'null/undefined',
        openrouterKeyValue: config?.openrouter_api_key ? `${config.openrouter_api_key.substring(0, 10)}...` : 'null/undefined',
        sarvamKeyValue: config?.sarvam_api_key ? `${config.sarvam_api_key.substring(0, 10)}...` : 'null/undefined',
    });

    if (!config) {
        throw new LLMError('No LLM configuration found', 'system');
    }

    // Build list of available providers (those with API keys)
    const availableProviders: { name: string; provider: LLMProvider; model?: string }[] = [];

    // Check if key exists and is not empty
    const hasValidKey = (key: string | null | undefined): key is string => {
        return !!key && key.trim().length > 0;
    };

    // Helper to add provider to list
    const addProvider = (
        name: 'Gemini' | 'OpenRouter' | 'Sarvam',
        providerInstance: LLMProvider,
        model?: string
    ) => {
        availableProviders.push({ name, provider: providerInstance, model });
    };

    // Initialize all providers with valid keys
    const providers: {
        gemini?: { name: 'Gemini'; provider: LLMProvider };
        openrouter?: { name: 'OpenRouter'; provider: LLMProvider; model: string };
        sarvam?: { name: 'Sarvam'; provider: LLMProvider };
    } = {};

    if (hasValidKey(config.gemini_api_key)) {
        try {
            console.log('[llmService] Initializing Gemini provider');
            providers.gemini = {
                name: 'Gemini',
                provider: new GeminiProvider(config.gemini_api_key),
            };
        } catch (error) {
            console.warn('[llmService] Failed to initialize Gemini provider:', error);
        }
    } else {
        console.log('[llmService] Skipping Gemini - no valid API key');
    }

    if (hasValidKey(config.openrouter_api_key)) {
        try {
            console.log('[llmService] Initializing OpenRouter provider with model:', config.openrouter_model);
            providers.openrouter = {
                name: 'OpenRouter',
                provider: new OpenRouterProvider(config.openrouter_api_key, config.openrouter_model),
                model: config.openrouter_model,
            };
        } catch (error) {
            console.warn('[llmService] Failed to initialize OpenRouter provider:', error);
        }
    } else {
        console.log('[llmService] Skipping OpenRouter - no valid API key');
    }

    if (hasValidKey(config.sarvam_api_key)) {
        try {
            console.log('[llmService] Initializing Sarvam provider');
            providers.sarvam = {
                name: 'Sarvam',
                provider: new SarvamProvider(config.sarvam_api_key),
            };
        } catch (error) {
            console.warn('[llmService] Failed to initialize Sarvam provider:', error);
        }
    } else {
        console.log('[llmService] Skipping Sarvam - no valid API key');
    }

    // Add selected provider FIRST
    console.log('[llmService] Selected provider:', config.provider);
    if (config.provider === 'sarvam' && providers.sarvam) {
        addProvider('Sarvam', providers.sarvam.provider);
    } else if (config.provider === 'gemini' && providers.gemini) {
        addProvider('Gemini', providers.gemini.provider);
    } else if (config.provider === 'openrouter' && providers.openrouter) {
        addProvider('OpenRouter', providers.openrouter.provider, providers.openrouter.model);
    }

    // Add remaining providers as fallbacks (in order of preference: Sarvam → Gemini → OpenRouter)
    if (config.provider !== 'sarvam' && providers.sarvam) {
        addProvider('Sarvam', providers.sarvam.provider);
    }
    if (config.provider !== 'gemini' && providers.gemini) {
        addProvider('Gemini', providers.gemini.provider);
    }
    if (config.provider !== 'openrouter' && providers.openrouter) {
        addProvider('OpenRouter', providers.openrouter.provider, providers.openrouter.model);
    }

    console.log('[llmService] Provider order:', availableProviders.map(p => p.name).join(' → '));

    if (availableProviders.length === 0) {
        throw new LLMError('No API keys configured', 'system');
    }

    // Try each provider in sequence
    const errors: { provider: string; error: Error; statusCode?: number }[] = [];

    for (const { name, provider, model } of availableProviders) {
        try {
            console.log(`[llmService] Trying provider: ${name}${model ? ` (${model})` : ''}`);
            const response = await provider.callWithRetry(request);
            console.log(`[llmService] ✓ Success with provider: ${name}`);
            return {
                response,
                usedProvider: name,
                usedModel: model,
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = error instanceof LLMError ? error.statusCode : undefined;
            const isRetryable = error instanceof LLMError ? error.isRetryable : false;
            
            console.warn(`[llmService] ✗ Provider ${name} failed:`, {
                error: errorMsg,
                statusCode,
                isRetryable,
            });
            
            errors.push({
                provider: name,
                error: error instanceof Error ? error : new Error('Unknown error'),
                statusCode,
            });
            
            // Continue to next provider
        }
    }

    // All providers failed
    const errorMessages = errors.map((e) => {
        const statusInfo = e.statusCode ? ` (${e.statusCode})` : '';
        return `${e.provider}${statusInfo}: ${e.error.message}`;
    }).join('; ');
    
    console.error('[llmService] All providers failed:', errorMessages);
    throw new LLMError(`All providers failed: ${errorMessages}`, 'system');
}
