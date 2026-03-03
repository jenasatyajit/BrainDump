import React from 'react';
import { View, Text } from 'react-native';

interface NotesHeaderProps {
    total: number;
    ideas: number;
}

export default function NotesHeader({ total, ideas }: NotesHeaderProps) {
    return (
        <View className="px-6 pb-3 pt-4">
            <Text className="text-[28px] font-bold tracking-tight text-text" style={{ fontFamily: 'DMSans_700Bold' }}>
                Notes
            </Text>
            <Text className="mt-0.5 text-[13px] text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                {total} notes · {ideas} ideas
            </Text>
        </View>
    );
}
