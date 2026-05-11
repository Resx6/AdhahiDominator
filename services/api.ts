import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'https://adhahi.dz/api/v1';

// Per-session isolated axios instances — ZERO cross-contamination
const sessionInstances: Record<string, AxiosInstance> = {};

export function getSessionClient(sessionId: string): AxiosInstance {
  if (!sessionInstances[sessionId]) {
    sessionInstances[sessionId] = axios.create({
      baseURL: BASE_URL,
      timeout: 12000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        Origin: 'https://adhahi.dz',
        Referer: 'https://adhahi.dz/',
      },
    });
  }
  return sessionInstances[sessionId];
}

export function destroySessionClient(sessionId: string) {
  delete sessionInstances[sessionId];
}

// ─── Locations ────────────────────────────────────────────────────────────────

export async function fetchWilayas(sessionId: string) {
  const client = getSessionClient(sessionId);
  const res = await client.get('/locations/wilayas');
  return res.data;
}

export async function fetchCommunes(sessionId: string, wilayaId: number) {
  const client = getSessionClient(sessionId);
  // Try canonical path first, fall back to query param variant
  try {
    const res = await client.get(`/locations/wilayas/${wilayaId}/communes`);
    return res.data;
  } catch {
    const res = await client.get(`/locations/communes?wilayaId=${wilayaId}`);
    return res.data;
  }
}

// ─── Quota Polling ────────────────────────────────────────────────────────────

export interface QuotaResult {
  available: boolean;
  wilayaId: number;
  remaining?: number;
}

export async function fetchWilayaQuotas(sessionId: string): Promise<QuotaResult[]> {
  const client = getSessionClient(sessionId);
  const res = await client.get('/public/wilaya-quotas');
  // API returns array or object — normalise
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (data?.wilayas) return data.wilayas;
  return [];
}

export function isWilayaAvailable(quotas: QuotaResult[], wilayaId: number): boolean {
  const entry = quotas.find((q) => q.wilayaId === wilayaId);
  return entry?.available === true;
}

// ─── Captcha ──────────────────────────────────────────────────────────────────

export interface CaptchaResponse {
  captchaId: string;
  imageBase64?: string;
  imageUrl?: string;
}

export async function generateCaptcha(sessionId: string): Promise<CaptchaResponse> {
  const client = getSessionClient(sessionId);
  const res = await client.get('/captcha/generate', {
    responseType: 'json',
  });
  const data = res.data;
  return {
    captchaId: data.id ?? data.captchaId ?? data.token ?? '',
    imageBase64: data.image ?? data.imageBase64 ?? data.img ?? undefined,
    imageUrl: data.url ?? data.imageUrl ?? undefined,
  };
}

// ─── Registration ─────────────────────────────────────────────────────────────

export interface RegisterPayload {
  nin: string;
  cnibe: string;
  phone: string;
  email?: string;
  password: string;
  wilayaId: number;
  communeId: number;
  paymentMethod: string;
  acceptedRules: boolean;
}

export interface RegisterResponse {
  success: boolean;
  token?: string;
  message?: string;
  otpRequired?: boolean;
}

export async function submitRegistration(
  sessionId: string,
  captchaId: string,
  captchaAnswer: string,
  payload: RegisterPayload
): Promise<RegisterResponse> {
  const client = getSessionClient(sessionId);
  const res = await client.post('/citizens/register', payload, {
    headers: {
      'X-Captcha-Id': captchaId,
      'X-Captcha-Answer': captchaAnswer,
    },
  });
  const data = res.data;
  return {
    success: data.success ?? (res.status === 200 || res.status === 201),
    token: data.token ?? data.registrationToken ?? data.ref ?? '',
    message: data.message ?? '',
    otpRequired: data.otpRequired ?? data.otp_required ?? true,
  };
}

// v2 fallback
export async function submitRegistrationV2(
  sessionId: string,
  captchaId: string,
  captchaAnswer: string,
  payload: RegisterPayload
): Promise<RegisterResponse> {
  const client = getSessionClient(sessionId);
  const res = await client.post(
    '/v2/citizens/register',
    { ...payload, captchaId, captchaAnswer },
    { headers: { 'X-Captcha-Id': captchaId, 'X-Captcha-Answer': captchaAnswer } }
  );
  const data = res.data;
  return {
    success: data.success ?? (res.status === 200 || res.status === 201),
    token: data.token ?? data.registrationToken ?? '',
    message: data.message ?? '',
    otpRequired: data.otpRequired ?? true,
  };
}

// ─── OTP ──────────────────────────────────────────────────────────────────────

export interface VerifyOtpPayload {
  token: string;
  otpCode: string;
  captchaId: string;
  captchaAnswer: string;
  phone: string;
}

export async function verifyOtp(
  sessionId: string,
  payload: VerifyOtpPayload
): Promise<{ success: boolean; message?: string }> {
  const client = getSessionClient(sessionId);
  const res = await client.post('/citizens/verify-otp', {
    token: payload.token,
    otp: payload.otpCode,
    captchaId: payload.captchaId,
    captchaAnswer: payload.captchaAnswer,
    phone: payload.phone,
  });
  return {
    success: res.data?.success ?? (res.status === 200),
    message: res.data?.message ?? '',
  };
}

export async function resendOtp(
  sessionId: string,
  token: string,
  phone: string
): Promise<{ success: boolean }> {
  const client = getSessionClient(sessionId);
  const res = await client.post('/citizens/resend-otp', { token, phone });
  return { success: res.data?.success ?? (res.status === 200) };
}
