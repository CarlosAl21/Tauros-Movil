export const TAUROS_API_BASE_URL =
  process.env.EXPO_PUBLIC_TAUROS_API_URL || 'http://localhost:3000';

type RequestOptions = RequestInit & {
  token?: string | null;
};

export async function taurosRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, body, ...rest } = options;
  const requestHeaders = new Headers(headers);

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  if (body && !(body instanceof FormData) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${TAUROS_API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    body,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'message' in payload
      ? (payload as { message?: string }).message
      : typeof payload === 'string'
        ? payload
        : 'Error de conexion con el backend';

    throw new Error(message || 'Error de conexion con el backend');
  }

  return payload as T;
}
