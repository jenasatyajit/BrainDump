import '../global.css';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';

import * as SplashScreen from 'expo-splash-screen';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';

import { initDatabase, getLLMConfig } from '@/services/database';
import { useChatStore } from '@/store/chatStore';
import NotificationToast from '@/components/NotificationToast';
import Toast from '@/components/Toast';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: '(drawer)',
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const router = useRouter();
  const segments = useSegments();

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
        
        // Check if user needs onboarding
        const config = await getLLMConfig();
        const needsOnboarding = !config || 
          (!config.gemini_api_key && !config.openrouter_api_key && !config.sarvam_api_key);
        
        if (needsOnboarding) {
          console.log('[RootLayout] No API keys configured, redirecting to onboarding');
          // Only redirect if not already on onboarding screen
          const currentPath = segments.join('/');
          if (!currentPath.includes('onboarding')) {
            router.replace('/onboarding');
          }
        } else {
          await loadMessages();
        }
      } catch (error) {
        console.warn('[RootLayout] Bootstrap error:', error);
      } finally {
        setIsReady(true);
        // Hide the splash screen once we're ready
        await SplashScreen.hideAsync().catch((e) => console.warn('[RootLayout] Error hiding splash screen:', e));
      }
    }
    bootstrap();
  }, [loadMessages, router, segments]);

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
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
