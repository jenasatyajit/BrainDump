import React, { useCallback } from 'react';
import { View, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTaskStore, type TaskEntry } from '@/store/taskStore';
import { useChatStore } from '@/store/chatStore';
import TasksHeader from '@/components/tasks/TasksHeader';
import FilterPills from '@/components/tasks/FilterPills';
import TaskItem from '@/components/tasks/TaskItem';

export default function TasksScreen() {
    const insets = useSafeAreaInsets();
    const { filter, setFilter, getFilteredTasks, getStats } = useTaskStore();
    const { toggleTaskComplete } = useChatStore();

    const tasks = getFilteredTasks();
    const stats = getStats();

    const handleToggle = useCallback(
        (task: TaskEntry) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleTaskComplete(task.messageId, task.entryIndex);
        },
        [toggleTaskComplete]
    );

    return (
        <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
            <TasksHeader pending={stats.pending} completedToday={stats.completedToday} />
            <FilterPills activeFilter={filter} onFilterChange={setFilter} />
            <FlatList
                data={tasks}
                keyExtractor={(item) => `${item.messageId}-${item.entryIndex}`}
                renderItem={({ item }) => (
                    <TaskItem task={item} onToggle={() => handleToggle(item)} />
                )}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 8 }}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}
