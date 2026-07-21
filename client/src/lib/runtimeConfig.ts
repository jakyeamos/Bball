const DEFAULT_API_BASE_URL = 'http://localhost:3001';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_URL;
  return trimTrailingSlash(configuredUrl || DEFAULT_API_BASE_URL);
}

export function buildApiUrl(endpoint: string): string {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${getApiBaseUrl()}${normalizedEndpoint}`;
}

export function getSocketUrl(): string {
  return getApiBaseUrl();
}
