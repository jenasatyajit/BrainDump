import React from 'react';
import { View, Text } from 'react-native';

interface NotesHeaderProps {
    total: number;
    ideas: number;
}

export default function NotesHeader({ total, ideas }: NotesHeaderProps) {
    return (
        <View className="px-6 pb-3 pt-4">
            <Text className="text-[22px] font-bold tracking-tight text-text" style={{ fontWeight: '700' }}>
                Notes
            </Text>
            <Text className="mt-0.5 text-xs text-muted">
                {total} notes · {ideas} ideas
            </Text>
        </View>
    );
}
