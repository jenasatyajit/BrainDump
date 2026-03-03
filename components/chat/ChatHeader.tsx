import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';

export default function ChatHeader() {
    const navigation = useNavigation();

    return (
        <View className="flex-row items-center justify-between px-6 pb-4 pt-3">
            <Text className="text-[32px] font-bold tracking-tight text-text" style={{ fontFamily: 'DMSans_700Bold' }}>
                DU<Text className="text-accent">MP</Text>
            </Text>
            <View className="flex-row gap-2">
                <TouchableOpacity
                    className="h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface2"
                    activeOpacity={0.7}
                >
                    <Ionicons name="mic-outline" size={16} color="#5a5a70" />
                </TouchableOpacity>
                <TouchableOpacity
                    className="h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface2"
                    activeOpacity={0.7}
                    onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                >
                    <Ionicons name="menu-outline" size={16} color="#5a5a70" />
                </TouchableOpacity>
            </View>
        </View>
    );
}
