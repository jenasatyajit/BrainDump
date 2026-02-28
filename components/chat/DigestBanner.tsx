import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DigestBannerProps {
    onPress: () => void;
    itemCount?: number;
}

export default function DigestBanner({ onPress, itemCount = 7 }: DigestBannerProps) {
    return (
        <TouchableOpacity
            className="mx-4 mb-3 flex-row items-center gap-3 rounded-2xl border border-accent/20 px-4 py-3"
            style={{
                backgroundColor: 'rgba(127,255,158,0.06)',
            }}
            activeOpacity={0.7}
            onPress={onPress}
        >
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
                <Text className="text-lg">✦</Text>
            </View>
            <View className="flex-1">
                <Text className="text-[13px] font-semibold text-accent">Daily Digest Ready</Text>
                <Text className="text-[11px] text-muted">
                    {itemCount} items synthesized · tap to view
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(127,255,158,0.5)" />
        </TouchableOpacity>
    );
}
