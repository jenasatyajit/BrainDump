import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { fullSync, getLastSyncTime } from '@/services/syncService';
import { clearAllData } from '@/services/database';
import { useChatStore } from '@/store/chatStore';
import { supabase } from '@/utils/supabase';
import type { User } from '@supabase/supabase-js';

export default function SettingsScreen() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const loadMessages = useChatStore((s) => s.loadMessages);

    useEffect(() => {
        getLastSyncTime().then(setLastSync);

        // Get current session
        supabase.auth.getUser().then(({ data }) => setUser(data.user));

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleSync = useCallback(async () => {
        if (!user) {
            router.push('/(drawer)/auth');
            return;
        }
        setIsSyncing(true);
        const result = await fullSync();
        setIsSyncing(false);

        if (result.success) {
            setLastSync(new Date().toISOString());
            Alert.alert('Sync Complete', 'Your data has been synced to the cloud.');
        } else {
            Alert.alert('Sync Failed', result.error || 'An unknown error occurred.');
        }
    }, [user]);

    const handleSignOut = useCallback(() => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await supabase.auth.signOut();
                },
            },
        ]);
    }, []);

    const handleClearData = useCallback(() => {
        Alert.alert(
            'Clear All Data',
            'This will permanently delete all messages, tasks, notes, and reminders. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Everything',
                    style: 'destructive',
                    onPress: async () => {
                        await clearAllData();
                        await loadMessages();
                        Alert.alert('Done', 'All data has been cleared.');
                    },
                },
            ]
        );
    }, [loadMessages]);

    const formatSyncTime = (iso: string | null) => {
        if (!iso) return 'Never';
        return new Date(iso).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    return (
        <View className="flex-1 bg-bg px-6 pt-6">

            {/* Account Section */}
            <Text className="mb-4 text-xs uppercase tracking-widest text-muted">Account</Text>

            <View className="rounded-2xl border border-border bg-surface2 p-4">
                {user ? (
                    // Signed in state
                    <>
                        <View className="flex-row items-center gap-3">
                            <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                                <Ionicons name="person-outline" size={20} color="#7fff9e" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-medium text-text">Signed In</Text>
                                <Text className="text-xs text-muted" numberOfLines={1}>{user.email}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            className="mt-4 items-center rounded-xl border border-[#ff4d4d]/20 bg-[#ff4d4d]/[0.06] py-3"
                            activeOpacity={0.7}
                            onPress={handleSignOut}
                        >
                            <Text className="text-sm font-medium text-[#ff4d4d]">Sign Out</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    // Signed out state
                    <>
                        <View className="flex-row items-center gap-3">
                            <View className="h-10 w-10 items-center justify-center rounded-xl bg-surface">
                                <Ionicons name="person-outline" size={20} color="#5a5a70" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-medium text-text">Not signed in</Text>
                                <Text className="text-xs text-muted">Sign in to enable cloud sync</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            className="mt-4 items-center rounded-xl border border-accent/20 bg-accent/[0.08] py-3"
                            activeOpacity={0.7}
                            onPress={() => router.push('/(drawer)/auth')}
                        >
                            <Text className="text-sm font-medium text-accent">Sign In / Sign Up</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* Cloud Sync Section */}
            <Text className="mb-4 mt-8 text-xs uppercase tracking-widest text-muted">Cloud Backup</Text>

            <View className="rounded-2xl border border-border bg-surface2 p-4">
                <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                        <Ionicons name="cloud-outline" size={20} color="#7fff9e" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-sm font-medium text-text">Supabase Sync</Text>
                        <Text className="text-xs text-muted">
                            Last synced: {formatSyncTime(lastSync)}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    className="mt-4 items-center rounded-xl border border-accent/20 bg-accent/[0.08] py-3"
                    activeOpacity={0.7}
                    onPress={handleSync}
                    disabled={isSyncing}
                >
                    {isSyncing ? (
                        <ActivityIndicator size="small" color="#7fff9e" />
                    ) : (
                        <Text className="text-sm font-medium text-accent">
                            {user ? 'Sync Now' : 'Sign in to Sync'}
                        </Text>
                    )}
                </TouchableOpacity>

                {!user && (
                    <Text className="mt-3 text-center text-[11px] text-muted">
                        Sign in above to enable cloud backup.
                    </Text>
                )}
            </View>

            {/* Danger Zone */}
            <Text className="mb-4 mt-8 text-xs uppercase tracking-widest text-muted">Danger Zone</Text>

            <View className="rounded-2xl border border-[#ff4d4d]/20 bg-[#ff4d4d]/[0.04] p-4">
                <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#ff4d4d]/10">
                        <Ionicons name="trash-outline" size={20} color="#ff4d4d" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-sm font-medium text-text">Clear All Data</Text>
                        <Text className="text-xs text-muted">
                            Delete all messages, tasks, notes & reminders
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    className="mt-4 items-center rounded-xl border border-[#ff4d4d]/20 bg-[#ff4d4d]/[0.08] py-3"
                    activeOpacity={0.7}
                    onPress={handleClearData}
                >
                    <Text className="text-sm font-medium text-[#ff4d4d]">Clear Data</Text>
                </TouchableOpacity>
            </View>

            {/* App Info */}
            <Text className="mb-4 mt-8 text-xs uppercase tracking-widest text-muted">About</Text>

            <View className="rounded-2xl border border-border bg-surface2 p-4">
                <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-text">Version</Text>
                    <Text className="text-sm text-muted">1.0.0</Text>
                </View>
                <View className="my-3 h-px bg-border" />
                <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-text">AI Model</Text>
                    <Text className="text-sm text-muted">Gemini 3 Flash</Text>
                </View>
                <View className="my-3 h-px bg-border" />
                <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-text">Local Database</Text>
                    <Text className="text-sm text-muted">SQLite (WAL)</Text>
                </View>
            </View>
        </View>
    );
}
