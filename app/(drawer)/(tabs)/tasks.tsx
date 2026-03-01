import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTaskStore, type TaskEntry } from '@/store/taskStore';
import { useChatStore } from '@/store/chatStore';
import TasksHeader from '@/components/tasks/TasksHeader';
import FilterPills from '@/components/tasks/FilterPills';
import TaskItem from '@/components/tasks/TaskItem';
import TaskEditModal from '@/components/tasks/TaskEditModal';
import { ParsedEntry } from '@/services/aiService';

export default function TasksScreen() {
  const { filter, setFilter, getFilteredTasks, getStats } = useTaskStore();
  const { toggleTaskComplete, loadMessages, editTask, deleteTask } = useChatStore();
  const [refreshing, setRefreshing] = useState(false);

  // According states
  const [todoExpanded, setTodoExpanded] = useState(true);
  const [completedExpanded, setCompletedExpanded] = useState(false);

  // Modal state
  const [editTaskItem, setEditTaskItem] = useState<TaskEntry | null>(null);

  const tasks = getFilteredTasks();
  const stats = getStats();

  const todoTasks = tasks.filter((t) => !t.isCompleted);
  const completedTasks = tasks.filter((t) => t.isCompleted);

  const handleToggle = useCallback(
    (task: TaskEntry) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toggleTaskComplete(task.messageId, task.entryIndex);
    },
    [toggleTaskComplete]
  );

  const handleEdit = (task: TaskEntry) => {
    setEditTaskItem(task);
  };

  const handleSaveEdit = (messageId: string, entryIndex: number, updates: Partial<ParsedEntry>) => {
    editTask(messageId, entryIndex, updates);
    setEditTaskItem(null);
  };

  const handleDelete = (task: TaskEntry) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTask(task.messageId, task.entryIndex),
        },
      ],
      { cancelable: true }
    );
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  }, [loadMessages]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <TasksHeader pending={stats.pending} completedToday={stats.completedToday} />
      <FilterPills activeFilter={filter} onFilterChange={setFilter} />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#7fff9e"
            colors={['#7fff9e']}
            progressBackgroundColor="#18181f"
          />
        }>
        {/* To Do / Pending Group */}
        <View className="mb-4">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setTodoExpanded(!todoExpanded)}
            className="mb-2 flex-row items-center justify-between py-3">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-semibold text-text">To Do</Text>
              <View className="rounded-md bg-surface2 px-2 py-0.5">
                <Text className="text-xs font-medium text-muted">{todoTasks.length}</Text>
              </View>
            </View>
            <Ionicons
              name={todoExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#a1a1b5"
            />
          </TouchableOpacity>

          {todoExpanded ? (
            <View className="gap-2">
              {todoTasks.length === 0 ? (
                <Text className="my-2 text-center text-sm text-muted">No tasks to do.</Text>
              ) : (
                todoTasks.map((item) => (
                  <TaskItem
                    key={`${item.messageId}-${item.entryIndex}`}
                    task={item}
                    onToggle={() => handleToggle(item)}
                    onEdit={() => handleEdit(item)}
                    onDelete={() => handleDelete(item)}
                  />
                ))
              )}
            </View>
          ) : null}
        </View>

        {/* Completed Group */}
        <View className="mb-4">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setCompletedExpanded(!completedExpanded)}
            className="mb-2 flex-row items-center justify-between py-3">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-semibold text-text">Completed</Text>
              <View className="rounded-md bg-surface2 px-2 py-0.5">
                <Text className="text-xs font-medium text-muted">{completedTasks.length}</Text>
              </View>
            </View>
            <Ionicons
              name={completedExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#a1a1b5"
            />
          </TouchableOpacity>

          {completedExpanded ? (
            <View className="gap-2">
              {completedTasks.length === 0 ? (
                <Text className="my-2 text-center text-sm text-muted">No completed tasks yet.</Text>
              ) : (
                completedTasks.map((item) => (
                  <TaskItem
                    key={`${item.messageId}-${item.entryIndex}`}
                    task={item}
                    onToggle={() => handleToggle(item)}
                    onEdit={() => handleEdit(item)}
                    onDelete={() => handleDelete(item)}
                  />
                ))
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <TaskEditModal
        visible={!!editTaskItem}
        task={editTaskItem}
        onClose={() => setEditTaskItem(null)}
        onSave={handleSaveEdit}
      />
    </SafeAreaView>
  );
}
