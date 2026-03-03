import React from 'react';
import { View, Text, TouchableOpacity, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { LibraryEntry } from '@/store/libraryStore';

interface VideoCardProps {
    video: LibraryEntry;
    onLongPress?: () => void;
    fullWidth?: boolean;
}

export default function VideoCard({ video, onLongPress, fullWidth = false }: VideoCardProps) {
    const getYouTubeThumbnail = (url: string): string => {
        try {
            const urlObj = new URL(url);
            let videoId = '';

            // Handle youtube.com/watch?v=VIDEO_ID
            if (urlObj.hostname.includes('youtube.com')) {
                videoId = urlObj.searchParams.get('v') || '';
            }
            // Handle youtu.be/VIDEO_ID
            else if (urlObj.hostname.includes('youtu.be')) {
                videoId = urlObj.pathname.slice(1);
            }

            return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
        } catch {
            return '';
        }
    };

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
            className={`mb-3 overflow-hidden rounded-2xl ${fullWidth ? 'w-full' : 'w-[280px] flex-shrink-0'}`}
            activeOpacity={0.7}
            onPress={handlePress}
            onLongPress={onLongPress}
        >
            {/* Thumbnail */}
            <View className={`items-center justify-center overflow-hidden bg-surface3 ${fullWidth ? 'h-[210px]' : 'h-[157px]'}`}>
                {video.url && video.platform === 'youtube' ? (
                    <View className="relative h-full w-full">
                        <Image
                            source={{ uri: getYouTubeThumbnail(video.url) }}
                            className="h-full w-full"
                            resizeMode="cover"
                        />
                        <View className="absolute inset-0 items-center justify-center bg-black/30">
                            <View className="h-12 w-12 items-center justify-center rounded-full bg-red-600">
                                <Ionicons name="play" size={24} color="white" />
                            </View>
                        </View>
                    </View>
                ) : (
                    <Ionicons name={platformIcon} size={48} color={platformColor} />
                )}
            </View>

            {/* Info */}
            <View className="min-h-[80px] bg-surface2 p-3">
                <Text
                    className="text-[15px] leading-tight text-text"
                    numberOfLines={2}
                    style={{ fontFamily: 'DMSans_500Medium' }}
                >
                    {video.title}
                </Text>
                <View className="mt-2 flex-row">
                    <View
                        className="rounded-full border px-2.5 py-1"
                        style={{ borderColor: platformColor + '40', backgroundColor: platformColor + '10' }}
                    >
                        <Text className="text-[10px] uppercase" style={{ color: platformColor, fontFamily: 'SpaceMono_400Regular' }}>
                            {video.platform}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}
