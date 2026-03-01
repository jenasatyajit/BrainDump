import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NoteEntry } from '@/store/noteStore';

interface NoteEditModalProps {
  visible: boolean;
  note: NoteEntry | null;
  onClose: () => void;
  onSave: (messageId: string, entryIndex: number, updates: Partial<NoteEntry>) => void;
}

const CATEGORIES = ['Idea', 'Meeting', 'Reading', 'Goal', 'Project', 'Research', 'General'];

export default function NoteEditModal({ visible, note, onClose, onSave }: NoteEditModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('General');

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBody(note.body || '');
      setCategory(note.category || 'General');
    }
  }, [note]);

  const handleSave = () => {
    if (!note) return;
    onSave(note.messageId, note.entryIndex, { title, body, category });
    onClose();
  };

  if (!note) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="mt-20 rounded-t-3xl border border-border bg-surface p-6 pb-10 shadow-lg">
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-text">Edit Note</Text>
            <TouchableOpacity onPress={onClose} className="rounded-full bg-surface2 p-2">
              <Ionicons name="close" size={20} color="#a1a1b5" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
            <Text className="mb-2 text-sm font-medium text-muted">Title</Text>
            <TextInput
              className="mb-4 rounded-xl border border-border bg-surface2 p-4 text-base text-text"
              value={title}
              onChangeText={setTitle}
              placeholder="Note title"
              placeholderTextColor="#5a5a70"
            />

            <Text className="mb-2 text-sm font-medium text-muted">Category</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    className={`rounded-xl border px-4 py-2 ${isSelected ? 'border-[#7eb8ff]' : 'border-border'}`}
                    style={{ backgroundColor: isSelected ? '#7eb8ff20' : '#18181f' }}>
                    <Text
                      style={{ color: isSelected ? '#7eb8ff' : '#a1a1b5' }}
                      className="text-sm font-medium">
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="mb-2 text-sm font-medium text-muted">Content</Text>
            <TextInput
              className="mb-4 rounded-xl border border-border bg-surface2 p-4 text-base text-text"
              value={body}
              onChangeText={setBody}
              placeholder="Note content..."
              placeholderTextColor="#5a5a70"
              multiline
              textAlignVertical="top"
              style={{ minHeight: 120 }}
            />
          </ScrollView>

          <TouchableOpacity
            onPress={handleSave}
            className="items-center rounded-xl border border-[#7fff9e] bg-[#7fff9e20] p-4">
            <Text className="text-base font-semibold text-[#7fff9e]">Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
