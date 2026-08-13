/**
 * Programmatic navigation for use outside of `<a>` clicks (e.g. form
 * submissions, button handlers). `@lit-labs/router`'s `Router` only
 * intercepts link clicks and real `popstate` events, so we push the new
 * location and dispatch a synthetic `popstate` to let it pick up the change.
 */
export function navigate(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
