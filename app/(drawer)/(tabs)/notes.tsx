import React from 'react';
import { View, FlatList, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNoteStore, type NoteEntry } from '@/store/noteStore';
import NotesHeader from '@/components/notes/NotesHeader';
import NoteCard from '@/components/notes/NoteCard';

export default function NotesScreen() {
    const insets = useSafeAreaInsets();
    const { getNotes, getStats } = useNoteStore();

    const notes = getNotes();
    const stats = getStats();

    if (notes.length === 0) {
        return (
            <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
                <NotesHeader total={0} ideas={0} />
                <View className="flex-1 items-center justify-center px-6">
                    <Text className="text-base text-muted">No notes yet</Text>
                    <Text className="mt-1 text-center text-xs text-muted">
                        Dump an idea or thought in the Inbox to get started.
                    </Text>
                </View>
            </View>
        );
    }

    // First note full-width, rest in 2-column grid
    const firstNote = notes[0];
    const gridNotes = notes.slice(1);
    const rows: NoteEntry[][] = [];
    for (let i = 0; i < gridNotes.length; i += 2) {
        rows.push(gridNotes.slice(i, i + 2));
    }

    return (
        <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
            <NotesHeader total={stats.total} ideas={stats.ideas} />
            <FlatList
                data={[firstNote]}
                keyExtractor={(item) => item.messageId + '-' + item.entryIndex}
                renderItem={({ item }) => (
                    <View className="mb-2 px-4">
                        <NoteCard note={item} isFullWidth />
                    </View>
                )}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                    <View className="px-4">
                        {rows.map((row, rowIndex) => (
                            <View key={rowIndex} className="mb-2 flex-row gap-2">
                                {row.map((note) => (
                                    <View key={note.messageId + '-' + note.entryIndex} className="flex-1">
                                        <NoteCard note={note} />
                                    </View>
                                ))}
                                {row.length === 1 && <View className="flex-1" />}
                            </View>
                        ))}
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 20 }}
            />
        </View>
    );
}
