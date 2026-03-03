import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { saveLLMConfig, getLLMConfig } from '@/services/database';

type Provider = 'gemini' | 'openrouter' | 'sarvam';

const PROVIDER_INFO = {
    gemini: {
        name: 'Google Gemini',
        description: 'Fast and reliable, great for general use',
        icon: 'flash' as const,
        getKeyUrl: 'https://aistudio.google.com/app/apikey',
    },
    openrouter: {
        name: 'OpenRouter',
        description: 'Access to 400+ models from one API',
        icon: 'git-network' as const,
        getKeyUrl: 'https://openrouter.ai/keys',
    },
    sarvam: {
        name: 'Sarvam AI',
        description: 'Optimized for Indian languages',
        icon: 'language' as const,
        getKeyUrl: 'https://www.sarvam.ai/',
    },
};

const OPENROUTER_MODELS = [
    { value: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B (Free)' },
    { value: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B (Free)' },
];

export default function OnboardingScreen() {
    const [selectedProvider, setSelectedProvider] = useState<Provider>('gemini');
    const [geminiKey, setGeminiKey] = useState('');
    const [openrouterKey, setOpenrouterKey] = useState('');
    const [sarvamKey, setSarvamKey] = useState('');
    const [satyaKey, setSatyaKey] = useState('');
    const [selectedModel, setSelectedModel] = useState(OPENROUTER_MODELS[0].value);
    const [showGeminiKey, setShowGeminiKey] = useState(false);
    const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);
    const [showSarvamKey, setShowSarvamKey] = useState(false);
    const [showSatyaKey, setShowSatyaKey] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Load existing config on mount
    useEffect(() => {
        async function loadConfig() {
            try {
                const config = await getLLMConfig();
                if (config) {
                    setSelectedProvider(config.provider);
                    setGeminiKey(config.gemini_api_key || '');
                    setOpenrouterKey(config.openrouter_api_key || '');
                    setSarvamKey(config.sarvam_api_key || '');
                    setSelectedModel(config.openrouter_model);
                }
            } catch (error) {
                console.error('[onboarding] Failed to load config:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadConfig();
    }, []);

    const handleSkip = async () => {
        Alert.alert(
            'No API Keys',
            'You need to provide your own API keys to use this app. Please enter at least one API key or use the SATYA KEY to access developer keys.',
            [{ text: 'OK' }]
        );
    };

    const handleContinue = async () => {
        // Check if SATYA KEY is provided and valid
        const isSatyaKeyValid = satyaKey === 'SATYAISKING';
        
        // Determine which keys to use
        let finalGeminiKey = geminiKey;
        let finalOpenrouterKey = openrouterKey;
        let finalSarvamKey = sarvamKey;
        
        // If SATYA KEY is valid, use environment keys
        if (isSatyaKeyValid) {
            finalGeminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || geminiKey;
            finalOpenrouterKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || openrouterKey;
            finalSarvamKey = process.env.EXPO_PUBLIC_SARVAM_API_KEY || sarvamKey;
        }
        
        // Validate that at least one key is provided
        if (!finalGeminiKey && !finalOpenrouterKey && !finalSarvamKey) {
            Alert.alert(
                'API Key Required',
                'Please enter at least one API key or provide the SATYA KEY to use developer keys.'
            );
            return;
        }

        // Validate selected provider has a key
        if (selectedProvider === 'gemini' && !finalGeminiKey) {
            Alert.alert('Gemini Key Required', 'Please enter your Gemini API key or select a different provider.');
            return;
        }
        if (selectedProvider === 'openrouter' && !finalOpenrouterKey) {
            Alert.alert('OpenRouter Key Required', 'Please enter your OpenRouter API key or select a different provider.');
            return;
        }
        if (selectedProvider === 'sarvam' && !finalSarvamKey) {
            Alert.alert('Sarvam Key Required', 'Please enter your Sarvam API key or select a different provider.');
            return;
        }

        setIsSaving(true);

        try {
            await saveLLMConfig({
                provider: selectedProvider,
                gemini_api_key: finalGeminiKey || null,
                openrouter_api_key: finalOpenrouterKey || null,
                sarvam_api_key: finalSarvamKey || null,
                openrouter_model: selectedModel,
            });

            router.replace('/(drawer)/(tabs)');
        } catch (error) {
            console.error('[onboarding] Failed to continue:', error);
            Alert.alert('Error', 'Failed to save configuration');
        } finally {
            setIsSaving(false);
        }
    };

    const openGetKeyUrl = (provider: Provider) => {
        Linking.openURL(PROVIDER_INFO[provider].getKeyUrl);
    };

    return (
        <ScrollView className="flex-1 bg-bg">
            {isLoading ? (
                <View className="flex-1 items-center justify-center py-20">
                    <ActivityIndicator size="large" color="#7fff9e" />
                    <Text className="mt-4 text-sm text-muted">Loading configuration...</Text>
                </View>
            ) : (
                <View className="px-6 pt-12 pb-6">
                {/* Header */}
                <View className="mb-8">
                    <Text className="text-3xl font-bold text-text mb-2">Welcome to Brain Dump</Text>
                    <Text className="text-base text-muted">Choose your AI provider to get started</Text>
                </View>

                {/* Provider Selection */}
                <Text className="text-xs uppercase tracking-widest text-muted mb-4">Select Provider</Text>

                {(Object.keys(PROVIDER_INFO) as Provider[]).map((provider) => (
                    <TouchableOpacity
                        key={provider}
                        className={`mb-3 rounded-2xl border p-4 ${
                            selectedProvider === provider
                                ? 'border-accent bg-accent/[0.08]'
                                : 'border-border bg-surface2'
                        }`}
                        activeOpacity={0.7}
                        onPress={() => setSelectedProvider(provider)}
                    >
                        <View className="flex-row items-center gap-3">
                            <View
                                className={`h-10 w-10 items-center justify-center rounded-xl ${
                                    selectedProvider === provider ? 'bg-accent/20' : 'bg-surface'
                                }`}
                            >
                                <Ionicons
                                    name={PROVIDER_INFO[provider].icon}
                                    size={20}
                                    color={selectedProvider === provider ? '#7fff9e' : '#5a5a70'}
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-medium text-text">
                                    {PROVIDER_INFO[provider].name}
                                </Text>
                                <Text className="text-xs text-muted">
                                    {PROVIDER_INFO[provider].description}
                                </Text>
                            </View>
                            {selectedProvider === provider && (
                                <Ionicons name="checkmark-circle" size={24} color="#7fff9e" />
                            )}
                        </View>
                    </TouchableOpacity>
                ))}


                {/* API Keys Section */}
                <Text className="text-xs uppercase tracking-widest text-muted mb-4 mt-8">API Keys</Text>

                {/* Gemini API Key */}
                <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-sm font-medium text-text">Gemini API Key</Text>
                        <TouchableOpacity onPress={() => openGetKeyUrl('gemini')}>
                            <Text className="text-xs text-accent">Get Key →</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="flex-row items-center rounded-xl border border-border bg-surface2 px-4">
                        <TextInput
                            className="flex-1 py-3 text-sm text-text"
                            placeholder="Enter your Gemini API key"
                            placeholderTextColor="#5a5a70"
                            value={geminiKey}
                            onChangeText={setGeminiKey}
                            secureTextEntry={!showGeminiKey}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity onPress={() => setShowGeminiKey(!showGeminiKey)}>
                            <Ionicons
                                name={showGeminiKey ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#5a5a70"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* OpenRouter API Key */}
                <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-sm font-medium text-text">OpenRouter API Key</Text>
                        <TouchableOpacity onPress={() => openGetKeyUrl('openrouter')}>
                            <Text className="text-xs text-accent">Get Key →</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="flex-row items-center rounded-xl border border-border bg-surface2 px-4">
                        <TextInput
                            className="flex-1 py-3 text-sm text-text"
                            placeholder="Enter your OpenRouter API key"
                            placeholderTextColor="#5a5a70"
                            value={openrouterKey}
                            onChangeText={setOpenrouterKey}
                            secureTextEntry={!showOpenrouterKey}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity onPress={() => setShowOpenrouterKey(!showOpenrouterKey)}>
                            <Ionicons
                                name={showOpenrouterKey ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#5a5a70"
                            />
                        </TouchableOpacity>
                    </View>

                    {/* OpenRouter Model Selection */}
                    {openrouterKey && (
                        <View className="mt-3">
                            <Text className="text-xs text-muted mb-2">Select Model</Text>
                            {OPENROUTER_MODELS.map((model) => (
                                <TouchableOpacity
                                    key={model.value}
                                    className={`mb-2 rounded-lg border p-3 ${
                                        selectedModel === model.value
                                            ? 'border-accent bg-accent/[0.08]'
                                            : 'border-border bg-surface'
                                    }`}
                                    onPress={() => setSelectedModel(model.value)}
                                >
                                    <Text
                                        className={`text-sm ${
                                            selectedModel === model.value ? 'text-accent' : 'text-text'
                                        }`}
                                    >
                                        {model.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Sarvam API Key */}
                <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-sm font-medium text-text">Sarvam API Key</Text>
                        <TouchableOpacity onPress={() => openGetKeyUrl('sarvam')}>
                            <Text className="text-xs text-accent">Get Key →</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="flex-row items-center rounded-xl border border-border bg-surface2 px-4">
                        <TextInput
                            className="flex-1 py-3 text-sm text-text"
                            placeholder="Enter your Sarvam API key"
                            placeholderTextColor="#5a5a70"
                            value={sarvamKey}
                            onChangeText={setSarvamKey}
                            secureTextEntry={!showSarvamKey}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity onPress={() => setShowSarvamKey(!showSarvamKey)}>
                            <Ionicons
                                name={showSarvamKey ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#5a5a70"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* SATYA KEY Section */}
                <View className="mb-8 rounded-2xl border border-accent/20 bg-accent/[0.04] p-4">
                    <View className="flex-row items-center gap-2 mb-3">
                        <Ionicons name="key-outline" size={20} color="#7fff9e" />
                        <Text className="text-sm font-medium text-accent">Developer Access</Text>
                    </View>
                    <Text className="text-xs text-muted mb-3">
                        Have a SATYA KEY? Enter it below to use developer API keys instead of your own.
                    </Text>
                    <View className="flex-row items-center rounded-xl border border-accent/20 bg-surface2 px-4">
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
                    {satyaKey === 'SATYAISKING' && (
                        <View className="mt-3 flex-row items-center gap-2">
                            <Ionicons name="checkmark-circle" size={16} color="#7fff9e" />
                            <Text className="text-xs text-accent">Valid! Developer keys will be used.</Text>
                        </View>
                    )}
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                    className="mb-3 items-center rounded-xl border border-accent/20 bg-accent/[0.08] py-4"
                    activeOpacity={0.7}
                    onPress={handleContinue}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <Text className="text-base font-medium text-accent">Saving...</Text>
                    ) : (
                        <Text className="text-base font-medium text-accent">Continue</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    className="items-center rounded-xl border border-border bg-surface2 py-4"
                    activeOpacity={0.7}
                    onPress={handleSkip}
                >
                    <Text className="text-base font-medium text-muted">Skip (Requires API Keys)</Text>
                </TouchableOpacity>

                <Text className="mt-4 text-center text-xs text-muted">
                    You must provide your own API keys or use SATYA KEY to continue
                </Text>
            </View>
            )}
        </ScrollView>
    );
}
