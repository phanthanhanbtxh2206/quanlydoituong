/**
 * API Configuration and Utility Helpers
 * Supports running full-stack locally and dynamically routing to the backend server
 * when deployed on static hosting environments like GitHub Pages.
 */

export function getApiBaseUrl(): string {
  const env = (import.meta as any).env || {};
  // 1. Explicitly configured VITE_API_URL has highest precedence
  if (env.VITE_API_URL) {
    return env.VITE_API_URL;
  }

  // 2. If running on GitHub Pages (or other static sites), fall back to the live preview backend URL
  if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
    return 'https://ais-pre-mfah7q2qoikg6jccpvjbhb-350240464410.asia-east1.run.app';
  }

  // 3. Fallback to empty string for relative paths (working full-stack locally or behind same-origin proxies)
  return '';
}

export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
