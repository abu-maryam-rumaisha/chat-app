import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { Router } from '@lit-labs/router';
import { isAuthenticated } from './auth/auth.service';
import { navigate } from './router/navigate';

@customElement('app-root')
export class AppRoot extends LitElement {
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private readonly router = new Router(this, [
    {
      path: '/login',
      enter: async () => {
        if (isAuthenticated()) {
          navigate('/');
          return false;
        }
        await import('./pages/login/login-page');
        return true;
      },
      render: () => html`<login-page></login-page>`,
    },
    {
      path: '/forgot-password',
      enter: async () => {
        if (isAuthenticated()) {
          navigate('/');
          return false;
        }
        await import('./pages/forgot-password/forgot-password-page');
        return true;
      },
      render: () => html`<forgot-password-page></forgot-password-page>`,
    },
    {
      path: '/signup',
      enter: async () => {
        if (isAuthenticated()) {
          navigate('/');
          return false;
        }
        await import('./pages/signup/signup-page');
        return true;
      },
      render: () => html`<signup-page></signup-page>`,
    },
    {
      path: '/',
      enter: async () => {
        await (isAuthenticated() ? import('./pages/home/home-page') : import('./pages/welcome/welcome-page'));
        return true;
      },
      render: () => (isAuthenticated() ? html`<home-page></home-page>` : html`<welcome-page></welcome-page>`),
    },
  ]);

  protected render() {
    return html`${this.router.outlet()}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-root': AppRoot;
  }
}
