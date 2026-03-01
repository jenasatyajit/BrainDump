import React, { useState, useCallback } from 'react';
import { View, FlatList, Text, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNoteStore, type NoteEntry } from '@/store/noteStore';
import { useChatStore } from '@/store/chatStore';
import NotesHeader from '@/components/notes/NotesHeader';
import NoteCard from '@/components/notes/NoteCard';
import NoteEditModal from '@/components/notes/NoteEditModal';
import { ParsedEntry } from '@/services/aiService';

export default function NotesScreen() {
  const { getNotes, getStats } = useNoteStore();
  const { loadMessages, editTask, deleteTask } = useChatStore();
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [editNoteItem, setEditNoteItem] = useState<NoteEntry | null>(null);

  const notes = getNotes();
  const stats = getStats();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  }, [loadMessages]);

  const handleEdit = (note: NoteEntry) => {
    setEditNoteItem(note);
  };

  const handleSaveEdit = (messageId: string, entryIndex: number, updates: Partial<ParsedEntry>) => {
    editTask(messageId, entryIndex, updates);
    setEditNoteItem(null);
  };

  const handleDelete = (note: NoteEntry) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTask(note.messageId, note.entryIndex),
        },
      ],
      { cancelable: true }
    );
  };

  if (notes.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-bg">
        <NotesHeader total={0} ideas={0} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted">No notes yet</Text>
          <Text className="mt-1 text-center text-xs text-muted">
            Dump an idea or thought in the Inbox to get started.
          </Text>
        </View>
      </SafeAreaView>
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
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <NotesHeader total={stats.total} ideas={stats.ideas} />
      <FlatList
        data={[firstNote]}
        keyExtractor={(item) => item.messageId + '-' + item.entryIndex}
        renderItem={({ item }) => (
          <View className="mb-2 px-4">
            <NoteCard
              note={item}
              isFullWidth
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#7fff9e"
            colors={['#7fff9e']}
            progressBackgroundColor="#18181f"
          />
        }
        ListFooterComponent={
          <View className="px-4">
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} className="mb-2 flex-row gap-2">
                {row.map((note) => (
                  <View key={note.messageId + '-' + note.entryIndex} className="flex-1">
                    <NoteCard
                      note={note}
                      onEdit={() => handleEdit(note)}
                      onDelete={() => handleDelete(note)}
                    />
                  </View>
                ))}
                {row.length === 1 && <View className="flex-1" />}
              </View>
            ))}
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <NoteEditModal
        visible={!!editNoteItem}
        note={editNoteItem}
        onClose={() => setEditNoteItem(null)}
        onSave={handleSaveEdit}
      />
    </SafeAreaView>
  );
}
