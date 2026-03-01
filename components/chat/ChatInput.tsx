import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, Text, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
    onSend: (text: string) => void;
    isProcessing: boolean;
}

const HINT_CHIPS = [
    { label: 'remind me', fillText: 'Remind me to ' },
    { label: 'add task', fillText: 'Task: ' },
    { label: 'note', fillText: 'Note: ' },
    { label: 'idea', fillText: 'Idea — ' },
    { label: 'follow up', fillText: 'Follow up with ' },
];

export default function ChatInput({ onSend, isProcessing }: ChatInputProps) {
    const [text, setText] = useState('');
    const inputRef = useRef<TextInput>(null);

    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed || isProcessing) return;
        onSend(trimmed);
        setText('');
        Keyboard.dismiss();
    };

    const handleChip = (fillText: string) => {
        setText(fillText);
        inputRef.current?.focus();
    };

    return (
        <View className="border-t border-border bg-surface px-4 pb-4 pt-3">
            {/* Hint chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-2"
                contentContainerStyle={{ gap: 6 }}
            >
                {HINT_CHIPS.map((chip) => (
                    <TouchableOpacity
                        key={chip.label}
                        className="rounded-full border border-border px-2.5 py-1.5"
                        activeOpacity={0.7}
                        onPress={() => handleChip(chip.fillText)}
                    >
                        <Text className="text-[11px] text-muted">{chip.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Input row */}
            <View className="flex-row items-end gap-2">
                <View className="flex-1 flex-row items-end rounded-[20px] border border-border bg-surface2 pl-3.5 pr-1 py-1">
                    <TextInput
                        ref={inputRef}
                        className="flex-1 py-1.5 text-sm text-text"
                        placeholder="Brain dump anything..."
                        placeholderTextColor="#5a5a70"
                        value={text}
                        onChangeText={setText}
                        multiline
                        maxLength={500}
                        style={{ maxHeight: 80 }}
                        onSubmitEditing={handleSend}
                        blurOnSubmit={true}
                    />
                    <TouchableOpacity className="h-[34px] w-[34px] items-center justify-center rounded-[14px]" activeOpacity={0.7}>
                        <Ionicons name="mic-outline" size={16} color="#5a5a70" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    className="h-[42px] w-[42px] items-center justify-center rounded-2xl bg-accent"
                    activeOpacity={0.7}
                    onPress={handleSend}
                    disabled={isProcessing}
                    style={{ opacity: isProcessing ? 0.5 : 1 }}
                >
                    <Ionicons name="arrow-up" size={18} color="#0a0a0f" />
                </TouchableOpacity>
            </View>
        </View>
    );
}
