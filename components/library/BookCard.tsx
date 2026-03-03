import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import type { LibraryEntry } from '@/store/libraryStore';

interface BookCardProps {
    book: LibraryEntry;
    onPress?: () => void;
}

export default function BookCard({ book, onPress }: BookCardProps) {
    return (
        <TouchableOpacity
            className="mb-3 w-[110px] flex-shrink-0 overflow-hidden rounded-2xl border border-border bg-surface2"
            activeOpacity={0.7}
            onPress={onPress}
        >
            {/* Cover */}
            <View className="h-36 items-center justify-center bg-surface3">
                {book.url ? (
                    <Image
                        source={{ uri: book.url }}
                        className="h-full w-full"
                        resizeMode="cover"
                    />
                ) : (
                    <Text className="text-4xl">📚</Text>
                )}
            </View>

            {/* Info */}
            <View className="p-2.5">
                <Text
                    className="font-heading text-xs leading-tight text-text"
                    numberOfLines={2}
                >
                    {book.title}
                </Text>
                {book.author && (
                    <Text className="mt-1 font-mono text-[10px] text-muted" numberOfLines={1}>
                        {book.author}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
}
