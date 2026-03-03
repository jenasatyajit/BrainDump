import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/store/toastStore';

const ICON_MAP = {
    info: 'information-circle-outline' as const,
    warning: 'warning-outline' as const,
    error: 'close-circle-outline' as const,
    success: 'checkmark-circle-outline' as const,
};

const COLOR_MAP = {
    info: '#7fff9e',
    warning: '#ff9d4d',
    error: '#ff4d4d',
    success: '#7fff9e',
};

export default function Toast() {
    const { toast, hideToast } = useToastStore();
    const slideAnim = useRef(new Animated.Value(-120)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (toast) {
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
        } else {
            // Animate out
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
            ]).start();
        }
    }, [toast, slideAnim, opacityAnim]);

    if (!toast) return null;

    const color = COLOR_MAP[toast.type];
    const icon = toast.icon || ICON_MAP[toast.type];

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
                onPress={hideToast}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: '#111118',
                    borderRadius: 18,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderWidth: 1,
                    borderColor: `${color}40`,
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 16,
                    elevation: 12,
                }}
            >
                {/* Icon */}
                <View
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: `${color}1A`,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Ionicons name={icon as any} size={20} color={color} />
                </View>

                {/* Text */}
                <View style={{ flex: 1 }}>
                    <Text
                        style={{
                            fontSize: 13,
                            fontWeight: '700',
                            color: color,
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
                        {toast.message}
                    </Text>
                </View>

                {/* Dismiss button */}
                <TouchableOpacity onPress={hideToast} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={16} color="#5a5a70" />
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
}
