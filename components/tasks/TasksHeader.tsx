import React from 'react';
import { View, Text } from 'react-native';

interface TasksHeaderProps {
    pending: number;
    completedToday: number;
}

export default function TasksHeader({ pending, completedToday }: TasksHeaderProps) {
    return (
        <View className="px-6 pb-3 pt-4">
            <Text className="text-[22px] font-bold tracking-tight text-text" style={{ fontWeight: '700' }}>
                Tasks
            </Text>
            <Text className="mt-0.5 text-xs text-muted">
                {pending} pending · {completedToday} completed today
            </Text>
        </View>
    );
}
