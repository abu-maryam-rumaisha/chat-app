import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { createRef, ref } from 'lit/directives/ref.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { checkEmailAvailability, completeSignup, sendOtp, signup, verifyOtp } from '../../auth/auth.service';
import { navigate } from '../../router/navigate';
import { LocalizeController, interpolate } from '../../i18n/i18n';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/callout/callout.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/otp-input/otp-input.js';
import '@awesome.me/webawesome/dist/components/avatar/avatar.js';
import '@awesome.me/webawesome/dist/components/progress-bar/progress-bar.js';

type Step = 0 | 1;

const RESEND_SECONDS = 30;
const STEP_PROGRESS: Record<Step, number> = { 0: 50, 1: 100 };

const { timeZone, locale } = Intl.DateTimeFormat().resolvedOptions();

@customElement('signup-page')
export class SignupPage extends LitElement {
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  @state()
  private step: Step = 0;

  @state()
  private email = '';

  @state()
  private password = '';

  @state()
  private displayName = '';

  @state()
  private status = '';

  @state()
  private timezone = timeZone;

  @state()
  private language = locale;

  @state()
  private avatarImage: string | null = null;

  private avatarFile: File | null = null;

  @state()
  private profileError: string | null = null;

  @state()
  private submittingProfile = false;

  @state()
  private emailError: string | null = null;

  @state()
  private checkingEmail = false;

  private emailAvailabilityCache: { email: string; available: boolean } | null = null;

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

