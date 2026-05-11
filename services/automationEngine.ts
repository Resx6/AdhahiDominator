/**
 * Core Automation Engine
 * Orchestrates the full registration flow for a single session.
 * Each session runs a completely isolated engine instance.
 */

import {
  fetchWilayaQuotas,
  isWilayaAvailable,
  generateCaptcha,
  submitRegistration,
  submitRegistrationV2,
  RegisterPayload,
  RegisterResponse,
} from './api';
import { solveCaptcha } from './captcha';
import { fireOTPAlarm } from './notifications';
import { useStore } from '../store/useStore';

// Registry of running engine timers — one per session
const runningTimers: Record<string, ReturnType<typeof setInterval>> = {};
const engineAborted: Record<string, boolean> = {};

export function startEngine(sessionId: string) {
  if (runningTimers[sessionId]) return; // already running
  engineAborted[sessionId] = false;

  const store = useStore.getState();
  const session = store.getSession(sessionId);
  if (!session) return;

  store.updateRuntime(sessionId, {
    status: 'polling',
    statusMessage: 'Scanning quotas...',
    isRunning: true,
    errorMessage: '',
    retryCount: 0,
  });

  const intervalMs = (session.config.pollingInterval ?? 3) * 1000;

  const tick = async () => {
    if (engineAborted[sessionId]) return;

    const current = useStore.getState().getSession(sessionId);
    if (!current || !current.runtime.isRunning) return;

    try {
      // ── Step 1: Poll quotas ────────────────────────────────────────────────
      const quotas = await fetchWilayaQuotas(sessionId);
      const now = Date.now();
      useStore.getState().updateRuntime(sessionId, { lastPolledAt: now });

      const wilayaId = current.config.wilayaId;
      if (!wilayaId) return;

      const available = isWilayaAvailable(quotas, wilayaId);
      useStore.getState().updateRuntime(sessionId, { availableQuota: available });

      if (!available) {
        useStore.getState().updateRuntime(sessionId, {
          statusMessage: `Polling... (quota unavailable)`,
        });
        return; // wait for next tick
      }

      // ── Step 2: Quota available — stop polling, solve captcha ──────────────
      stopEngine(sessionId);
      useStore.getState().updateRuntime(sessionId, {
        status: 'captcha_solving',
        statusMessage: 'Quota found! Solving captcha...',
      });

      await runCaptchaAndSubmit(sessionId);
    } catch (err: any) {
      if (!engineAborted[sessionId]) {
        useStore.getState().updateRuntime(sessionId, {
          statusMessage: `Polling error: ${err?.message ?? 'unknown'}`,
        });
      }
    }
  };

  // Run immediately then on interval
  tick();
  runningTimers[sessionId] = setInterval(tick, intervalMs);
}

export function stopEngine(sessionId: string) {
  engineAborted[sessionId] = true;
  if (runningTimers[sessionId]) {
    clearInterval(runningTimers[sessionId]);
    delete runningTimers[sessionId];
  }
  const current = useStore.getState().getSession(sessionId);
  if (current && current.runtime.status !== 'otp_required' && current.runtime.status !== 'success') {
    useStore.getState().updateRuntime(sessionId, {
      isRunning: false,
      status: 'idle',
      statusMessage: 'Stopped',
    });
  } else {
    useStore.getState().updateRuntime(sessionId, { isRunning: false });
  }
}

export function isEngineRunning(sessionId: string): boolean {
  return !!runningTimers[sessionId] && !engineAborted[sessionId];
}

async function runCaptchaAndSubmit(sessionId: string, retryCount = 0) {
  if (engineAborted[sessionId]) return;

  const MAX_CAPTCHA_RETRIES = 15;
  if (retryCount > MAX_CAPTCHA_RETRIES) {
    useStore.getState().updateRuntime(sessionId, {
      status: 'error',
      statusMessage: 'Max captcha retries exceeded.',
      errorMessage: 'Captcha auto-solver exhausted retries.',
      isRunning: false,
    });
    return;
  }

  try {
    // Fetch captcha
    useStore.getState().updateRuntime(sessionId, {
      status: 'captcha_solving',
      statusMessage: `Fetching captcha (attempt ${retryCount + 1})...`,
    });

    const captcha = await generateCaptcha(sessionId);
    const imageUri = captcha.imageBase64
      ? `data:image/png;base64,${captcha.imageBase64}`
      : captcha.imageUrl ?? '';

    useStore.getState().updateRuntime(sessionId, {
      captchaId: captcha.captchaId,
      captchaImageUri: imageUri,
    });

    // Solve captcha
    const solved = await solveCaptcha(captcha.imageBase64 ?? '', captcha.imageUrl);
    if (!solved.answer || solved.answer.length < 4) {
      // Could not solve — retry immediately
      await new Promise((r) => setTimeout(r, 80));
      return runCaptchaAndSubmit(sessionId, retryCount + 1);
    }

    useStore.getState().updateRuntime(sessionId, {
      captchaAnswer: solved.answer,
      statusMessage: `Captcha solved: "${solved.answer}". Submitting...`,
      status: 'submitting',
    });

    // Build payload
    const session = useStore.getState().getSession(sessionId)!;
    const cfg = session.config;
    const payload: RegisterPayload = {
      nin: cfg.nin,
      cnibe: cfg.cnibe,
      phone: cfg.phone,
      email: cfg.email || undefined,
      password: cfg.password,
      wilayaId: cfg.wilayaId!,
      communeId: cfg.communeId!,
      paymentMethod: cfg.paymentMethod,
      acceptedRules: true,
    };

    // Try v1 then v2
    let result: RegisterResponse;
    try {
      result = await submitRegistration(sessionId, captcha.captchaId, solved.answer, payload);
    } catch {
      result = await submitRegistrationV2(sessionId, captcha.captchaId, solved.answer, payload);
    }

    if (!result.success) {
      // Wrong captcha or rejected — retry immediately
      const msg = result.message?.toLowerCase() ?? '';
      const isCaptchaError =
        msg.includes('captcha') || msg.includes('invalid') || msg.includes('wrong');
      if (isCaptchaError || retryCount < 5) {
        await new Promise((r) => setTimeout(r, 60));
        return runCaptchaAndSubmit(sessionId, retryCount + 1);
      }
      useStore.getState().updateRuntime(sessionId, {
        status: 'error',
        statusMessage: result.message ?? 'Registration failed.',
        errorMessage: result.message ?? 'Unknown error',
        isRunning: false,
      });
      return;
    }

    // SUCCESS — OTP required
    useStore.getState().updateRuntime(sessionId, {
      status: 'otp_required',
      statusMessage: 'Registration submitted! OTP sent to your phone.',
      registrationToken: result.token ?? '',
      otpStartedAt: Date.now(),
      isRunning: false,
    });
    // Fire alarm notification
    const cfg2 = useStore.getState().getSession(sessionId)?.config;
    if (cfg2) {
      fireOTPAlarm(cfg2.name, cfg2.phone).catch(() => {});
    }
  } catch (err: any) {
    if (!engineAborted[sessionId]) {
      await new Promise((r) => setTimeout(r, 150));
      return runCaptchaAndSubmit(sessionId, retryCount + 1);
    }
  }
}
