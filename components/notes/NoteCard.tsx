import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NoteEntry } from '@/store/noteStore';

interface NoteCardProps {
    note: NoteEntry;
    isFullWidth?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}

function formatDate(date: Date): string {
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NoteCard({ note, isFullWidth, onEdit, onDelete }: NoteCardProps) {
    return (
        <TouchableOpacity
            className={`rounded-2xl border border-border bg-surface2 p-3.5 ${isFullWidth ? '' : ''}`}
            activeOpacity={0.7}
            style={isFullWidth ? { width: '100%' } : { flex: 1 }}
            onPress={onEdit}>
            <View className="mb-2 flex-row items-start justify-between">
                <Text className="text-[22px]">{note.emoji}</Text>

                <View className="flex-row gap-2">
                    {onEdit && (
                        <TouchableOpacity
                            onPress={onEdit}
                            className="p-1"
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="pencil-outline" size={16} color="#7eb8ff" />
                        </TouchableOpacity>
                    )}
                    {onDelete && (
                        <TouchableOpacity
                            onPress={onDelete}
                            className="p-1"
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="trash-outline" size={16} color="#ff7eb3" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <Text className="mb-1.5 text-[15px] leading-[18px] text-text" numberOfLines={2} style={{ fontFamily: 'DMSans_500Medium' }}>
                {note.title}
            </Text>
            <Text className="text-[13px] leading-[18px] text-muted" numberOfLines={3} style={{ fontFamily: 'DMSans_400Regular' }}>
                {note.body}
            </Text>
            <Text className="mt-2 text-[11px] text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                {formatDate(note.createdAt)}
                {note.category === 'Idea' ? ' · 2 related notes' : ''}
            </Text>
        </TouchableOpacity>
    );
}
