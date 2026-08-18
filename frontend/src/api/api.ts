/**
 * Root URL every API endpoint below is prefixed with. Defaults to same-origin
 * (empty string) so the built app keeps working when folded into the Spring
 * Boot jar, but can be pointed at a separately-running backend by setting
 * `VITE_API_BASE_URL` (e.g. in `.env.local`) for local development.
 */
export const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Set when `BASE_URL` points at an ngrok tunnel (local dev against a
 * `*.ngrok-free.dev` backend). Ngrok otherwise serves an HTML interstitial
 * warning page in place of the real response on first contact from a browser.
 */
const API_VIA_NGROK: boolean = import.meta.env.VITE_API_VIA_NGROK === 'true';

/**
 * Drop-in replacement for the global `fetch` for calls to `API` endpoints.
 * Transparently attaches the `ngrok-skip-browser-warning` header when
 * `VITE_API_VIA_NGROK` is set, so responses aren't replaced by ngrok's
 * browser-warning interstitial.
 */
export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  if (!API_VIA_NGROK) {
    return fetch(input, init);
  }

  const headers = new Headers(init.headers);
  headers.set('ngrok-skip-browser-warning', 'true');

  return fetch(input, { ...init, headers });
}

/**
 * Resolves the STOMP-over-WebSocket endpoint from the same `BASE_URL` the REST calls use, so it
 * stays same-origin (`ws(s)://<host>/ws`) when `BASE_URL` is empty, or points at wherever
 * `VITE_API_BASE_URL` does otherwise, upgraded to a `ws(s):` scheme.
 */
export function resolveWebSocketUrl(path: string): string {
  const url = new URL(path, BASE_URL || window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

export const API = {
  auth: {
    signIn: `${BASE_URL}/api/v1/auth/sign-in`,
    signOut: `${BASE_URL}/api/v1/auth/sign-out`,
    otp: `${BASE_URL}/api/v1/auth/otp`,
    otpVerification: `${BASE_URL}/api/v1/auth/otp/verification`,
    passwordResetOtpVerification: `${BASE_URL}/api/v1/auth/password-reset/otp/verification`,
    passwordReset: `${BASE_URL}/api/v1/auth/password-reset`,
  },
  user: {
    base: `${BASE_URL}/api/v1/user`,
    emailAvailability: `${BASE_URL}/api/v1/user/email-availability`,
    contacts: `${BASE_URL}/api/v1/user/contacts`,
  },
  conversation: {
    base: `${BASE_URL}/api/v1/conversation`,
    direct: `${BASE_URL}/api/v1/conversation/direct`,
  },
} as const;
