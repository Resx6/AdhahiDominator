import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function fireOTPAlarm(sessionName: string, phone: string) {
  await requestNotificationPermission();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔴 OTP REQUIRED — ADHAHI DOMINATOR',
      body: `Session "${sessionName}" registered! Check your SMS on ${phone}. Open NOW to verify.`,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      color: '#0F6A3B',
    },
    trigger: null, // fire immediately
  });
}

export async function fireSuccessNotification(sessionName: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ REGISTRATION COMPLETE!',
      body: `Session "${sessionName}" — OTP verified. You are registered on Adhahi.dz!`,
      sound: true,
      color: '#22C55E',
    },
    trigger: null,
  });
}
