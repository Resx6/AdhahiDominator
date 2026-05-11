import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { useStore } from '../store/useStore';
import { fetchWilayaQuotas, isWilayaAvailable } from './api';
import { startEngine, isEngineRunning } from './automationEngine';

export const BACKGROUND_FETCH_TASK = 'adhahi-background-poll';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const sessions = useStore.getState().getAllSessions();
    for (const session of sessions) {
      if (session.runtime.status === 'polling' && !isEngineRunning(session.config.id)) {
        startEngine(session.config.id);
      }
      if (session.runtime.status === 'polling') {
        try {
          const quotas = await fetchWilayaQuotas(session.config.id);
          const wilayaId = session.config.wilayaId;
          if (wilayaId && isWilayaAvailable(quotas, wilayaId)) {
            useStore.getState().updateRuntime(session.config.id, {
              availableQuota: true,
              statusMessage: 'Quota available! (background)',
            });
          }
        } catch {
          // silently ignore per session
        }
      }
    }
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundTask(): Promise<void> {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      return;
    }
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 15,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch {
    // Background tasks may not be available in all environments
  }
}

export async function unregisterBackgroundTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    }
  } catch {
    // ignore
  }
}
