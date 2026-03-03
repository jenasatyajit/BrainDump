import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LibraryHeaderProps {
    total: number;
    onAddPress?: () => void;
}

export default function LibraryHeader({ total, onAddPress }: LibraryHeaderProps) {
    return (
        <View className="px-6 pb-4 pt-3">
            <View className="flex-row items-start justify-between">
                <View>
                    <Text className="font-heading text-3xl tracking-tight text-text">Library</Text>
                    <Text className="font-mono text-xs text-muted">
                        {total} resource{total !== 1 ? 's' : ''} saved
                    </Text>
                </View>
                <View className="flex-row gap-2">
                    {/* Future: Search button */}
                    {/* <TouchableOpacity
                        className="h-9 w-9 items-center justify-center rounded-xl border border-border2 bg-surface2"
                        activeOpacity={0.7}
                    >
                        <Ionicons name="search-outline" size={18} color="#7eb8ff" />
                    </TouchableOpacity> */}
                    
                    {/* Future: Manual add button */}
                    {/* {onAddPress && (
                        <TouchableOpacity
                            className="h-9 w-9 items-center justify-center rounded-xl border border-border2 bg-surface2"
                            activeOpacity={0.7}
                            onPress={onAddPress}
                        >
                            <Ionicons name="add" size={20} color="#7fff9e" />
                        </TouchableOpacity>
                    )} */}
                </View>
            </View>
        </View>
    );
}
