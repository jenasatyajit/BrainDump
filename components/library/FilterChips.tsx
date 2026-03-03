import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

type FilterType = 'all' | 'books' | 'videos' | 'articles';

interface FilterChipsProps {
    active: FilterType;
    stats: { total: number; books: number; videos: number; articles: number };
    onFilterChange: (filter: FilterType) => void;
}

export default function FilterChips({ active, stats, onFilterChange }: FilterChipsProps) {
    const handlePress = (filter: FilterType) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onFilterChange(filter);
    };

    return (
        <View className="mb-4 flex-row gap-2 px-6">
            {/* All */}
            <TouchableOpacity
                className={`h-16 flex-shrink-0 flex-col justify-center gap-0.5 rounded-2xl border-[1.5px] px-4 ${
                    active === 'all'
                        ? 'border-accent/30 bg-accent/[0.07]'
                        : 'border-border2 bg-surface2'
                }`}
                activeOpacity={0.7}
                onPress={() => handlePress('all')}
            >
                <Text
                    className="text-[20px] leading-none"
                    style={{ color: active === 'all' ? '#7fff9e' : '#e8e8f0', fontFamily: 'DMSans_700Bold' }}
                >
                    {stats.total}
                </Text>
                <Text className="text-[10px] uppercase tracking-wide text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>All</Text>
            </TouchableOpacity>

            {/* Books */}
            <TouchableOpacity
                className={`flex-1 rounded-2xl border-[1.5px] p-3 ${
                    active === 'books'
                        ? 'border-[#f59e6a]/30 bg-[#f59e6a]/[0.07]'
                        : 'border-border2 bg-surface2'
                }`}
                activeOpacity={0.7}
                onPress={() => handlePress('books')}
            >
                <View className="flex-row items-center justify-between">
                    <Text className="text-lg">📚</Text>
                    <Text
                        className="text-[20px] leading-none"
                        style={{ color: active === 'books' ? '#f59e6a' : '#e2e2f0', fontFamily: 'DMSans_700Bold' }}
                    >
                        {stats.books}
                    </Text>
                </View>
                <Text className="mt-1.5 text-[10px] uppercase tracking-wide text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                    Books
                </Text>
            </TouchableOpacity>

            {/* Videos */}
            <TouchableOpacity
                className={`flex-1 rounded-2xl border-[1.5px] p-3 ${
                    active === 'videos'
                        ? 'border-[#7eb8ff]/30 bg-[#7eb8ff]/[0.07]'
                        : 'border-border2 bg-surface2'
                }`}
                activeOpacity={0.7}
                onPress={() => handlePress('videos')}
            >
                <View className="flex-row items-center justify-between">
                    <Text className="text-lg">🎬</Text>
                    <Text
                        className="text-[20px] leading-none"
                        style={{ color: active === 'videos' ? '#7eb8ff' : '#e2e2f0', fontFamily: 'DMSans_700Bold' }}
                    >
                        {stats.videos}
                    </Text>
                </View>
                <Text className="mt-1.5 text-[10px] uppercase tracking-wide text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                    Videos
                </Text>
            </TouchableOpacity>

            {/* Articles */}
            <TouchableOpacity
                className={`flex-1 rounded-2xl border-[1.5px] p-3 ${
                    active === 'articles'
                        ? 'border-[#a78bfa]/30 bg-[#a78bfa]/[0.07]'
                        : 'border-border2 bg-surface2'
                }`}
                activeOpacity={0.7}
                onPress={() => handlePress('articles')}
            >
                <View className="flex-row items-center justify-between">
                    <Text className="text-lg">📰</Text>
                    <Text
                        className="text-[20px] leading-none"
                        style={{ color: active === 'articles' ? '#a78bfa' : '#e2e2f0', fontFamily: 'DMSans_700Bold' }}
                    >
                        {stats.articles}
                    </Text>
                </View>
                <Text className="mt-1.5 text-[10px] uppercase tracking-wide text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                    Articles
                </Text>
            </TouchableOpacity>
        </View>
    );
}
