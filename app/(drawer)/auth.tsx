import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/utils/supabase';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
    const insets = useSafeAreaInsets();
    const [mode, setMode] = useState<Mode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        setError(null);
        if (!email.trim() || !password.trim()) {
            setError('Please enter your email and password.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            if (mode === 'signup') {
                const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
                if (err) throw err;
                Alert.alert(
                    'Check your inbox',
                    'We sent a confirmation email. Verify it then sign in.',
                    [{ text: 'OK', onPress: () => setMode('signin') }]
                );
            } else {
                const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
                if (err) throw err;
                router.back();
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [mode, email, password]);

    const inputStyle = {
        color: '#e2e2f0',
        fontSize: 14,
        flex: 1,
    } as const;

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-bg"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View
                    className="flex-1 bg-bg px-6"
                    style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
                >
                    {/* Back button */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mb-8 h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface2"
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={18} color="#e2e2f0" />
                    </TouchableOpacity>

                    {/* Header */}
                    <View className="mb-10">
                        <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                            <Text style={{ fontSize: 26 }}>✦</Text>
                        </View>
                        <Text className="text-2xl font-bold text-text">
                            {mode === 'signin' ? 'Welcome back' : 'Create account'}
                        </Text>
                        <Text className="mt-1.5 text-sm text-muted">
                            {mode === 'signin'
                                ? 'Sign in to sync your brain dump across devices.'
                                : 'Sign up to back up your data to the cloud.'}
                        </Text>
                    </View>

                    {/* Error banner */}
                    {error && (
                        <View className="mb-5 flex-row items-start gap-2.5 rounded-xl border border-[#ff4d4d]/20 bg-[#ff4d4d]/[0.06] px-4 py-3">
                            <Ionicons name="alert-circle-outline" size={16} color="#ff4d4d" style={{ marginTop: 1 }} />
                            <Text className="flex-1 text-xs leading-5 text-[#ff4d4d]">{error}</Text>
                        </View>
                    )}

                    {/* Fields */}
                    <View className="gap-3">
                        {/* Email */}
                        <View>
                            <Text className="mb-1.5 text-xs text-muted">Email</Text>
                            <View className="flex-row items-center rounded-xl border border-border bg-surface2 px-4 py-3">
                                <Ionicons name="mail-outline" size={16} color="#5a5a70" style={{ marginRight: 10 }} />
                                <TextInput
                                    style={inputStyle}
                                    placeholder="you@example.com"
                                    placeholderTextColor="#5a5a70"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        {/* Password */}
                        <View>
                            <Text className="mb-1.5 text-xs text-muted">Password</Text>
                            <View className="flex-row items-center rounded-xl border border-border bg-surface2 px-4 py-3">
                                <Ionicons name="lock-closed-outline" size={16} color="#5a5a70" style={{ marginRight: 10 }} />
                                <TextInput
                                    style={inputStyle}
                                    placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                                    placeholderTextColor="#5a5a70"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    onSubmitEditing={handleSubmit}
                                />
                                <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                                    <Ionicons
                                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                        size={16}
                                        color="#5a5a70"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* CTA */}
                    <TouchableOpacity
                        className="mt-6 items-center rounded-xl bg-accent py-3.5"
                        activeOpacity={0.8}
                        onPress={handleSubmit}
                        disabled={loading}
                        style={{ opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#0a0a0f" />
                        ) : (
                            <Text className="text-sm font-semibold text-bg">
                                {mode === 'signin' ? 'Sign In' : 'Create Account'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Switch mode */}
                    <View className="mt-6 flex-row items-center justify-center gap-1.5">
                        <Text className="text-xs text-muted">
                            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                setMode(mode === 'signin' ? 'signup' : 'signin');
                                setError(null);
                            }}
                            hitSlop={8}
                        >
                            <Text className="text-xs font-medium text-accent">
                                {mode === 'signin' ? 'Sign up' : 'Sign in'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
