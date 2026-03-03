import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { LibraryEntry } from '@/store/libraryStore';

interface LibraryEditModalProps {
    visible: boolean;
    entry: LibraryEntry | null;
    onClose: () => void;
    onSave: (messageId: string, entryIndex: number, updates: Partial<LibraryEntry>) => void;
    onDelete: (messageId: string, entryIndex: number) => void;
}

const STATUS_OPTIONS: Array<'reading' | 'want' | 'done'> = ['reading', 'want', 'done'];

export default function LibraryEditModal({ visible, entry, onClose, onSave, onDelete }: LibraryEditModalProps) {
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState<'reading' | 'want' | 'done' | undefined>(undefined);

    useEffect(() => {
        if (entry) {
            setTitle(entry.title);
            setAuthor(entry.author || '');
            setUrl(entry.url || '');
            setStatus(entry.status);
        }
    }, [entry]);

    const handleSave = () => {
        if (!entry || !title.trim()) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        onSave(entry.messageId, entry.entryIndex, {
            title: title.trim(),
            author: author.trim() || undefined,
            url: url.trim() || undefined,
            status,
        });
        
        onClose();
    };

    const handleDelete = () => {
        if (!entry) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onDelete(entry.messageId, entry.entryIndex);
        onClose();
    };

    const handleOpenUrl = async () => {
        if (url) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            try {
                await Linking.openURL(url);
            } catch (error) {
                console.error('Failed to open URL:', error);
            }
        }
    };

    const getTypeIcon = () => {
        if (!entry) return '📚';
        switch (entry.libraryType) {
            case 'book': return '📚';
            case 'video': return '🎬';
            case 'article': return '📰';
            default: return '📚';
        }
    };

    const getTypeLabel = () => {
        if (!entry) return 'Resource';
        switch (entry.libraryType) {
            case 'book': return 'Book';
            case 'video': return 'Video';
            case 'article': return 'Article';
            default: return 'Resource';
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/60">
                <View className="max-h-[85%] rounded-t-3xl border border-border bg-surface p-6 pb-10 shadow-lg">
                    {/* Header */}
                    <View className="mb-6 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                            <Text className="text-2xl">{getTypeIcon()}</Text>
                            <Text className="text-xl text-text" style={{ fontFamily: 'DMSans_700Bold' }}>
                                {getTypeLabel()}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                            <Ionicons name="close" size={24} color="#7eb8ff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Title */}
                        <View className="mb-4">
                            <Text className="mb-2 text-sm text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                                Title
                            </Text>
                            <TextInput
                                className="rounded-xl border border-border2 bg-surface2 px-4 py-3 text-base text-text"
                                style={{ fontFamily: 'DMSans_400Regular' }}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Enter title"
                                placeholderTextColor="#5a5a70"
                                multiline
                            />
                        </View>

                        {/* Author (Books only) */}
                        {entry?.libraryType === 'book' && (
                            <View className="mb-4">
                                <Text className="mb-2 text-sm text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                                    Author
                                </Text>
                                <TextInput
                                    className="rounded-xl border border-border2 bg-surface2 px-4 py-3 text-base text-text"
                                    style={{ fontFamily: 'DMSans_400Regular' }}
                                    value={author}
                                    onChangeText={setAuthor}
                                    placeholder="Enter author name"
                                    placeholderTextColor="#5a5a70"
                                />
                            </View>
                        )}

                        {/* URL */}
                        <View className="mb-4">
                            <Text className="mb-2 text-sm text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                                URL
                            </Text>
                            <View className="flex-row gap-2">
                                <TextInput
                                    className="flex-1 rounded-xl border border-border2 bg-surface2 px-4 py-3 text-base text-text"
                                    style={{ fontFamily: 'SpaceMono_400Regular' }}
                                    value={url}
                                    onChangeText={setUrl}
                                    placeholder="https://..."
                                    placeholderTextColor="#5a5a70"
                                    autoCapitalize="none"
                                    keyboardType="url"
                                />
                                {url && (
                                    <TouchableOpacity
                                        className="items-center justify-center rounded-xl border border-border2 bg-surface2 px-4"
                                        onPress={handleOpenUrl}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="open-outline" size={20} color="#7eb8ff" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Status (Books only) */}
                        {entry?.libraryType === 'book' && (
                            <View className="mb-6">
                                <Text className="mb-2 text-sm text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                                    Status
                                </Text>
                                <View className="flex-row gap-2">
                                    {STATUS_OPTIONS.map((opt) => (
                                        <TouchableOpacity
                                            key={opt}
                                            className={`flex-1 rounded-xl border-[1.5px] py-3 ${
                                                status === opt
                                                    ? 'border-accent bg-accent/10'
                                                    : 'border-border2 bg-surface2'
                                            }`}
                                            onPress={() => setStatus(status === opt ? undefined : opt)}
                                            activeOpacity={0.7}
                                        >
                                            <Text
                                                className="text-center text-sm capitalize"
                                                style={{
                                                    fontFamily: 'DMSans_500Medium',
                                                    color: status === opt ? '#7fff9e' : '#a0a0b0',
                                                }}
                                            >
                                                {opt}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View className="gap-3">
                            <TouchableOpacity
                                className="rounded-xl bg-accent py-4"
                                onPress={handleSave}
                                activeOpacity={0.7}
                            >
                                <Text
                                    className="text-center text-base text-bg"
                                    style={{ fontFamily: 'DMSans_700Bold' }}
                                >
                                    Save Changes
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="rounded-xl border border-red-500/30 bg-red-500/10 py-4"
                                onPress={handleDelete}
                                activeOpacity={0.7}
                            >
                                <Text
                                    className="text-center text-base text-red-500"
                                    style={{ fontFamily: 'DMSans_700Bold' }}
                                >
                                    Delete
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
