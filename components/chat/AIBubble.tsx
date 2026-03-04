import React, { useCallback } from 'react';
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

// ── TaskCardWrapper ──
// Wraps ParsedCard for task entries and creates a stable `onToggleComplete`
// callback via useCallback. Previously AIBubble passed an inline arrow function
// from inside entries.map() — a new reference every render — which defeated
// React.memo on ParsedCard entirely for all task cards.
interface TaskCardWrapperProps {
    entry: ParsedEntry;
    messageId: string;
    entryIndex: number;
    onToggleTask: (messageId: string, entryIndex: number) => void;
}

const TaskCardWrapper = React.memo(function TaskCardWrapper({
    entry,
    messageId,
    entryIndex,
    onToggleTask,
}: TaskCardWrapperProps) {
    const onToggleComplete = useCallback(() => {
        onToggleTask(messageId, entryIndex);
    }, [onToggleTask, messageId, entryIndex]);

    return <ParsedCard entry={entry} onToggleComplete={onToggleComplete} />;
});

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
                        <Text className="text-[11px] tracking-wider text-accent" style={{ fontFamily: 'SpaceMono_700Bold' }}>DAILY DIGEST</Text>
                    </View>
                )}
                <Text className="text-[15px] leading-[23px] text-text" style={{ fontFamily: 'DMSans_400Regular' }}>{content}</Text>
            </View>
            {entries?.map((entry, index) =>
                entry.type === 'task' && onToggleTask ? (
                    // TaskCardWrapper holds a stable useCallback — React.memo works
                    <TaskCardWrapper
                        key={`${messageId}-${index}`}
                        entry={entry}
                        messageId={messageId}
                        entryIndex={index}
                        onToggleTask={onToggleTask}
                    />
                ) : (
                    // Non-task cards (note, reminder, library) need no toggle callback
                    <ParsedCard
                        key={`${messageId}-${index}`}
                        entry={entry}
                    />
                )
            )}
        </View>
    );
}

export default React.memo(AIBubble);
