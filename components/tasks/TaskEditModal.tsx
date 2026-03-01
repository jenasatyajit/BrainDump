import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { TaskEntry } from '@/store/taskStore';

interface TaskEditModalProps {
  visible: boolean;
  task: TaskEntry | null;
  onClose: () => void;
  onSave: (messageId: string, entryIndex: number, updates: Partial<TaskEntry>) => void;
}

export default function TaskEditModal({ visible, task, onClose, onSave }: TaskEditModalProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('low');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [time, setTime] = useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setPriority(task.priority || 'low');

      const rawDue = task.type === 'reminder' ? task.remindAt : task.dueDate;
      if (rawDue) {
        const parsedDate = new Date(rawDue);
        setDueDate(parsedDate);
        if (rawDue.includes('T')) {
          setTime(parsedDate);
        } else {
          setTime(null);
        }
      } else {
        setDueDate(null);
        setTime(null);
      }
    }
  }, [task]);

  const handleSave = () => {
    if (!task) return;

    let finalDueDate = undefined;
    let finalRemindAt = undefined;

    if (dueDate) {
      const dateStr = dueDate.toISOString().split('T')[0];
      if (time) {
        const timeStr = time.toISOString().split('T')[1];
        finalRemindAt = `${dateStr}T${timeStr}`;
        finalDueDate = dateStr;
      } else {
        finalDueDate = dateStr;
        finalRemindAt = undefined;
      }
    }

    const updates: Partial<TaskEntry> = {
      title,
      priority,
    };

    if (task.type === 'reminder') {
      updates.remindAt = finalRemindAt || finalDueDate || undefined;
    } else {
      updates.dueDate = finalDueDate;
      updates.remindAt = finalRemindAt;
    }

    onSave(task.messageId, task.entryIndex, updates);
    onClose();
  };

  if (!task) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="rounded-t-3xl border border-border bg-surface p-6 pb-10 shadow-lg">
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-text">Edit Task</Text>
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
              placeholder="Task title"
              placeholderTextColor="#5a5a70"
            />

            <Text className="mb-2 text-sm font-medium text-muted">Priority</Text>
            <View className="mb-4 flex-row gap-2">
              {['low', 'medium', 'high'].map((p) => {
                const isSelected = priority === p;
                const colors: Record<string, string> = {
                  high: '#ff7eb3',
                  medium: '#7eb8ff',
                  low: '#7fff9e',
                };
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPriority(p as any)}
                    className={`flex-1 items-center rounded-xl border py-3 ${isSelected ? 'border-transparent' : 'border-border'}`}
                    style={{
                      backgroundColor: isSelected ? colors[p] + '20' : '#18181f',
                      borderColor: isSelected ? colors[p] : '#2d2d3d',
                    }}>
                    <Text
                      style={{ color: isSelected ? colors[p] : '#a1a1b5' }}
                      className="text-sm font-medium capitalize">
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="mb-2 text-sm font-medium text-muted">Date & Time</Text>
            <View className="mb-4 flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface2 p-4">
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={dueDate ? '#7fff9e' : '#a1a1b5'}
                />
                <Text className={dueDate ? 'text-text' : 'text-muted'}>
                  {dueDate ? dueDate.toLocaleDateString() : 'Set Date'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface2 p-4">
                <Ionicons name="time-outline" size={18} color={time ? '#7eb8ff' : '#a1a1b5'} />
                <Text className={time ? 'text-text' : 'text-muted'}>
                  {time
                    ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Set Time'}
                </Text>
              </TouchableOpacity>
            </View>
            {(dueDate || time) && (
              <TouchableOpacity
                onPress={() => {
                  setDueDate(null);
                  setTime(null);
                }}
                className="mb-4 items-end pr-1">
                <Text className="text-sm text-red-400">Clear Date & Time</Text>
              </TouchableOpacity>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setDueDate(date);
                }}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={time || new Date()}
                mode="time"
                display="default"
                onChange={(event, date) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (date) {
                    setTime(date);
                    if (!dueDate) setDueDate(date); // automatically set date to today if time is picked without date
                  }
                }}
              />
            )}
          </ScrollView>

          <TouchableOpacity
            onPress={handleSave}
            className="bg-primary/20 items-center rounded-xl border border-[#7fff9e] bg-[#7fff9e20] p-4">
            <Text className="text-base font-semibold text-[#7fff9e]">Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
