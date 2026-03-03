import '../global.css';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';

import * as SplashScreen from 'expo-splash-screen';

import { initDatabase } from '@/services/database';
import { useChatStore } from '@/store/chatStore';
import NotificationToast from '@/components/NotificationToast';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

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
        // Hide the splash screen once we're ready
        await SplashScreen.hideAsync().catch((e) => console.warn('[RootLayout] Error hiding splash screen:', e));
      }
    }
    bootstrap();
  }, [loadMessages]);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0a0f' } }}>
          <Stack.Screen name="(drawer)" />
          <Stack.Screen name="modal" options={{ title: 'Modal', presentation: 'modal' }} />
        </Stack>
        <NotificationToast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
