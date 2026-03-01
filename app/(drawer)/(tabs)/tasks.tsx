import React, { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTaskStore, type TaskEntry } from '@/store/taskStore';
import { useChatStore } from '@/store/chatStore';
import TasksHeader from '@/components/tasks/TasksHeader';
import FilterPills from '@/components/tasks/FilterPills';
import TaskItem from '@/components/tasks/TaskItem';

export default function TasksScreen() {
    const { filter, setFilter, getFilteredTasks, getStats } = useTaskStore();
    const { toggleTaskComplete, loadMessages } = useChatStore();
    const [refreshing, setRefreshing] = useState(false);

    const tasks = getFilteredTasks();
    const stats = getStats();

    const handleToggle = useCallback(
        (task: TaskEntry) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleTaskComplete(task.messageId, task.entryIndex);
        },
        [toggleTaskComplete]
    );

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadMessages();
        setRefreshing(false);
    }, [loadMessages]);

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-bg">
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
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#7fff9e" colors={['#7fff9e']} progressBackgroundColor="#18181f" />
                }
            />
        </SafeAreaView>
    );
}
