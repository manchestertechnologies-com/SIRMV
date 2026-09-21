const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('sirmv_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('sirmv_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('sirmv_token');
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (_) {}
    throw new Error(errorMessage);
  }

  return response.json();
}
