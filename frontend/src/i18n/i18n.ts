import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { Translations } from './types';
import { en } from './translations/en';
import { id } from './translations/id';

export type Locale = 'en' | 'id';

export const DEFAULT_LOCALE: Locale = 'en';

const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'id'];
const STORAGE_KEY = 'chat-app.locale';
const LOCALE_CHANGE_EVENT = 'chat-app-locale-change';

const dictionaries: Record<Locale, Translations> = { en, id };

function isLocale(value: string): value is Locale {
   return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function detectLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && isLocale(stored)) return stored;

  const browserLocale = navigator.language.slice(0, 2).toLowerCase();
  if (isLocale(browserLocale)) return browserLocale;

  return DEFAULT_LOCALE;
}

let currentLocale: Locale = detectLocale();
document.documentElement.lang = currentLocale;

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  if (locale === currentLocale) return;
  currentLocale = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale;
  window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT));
}

export function getTranslations(): Translations {
  return dictionaries[currentLocale];
}

/**
 * Splits a `{{token}}`-templated string and substitutes each token with the
 * matching value, so translations can carry embedded markup (e.g. a styled
 * `<span>`) without hardcoding sentence structure per locale.
 */
export function interpolate(template: string, values: Record<string, unknown>): unknown[] {
  return template
    .split(/(\{\{\w+\}\})/g)
    .filter((part) => part.length > 0)
    .map((part) => {
      const match = part.match(/^\{\{(\w+)\}\}$/);
      return match ? values[match[1] as string] : part;
    });
}

export class LocalizeController implements ReactiveController {
  t: Translations = getTranslations();

  constructor(private readonly host: ReactiveControllerHost) {
    this.host.addController(this);
  }

  hostConnected(): void {
    window.addEventListener(LOCALE_CHANGE_EVENT, this.handleLocaleChange);
  }

  hostDisconnected(): void {
    window.removeEventListener(LOCALE_CHANGE_EVENT, this.handleLocaleChange);
  }

  private readonly handleLocaleChange = (): void => {
    this.t = getTranslations();
    this.host.requestUpdate();
  };
}
