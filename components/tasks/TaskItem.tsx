import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TaskEntry } from '@/store/taskStore';

interface TaskItemProps {
    task: TaskEntry;
    onToggle: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
    high: '#ff7eb3',
    medium: '#7eb8ff',
    low: '#7fff9e',
};

function formatDetail(task: TaskEntry): string {
    const parts: string[] = [];

    if (task.isCompleted) {
        parts.push('Completed');
    } else if (task.dueDate) {
        const date = new Date(task.dueDate);
        const today = new Date();
        const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86400000);

        if (diffDays === 0) parts.push('Due Today');
        else if (diffDays === 1) parts.push('Due Tomorrow');
        else if (diffDays < 0) parts.push('Overdue');
        else
            parts.push(
                `Due ${date.toLocaleDateString('en-US', { weekday: 'short' })} ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            );
    } else {
        parts.push('No due date');
    }

    if (task.category) parts.push(task.category);

    return parts.join(' · ');
}

export default function TaskItem({ task, onToggle }: TaskItemProps) {
    const priorityColor = PRIORITY_COLORS[task.priority || 'low'] || '#5a5a70';

    return (
        <TouchableOpacity
            className={`flex-row items-start gap-3 rounded-2xl border border-border bg-surface2 p-3.5 px-4 ${task.isCompleted ? 'opacity-50' : ''
                }`}
            activeOpacity={0.7}
            onPress={onToggle}
        >
            {/* Checkbox */}
            <View
                className="mt-0.5 h-[18px] w-[18px] items-center justify-center rounded-[5px] border-[1.5px]"
                style={{
                    borderColor: task.isCompleted ? '#5a5a70' : priorityColor,
                    backgroundColor: task.isCompleted ? '#5a5a70' : 'transparent',
                }}
            >
                {task.isCompleted && <Ionicons name="checkmark" size={10} color="#0a0a0f" />}
            </View>

            {/* Content */}
            <View className="flex-1">
                <Text
                    className={`text-sm font-medium leading-5 ${task.isCompleted ? 'text-muted line-through' : 'text-text'
                        }`}
                >
                    {task.title}
                </Text>
                <Text className="mt-0.5 text-xs text-muted">{formatDetail(task)}</Text>
            </View>

            {/* Priority dot */}
            <View
                className="mt-1 h-2 w-2 rounded-full"
                style={{ backgroundColor: task.isCompleted ? '#5a5a70' : priorityColor }}
            />
        </TouchableOpacity>
    );
}
