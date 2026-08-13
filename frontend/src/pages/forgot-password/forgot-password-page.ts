import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { login, resetPassword, sendOtp, verifyPasswordResetOtp } from '../../auth/auth.service';
import { navigate } from '../../router/navigate';
import { LocalizeController, interpolate } from '../../i18n/i18n';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/callout/callout.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/otp-input/otp-input.js';
import '@awesome.me/webawesome/dist/components/progress-bar/progress-bar.js';

type Step = 0 | 1 | 2;

const RESEND_SECONDS = 30;
const STEP_PROGRESS: Record<Step, number> = { 0: 33, 1: 67, 2: 100 };

@customElement('forgot-password-page')
export class ForgotPasswordPage extends LitElement {
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private readonly localize = new LocalizeController(this);

  @state()
  private step: Step = 0;

  @state()
  private email = '';

  private resetToken = '';

  @state()
  private requestError: string | null = null;

  @state()
  private sendingCode = false;

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

  @state()
  private passwordError: string | null = null;

  @state()
  private resettingPassword = false;

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

  private goBack(): void {
    if (this.step === 0) {
      navigate('/login');
      return;
    }
    this.step = (this.step - 1) as Step;
  }

  private async handleRequestCode(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.requestError = null;

    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const email = String(data.get('email') ?? '').trim();

    if (!email) {
      this.requestError = this.localize.t.forgotPassword.emailErrorEmpty;
      return;
    }

    this.sendingCode = true;
    try {
      await sendOtp('email', email);
    } catch (error) {
      this.requestError = error instanceof Error ? error.message : this.localize.t.forgotPassword.sendCodeError;
      return;
    } finally {
      this.sendingCode = false;
    }

    this.email = email;
    this.startResendCountdown();
    this.step = 1;
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
      this.otpError = this.localize.t.forgotPassword.otpErrorEmpty;
      return;
    }

    this.verifyingOtp = true;
    try {
      this.resetToken = await verifyPasswordResetOtp('email', this.email, this.otpValue);
    } catch (error) {
      this.otpError = error instanceof Error ? error.message : this.localize.t.forgotPassword.otpVerifyError;
      return;
    } finally {
      this.verifyingOtp = false;
    }

