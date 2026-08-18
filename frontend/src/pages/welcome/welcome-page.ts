import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { navigate } from '../../router/navigate';
import { LocalizeController } from '../../i18n/i18n';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/progress-bar/progress-bar.js';

@customElement('welcome-page')
export class WelcomePage extends LitElement {
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private readonly localize = new LocalizeController(this);

  private handleGetStarted(): void {
    navigate('/signup');
  }

  private handleSignIn(): void {
    navigate('/login');
  }

  protected render() {
    return html`
      <main
        class="relative flex min-h-svh items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-rose-50 p-4 sm:p-6"
      >
        <span
          class="icon-mask pointer-events-none absolute -top-6 -left-6 h-28 w-28 text-indigo-300/60 sm:h-36 sm:w-36 [--icon-url:url(/icons/diagonal-accent.svg)]"
          aria-hidden="true"
        ></span>

        <span
          class="icon-mask pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rotate-180 text-rose-300/60 sm:h-36 sm:w-36 [--icon-url:url(/icons/diagonal-accent.svg)]"
          aria-hidden="true"
        ></span>

        <div class="relative flex w-full max-w-sm flex-col gap-6 sm:max-w-md">
          <div class="flex items-center gap-2 px-1">
            <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600">
              <span class="h-3 w-3 rounded-sm bg-white"></span>
            </span>
            <span class="text-lg font-semibold text-slate-900">Simply<span class="text-indigo-600">C</span></span>
          </div>

          <div class="w-full rounded-3xl bg-white p-6 shadow-xl shadow-indigo-950/10 sm:p-8">
            <wa-progress-bar
              value="30"
              class="block [--indicator-color:#4f46e5] [--track-color:var(--wa-color-neutral-fill-normal)] [--track-height:0.35rem]"
            ></wa-progress-bar>

            <p class="mt-5 text-xs font-semibold tracking-widest text-slate-400 uppercase">
              ${this.localize.t.welcome.eyebrow}
            </p>

            <div
              class="mt-3 flex min-h-28 flex-col justify-between gap-2 rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-50 to-rose-100 p-4"
            >
              <span class="w-fit max-w-[75%] rounded-full bg-white px-4 py-2 text-sm text-slate-800 shadow-sm">
                ${this.localize.t.welcome.bubbleLate}
              </span>
              <span
                class="w-fit max-w-[75%] self-end rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
              >
                ${this.localize.t.welcome.bubbleNoWorries}
              </span>
            </div>

            <h1 class="mt-6 text-2xl font-bold text-slate-900 sm:text-3xl">${this.localize.t.welcome.title}</h1>
            <p class="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
              ${this.localize.t.welcome.subtitle}
            </p>

            <wa-button
              variant="neutral"
              appearance="accent"
              class="mt-6 block w-full"
              style="--wa-color-fill-loud: #0f172a; --wa-color-on-loud: #ffffff;"
              @click=${this.handleGetStarted}
            >
              ${this.localize.t.welcome.getStarted}
            </wa-button>

            <wa-button
              appearance="plain"
              variant="brand"
              class="mt-3 block w-full [--wa-color-on-quiet:#4f46e5] [--wa-font-weight-action:var(--wa-font-weight-semibold)]"
              @click=${this.handleSignIn}
            >
              ${this.localize.t.welcome.haveAccount}
            </wa-button>
          </div>
        </div>
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'welcome-page': WelcomePage;
  }
}
