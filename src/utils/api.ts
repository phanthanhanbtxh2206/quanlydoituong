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

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  // If already matches YYYY-MM-DD
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-');
    return `${day}-${month}-${year}`;
  }

  // If ISO string containing T
  if (trimmed.includes('T')) {
    const part = trimmed.split('T')[0];
    if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(part)) {
      const [year, month, day] = part.split('-');
      return `${day}-${month}-${year}`;
    }
  }

  // Fallback to parsing and returning DD-MM-YYYY
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch (e) {}

  return trimmed;
}

