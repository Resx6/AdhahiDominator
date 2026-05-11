// Web stub — expo-background-fetch and expo-task-manager are not supported on web.
// Background polling on web is handled by the in-process setInterval engine.

export const BACKGROUND_FETCH_TASK = 'adhahi-background-poll';

export async function registerBackgroundTask(): Promise<void> {
  // No-op on web
}

export async function unregisterBackgroundTask(): Promise<void> {
  // No-op on web
}
