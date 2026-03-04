import React, { useRef, useCallback, useState } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatStore, type ChatMessage } from '@/store/chatStore';
import { generateDigest } from '@/services/aiService';

import ChatHeader from '@/components/chat/ChatHeader';
import DigestBanner from '@/components/chat/DigestBanner';
import DateDivider from '@/components/chat/DateDivider';
import AIGreeting from '@/components/chat/AIGreeting';
import UserBubble from '@/components/chat/UserBubble';
import AIBubble from '@/components/chat/AIBubble';
import ThinkingIndicator from '@/components/chat/ThinkingIndicator';
import ChatInput from '@/components/chat/ChatInput';

export default function InboxScreen() {
  const flatListRef = useRef<FlatList>(null);
  const { messages, isProcessing, addUserMessage, toggleTaskComplete, addDigestMessage, loadMessages } =
    useChatStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  }, [loadMessages]);

  const handleSend = useCallback(
    async (text: string) => {
      await addUserMessage(text);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [addUserMessage]
  );

  const handleDigest = useCallback(async () => {
    // Read messages directly from the store at call-time instead of closing over
    // the `messages` variable. This removes `messages` from the dependency array,
    // so handleDigest gets a stable reference across renders.
    // Previously, every new message caused a new handleDigest reference which
    // drove an InboxScreen re-render and cascaded into unnecessary FlatList work.
    const { messages: currentMessages } = useChatStore.getState();

    const tasks = currentMessages
      .filter((m) => m.entries?.some((e) => e.type === 'task'))
      .flatMap((m) => m.entries?.filter((e) => e.type === 'task').map((e) => e.title) || []);

    const completed = currentMessages
      .filter((m) => m.entries?.some((e) => e.type === 'task' && e.isCompleted))
      .flatMap(
        (m) => m.entries?.filter((e) => e.type === 'task' && e.isCompleted).map((e) => e.title) || []
      );

    const reminders = currentMessages
      .filter((m) => m.entries?.some((e) => e.type === 'reminder'))
      .flatMap((m) => m.entries?.filter((e) => e.type === 'reminder').map((e) => e.title) || []);

    const digest = await generateDigest({
      tasksAdded: tasks,
      tasksCompleted: completed,
      remindersTomorrow: reminders,
    });

    addDigestMessage(digest);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [addDigestMessage]);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      // First message is the AI greeting
      if (item.role === 'ai' && !item.entries && !item.isDigest && !item.isThinking) {
        return <AIGreeting />;
      }

      if (item.isThinking) {
        return <ThinkingIndicator />;
      }

      if (item.role === 'user') {
        return <UserBubble content={item.content} />;
      }

      if (item.role === 'ai') {
        return (
          <AIBubble
            content={item.content}
            entries={item.entries}
            isDigest={item.isDigest}
            messageId={item.id}
            onToggleTask={toggleTaskComplete}
          />
        );
      }

      return null;
    },
    [toggleTaskComplete]
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <SafeAreaView edges={['top']} className="flex-1">
        <ChatHeader />
        <DigestBanner onPress={handleDigest} itemCount={messages.reduce((sum, m) => sum + (m.entries?.length || 0), 0)} />

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 10 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<DateDivider label="Today" />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#7fff9e" colors={['#7fff9e']} progressBackgroundColor="#18181f" />
          }
        />

        <ChatInput onSend={handleSend} isProcessing={isProcessing} />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