    this.step = 2;
  }

  private async handleResend(): Promise<void> {
    if (this.secondsLeft > 0 || this.resendingCode) return;

    this.otpError = null;
    this.resendingCode = true;
    try {
      await sendOtp('email', this.email);
    } catch (error) {
      this.otpError = error instanceof Error ? error.message : this.localize.t.forgotPassword.otpSendError;
      return;
    } finally {
      this.resendingCode = false;
    }

    this.startResendCountdown();
  }

  private async handleResetPassword(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.passwordError = null;

    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const newPassword = String(data.get('newPassword') ?? '');
    const confirmPassword = String(data.get('confirmPassword') ?? '');

    if (!newPassword) {
      this.passwordError = this.localize.t.forgotPassword.passwordErrorEmpty;
      return;
    }

    if (newPassword !== confirmPassword) {
      this.passwordError = this.localize.t.forgotPassword.passwordErrorMismatch;
      return;
    }

    this.resettingPassword = true;
    try {
      await resetPassword(this.resetToken, newPassword);
      await login({ username: this.email, password: newPassword });
    } catch (error) {
      this.passwordError = error instanceof Error ? error.message : this.localize.t.forgotPassword.resetError;
      return;
    } finally {
      this.resettingPassword = false;
    }

    navigate('/');
  }

  private renderRequestStep() {
    const t = this.localize.t;
    return html`
      <form class="flex min-h-[380px] flex-col" @submit=${this.handleRequestCode}>
        <p class="mt-3 text-xs font-semibold tracking-widest text-slate-400 uppercase">
          ${interpolate(t.forgotPassword.stepOf, { step: '1' })}
        </p>
        <h1 class="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">${t.forgotPassword.requestTitle}</h1>
        <p class="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">${t.forgotPassword.requestSubtitle}</p>

        ${this.requestError
          ? html`<wa-callout variant="danger" appearance="outlined" class="mt-4">${this.requestError}</wa-callout>`
          : null}

        <wa-input
          class="mt-5"
          type="email"
          name="email"
          label=${t.forgotPassword.emailLabel}
          value=${this.email}
          autocomplete="email"
          required
        ></wa-input>

        <div class="flex-1"></div>

        <wa-button
          type="submit"
          variant="brand"
          class="mt-4 block w-full"
          style="--wa-color-fill-loud:#4f46e5;"
          ?loading=${this.sendingCode}
          ?disabled=${this.sendingCode}
        >
          ${t.forgotPassword.sendCode}
        </wa-button>
      </form>
    `;
  }

  private renderOtpStep() {
    const t = this.localize.t;
    const targetText = interpolate(t.forgotPassword.otpTargetEmail, { email: this.email });

    return html`
      <form class="flex min-h-[380px] flex-col" @submit=${this.handleVerifyOtp}>
        <p class="mt-3 text-xs font-semibold tracking-widest text-slate-400 uppercase">
          ${interpolate(t.forgotPassword.stepOf, { step: '2' })}
        </p>
        <h1 class="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">${t.forgotPassword.otpTitle}</h1>
        <p class="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
          ${interpolate(t.forgotPassword.otpSubtitle, {
            target: html`<span class="font-semibold text-slate-900">${targetText}</span>`,
          })}
        </p>

        ${this.otpError
          ? html`<wa-callout variant="danger" appearance="outlined" class="mt-4">${this.otpError}</wa-callout>`
          : null}

        <wa-otp-input
          class="mt-5 [--segment-size:2.6rem]"
          name="otp"
          length="6"
          type="numeric"
          autocomplete="one-time-code"
          @input=${this.handleOtpInput}
          @wa-complete=${this.handleOtpInput}
        ></wa-otp-input>

        <p class="mt-4 text-sm text-slate-500">
          ${t.forgotPassword.resendPrompt}
          ${this.secondsLeft > 0
            ? html`<span class="font-semibold text-slate-400"
                >${interpolate(t.forgotPassword.resendCountdown, {
                  time: `0:${this.secondsLeft.toString().padStart(2, '0')}`,
                })}</span
              >`
            : html`<button
                type="button"
                class="font-semibold text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-indigo-300"
                ?disabled=${this.resendingCode}
                @click=${this.handleResend}
              >
                ${t.forgotPassword.resendButton}
              </button>`}
        </p>

        <div class="flex-1"></div>

        <wa-button
          type="submit"
          variant="brand"
          class="block w-full"
          style="--wa-color-fill-loud:#4f46e5;"
          ?loading=${this.verifyingOtp}
          ?disabled=${!this.otpComplete || this.verifyingOtp}
        >
          ${t.forgotPassword.verify}
        </wa-button>
      </form>
    `;
  }

  private renderNewPasswordStep() {
    const t = this.localize.t;
    return html`
      <form class="flex min-h-[380px] flex-col" @submit=${this.handleResetPassword}>
        <p class="mt-3 text-xs font-semibold tracking-widest text-slate-400 uppercase">
          ${interpolate(t.forgotPassword.stepOf, { step: '3' })}
        </p>
        <h1 class="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">${t.forgotPassword.newPasswordTitle}</h1>
        <p class="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
          ${t.forgotPassword.newPasswordSubtitle}
        </p>

        ${this.passwordError
          ? html`<wa-callout variant="danger" appearance="outlined" class="mt-4">${this.passwordError}</wa-callout>`
          : null}

        <wa-input
          class="mt-5"
          type="password"
          name="newPassword"
          label=${t.forgotPassword.newPasswordLabel}
          password-toggle
          autocomplete="new-password"
          required
        ></wa-input>

        <wa-input
          class="mt-4"
          type="password"
          name="confirmPassword"
          label=${t.forgotPassword.confirmPasswordLabel}
          password-toggle
          autocomplete="new-password"
          required
        ></wa-input>

        <p class="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          ${t.forgotPassword.autoLoginHint}
        </p>

        <div class="flex-1"></div>

        <wa-button
          type="submit"
          variant="brand"
          class="block w-full"
          style="--wa-color-fill-loud:#4f46e5;"
          ?loading=${this.resettingPassword}
          ?disabled=${this.resettingPassword}
        >
          ${t.forgotPassword.resetAndContinue}
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
        <div class="relative flex w-full max-w-sm flex-col gap-6 sm:max-w-md">
          <div class="flex items-center gap-2 px-1">
            <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600">
              <span class="h-3 w-3 rounded-sm bg-white"></span>
            </span>
            <span class="text-lg font-semibold text-slate-900">Simply<span class="text-indigo-600">C</span></span>
          </div>

          <span
            class="w-fit rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold tracking-widest text-indigo-600 uppercase"
          >
            ${t.forgotPassword.badge}
          </span>

          <div class="w-full rounded-3xl bg-white p-6 shadow-xl shadow-indigo-950/10 sm:p-8">
            <wa-progress-bar
              value=${STEP_PROGRESS[this.step]}
              class="block [--indicator-color:#4f46e5] [--track-color:var(--wa-color-neutral-fill-normal)] [--track-height:0.35rem]"
            ></wa-progress-bar>

            <wa-button
              appearance="plain"
              variant="neutral"
              size="small"
              class="-ml-2 mt-3 [--wa-color-on-quiet:#64748b]"
              @click=${this.goBack}
            >
              ← ${this.step === 0 ? t.forgotPassword.backToLogin : this.localize.t.common.back}
            </wa-button>

            ${this.step === 0 ? this.renderRequestStep() : this.step === 1 ? this.renderOtpStep() : this.renderNewPasswordStep()}
          </div>
        </div>
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'forgot-password-page': ForgotPasswordPage;
  }
}