  private readonly localize = new LocalizeController(this);
  private readonly fileInputRef = createRef<HTMLInputElement>();
  private resendTimer: ReturnType<typeof setInterval> | undefined;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    clearInterval(this.resendTimer);
  }

  private get initials(): string {
    const parts = this.displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return (first + last).toUpperCase();
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
      navigate('/');
      return;
    }
    this.step = 0;
  }

  private handleUploadClick(): void {
    this.fileInputRef.value?.click();
  }

  private handleFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarImage = typeof reader.result === 'string' ? reader.result : null;
    };
    reader.readAsDataURL(file);
  }

  private async verifyEmailAvailability(email: string): Promise<boolean> {
    if (this.emailAvailabilityCache?.email === email) {
      return this.emailAvailabilityCache.available;
    }

    this.checkingEmail = true;
    try {
      const available = await checkEmailAvailability(email);
      this.emailAvailabilityCache = { email, available };
      return available;
    } catch {
      this.emailAvailabilityCache = null;
      return true;
    } finally {
      this.checkingEmail = false;
    }
  }

  private async handleEmailBlur(event: FocusEvent): Promise<void> {
    const input = event.currentTarget as HTMLElementTagNameMap['wa-input'];
    const email = (input.value ?? '').trim();
    this.emailError = null;
    if (!email) return;

    const available = await this.verifyEmailAvailability(email);
    if (!available) {
      this.emailError = this.localize.t.signup.emailErrorTaken;
    }
  }

  private async handleSubmitProfile(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.profileError = null;
    this.emailError = null;

    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);

    const email = String(data.get('email') ?? '').trim();
    if (!email) {
      this.profileError = this.localize.t.signup.emailErrorEmpty;
      return;
    }

    const password = String(data.get('password') ?? '');
    if (!password) {
      this.profileError = this.localize.t.signup.passwordErrorEmpty;
      return;
    }

    const displayName = String(data.get('displayName') ?? '').trim();
    if (!displayName) {
      this.profileError = this.localize.t.signup.profileErrorEmpty;
      return;
    }

    this.submittingProfile = true;

    const available = await this.verifyEmailAvailability(email);
    if (!available) {
      this.emailError = this.localize.t.signup.emailErrorTaken;
      this.submittingProfile = false;
      return;
    }

    this.email = email;
    this.password = password;
    this.displayName = displayName;
    this.status = String(data.get('status') ?? '').trim();
    this.timezone = String(data.get('timezone') ?? '').trim();
    this.language = String(data.get('language') ?? '').trim();

    try {
      await signup({
        email: this.email,
        password: this.password,
        displayName: this.displayName,
        timezone: this.timezone,
        language: this.language,
        icon: this.avatarFile,
      });
      await sendOtp('email', this.email);
    } catch (error) {
      this.profileError = error instanceof Error ? error.message : this.localize.t.signup.signupError;
      return;
    } finally {
      this.submittingProfile = false;
    }

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
      this.otpError = this.localize.t.signup.otpErrorEmpty;
      return;
    }

    this.verifyingOtp = true;
    try {
      await verifyOtp('email', this.email, this.otpValue);
      await completeSignup({
        email: this.email,
        password: this.password,
        displayName: this.displayName,
        timezone: this.timezone,
        language: this.language,
      });
    } catch (error) {
      this.otpError = error instanceof Error ? error.message : this.localize.t.signup.otpVerifyError;
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
      await sendOtp('email', this.email);
    } catch (error) {
      this.otpError = error instanceof Error ? error.message : this.localize.t.signup.otpSendError;
      return;
    } finally {
      this.resendingCode = false;
    }

    this.startResendCountdown();
  }

  private renderProfileStep() {
    const t = this.localize.t;
    return html`
      <form class="flex min-h-[380px] flex-col" @submit=${this.handleSubmitProfile}>
        <p class="mt-3 text-xs font-semibold tracking-widest text-slate-400 uppercase">
          ${interpolate(t.signup.stepOf, { step: '1' })}
        </p>
        <h1 class="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">${t.signup.profileTitle}</h1>
        <p class="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">${t.signup.profileSubtitle}</p>

        ${this.profileError
          ? html`<wa-callout variant="danger" appearance="outlined" class="mt-4">${this.profileError}</wa-callout>`
          : null}

        <div class="mt-5 flex items-center gap-4">
          <wa-avatar
            shape="circle"
            initials=${this.initials}
            image=${ifDefined(this.avatarImage ?? undefined)}
            style="--size:4.5rem; --wa-color-neutral-fill-normal:#4f46e5; --wa-color-neutral-on-normal:#ffffff;"
          ></wa-avatar>
          <input
            ${ref(this.fileInputRef)}
            type="file"
            accept="image/*"
            class="hidden"
            @change=${this.handleFileChange}
          />
          <wa-button
            appearance="filled"
            variant="brand"
            size="small"
            style="--wa-color-fill-normal:#eef2ff; --wa-color-on-normal:#4f46e5;"
            @click=${this.handleUploadClick}
          >
            ${t.signup.uploadPhoto}
          </wa-button>
        </div>

        <wa-input
          class="mt-5"
          type="email"
          name="email"
          label=${t.signup.emailLabel}
          value=${this.email}
          hint=${this.checkingEmail ? t.signup.emailChecking : ''}
          required
          @blur=${this.handleEmailBlur}
        ></wa-input>
        ${this.emailError ? html`<p class="mt-1 text-xs text-red-600">${this.emailError}</p>` : null}
        <wa-input
          class="mt-4"
          type="password"
          name="password"
          label=${t.signup.passwordLabel}
          value=${this.password}
          required
        ></wa-input>
        <wa-input
          class="mt-4"
          name="displayName"
          label=${t.signup.displayNameLabel}
          value=${this.displayName}
          required
        ></wa-input>
        <wa-input
          class="mt-4"
          name="status"
          label=${t.signup.statusLabel}
          placeholder=${t.signup.statusPlaceholder}
          value=${this.status}
        ></wa-input>
        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <wa-input name="timezone" label=${t.signup.timezoneLabel} value=${this.timezone}></wa-input>
          <wa-input name="language" label=${t.signup.languageLabel} value=${this.language}></wa-input>
        </div>

        <p class="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          ${t.signup.onlineHint}
        </p>

        <div class="flex-1"></div>

        <wa-button
          type="submit"
          variant="brand"
          class="mt-4 block w-full"
          style="--wa-color-fill-loud:#4f46e5;"
          ?loading=${this.submittingProfile}
          ?disabled=${this.submittingProfile}
        >
          ${t.signup.submitLabel}
        </wa-button>
      </form>
    `;
  }

  private renderOtpStep() {
    const t = this.localize.t;
    const targetText = interpolate(t.signup.otpTargetEmail, { email: this.email });

    return html`
      <form class="flex min-h-[380px] flex-col" @submit=${this.handleVerifyOtp}>
        <p class="mt-3 text-xs font-semibold tracking-widest text-slate-400 uppercase">
          ${interpolate(t.signup.stepOf, { step: '2' })}
        </p>
        <h1 class="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">${t.signup.otpTitle}</h1>
        <p class="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
          ${interpolate(t.signup.otpSubtitle, {
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
          ${t.signup.resendPrompt}
          ${this.secondsLeft > 0
            ? html`<span class="font-semibold text-slate-400"
                >${interpolate(t.signup.resendCountdown, {
                  time: `0:${this.secondsLeft.toString().padStart(2, '0')}`,
                })}</span
              >`
            : html`<button
                type="button"
                class="font-semibold text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-indigo-300"
                ?disabled=${this.resendingCode}
                @click=${this.handleResend}
              >
                ${t.signup.resendButton}
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
          ${t.signup.verify}
        </wa-button>
      </form>
    `;
  }

  protected render() {
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
              ← ${this.localize.t.common.back}
            </wa-button>

            ${this.step === 0 ? this.renderProfileStep() : this.renderOtpStep()}
          </div>
        </div>
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'signup-page': SignupPage;
  }
}
