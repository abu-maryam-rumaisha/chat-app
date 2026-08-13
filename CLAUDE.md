# chat-app

Spring Boot chat application with a Lit-based frontend, split into two top-level projects:

- **`backend/`** — Spring Boot API. See `backend/CLAUDE.md`.
- **`frontend/`** — Lit + Vite UI. See `frontend/CLAUDE.md`.

## Build integration

The frontend is not served separately — it is compiled and folded into the Spring Boot jar:

1. `backend/pom.xml` uses the `frontend-maven-plugin` (`com.github.eirslett`) during the `generate-sources` phase to install a local Node/pnpm toolchain and run `pnpm install` + `pnpm run build` against the sibling `frontend/` project.
2. `maven-resources-plugin` then copies the Vite `dist/` output into `backend/src/main/resources/static`, which Spring Boot serves as static resources.
3. `backend/src/main/resources/static` is generated output (gitignored) — treat it as a build artifact, not hand-edited source. Don't edit files there directly; edit `frontend/src` instead.
