/**
 * Captcha Auto-Solver Service
 * 
 * Strategy:
 * 1. Primary: OCR via free OCR API (ocr.space) using base64 image
 * 2. Fallback: Pattern analysis on digit grids
 * 3. Ultra-fast retry on wrong answer (re-fetch + re-solve in <200ms)
 */

const OCR_API_KEY = 'K85430440888957'; // free tier key
const OCR_API_URL = 'https://api.ocr.space/parse/image';

export interface SolveResult {
  answer: string;
  confidence: number;
  method: 'ocr_api' | 'pattern' | 'manual';
}

/**
 * Primary solver via OCR.space API
 */
async function solveViaOCRApi(base64Image: string): Promise<SolveResult | null> {
  try {
    const body = new FormData();
    // Strip data URI prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    body.append('base64Image', `data:image/png;base64,${cleanBase64}`);
    body.append('apikey', OCR_API_KEY);
    body.append('language', 'eng');
    body.append('isNumericOnly', 'true');
    body.append('scale', 'true');
    body.append('OCREngine', '2');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(OCR_API_URL, {
      method: 'POST',
      body,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    if (!data.ParsedResults?.length) return null;

    const raw: string = data.ParsedResults[0].ParsedText ?? '';
    // Extract only digits/letters (typical captcha format)
    const cleaned = raw.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '').trim();
    if (!cleaned) return null;

    return { answer: cleaned, confidence: 0.85, method: 'ocr_api' };
  } catch {
    return null;
  }
}

/**
 * Pattern fallback: common adhahi.dz captcha uses 4-6 digit numbers
 * Simple heuristic extraction from OCR artifacts
 */
function solveViaPattern(base64Image: string): SolveResult {
  // Cannot do pixel-level analysis in pure JS without canvas
  // Return empty so caller knows to prompt manual
  return { answer: '', confidence: 0, method: 'pattern' };
}

/**
 * Main solver — tries fastest method first, falls back gracefully
 * Designed for <200ms re-attempt cycle
 */
export async function solveCaptcha(
  base64Image: string,
  imageUrl?: string
): Promise<SolveResult> {
  // Attempt OCR API
  const ocrResult = await solveViaOCRApi(base64Image);
  if (ocrResult && ocrResult.answer.length >= 4) {
    return ocrResult;
  }

  // If image URL available, try fetching and sending URL directly
  if (imageUrl) {
    try {
      const body = new FormData();
      body.append('url', imageUrl);
      body.append('apikey', OCR_API_KEY);
      body.append('language', 'eng');
      body.append('isNumericOnly', 'true');
      body.append('OCREngine', '2');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(OCR_API_URL, { method: 'POST', body, signal: controller.signal });
      clearTimeout(timeoutId);

      const data = await res.json();
      const raw: string = data.ParsedResults?.[0]?.ParsedText ?? '';
      const cleaned = raw.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '').trim();
      if (cleaned.length >= 4) {
        return { answer: cleaned, confidence: 0.80, method: 'ocr_api' };
      }
    } catch {
      // ignore
    }
  }

  return { answer: '', confidence: 0, method: 'manual' };
}

/**
 * Aggressive retry loop: fetch new captcha + solve, up to maxRetries times
 * Returns solved answer or empty string if exhausted
 */
export async function aggressiveSolveLoop(
  fetchNewCaptcha: () => Promise<{ captchaId: string; imageBase64?: string; imageUrl?: string }>,
  onNewCaptcha: (captchaId: string, imageUri: string) => void,
  maxRetries = 8
): Promise<{ captchaId: string; answer: string }> {
  for (let i = 0; i < maxRetries; i++) {
    const cap = await fetchNewCaptcha();
    const imageUri = cap.imageBase64
      ? `data:image/png;base64,${cap.imageBase64}`
      : cap.imageUrl ?? '';
    onNewCaptcha(cap.captchaId, imageUri);

    const result = await solveCaptcha(cap.imageBase64 ?? '', cap.imageUrl);
    if (result.answer.length >= 4) {
      return { captchaId: cap.captchaId, answer: result.answer };
    }
    // Wait 50ms before retry
    await new Promise((r) => setTimeout(r, 50));
  }
  return { captchaId: '', answer: '' };
}
