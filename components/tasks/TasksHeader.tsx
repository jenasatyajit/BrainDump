import React from 'react';
import { View, Text } from 'react-native';

interface TasksHeaderProps {
    pending: number;
    completedToday: number;
}

export default function TasksHeader({ pending, completedToday }: TasksHeaderProps) {
    return (
        <View className="px-6 pb-3 pt-4">
            <Text className="text-[28px] font-bold tracking-tight text-text" style={{ fontFamily: 'DMSans_700Bold' }}>
                Tasks
            </Text>
            <Text className="mt-0.5 text-[13px] text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                {pending} pending · {completedToday} completed today
            </Text>
        </View>
    );
}
