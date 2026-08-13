import { API } from '../api/api.ts';

const SESSION_COOKIE_NAME = 'chat-app.session';

/**
 * The real session lives in the `_session_token` cookie the backend sets on
 * `/api/v1/auth/sign-in` (HttpOnly + Secure + SameSite=Strict), so it can't be
 * read from here. This cookie is just a client-readable marker, mirroring its
 * lifetime, so `isAuthenticated()` can stay synchronous for the router.
 */
function setSessionCookie(maxAgeSeconds: number): void {
  document.cookie = `${SESSION_COOKIE_NAME}=1; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Strict; Secure`;
}

function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Strict; Secure`;
}

export function isAuthenticated(): boolean {
  return document.cookie.split('; ').some((entry) => entry.startsWith(`${SESSION_COOKIE_NAME}=`));
}

export interface LoginCredentials {
  username: string;
  password: string;
}

interface SignInResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export class AccountPendingError extends Error {}

export async function login(credentials: LoginCredentials): Promise<void> {
  const response = await fetch(API.auth.signIn, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
    },
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<SignInResponse> | null;

  if (!response.ok) {
    if (response.status === 403) {
      throw new AccountPendingError(body?.message ?? "Your account isn't verified yet");
    }
    throw new Error(body?.message ?? 'Invalid username or password');
  }

  setSessionCookie(body?.payload?.expiresIn ?? 0);
}

export interface SignupProfile {
  email: string;
  password: string;
  displayName: string;
  timezone: string;
  language: string;
  icon?: File | null;
}

interface SignupResponse {
  id: string;
  email: string;
}

export async function signup(profile: SignupProfile): Promise<void> {
  const [firstName, ...rest] = profile.displayName.trim().split(/\s+/);

  const formData = new FormData();
  formData.set('email', profile.email);
  formData.set('password', profile.password);
  formData.set('firstName', firstName);
  formData.set('lastName', rest.join(' '));
  formData.set('timezone', profile.timezone);
  formData.set('lang', profile.language);
  if (profile.icon) {
    formData.set('icon', profile.icon);
  }

  const response = await fetch(API.user.base, {
    method: 'POST',
    body: formData,
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<SignupResponse> | null;

  if (!response.ok) {
    throw new Error(body?.message ?? 'Failed to create account');
  }
}

export async function completeSignup(profile: SignupProfile): Promise<void> {
  await login({ username: profile.email, password: profile.password });
}

interface EmailAvailabilityResponse {
  available: boolean;
}

export async function checkEmailAvailability(email: string): Promise<boolean> {
  const response = await fetch(API.user.emailAvailability, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<EmailAvailabilityResponse> | null;

  if (!response.ok) {
    throw new Error(body?.message ?? 'Failed to check email availability');
  }

  return body?.payload?.available ?? true;
}

export type OtpType = 'email';

interface ApiResponse<T> {
  payload?: T;
  message?: string;
}

interface GenerateOtpResponse {
  message: string;
}

export async function sendOtp(type: OtpType, recipient: string): Promise<void> {
  const response = await fetch(API.auth.otp, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, recipient }),
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<GenerateOtpResponse> | null;

  if (!response.ok) {
    throw new Error(body?.message ?? 'Failed to send verification code');
  }
}

interface VerifyOtpResponse {
  verified: boolean;
}

export async function verifyOtp(type: OtpType, recipient: string, code: string): Promise<void> {
  const response = await fetch(API.auth.otpVerification, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, recipient, code }),
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<VerifyOtpResponse> | null;

  if (!response.ok || !body?.payload?.verified) {
    throw new Error(body?.message ?? 'Invalid verification code');
  }
}

interface VerifyPasswordResetOtpResponse {
  resetToken: string;
}

export async function verifyPasswordResetOtp(type: OtpType, recipient: string, code: string): Promise<string> {
  const response = await fetch(API.auth.passwordResetOtpVerification, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, recipient, code }),
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<VerifyPasswordResetOtpResponse> | null;

  if (!response.ok || !body?.payload?.resetToken) {
    throw new Error(body?.message ?? 'Invalid verification code');
  }

  return body.payload.resetToken;
}

export async function resetPassword(resetToken: string, newPassword: string): Promise<void> {
  const response = await fetch(API.auth.passwordReset, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resetToken, newPassword }),
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;

  if (!response.ok) {
    throw new Error(body?.message ?? 'Failed to reset password');
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(API.auth.signOut, { method: 'POST', credentials: 'include' });
  } finally {
    clearSessionCookie();
  }
}
