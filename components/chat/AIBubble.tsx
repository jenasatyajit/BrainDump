import React from 'react';
import { View, Text } from 'react-native';
import ParsedCard from './ParsedCard';
import type { ParsedEntry } from '@/services/aiService';

interface AIBubbleProps {
    content: string;
    entries?: ParsedEntry[];
    isDigest?: boolean;
    messageId: string;
    onToggleTask?: (messageId: string, entryIndex: number) => void;
}

function AIBubble({
    content,
    entries,
    isDigest,
    messageId,
    onToggleTask,
}: AIBubbleProps) {
    return (
        <View className="max-w-[88%] self-start">
            <View
                className={`rounded-[20px] rounded-bl-[4px] border px-3.5 py-2.5 ${isDigest ? 'border-accent/20' : 'border-border'
                    }`}
                style={{
                    backgroundColor: isDigest ? 'rgba(127,255,158,0.06)' : '#18181f',
                }}
            >
                {isDigest && (
                    <View className="mb-1.5 flex-row items-center gap-1.5">
                        <Text className="text-sm">✦</Text>
                        <Text className="text-[10px] tracking-wider text-accent">DAILY DIGEST</Text>
                    </View>
                )}
                <Text className="text-sm leading-[21px] text-text">{content}</Text>
            </View>
            {entries?.map((entry, index) => (
                <ParsedCard
                    key={`${messageId}-${index}`}
                    entry={entry}
                    onToggleComplete={
                        entry.type === 'task' && onToggleTask
                            ? () => onToggleTask(messageId, index)
                            : undefined
                    }
                />
            ))}
        </View>
    );
}

export default React.memo(AIBubble);
