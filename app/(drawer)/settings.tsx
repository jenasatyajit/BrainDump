import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { fullSync, getLastSyncTime } from '@/services/syncService';
import { clearAllData, getLLMConfig, type LLMConfig, resetLLMConfig, saveLLMConfig } from '@/services/database';
import { useChatStore } from '@/store/chatStore';
import { supabase } from '@/utils/supabase';
import type { User } from '@supabase/supabase-js';
import appConfig from '@/app.json';

export default function SettingsScreen() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);
    const [satyaKey, setSatyaKey] = useState('');
    const [showSatyaKey, setShowSatyaKey] = useState(false);
    const loadMessages = useChatStore((s) => s.loadMessages);

    useEffect(() => {
        getLastSyncTime().then(setLastSync);
        getLLMConfig().then(setLlmConfig);

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

    const handleResetLLMConfig = useCallback(async () => {
        Alert.alert(
            'Reset LLM Config',
            'This will delete all your API keys and redirect you to onboarding to re-enter them.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        await resetLLMConfig();
                        const updated = await getLLMConfig();
                        setLlmConfig(updated);
                        Alert.alert('Done', 'LLM config reset. Redirecting to onboarding...', [
                            {
                                text: 'OK',
                                onPress: () => {
                                    router.replace('/onboarding');
                                },
                            },
                        ]);
                    },
                },
            ]
        );
    }, [router]);

    const handleShowConfig = useCallback(async () => {
        const config = await getLLMConfig();
        const details = `
Provider: ${config?.provider || 'none'}

Gemini Key: ${config?.gemini_api_key ? `${config.gemini_api_key.substring(0, 15)}...` : 'NOT SET'}

OpenRouter Key: ${config?.openrouter_api_key ? `${config.openrouter_api_key.substring(0, 15)}...` : 'NOT SET'}

Sarvam Key: ${config?.sarvam_api_key ? `${config.sarvam_api_key.substring(0, 15)}...` : 'NOT SET'}

OpenRouter Model: ${config?.openrouter_model || 'none'}
        `.trim();
        
        Alert.alert('Current LLM Config', details);
    }, []);

    const handleApplySatyaKey = useCallback(async () => {
        if (satyaKey !== 'SATYAISKING') {
            Alert.alert('Invalid Key', 'The SATYA KEY you entered is incorrect.');
            return;
        }

        try {
            const envGeminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || null;
            const envOpenrouterKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || null;
            const envSarvamKey = process.env.EXPO_PUBLIC_SARVAM_API_KEY || null;

            if (!envGeminiKey && !envOpenrouterKey && !envSarvamKey) {
                Alert.alert('Error', 'No developer API keys found in environment.');
                return;
            }

            await saveLLMConfig({
                provider: llmConfig?.provider || 'gemini',
                gemini_api_key: envGeminiKey,
                openrouter_api_key: envOpenrouterKey,
                sarvam_api_key: envSarvamKey,
                openrouter_model: llmConfig?.openrouter_model || 'meta-llama/llama-3.2-3b-instruct:free',
            });

            const updated = await getLLMConfig();
            setLlmConfig(updated);
            setSatyaKey('');
            
            Alert.alert('Success', 'Developer API keys have been applied!');
        } catch (error) {
            console.error('[settings] Failed to apply SATYA KEY:', error);
            Alert.alert('Error', 'Failed to apply developer keys');
        }
    }, [satyaKey, llmConfig]);

    const formatSyncTime = (iso: string | null) => {
        if (!iso) return 'Never';
        return new Date(iso).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const getProviderDisplayName = () => {
        if (!llmConfig) return 'Loading...';
        
        const providerNames = {
            gemini: 'Gemini',
            openrouter: 'OpenRouter',
            sarvam: 'Sarvam AI',
        };
        
        return providerNames[llmConfig.provider] || llmConfig.provider;
    };

    const getModelDisplayName = () => {
        if (!llmConfig) return 'Loading...';
        
        if (llmConfig.provider === 'gemini') {
            return 'Gemini 3 Flash';
        } else if (llmConfig.provider === 'openrouter') {
            const modelName = llmConfig.openrouter_model;
            if (modelName.includes('llama')) return 'Llama 3.2 3B';
            if (modelName.includes('stepfun')) return 'Step 3.5 Flash';
            return modelName;
        } else if (llmConfig.provider === 'sarvam') {
            return 'Sarvam-M';
        }
        
        return 'Unknown';
    };

    return (
        <ScrollView className="flex-1 bg-bg px-6 pt-6">

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

            {/* LLM Provider Section */}
            <Text className="mb-4 mt-8 text-xs uppercase tracking-widest text-muted">AI Provider</Text>

            <View className="rounded-2xl border border-border bg-surface2 p-4">
                <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                        <Ionicons name="flash-outline" size={20} color="#7fff9e" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-sm font-medium text-text">{getProviderDisplayName()}</Text>
                        <Text className="text-xs text-muted">{getModelDisplayName()}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    className="mt-4 items-center rounded-xl border border-accent/20 bg-accent/[0.08] py-3"
                    activeOpacity={0.7}
                    onPress={() => router.push('/onboarding')}
                >
                    <Text className="text-sm font-medium text-accent">Change Provider</Text>
                </TouchableOpacity>

                <Text className="mt-3 text-center text-[11px] text-muted">
                    Configure API keys and select your preferred AI provider
                </Text>
            </View>

            {/* SATYA KEY Section */}
            <Text className="mb-4 mt-8 text-xs uppercase tracking-widest text-muted">Developer Access</Text>

            <View className="rounded-2xl border border-accent/20 bg-accent/[0.04] p-4">
                <View className="flex-row items-center gap-3 mb-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                        <Ionicons name="key-outline" size={20} color="#7fff9e" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-sm font-medium text-text">SATYA KEY</Text>
                        <Text className="text-xs text-muted">Use developer API keys</Text>
                    </View>
                </View>

                <View className="flex-row items-center rounded-xl border border-accent/20 bg-surface2 px-4 mb-3">
                    <TextInput
                        className="flex-1 py-3 text-sm text-text"
                        placeholder="Enter SATYA KEY"
                        placeholderTextColor="#5a5a70"
                        value={satyaKey}
                        onChangeText={setSatyaKey}
                        secureTextEntry={!showSatyaKey}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <TouchableOpacity onPress={() => setShowSatyaKey(!showSatyaKey)}>
                        <Ionicons
                            name={showSatyaKey ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color="#5a5a70"
                        />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    className="items-center rounded-xl border border-accent/20 bg-accent/[0.08] py-3"
                    activeOpacity={0.7}
                    onPress={handleApplySatyaKey}
                    disabled={!satyaKey}
                >
                    <Text className={`text-sm font-medium ${satyaKey ? 'text-accent' : 'text-muted'}`}>
                        Apply Developer Keys
                    </Text>
                </TouchableOpacity>

                <Text className="mt-3 text-center text-[11px] text-muted">
                    Have a SATYA KEY? Enter it to use developer API keys
                </Text>
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

            {/* Debug Section */}
            <Text className="mb-4 mt-8 text-xs uppercase tracking-widest text-muted">Debug Tools</Text>

            <View className="rounded-2xl border border-border bg-surface2 p-4">
                <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                        <Ionicons name="bug-outline" size={20} color="#7fff9e" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-sm font-medium text-text">Configuration Tools</Text>
                        <Text className="text-xs text-muted">
                            View and manage LLM configuration
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    className="mt-4 items-center rounded-xl border border-accent/20 bg-accent/[0.08] py-3"
                    activeOpacity={0.7}
                    onPress={handleShowConfig}
                >
                    <Text className="text-sm font-medium text-accent">Show Current Config</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="mt-2 items-center rounded-xl border border-[#ff9d4d]/20 bg-[#ff9d4d]/[0.08] py-3"
                    activeOpacity={0.7}
                    onPress={handleResetLLMConfig}
                >
                    <Text className="text-sm font-medium text-[#ff9d4d]">Reset LLM Config</Text>
                </TouchableOpacity>

                <Text className="mt-3 text-center text-[11px] text-muted">
                    View your current configuration or reset to clear all API keys
                </Text>
            </View>

            {/* App Info */}
            <Text className="mb-4 mt-8 text-xs uppercase tracking-widest text-muted">About</Text>

            <View className="rounded-2xl border border-border bg-surface2 p-4 mb-6">
                <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-text">Version</Text>
                    <Text className="text-sm text-muted">{appConfig.expo.version}</Text>
                </View>
                <View className="my-3 h-px bg-border" />
                <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-text">AI Provider</Text>
                    <Text className="text-sm text-muted">{getProviderDisplayName()}</Text>
                </View>
                <View className="my-3 h-px bg-border" />
                <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-text">AI Model</Text>
                    <Text className="text-sm text-muted">{getModelDisplayName()}</Text>
                </View>
                <View className="my-3 h-px bg-border" />
                <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-text">Local Database</Text>
                    <Text className="text-sm text-muted">SQLite (WAL)</Text>
                </View>
            </View>
        </ScrollView>
    );
}
