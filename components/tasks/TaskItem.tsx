import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import type { TaskEntry } from '@/store/taskStore';

interface TaskItemProps {
  task: TaskEntry;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ff7eb3',
  medium: '#7eb8ff',
  low: '#7fff9e',
};

function formatTaskDetail(task: TaskEntry): string {
  if (task.isCompleted) return 'Completed';
  if (!task.dueDate) return 'No due date';

  const date = new Date(task.dueDate);
  const diffDays = Math.ceil((date.getTime() - Date.now()) / 86400000);

  if (diffDays === 0) return 'Due Today';
  if (diffDays === 1) return 'Due Tomorrow';
  if (diffDays < 0) return 'Overdue';
  return `Due ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
}

function formatReminderDetail(task: TaskEntry): string {
  const raw = task.remindAt || task.dueDate;
  if (!raw) return 'No date set';
  const date = new Date(raw);
  const diffDays = Math.ceil((date.getTime() - Date.now()) / 86400000);

  let when = '';
  if (diffDays === 0) when = 'Today';
  else if (diffDays === 1) when = 'Tomorrow';
  else if (diffDays < 0) when = 'Overdue';
  else
    when = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Include time if available
  const hasTime = raw.includes('T');
  if (hasTime) {
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${when} at ${time}`;
  }
  return when;
}

export default function TaskItem({ task, onToggle, onEdit, onDelete }: TaskItemProps) {
  const isReminder = task.type === 'reminder';
  const priorityColor = isReminder
    ? '#c084fc'
    : PRIORITY_COLORS[task.priority || 'low'] || '#5a5a70';
  const swipeableRef = useRef<Swipeable>(null);

  const handleEdit = () => {
    swipeableRef.current?.close();
    onEdit();
  };

  const handleDelete = () => {
    swipeableRef.current?.close();
    onDelete();
  };

  const handleSwipeableOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        onPress={handleEdit}
        className="mr-2 w-[75px] items-center justify-center rounded-2xl border border-border bg-surface2"
        style={{ backgroundColor: 'rgba(126, 184, 255, 0.15)', borderColor: '#7eb8ff' }}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="pencil-outline" size={24} color="#7eb8ff" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        onPress={handleDelete}
        className="ml-2 w-[75px] items-center justify-center rounded-2xl border border-border bg-surface2"
        style={{ backgroundColor: 'rgba(255, 126, 179, 0.15)', borderColor: '#ff7eb3' }}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={24} color="#ff7eb3" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      friction={2}
      onSwipeableWillOpen={handleSwipeableOpen}>
      <TouchableOpacity
        className={`flex-row items-start gap-3 rounded-2xl border border-border bg-surface2 p-3.5 px-4 ${task.isCompleted ? 'opacity-50' : ''}`}
        activeOpacity={0.7}
        onPress={onToggle}>
        {/* Icon — bell for reminder, checkbox for task */}
        {isReminder ? (
          <View
            className="mt-0.5 h-[18px] w-[18px] items-center justify-center rounded-[5px]"
            style={{ backgroundColor: 'rgba(192,132,252,0.12)' }}>
            <Ionicons name="notifications-outline" size={11} color="#c084fc" />
          </View>
        ) : (
          <View
            className="mt-0.5 h-[18px] w-[18px] items-center justify-center rounded-[5px] border-[1.5px]"
            style={{
              borderColor: task.isCompleted ? '#5a5a70' : priorityColor,
              backgroundColor: task.isCompleted ? '#5a5a70' : 'transparent',
            }}>
            {task.isCompleted && <Ionicons name="checkmark" size={10} color="#0a0a0f" />}
          </View>
        )}

        {/* Content */}
        <View className="flex-1">
          <Text
            className={`text-[15px] leading-5 ${task.isCompleted ? 'text-muted line-through' : 'text-text'}`}
            style={{ fontFamily: 'DMSans_500Medium' }}>
            {task.title}
          </Text>
          <Text className="mt-0.5 text-[13px] text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
            {isReminder ? formatReminderDetail(task) : formatTaskDetail(task)}
          </Text>
        </View>

        {/* Accent dot */}
        <View
          className="mt-1 h-2 w-2 rounded-full"
          style={{ backgroundColor: task.isCompleted ? '#5a5a70' : priorityColor }}
        />
      </TouchableOpacity>
    </Swipeable>
  );
}
