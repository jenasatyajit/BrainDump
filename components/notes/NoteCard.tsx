import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { NoteEntry } from '@/store/noteStore';

interface NoteCardProps {
    note: NoteEntry;
    isFullWidth?: boolean;
}

function formatDate(date: Date): string {
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NoteCard({ note, isFullWidth }: NoteCardProps) {
    return (
        <TouchableOpacity
            className={`rounded-2xl border border-border bg-surface2 p-3.5 ${isFullWidth ? '' : ''}`}
            activeOpacity={0.7}
            style={isFullWidth ? { width: '100%' } : { flex: 1 }}
        >
            <Text className="mb-2 text-[22px]">{note.emoji}</Text>
            <Text className="mb-1.5 text-sm font-semibold leading-[18px] text-text" numberOfLines={2}>
                {note.title}
            </Text>
            <Text className="text-xs leading-[18px] text-muted" numberOfLines={3}>
                {note.body}
            </Text>
            <Text className="mt-2 text-[10px] text-muted">
                {formatDate(note.createdAt)}
                {note.category === 'Idea' ? ' · 2 related notes' : ''}
            </Text>
        </TouchableOpacity>
    );
}
