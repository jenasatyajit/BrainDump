import React from 'react';
import { View, Text, TouchableOpacity, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { LibraryEntry } from '@/store/libraryStore';

interface VideoCardProps {
    video: LibraryEntry;
}

export default function VideoCard({ video }: VideoCardProps) {
    const handlePress = async () => {
        if (video.url) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            try {
                await Linking.openURL(video.url);
            } catch (error) {
                console.error('Failed to open URL:', error);
            }
        }
    };

    const platformColor = video.platform === 'youtube' ? '#7eb8ff' : '#ff7eb3';
    const platformIcon = video.platform === 'youtube' ? 'logo-youtube' : 'logo-instagram';

    return (
        <TouchableOpacity
            className="mb-2 flex-row items-center gap-3 rounded-2xl border border-border bg-surface2 p-3"
            activeOpacity={0.7}
            onPress={handlePress}
        >
            {/* Thumbnail */}
            <View className="h-12 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface3">
                {video.url && video.platform === 'youtube' ? (
                    <View className="relative h-full w-full">
                        <Image
                            source={{ uri: video.url.replace('watch?v=', 'vi/').replace('youtu.be/', 'vi/') + '/hqdefault.jpg' }}
                            className="h-full w-full"
                            resizeMode="cover"
                        />
                        <View className="absolute inset-0 items-center justify-center bg-black/30">
                            <Ionicons name="play" size={16} color="white" />
                        </View>
                    </View>
                ) : (
                    <Ionicons name={platformIcon} size={24} color={platformColor} />
                )}
            </View>

            {/* Info */}
            <View className="flex-1">
                <Text className="text-[15px] leading-tight text-text" numberOfLines={2} style={{ fontFamily: 'DMSans_400Regular' }}>
                    {video.title}
                </Text>
                <View className="mt-1 flex-row items-center gap-2">
                    <View
                        className="rounded-full border px-2 py-0.5"
                        style={{ borderColor: platformColor + '40', backgroundColor: platformColor + '10' }}
                    >
                        <Text className="text-[10px] uppercase" style={{ color: platformColor, fontFamily: 'SpaceMono_400Regular' }}>
                            {video.platform}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Arrow */}
            <Ionicons name="chevron-forward" size={16} color="#5a5a70" />
        </TouchableOpacity>
    );
}
