import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, Text, Keyboard, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { transcribeAudio } from '@/services/sarvamSTTService';

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
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(recorder, 100); // Poll every 100ms

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

    const checkPermissions = async (): Promise<boolean> => {
        const { status } = await getRecordingPermissionsAsync();
        if (status !== 'granted') {
            const { granted } = await requestRecordingPermissionsAsync();
            if (!granted) {
                Alert.alert(
                    'Permission Required',
                    'Please enable microphone permissions in your device settings to use voice input.',
                    [{ text: 'OK' }]
                );
                return false;
            }
        }
        return true;
    };

    const startRecording = async () => {
        try {
            const hasPermission = await checkPermissions();
            if (!hasPermission) return;

            await recorder.prepareToRecordAsync();
            recorder.record();
            setIsRecording(true);
        } catch (error) {
            console.error('Failed to start recording:', error);
            Alert.alert('Error', 'Failed to start recording. Please try again.');
        }
    };

    const stopRecording = async () => {
        try {
            setIsRecording(false);
            await recorder.stop();
            const uri = recorder.uri;
            
            if (!uri) {
                Alert.alert('Error', 'No audio recorded');
                return;
            }

            // Get duration in milliseconds and convert to seconds
            const durationMs = recorderState.durationMillis;
            const durationSeconds = durationMs / 1000;
            
            console.log('Recording duration:', durationSeconds, 'seconds');
            
            // Check if duration is valid (30 seconds max for REST API)
            if (durationSeconds <= 0 || durationSeconds > 30) {
                Alert.alert(
                    'Recording Too Long',
                    `Please keep your voice message under 30 seconds. Your recording was ${durationSeconds.toFixed(1)} seconds.`,
                    [{ text: 'OK' }]
                );
                return;
            }

            setIsTranscribing(true);
            const transcript = await transcribeAudio(uri, 'transcribe');
            
            if (transcript.trim()) {
                setText(text + (text ? ' ' : '') + transcript);
                inputRef.current?.focus();
            } else {
                Alert.alert('No Speech Detected', 'Please try speaking again.');
            }
        } catch (error) {
            console.error('Failed to transcribe audio:', error);
            Alert.alert('Error', 'Failed to transcribe audio. Please try again.');
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleMicPress = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
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
                        <Text className="text-[12px] text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>{chip.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Input row */}
            <View className="flex-row items-end gap-2">
                <View className="flex-1 flex-row items-end rounded-[20px] border border-border bg-surface2 pl-3.5 pr-1 py-1">
                    <TextInput
                        ref={inputRef}
                        className="flex-1 py-1.5 text-[15px] text-text"
                        placeholder="Brain dump anything..."
                        placeholderTextColor="#5a5a70"
                        value={text}
                        onChangeText={setText}
                        multiline
                        maxLength={500}
                        style={{ maxHeight: 80, fontFamily: 'DMSans_400Regular' }}
                        onSubmitEditing={handleSend}
                    />
                    <TouchableOpacity 
                        className="h-[34px] w-[34px] items-center justify-center rounded-[14px]" 
                        activeOpacity={0.7}
                        onPress={handleMicPress}
                        disabled={isTranscribing}
                        style={{ backgroundColor: isRecording ? '#ef4444' : 'transparent' }}
                    >
                        {isTranscribing ? (
                            <ActivityIndicator size="small" color="#5a5a70" />
                        ) : (
                            <Ionicons 
                                name={isRecording ? "stop" : "mic-outline"} 
                                size={16} 
                                color={isRecording ? "#fff" : "#5a5a70"} 
                            />
                        )}
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
