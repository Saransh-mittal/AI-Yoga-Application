/**
 * Runtime configuration for the XTTS backend URL.
 *
 * Next.js bakes NEXT_PUBLIC_* env vars at BUILD time, not runtime.
 * This helper checks multiple sources to find the backend URL:
 * 1. Window-level config (injected at runtime)
 * 2. NEXT_PUBLIC_XTTS_BACKEND_URL (build-time env var)
 * 3. Fallback to localhost for local development
 */

// Extend Window interface
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      XTTS_BACKEND_URL?: string;
    };
  }
}

export function getXttsBackendUrl(): string {
  // 1. Check runtime config (if injected via script tag)
  if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__?.XTTS_BACKEND_URL) {
    return window.__RUNTIME_CONFIG__.XTTS_BACKEND_URL;
  }

  // 2. Check build-time env var (works when set before build)
  if (process.env.NEXT_PUBLIC_XTTS_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_XTTS_BACKEND_URL;
  }

  // 3. Fallback for local development
  return 'http://localhost:8000';
}
