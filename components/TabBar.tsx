import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const tabs = [
    { name: 'index', label: 'Inbox', icon: 'chatbubble-outline' as const, activeIcon: 'chatbubble' as const },
    { name: 'tasks', label: 'Tasks', icon: 'checkbox-outline' as const, activeIcon: 'checkbox' as const, badge: true },
    { name: 'notes', label: 'Notes', icon: 'document-text-outline' as const, activeIcon: 'document-text' as const },
];

export default function TabBar({ state, navigation }: BottomTabBarProps) {
    return (
        <View className="flex-row items-center justify-around border-t border-border bg-surface px-5 pb-6 pt-2">
            {tabs.map((tab, index) => {
                const isActive = state.index === index;
                return (
                    <TouchableOpacity
                        key={tab.name}
                        onPress={() => navigation.navigate(tab.name)}
                        className={`relative flex-col items-center gap-1 rounded-[14px] px-4 py-1.5 ${isActive ? 'bg-accent/[0.08]' : ''}`}
                        activeOpacity={0.7}
                    >
                        {tab.badge && (
                            <View className="absolute right-2.5 top-0.5 h-[7px] w-[7px] rounded-full border-2 border-surface bg-accent2" />
                        )}
                        <Ionicons
                            name={isActive ? tab.activeIcon : tab.icon}
                            size={22}
                            color={isActive ? '#7fff9e' : '#5a5a70'}
                        />
                        <Text
                            className="font-mono text-[10px] tracking-wide"
                            style={{ color: isActive ? '#7fff9e' : '#5a5a70' }}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
