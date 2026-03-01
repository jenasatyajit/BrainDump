import React from 'react';
import { ScrollView, TouchableOpacity, Text } from 'react-native';

export type TaskFilter = 'all' | 'today' | 'thisWeek' | 'overdue';

interface FilterPillsProps {
    activeFilter: TaskFilter;
    onFilterChange: (filter: TaskFilter) => void;
}

const FILTERS: { key: TaskFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'thisWeek', label: 'This Week' },
    { key: 'overdue', label: 'Overdue' },
];

export default function FilterPills({ activeFilter, onFilterChange }: FilterPillsProps) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-3 max-h-9"
            contentContainerStyle={{ gap: 6, paddingHorizontal: 16, alignItems: 'center' }}
        >
            {FILTERS.map((filter) => {
                const isActive = activeFilter === filter.key;
                return (
                    <TouchableOpacity
                        key={filter.key}
                        className={`rounded-full border px-3.5 py-1.5 ${isActive ? 'border-task/30 bg-task/[0.12]' : 'border-border'
                            }`}
                        activeOpacity={0.7}
                        onPress={() => onFilterChange(filter.key)}
                    >
                        <Text
                            className="text-xs"
                            style={{ color: isActive ? '#7eb8ff' : '#5a5a70' }}
                        >
                            {filter.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}
