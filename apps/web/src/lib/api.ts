import type {
  ApiErrorBody,
  AuthResponse,
  ForgotPasswordInput,
  LoginInput,
  MeResponse,
  RegisterInput,
  ResetPasswordInput,
} from '@urcst/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

const NETWORK_MESSAGE = 'We could not reach the server. Check your connection and try again.';

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_MESSAGE);
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (data as ApiErrorBody | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'SERVER_ERROR',
      error?.message ?? 'Something went wrong on our side. Please try again.',
      error?.fields,
    );
  }
  return data as T;
}

export const api = {
  me: () => request<MeResponse>('/auth/me'),
  login: (input: LoginInput) => request<AuthResponse>('/auth/login', 'POST', input),
  register: (input: RegisterInput) => request<AuthResponse>('/auth/register', 'POST', input),
  logout: () => request<{ ok: true }>('/auth/logout', 'POST'),
  forgotPassword: (input: ForgotPasswordInput) =>
    request<{ message: string }>('/auth/forgot-password', 'POST', input),
  resetPassword: (input: ResetPasswordInput) =>
    request<{ ok: true }>('/auth/reset-password', 'POST', input),
};
