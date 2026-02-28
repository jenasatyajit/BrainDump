/**
 * Gemini API Service — Low-level wrapper for Google Gemini API
 *
 * Model: gemini-3.5-flash-preview
 * Endpoint: generativelanguage.googleapis.com/v1beta
 */

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-3.5-flash-preview';
const TIMEOUT_MS = 10_000;

interface GeminiRequest {
    systemPrompt: string;
    userMessage: string;
    jsonMode?: boolean;
}

interface GeminiCandidate {
    content: {
        parts: { text: string }[];
        role: string;
    };
    finishReason: string;
}

interface GeminiResponse {
    candidates: GeminiCandidate[];
    usageMetadata?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
    };
}

export class GeminiError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public isRetryable: boolean = false
    ) {
        super(message);
        this.name = 'GeminiError';
    }
}

/**
 * Call the Gemini API with a system prompt and user message.
 * Returns the raw text response.
 */
export async function callGemini({
    systemPrompt,
    userMessage,
    jsonMode = true,
}: GeminiRequest): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new GeminiError('EXPO_PUBLIC_GEMINI_API_KEY is not set');
    }

    const url = `${BASE_URL}/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
        contents: [
            {
                role: 'user',
                parts: [{ text: userMessage }],
            },
        ],
        systemInstruction: {
            parts: [{ text: systemPrompt }],
        },
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
            ...(jsonMode && { responseMimeType: 'application/json' }),
        },
    };

    // Timeout via AbortController
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
            throw new GeminiError('Rate limited by Gemini API', 429, true);
        }

        if (!response.ok) {
            const errorBody = await response.text().catch(() => 'Unknown error');
            throw new GeminiError(
                `Gemini API error: ${response.status} — ${errorBody}`,
                response.status,
                response.status >= 500
            );
        }

        const data: GeminiResponse = await response.json();

        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new GeminiError('Empty response from Gemini API');
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof GeminiError) throw error;

        if (error instanceof Error && error.name === 'AbortError') {
            throw new GeminiError('Gemini API request timed out (>10s)', undefined, true);
        }

        throw new GeminiError(
            `Network error: ${error instanceof Error ? error.message : 'Unknown'}`,
            undefined,
            true
        );
    }
}

/**
 * Call Gemini with exponential backoff retry (for 429 / 5xx errors).
 * Retries up to `maxRetries` times before throwing.
 */
export async function callGeminiWithRetry(
    request: GeminiRequest,
    maxRetries: number = 2
): Promise<string> {
    let lastError: GeminiError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await callGemini(request);
        } catch (error) {
            if (error instanceof GeminiError && error.isRetryable && attempt < maxRetries) {
                lastError = error;
                // Exponential backoff: 1s, 2s
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }

    throw lastError || new GeminiError('Max retries exceeded');
}
