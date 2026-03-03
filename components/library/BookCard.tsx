import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { LibraryEntry } from '@/store/libraryStore';

interface BookCardProps {
    book: LibraryEntry;
    onPress?: () => void;
    onLongPress?: () => void;
}

const BOOK_GRADIENTS = [
    { colors: ['#667eea', '#764ba2', '#f093fb'] as const }, // Purple to Pink
    { colors: ['#f093fb', '#f5576c', '#ffd140'] as const }, // Pink to Orange
    { colors: ['#4facfe', '#00f2fe', '#43e97b'] as const }, // Blue to Cyan to Green
    { colors: ['#fa709a', '#fee140', '#30cfd0'] as const }, // Pink to Yellow to Cyan
    { colors: ['#a8edea', '#fed6e3', '#fbc2eb'] as const }, // Mint to Pink
    { colors: ['#ff9a56', '#ff6a88', '#ffecd2'] as const }, // Orange to Pink to Peach
    { colors: ['#6a11cb', '#2575fc', '#00d4ff'] as const }, // Deep Purple to Blue
    { colors: ['#f77062', '#fe5196', '#ffd200'] as const }, // Coral to Pink to Gold
];

const STATUS_CONFIG = {
    reading: { label: 'reading', color: '#7fff9e', bg: '#7fff9e15' },
    want: { label: 'want', color: '#f59e6a', bg: '#f59e6a15' },
    done: { label: 'done', color: '#7eb8ff', bg: '#7eb8ff15' },
};

export default function BookCard({ book, onPress, onLongPress }: BookCardProps) {
    const gradientConfig = useMemo(() => {
        const hash = book.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return BOOK_GRADIENTS[hash % BOOK_GRADIENTS.length];
    }, [book.title]);

    const statusConfig = book.status ? STATUS_CONFIG[book.status] : null;

    return (
        <TouchableOpacity
            className="mb-3 w-[160px] flex-shrink-0 overflow-hidden rounded-2xl"
            activeOpacity={0.7}
            onPress={onPress}
            onLongPress={onLongPress}
        >
            {/* Cover */}
            <View className="h-[200px] items-center justify-center overflow-hidden">
                {book.url ? (
                    <Image
                        source={{ uri: book.url }}
                        className="h-full w-full"
                        resizeMode="cover"
                    />
                ) : (
                    <>
                        <LinearGradient
                            colors={gradientConfig.colors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: 0,
                                bottom: 0,
                            }}
                        />
                        <Text className="text-6xl">📘</Text>
                    </>
                )}
            </View>

            {/* Info */}
            <View className="min-h-[100px] bg-surface2 p-3">
                <Text
                    className="text-[15px] leading-tight text-text"
                    numberOfLines={2}
                    style={{ fontFamily: 'DMSans_500Medium' }}
                >
                    {book.title}
                </Text>
                {book.author && (
                    <Text className="mt-1 text-[12px] text-muted" numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular' }}>
                        {book.author}
                    </Text>
                )}
                {statusConfig && (
                    <View className="mt-2 flex-row">
                        <View
                            className="rounded-md px-2 py-1"
                            style={{ backgroundColor: statusConfig.bg }}
                        >
                            <Text
                                className="text-[10px]"
                                style={{ color: statusConfig.color, fontFamily: 'SpaceMono_400Regular' }}
                            >
                                ● {statusConfig.label}
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}
