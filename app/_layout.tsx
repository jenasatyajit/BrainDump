import '../global.css';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';

import { initDatabase } from '@/services/database';
import { useChatStore } from '@/store/chatStore';

export const unstable_settings = {
  initialRouteName: '(drawer)',
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const loadMessages = useChatStore((s) => s.loadMessages);

  useEffect(() => {
    async function bootstrap() {
      try {
        await initDatabase();
        await loadMessages();
      } catch (error) {
        console.warn('[RootLayout] Bootstrap error:', error);
      } finally {
        setIsReady(true);
      }
    }
    bootstrap();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#7fff9e" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0a0f' } }}>
          <Stack.Screen name="(drawer)" />
          <Stack.Screen name="modal" options={{ title: 'Modal', presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
