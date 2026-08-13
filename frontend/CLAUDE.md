# chat-app frontend

Lit-based UI for chat-app. See root `CLAUDE.md` for how this integrates with `backend/`.

## Stack

- Lit 3.3.3 + `@lit-labs/router` 0.1.4 for routing
- WebAwesome (`@awesome.me/webawesome` 3.11.0) as the component library
- Tailwind CSS 4.3.3 via `@tailwindcss/vite`
- Vite 8.2.0 + TypeScript ~6.0.2
- Package manager: **pnpm** (pinned to 11.20.0 via `packageManager` in `package.json`; `save-exact=true` in `.npmrc` — always exact-pin new deps, don't use `^`/`~` ranges when adding packages)

## Conventions

- Use WebAwesome components + Tailwind utility classes for styling; avoid hand-rolled CSS where a WebAwesome component/Tailwind utility covers it.
- Routing goes through `@lit-labs/router`, not manual `history`/hash handling.
- Keep deps exact-pinned (see `.npmrc`) rather than range-pinned.
- Always style with Tailwind utility classes, and always make styles responsive (mobile-first, use Tailwind breakpoints) — no fixed-only layouts.
- Never use TypeScript's `any`. If a type is genuinely unknown, use `unknown` and narrow it.
- Always terminate TypeScript statements with a semicolon — this includes imports/exports, variable declarations, class field/property declarations, and expression statements, not just top-level statements.
- Every type declaration is an `interface`, not a `type` alias (except where a `type` is required — e.g. unions, tuples, mapped types).
