import { AlertProvider } from '@/template';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { registerBackgroundTask } from '../services/backgroundTask';
import { requestNotificationPermission } from '../services/notifications';

export default function RootLayout() {
  useEffect(() => {
    // Register background polling task
    registerBackgroundTask();
    // Request notification permissions
    requestNotificationPermission();
  }, []);

  return (
    <AlertProvider>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#060F0A" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#060F0A' },
            animation: 'fade_from_bottom',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="session/[id]"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="otp/[id]"
            options={{
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
