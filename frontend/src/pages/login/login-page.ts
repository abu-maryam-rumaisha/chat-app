import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { AccountPendingError, login, sendOtp, verifyOtp } from '../../auth/auth.service';
import { navigate } from '../../router/navigate';
import { LocalizeController, interpolate } from '../../i18n/i18n';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/callout/callout.js';
import '@awesome.me/webawesome/dist/components/otp-input/otp-input.js';

type View = 'login' | 'pending';

const RESEND_SECONDS = 30;

@customElement('login-page')
export class LoginPage extends LitElement {
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private readonly localize = new LocalizeController(this);

  @state()
  private view: View = 'login';

  @state()
  private error: string | null = null;

  @state()
  private submitting = false;

  private pendingEmail = '';
  private pendingPassword = '';

  @state()
  private otpComplete = false;

  @state()
  private otpValue = '';

  @state()
  private verifyingOtp = false;

  @state()
  private otpError: string | null = null;

  @state()
  private resendingCode = false;

  @state()
  private secondsLeft = RESEND_SECONDS;

  private resendTimer: ReturnType<typeof setInterval> | undefined;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    clearInterval(this.resendTimer);
  }

  private startResendCountdown(): void {
    clearInterval(this.resendTimer);
    this.secondsLeft = RESEND_SECONDS;
    this.resendTimer = setInterval(() => {
      this.secondsLeft = Math.max(0, this.secondsLeft - 1);
      if (this.secondsLeft === 0) clearInterval(this.resendTimer);
    }, 1000);
  }

  private async handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.error = null;

    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const username = String(data.get('username') ?? '').trim();
    const password = String(data.get('password') ?? '');

    if (!username || !password) {
      this.error = this.localize.t.login.errorRequired;
      return;
    }

    this.submitting = true;
    try {
      await login({ username, password });
    } catch (error) {
      if (error instanceof AccountPendingError) {
        this.pendingEmail = username;
        this.pendingPassword = password;
        await this.enterPendingView();
        return;
      }
      this.error = error instanceof Error ? error.message : this.localize.t.login.loginError;
      return;
    } finally {
      this.submitting = false;
    }

    navigate('/');
  }

  private async enterPendingView(): Promise<void> {
    this.otpError = null;
    this.otpValue = '';
    this.otpComplete = false;
    try {
      await sendOtp('email', this.pendingEmail);
    } catch (error) {
      this.error = error instanceof Error ? error.message : this.localize.t.login.pendingOtpSendError;
      return;
    }

    this.startResendCountdown();
    this.view = 'pending';
  }

  private handleOtpInput(event: Event): void {
    const otpInput = event.currentTarget as HTMLElementTagNameMap['wa-otp-input'];
    this.otpValue = otpInput.value;
    this.otpComplete = otpInput.value.length === otpInput.effectiveLength;
  }

  private async handleVerifyOtp(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.otpError = null;

    if (!this.otpComplete) {
      this.otpError = this.localize.t.login.pendingOtpErrorEmpty;
      return;
    }

    this.verifyingOtp = true;
    try {
      await verifyOtp('email', this.pendingEmail, this.otpValue);
      await login({ username: this.pendingEmail, password: this.pendingPassword });
    } catch (error) {
      this.otpError = error instanceof Error ? error.message : this.localize.t.login.pendingOtpVerifyError;
      return;
    } finally {
      this.verifyingOtp = false;
    }

    navigate('/');
  }

  private async handleResend(): Promise<void> {
    if (this.secondsLeft > 0 || this.resendingCode) return;

    this.otpError = null;
    this.resendingCode = true;
    try {
      await sendOtp('email', this.pendingEmail);
    } catch (error) {
      this.otpError = error instanceof Error ? error.message : this.localize.t.login.pendingOtpSendError;
      return;
    } finally {
      this.resendingCode = false;
    }

    this.startResendCountdown();
  }

  private handleBackToLogin(): void {
    clearInterval(this.resendTimer);
    this.view = 'login';
    this.otpError = null;
    this.otpValue = '';
    this.otpComplete = false;
    this.pendingPassword = '';
  }

  private handleForgotPassword(): void {
    navigate('/forgot-password');
  }

  private handleCreateAccount(): void {
    navigate('/signup');
  }

  private renderLoginView() {
    const t = this.localize.t;
    return html`
      <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
        <svg
          class="h-6 w-6 text-indigo-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8" />
        </svg>
      </span>

      <p class="mt-4 text-xs font-semibold tracking-widest text-slate-400 uppercase">${t.login.eyebrow}</p>
      <h1 class="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">${t.login.title}</h1>
      <p class="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">${t.login.subtitle}</p>

      <form class="mt-5 flex flex-col" @submit=${this.handleSubmit}>
        ${this.error
          ? html`<wa-callout variant="danger" appearance="outlined" class="mb-4">${this.error}</wa-callout>`
          : null}

        <wa-input
          type="email"
          name="username"
          label=${t.login.emailLabel}
          autocomplete="username"
          required
        ></wa-input>

        <wa-input
          class="mt-4"
          type="password"
          name="password"
          label=${t.login.passwordLabel}
          password-toggle
          autocomplete="current-password"
          required
        ></wa-input>

        <p class="mt-2 text-sm text-slate-500">
          ${t.login.forgotPassword}
          <button
            type="button"
            class="font-semibold text-indigo-600 hover:text-indigo-700"
            @click=${this.handleForgotPassword}
          >
            ${t.login.resetIt}
          </button>
        </p>

        <wa-button
          type="submit"
          variant="neutral"
          appearance="accent"
          class="mt-5 block w-full"
          style="--wa-color-fill-loud: #0f172a; --wa-color-on-loud: #ffffff;"
          ?loading=${this.submitting}
          ?disabled=${this.submitting}
        >
          ${t.login.submit}
        </wa-button>

        <wa-button
          appearance="plain"
          variant="brand"
          class="mt-3 block w-full [--wa-color-on-quiet:#4f46e5] [--wa-font-weight-action:var(--wa-font-weight-semibold)]"
          @click=${this.handleCreateAccount}
        >
          ${t.login.newHere}
        </wa-button>
      </form>
    `;
  }

  private renderPendingView() {
    const t = this.localize.t;
    const targetText = interpolate(t.login.pendingTargetEmail, { email: this.pendingEmail });

    return html`
      <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
        <svg
          class="h-6 w-6 text-amber-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      </span>

      <p class="mt-4 text-xs font-semibold tracking-widest text-slate-400 uppercase">${t.login.pendingStepLabel}</p>
      <h1 class="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">${t.login.pendingTitle}</h1>
      <p class="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
        ${interpolate(t.login.pendingSubtitle, {
          target: html`<span class="font-semibold text-slate-900">${targetText}</span>`,
        })}
      </p>

      <form class="mt-5 flex flex-col" @submit=${this.handleVerifyOtp}>
        ${this.otpError
          ? html`<wa-callout variant="danger" appearance="outlined" class="mb-4">${this.otpError}</wa-callout>`
          : null}

        <wa-otp-input
          class="[--segment-size:2.6rem]"
          name="otp"
          length="6"
          type="numeric"
          autocomplete="one-time-code"
          @input=${this.handleOtpInput}
          @wa-complete=${this.handleOtpInput}
        ></wa-otp-input>

        <p class="mt-4 text-sm text-slate-500">
          ${t.login.pendingResendPrompt}
          ${this.secondsLeft > 0
            ? html`<span class="font-semibold text-slate-400"
                >${interpolate(t.login.pendingResendCountdown, {
                  time: `0:${this.secondsLeft.toString().padStart(2, '0')}`,
                })}</span
              >`
            : html`<button
                type="button"
                class="font-semibold text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-indigo-300"
                ?disabled=${this.resendingCode}
                @click=${this.handleResend}
              >
                ${t.login.pendingResendButton}
              </button>`}
        </p>

        <wa-button
          type="submit"
          variant="neutral"
          appearance="accent"
          class="mt-5 block w-full"
          style="--wa-color-fill-loud: #0f172a; --wa-color-on-loud: #ffffff;"
          ?loading=${this.verifyingOtp}
          ?disabled=${!this.otpComplete || this.verifyingOtp}
        >
          ${t.login.pendingVerify}
        </wa-button>

        <wa-button
          appearance="plain"
          variant="brand"
          class="mt-3 block w-full [--wa-color-on-quiet:#4f46e5] [--wa-font-weight-action:var(--wa-font-weight-semibold)]"
          @click=${this.handleBackToLogin}
        >
          ${t.login.pendingBackToLogin}
        </wa-button>
      </form>
    `;
  }

  protected render() {
    const t = this.localize.t;
    return html`
      <main
        class="relative flex min-h-svh items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-rose-50 p-4 sm:p-6"
      >
        <svg
          class="pointer-events-none absolute -top-6 -left-6 h-28 w-28 text-indigo-300/60 sm:h-36 sm:w-36"
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden="true"
        >
          <path d="M0 30 L60 0" stroke="currentColor" stroke-width="1.5" />
          <path d="M0 55 L85 20" stroke="currentColor" stroke-width="1.5" />
        </svg>

        <svg
          class="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 text-rose-300/60 sm:h-36 sm:w-36"
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden="true"
        >
          <path d="M100 70 L40 100" stroke="currentColor" stroke-width="1.5" />
          <path d="M100 45 L15 80" stroke="currentColor" stroke-width="1.5" />
        </svg>

        <div class="relative flex w-full max-w-sm flex-col gap-4 sm:max-w-md">
          <div class="flex items-center gap-2 px-1">
            <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600">
              <span class="h-3 w-3 rounded-sm bg-white"></span>
            </span>
            <span class="text-lg font-semibold text-slate-900">Simply<span class="text-indigo-600">C</span></span>
          </div>

          <span
            class="w-fit rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold tracking-widest text-indigo-600 uppercase"
          >
            ${this.view === 'login' ? t.login.badge : t.login.pendingBadge}
          </span>

          <div class="w-full rounded-3xl bg-white p-6 shadow-xl shadow-indigo-950/10 sm:p-8">
            ${this.view === 'login' ? this.renderLoginView() : this.renderPendingView()}
          </div>
        </div>
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'login-page': LoginPage;
  }
}
