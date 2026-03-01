/**
 * NotificationToast — in-app notification banner
 *
 * Shows a styled toast when a notification fires while the app is open.
 * The OS notification is suppressed; this component renders instead.
 *
 * Usage: Mount <NotificationToast /> once in your root layout.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ToastData {
    title: string;
    body: string;
    id: string;
}

export default function NotificationToast() {
    const [toast, setToast] = useState<ToastData | null>(null);
    const slideAnim = useRef(new Animated.Value(-120)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        let Notifications: typeof import('expo-notifications') | null = null;
        let subscription: { remove: () => void } | null = null;

        (async () => {
            Notifications = await import('expo-notifications');

            // Listen for notifications received while app is foregrounded
            subscription = Notifications.addNotificationReceivedListener((notification) => {
                const { title, body } = notification.request.content;
                showToast({
                    title: title ?? '⏰ Brain Dump',
                    body: body ?? '',
                    id: notification.request.identifier,
                });
            });
        })();

        return () => {
            subscription?.remove();
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    function showToast(data: ToastData) {
        setToast(data);

        // Clear any pending dismiss timer
        if (timerRef.current) clearTimeout(timerRef.current);

        // Animate in
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 80,
                friction: 10,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto-dismiss after 4s
        timerRef.current = setTimeout(() => dismissToast(), 4000);
    }

    function dismissToast() {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -120,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => setToast(null));
    }

    if (!toast) return null;

    return (
        <Animated.View
            style={{
                position: 'absolute',
                top: insets.top + 8,
                left: 16,
                right: 16,
                zIndex: 9999,
                transform: [{ translateY: slideAnim }],
                opacity: opacityAnim,
            }}
        >
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={dismissToast}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: '#111118',
                    borderRadius: 18,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(127,255,158,0.25)',
                    // Shadow for iOS
                    shadowColor: '#7fff9e',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 16,
                    // Elevation for Android
                    elevation: 12,
                }}
            >
                {/* Icon */}
                <View
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: 'rgba(127,255,158,0.1)',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Ionicons name="alarm-outline" size={20} color="#7fff9e" />
                </View>

                {/* Text */}
                <View style={{ flex: 1 }}>
                    <Text
                        style={{
                            fontSize: 13,
                            fontWeight: '700',
                            color: '#7fff9e',
                            marginBottom: 2,
                            letterSpacing: 0.2,
                        }}
                        numberOfLines={1}
                    >
                        {toast.title}
                    </Text>
                    <Text
                        style={{
                            fontSize: 12,
                            color: '#e8e8f0',
                            lineHeight: 17,
                        }}
                        numberOfLines={2}
                    >
                        {toast.body}
                    </Text>
                </View>

                {/* Dismiss button */}
                <TouchableOpacity onPress={dismissToast} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={16} color="#5a5a70" />
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
}
