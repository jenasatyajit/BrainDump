import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ParsedEntry } from '@/services/aiService';

interface ParsedCardProps {
    entry: ParsedEntry;
    onToggleComplete?: () => void;
}

const TYPE_STYLES = {
    task: {
        bg: 'rgba(126,184,255,0.07)',
        border: 'rgba(126,184,255,0.2)',
        tagColor: '#7eb8ff',
        label: 'TASK',
    },
    note: {
        bg: 'rgba(255,217,126,0.07)',
        border: 'rgba(255,217,126,0.2)',
        tagColor: '#ffd97e',
        label: 'NOTE',
    },
    reminder: {
        bg: 'rgba(255,126,179,0.07)',
        border: 'rgba(255,126,179,0.2)',
        tagColor: '#ff7eb3',
        label: 'REMINDER',
    },
    library: {
        bg: 'rgba(167,139,250,0.07)',
        border: 'rgba(167,139,250,0.2)',
        tagColor: '#a78bfa',
        label: 'LIBRARY',
    },
};

function formatMeta(entry: ParsedEntry): string {
    const parts: string[] = [];

    if (entry.type === 'task' && entry.dueDate) {
        const date = new Date(entry.dueDate);
        const today = new Date();
        const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86400000);

        if (diffDays === 0) parts.push('Due Today');
        else if (diffDays === 1) parts.push('Due Tomorrow');
        else if (diffDays < 0) parts.push(`Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`);
        else parts.push(`Due ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`);
    }

    if (entry.type === 'reminder' && entry.remindAt) {
        const date = new Date(entry.remindAt);
        const today = new Date();
        const isTomorrow = date.toDateString() !== today.toDateString();
        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        parts.push(isTomorrow ? `Tomorrow · ${timeStr}` : `Today · ${timeStr}`);
    }

    if (entry.type === 'library') {
        if (entry.libraryType === 'book') {
            parts.push('� Book');
            if (entry.author) parts.push(entry.author);
        } else if (entry.libraryType === 'video') {
            if (entry.platform === 'youtube') parts.push('📺 YouTube');
            else if (entry.platform === 'instagram') parts.push('📱 Instagram');
            else parts.push('🎬 Video');
        } else if (entry.libraryType === 'article') {
            parts.push('📰 Article');
        }
    }

    if (entry.priority === 'high') parts.push('🟡 High priority');
    else if (entry.priority === 'medium') parts.push('Medium');

    if (entry.type === 'note' && entry.category) {
        parts.push(entry.category);
    }

    if (entry.type === 'reminder' && entry.priority === 'high') {
        // Replace the priority text with overdue indicator for reminders
        return parts.filter((p) => p !== '🟡 High priority').join(' · ') + ' · 🔴 Overdue';
    }

    return parts.join(' · ') || (entry.type === 'task' ? 'Tap to complete' : 'Saved');
}

export default function ParsedCard({ entry, onToggleComplete }: ParsedCardProps) {
    const style = TYPE_STYLES[entry.type];
    
    let categoryLabel = style.label;
    if (entry.type === 'note' && entry.category) {
        categoryLabel = `${style.label} — ${entry.category.toUpperCase()}`;
    } else if (entry.type === 'library' && entry.libraryType) {
        categoryLabel = `${style.label} — ${entry.libraryType.toUpperCase()}`;
    }

    const CardContent = React.memo(() => (
        <>
            <View className="mb-1.5 flex-row items-center gap-1.5">
                <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.tagColor }} />
                <Text className="text-[9px] tracking-[1.5px]" style={{ color: style.tagColor }}>
                    {categoryLabel}
                </Text>
            </View>
            <Text
                className={`text-[13px] font-medium leading-[18px] ${entry.isCompleted ? 'line-through text-muted' : 'text-text'}`}
            >
                {entry.title}
            </Text>
            <Text className="mt-1 text-xs text-muted">{formatMeta(entry)}</Text>
        </>
    ));

    if (entry.type === 'task') {
        return (
            <TouchableOpacity
                className="mt-1.5 rounded-2xl border p-3 px-3.5"
                style={{ backgroundColor: style.bg, borderColor: style.border }}
                activeOpacity={0.7}
                onPress={onToggleComplete}
            >
                <View className="flex-row items-start gap-2.5">
                    <View
                        className="mt-0.5 h-[18px] w-[18px] items-center justify-center rounded-[5px] border-[1.5px]"
                        style={{
                            borderColor: style.tagColor,
                            backgroundColor: entry.isCompleted ? style.tagColor : 'transparent',
                        }}
                    >
                        {entry.isCompleted && (
                            <Ionicons name="checkmark" size={10} color="#0a0a0f" />
                        )}
                    </View>
                    <View className="flex-1">
                        <CardContent />
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <View
            className="mt-1.5 rounded-2xl border p-3 px-3.5"
            style={{ backgroundColor: style.bg, borderColor: style.border }}
        >
            <CardContent />
        </View>
    );
}
