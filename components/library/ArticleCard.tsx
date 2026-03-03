import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { LibraryEntry } from '@/store/libraryStore';

interface ArticleCardProps {
    article: LibraryEntry;
}

export default function ArticleCard({ article }: ArticleCardProps) {
    const handlePress = async () => {
        if (article.url) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            try {
                await Linking.openURL(article.url);
            } catch (error) {
                console.error('Failed to open URL:', error);
            }
        }
    };

    // Extract domain from URL for display
    const domain = article.url ? new URL(article.url).hostname.replace('www.', '') : '';

    return (
        <TouchableOpacity
            className="flex-row items-center gap-3 border-b border-border bg-surface2 p-3.5"
            activeOpacity={0.7}
            onPress={handlePress}
        >
            {/* Icon */}
            <View className="h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border2 bg-surface3">
                <Text className="text-base">📰</Text>
            </View>

            {/* Info */}
            <View className="flex-1">
                <Text className="text-[15px] leading-tight text-text" numberOfLines={2} style={{ fontFamily: 'DMSans_400Regular' }}>
                    {article.title}
                </Text>
                {domain && (
                    <Text className="mt-1 text-[11px] text-[#a78bfa]" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                        {domain}
                    </Text>
                )}
            </View>

            {/* Arrow */}
            <Ionicons name="chevron-forward" size={16} color="#5a5a70" />
        </TouchableOpacity>
    );
}
