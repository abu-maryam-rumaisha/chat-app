/**
 * Root URL every API endpoint below is prefixed with. Defaults to same-origin
 * (empty string) so the built app keeps working when folded into the Spring
 * Boot jar, but can be pointed at a separately-running backend by setting
 * `VITE_API_BASE_URL` (e.g. in `.env.local`) for local development.
 */
export const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

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
  },
} as const;
