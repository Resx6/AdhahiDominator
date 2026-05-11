import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SessionStatus =
  | 'idle'
  | 'polling'
  | 'captcha_solving'
  | 'submitting'
  | 'otp_required'
  | 'otp_verifying'
  | 'success'
  | 'error';

export type PaymentMethod = 'cash' | 'pos' | 'online';

export interface SessionConfig {
  id: string;
  name: string;
  nin: string;          // 18 digits
  cnibe: string;        // 9 digits
  phone: string;
  email: string;
  password: string;
  wilayaId: number | null;
  wilayaName: string;
  communeId: number | null;
  communeName: string;
  paymentMethod: PaymentMethod;
  acceptedRules: boolean;
  pollingInterval: number; // 1–10 seconds
}

export interface SessionRuntime {
  id: string;
  status: SessionStatus;
  statusMessage: string;
  errorMessage: string;
  captchaId: string;
  captchaImageUri: string;
  captchaAnswer: string;
  otpCode: string;
  registrationToken: string;
  otpStartedAt: number | null;   // timestamp ms
  availableQuota: boolean;
  retryCount: number;
  lastPolledAt: number | null;
  isRunning: boolean;
}

export interface Session {
  config: SessionConfig;
  runtime: SessionRuntime;
}

interface AppState {
  onboardingDone: boolean;
  sessions: Record<string, Session>;

  // Onboarding
  setOnboardingDone: (v: boolean) => void;

  // Session CRUD
  addSession: (config: SessionConfig) => void;
  updateConfig: (id: string, partial: Partial<SessionConfig>) => void;
  updateRuntime: (id: string, partial: Partial<SessionRuntime>) => void;
  removeSession: (id: string) => void;

  // Helpers
  getSession: (id: string) => Session | undefined;
  getAllSessions: () => Session[];
}

const defaultRuntime = (id: string): SessionRuntime => ({
  id,
  status: 'idle',
  statusMessage: 'Ready',
  errorMessage: '',
  captchaId: '',
  captchaImageUri: '',
  captchaAnswer: '',
  otpCode: '',
  registrationToken: '',
  otpStartedAt: null,
  availableQuota: false,
  retryCount: 0,
  lastPolledAt: null,
  isRunning: false,
});

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      onboardingDone: false,
      sessions: {},

      setOnboardingDone: (v) => set({ onboardingDone: v }),

      addSession: (config) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [config.id]: {
              config,
              runtime: defaultRuntime(config.id),
            },
          },
        })),

      updateConfig: (id, partial) =>
        set((state) => {
          const session = state.sessions[id];
          if (!session) return state;
          // Allow explicit null for wilayaId / communeId
          const merged = { ...session.config };
          (Object.keys(partial) as (keyof SessionConfig)[]).forEach((k) => {
            (merged as any)[k] = (partial as any)[k];
          });
          return {
            sessions: {
              ...state.sessions,
              [id]: { ...session, config: merged },
            },
          };
        }),

      updateRuntime: (id, partial) =>
        set((state) => {
          const session = state.sessions[id];
          if (!session) return state;
          return {
            sessions: {
              ...state.sessions,
              [id]: {
                ...session,
                runtime: { ...session.runtime, ...partial },
              },
            },
          };
        }),

      removeSession: (id) =>
        set((state) => {
          const next = { ...state.sessions };
          delete next[id];
          return { sessions: next };
        }),

      getSession: (id) => get().sessions[id],
      getAllSessions: () => Object.values(get().sessions),
    }),
    {
      name: 'adhahi-dominator-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist config + minimal runtime (OTP screen state)
      partialize: (state) => ({
        onboardingDone: state.onboardingDone,
        sessions: Object.fromEntries(
          Object.entries(state.sessions).map(([id, s]) => [
            id,
            {
              config: s.config,
              runtime: {
                ...defaultRuntime(id),
                status: s.runtime.status === 'otp_required' ? 'otp_required' : 'idle',
                otpStartedAt: s.runtime.otpStartedAt,
                registrationToken: s.runtime.registrationToken,
                captchaId: s.runtime.captchaId,
                isRunning: false,
              },
            },
          ])
        ),
      }),
    }
  )
);
