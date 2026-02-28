import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';

export default function ThinkingIndicator() {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const createAnimation = (dot: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, {
                        toValue: 1,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0,
                        duration: 300,
                        easing: Easing.in(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.delay(600 - delay),
                ])
            );

        createAnimation(dot1, 0).start();
        createAnimation(dot2, 200).start();
        createAnimation(dot3, 400).start();
    }, []);

    const renderDot = (anim: Animated.Value) => (
        <Animated.View
            className="h-1.5 w-1.5 rounded-full bg-accent"
            style={{
                opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
                transform: [
                    { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
                ],
            }}
        />
    );

    return (
        <View className="max-w-[88%] self-start">
            <View className="flex-row items-center gap-1 rounded-[20px] rounded-bl-[4px] border border-border bg-surface2 px-3.5 py-2.5">
                {renderDot(dot1)}
                {renderDot(dot2)}
                {renderDot(dot3)}
            </View>
        </View>
    );
}
