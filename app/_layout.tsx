import '../global.css';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';

import * as SplashScreen from 'expo-splash-screen';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';

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

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

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

  if (!isReady || !fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0a0f' } }}>
          <Stack.Screen name="(drawer)" />
          <Stack.Screen name="modal" options={{ title: 'Modal', presentation: 'modal' }} />
          <Stack.Screen 
            name="onboarding" 
            options={{ 
              title: 'Setup', 
              presentation: 'card',
              headerShown: true,
              headerStyle: { backgroundColor: '#0a0a0f' },
              headerTintColor: '#e8e8f0',
            }} 
          />
        </Stack>
        <NotificationToast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
