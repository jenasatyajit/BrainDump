/**
 * Library Service — Metadata fetching for books, videos, and articles
 *
 * - Books: Google Books API (free, no key required)
 * - YouTube: oEmbed API (no key) or Data API v3 (with key)
 * - Instagram: URL storage only (API restrictions)
 * - Articles: Basic HTML meta tag extraction
 */

import * as FileSystem from 'expo-file-system';

// ── Types ──

export interface BookMetadata {
    title: string;
    author?: string;
    coverUrl?: string;
    isbn?: string;
}

export interface VideoMetadata {
    title: string;
    platform: 'youtube' | 'instagram';
    url: string;
    thumbnailUrl?: string;
    duration?: string;
}

export interface ArticleMetadata {
    title: string;
    url: string;
    domain?: string;
}

// ── Book Metadata (Google Books API) ──

export async function fetchBookMetadata(title: string): Promise<BookMetadata | null> {
    try {
        const query = encodeURIComponent(title);
        const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            console.warn('[libraryService] Google Books API failed:', response.status);
            return null;
        }

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            console.warn('[libraryService] No book found for:', title);
            return null;
        }

        const book = data.items[0].volumeInfo;

        return {
            title: book.title || title,
            author: book.authors ? book.authors.join(', ') : undefined,
            coverUrl: book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || undefined,
            isbn: book.industryIdentifiers?.[0]?.identifier || undefined,
        };
    } catch (error) {
        console.error('[libraryService] fetchBookMetadata error:', error);
        return null;
    }
}

// ── Video Metadata ──

export function extractVideoId(url: string): { platform: 'youtube' | 'instagram' | null; id: string | null } {
    // YouTube patterns
    const youtubePatterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of youtubePatterns) {
        const match = url.match(pattern);
        if (match) {
            return { platform: 'youtube', id: match[1] };
        }
    }

    // Instagram patterns
    const instagramPatterns = [
        /instagram\.com\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of instagramPatterns) {
        const match = url.match(pattern);
        if (match) {
            return { platform: 'instagram', id: match[2] };
        }
    }

    return { platform: null, id: null };
}

export function getYouTubeThumbnail(videoId: string): string {
    // Use maxresdefault for best quality, fallback to hqdefault
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export async function fetchYouTubeMetadata(url: string): Promise<VideoMetadata | null> {
    try {
        const { platform, id } = extractVideoId(url);

        if (platform !== 'youtube' || !id) {
            console.warn('[libraryService] Invalid YouTube URL:', url);
            return null;
        }

        // Use oEmbed API (no key required)
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

        const response = await fetch(oembedUrl);

        if (!response.ok) {
            console.warn('[libraryService] YouTube oEmbed failed:', response.status);
            return {
                title: 'YouTube Video',
                platform: 'youtube',
                url,
                thumbnailUrl: getYouTubeThumbnail(id),
            };
        }

        const data = await response.json();

        return {
            title: data.title || 'YouTube Video',
            platform: 'youtube',
            url,
            thumbnailUrl: data.thumbnail_url || getYouTubeThumbnail(id),
            // oEmbed doesn't provide duration, would need Data API v3 for that
        };
    } catch (error) {
        console.error('[libraryService] fetchYouTubeMetadata error:', error);
        return null;
    }
}

export function createInstagramMetadata(url: string): VideoMetadata {
    const { id } = extractVideoId(url);
    return {
        title: id ? `Instagram Video (${id})` : 'Instagram Video',
        platform: 'instagram',
        url,
    };
}

// ── Article Metadata ──

export async function fetchArticleMetadata(url: string): Promise<ArticleMetadata | null> {
    try {
        // Extract domain
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');

        // Fetch HTML and extract title from meta tags
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; DumpApp/1.0)',
            },
        });

        if (!response.ok) {
            console.warn('[libraryService] Article fetch failed:', response.status);
            return {
                title: domain,
                url,
                domain,
            };
        }

        const html = await response.text();

        // Try to extract title from various meta tags
        let title = domain;

        // Try og:title
        const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
        if (ogTitleMatch) {
            title = ogTitleMatch[1];
        } else {
            // Try <title> tag
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch) {
                title = titleMatch[1];
            }
        }

        // Decode HTML entities
        title = title
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();

        return {
            title,
            url,
            domain,
        };
    } catch (error) {
        console.error('[libraryService] fetchArticleMetadata error:', error);

        // Fallback: use domain as title
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace('www.', '');
            return {
                title: domain,
                url,
                domain,
            };
        } catch {
            return null;
        }
    }
}

// ── Image Caching ──

import { Paths, Directory, File } from 'expo-file-system';

const CACHE_DIR_NAME = 'library_covers';

async function getCacheDir(): Promise<Directory> {
    const cacheDir = new Directory(Paths.document, CACHE_DIR_NAME);
    
    // Create directory if it doesn't exist
    if (!cacheDir.exists) {
        await cacheDir.create();
    }
    
    return cacheDir;
}

export async function downloadAndCacheImage(url: string, id: string): Promise<string | null> {
    try {
        const cacheDir = await getCacheDir();
        
        const extension = url.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)?.[1] || 'jpg';
        const fileName = `${id}.${extension}`;
        const file = new File(cacheDir, fileName);

        // Check if already cached
        if (file.exists) {
            return file.uri;
        }

        // Download
        const downloadedFile = await File.downloadFileAsync(url, file);

        if (downloadedFile.exists) {
            return downloadedFile.uri;
        } else {
            console.warn('[libraryService] Image download failed');
            return null;
        }
    } catch (error) {
        console.error('[libraryService] downloadAndCacheImage error:', error);
        return null;
    }
}

// ── URL Detection ──

export function detectResourceType(text: string): 'book' | 'video' | 'article' | null {
    const lower = text.toLowerCase().trim();

    // Check for video URLs
    if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('instagram.com')) {
        return 'video';
    }

    // Check for article URLs (http/https)
    if (lower.match(/^https?:\/\//)) {
        return 'article';
    }

    // Check for book keywords
    const bookKeywords = [
        /\bread\s+/i,
        /\bbook\s*:/i,
        /\bfinish\s+reading\b/i,
        /\bstart\s+reading\b/i,
        /\bcurrently\s+reading\b/i,
    ];

    if (bookKeywords.some(pattern => pattern.test(text))) {
        return 'book';
    }

    return null;
}

export function extractBookTitle(text: string): string {
    // Remove common prefixes
    let title = text
        .replace(/^(read|reading|book:|finish reading|start reading|currently reading)\s*/i, '')
        .trim();

    // Remove "by [author]" suffix if present
    title = title.replace(/\s+by\s+.+$/i, '').trim();

    return title;
}
