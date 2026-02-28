import React from 'react';
import { View, Text } from 'react-native';

export default function AIGreeting() {
    return (
        <View
            className="rounded-[20px] rounded-bl-[4px] border border-accent/15 p-3.5 px-4"
            style={{
                backgroundColor: 'rgba(127,255,158,0.04)',
            }}
        >
            <View className="mb-2 flex-row items-center gap-1.5 self-start rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5">
                <View className="h-1.5 w-1.5 rounded-full bg-accent" />
                <Text className="text-[10px] tracking-wider text-accent">AI ENGINE</Text>
            </View>
            <Text className="text-sm leading-6 text-text">
                Morning. What's on your mind? Dump anything — I'll sort it out.
            </Text>
        </View>
    );
}
