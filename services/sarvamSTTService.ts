import { getLLMConfig } from './database';

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text-translate';

export interface SarvamSTTResponse {
    transcript: string;
    language_code?: string;
}

export interface SarvamSTTError {
    error: string;
    message?: string;
}

/**
 * Transcribe audio using Sarvam AI's Saaras v3 STT model
 * Supports multiple Indian languages and English
 * Maximum audio duration: 30 seconds for REST API
 */
export async function transcribeAudio(
    audioUri: string,
    mode: 'transcribe' | 'translate' | 'verbatim' | 'transliterate' | 'codemix' = 'transcribe'
): Promise<string> {
    try {
        // Get Sarvam API key from user configuration
        const config = await getLLMConfig();
        const SARVAM_API_KEY = config?.sarvam_api_key;

        if (!SARVAM_API_KEY) {
            throw new Error('Sarvam API key required. Please add your Sarvam API key in Settings → Change Provider to use voice input.');
        }

        console.log('Transcribing audio from:', audioUri);
        console.log('Mode:', mode);

        // Create FormData with the file URI directly
        // React Native's FormData handles local file URIs automatically
        const formData = new FormData();
        
        // Append the audio file with correct MIME type
        // Sarvam API accepts 'audio/x-m4a' not 'audio/m4a'
        formData.append('file', {
            uri: audioUri,
            type: 'audio/x-m4a',
            name: 'recording.m4a',
        } as any);
        
        formData.append('model', 'saaras:v3');
        formData.append('mode', mode);

        console.log('Sending request to Sarvam API...');

        // Call Sarvam API
        const apiResponse = await fetch(SARVAM_STT_URL, {
            method: 'POST',
            headers: {
                'api-subscription-key': SARVAM_API_KEY,
                'Content-Type': 'multipart/form-data',
            },
            body: formData,
        });

        console.log('API Response status:', apiResponse.status);

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('Sarvam API error response:', errorText);
            
            try {
                const errorData: SarvamSTTError = JSON.parse(errorText);
                throw new Error(errorData.message || errorData.error || 'Failed to transcribe audio');
            } catch (parseError) {
                throw new Error(`API Error (${apiResponse.status}): ${errorText}`);
            }
        }

        const data: SarvamSTTResponse = await apiResponse.json();
        console.log('Transcription successful:', data.transcript);
        return data.transcript || '';
    } catch (error) {
        console.error('Sarvam STT Error:', error);
        throw error;
    }
}
