/**
 * Cross-platform UUID v4 generator.
 * Uses crypto.randomUUID() when available (modern browsers & Node 15+),
 * otherwise falls back to a Math.random-based implementation.
 */
export function generateUUID(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof (crypto as any).randomUUID === 'function'
  ) {
    return (crypto as any).randomUUID() as string;
  }
  // Fallback: RFC 4122 compliant v4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
