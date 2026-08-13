# chat-app

A chat application with a Spring Boot API backend and a Lit-based frontend, built and served as a single deployable jar.

## Project layout

- **`backend/`** — Spring Boot API (Java, PostgreSQL, Redis, RabbitMQ, WebSocket). See `backend/CLAUDE.md`.
- **`frontend/`** — Lit + Vite UI. See `frontend/CLAUDE.md`.
- **`db/migrations/`** — Flyway SQL migrations, applied against PostgreSQL.

## Build integration

The frontend is not served separately — it is folded into the Spring Boot jar:

1. Build the frontend yourself first: `pnpm install --frozen-lockfile` + `pnpm run build` in `frontend/` (see `frontend/CLAUDE.md`). Maven no longer drives this step.
2. `backend/pom.xml`'s `maven-resources-plugin` then copies the Vite `dist/` output into `backend/src/main/resources/static` during the `generate-sources` phase, which Spring Boot serves as static resources.
3. `backend/src/main/resources/static` is generated output (gitignored) — it's a build artifact, not hand-edited source.

## Stack

- **Backend**: Spring Boot 4.0.7, Java, Spring Web/Data JPA/Validation/WebSocket/AMQP/Data Redis, PostgreSQL, Flyway, Lombok, springdoc-openapi
- **Frontend**: Lit 3, Vite, TypeScript, Tailwind CSS, Web Awesome
- **Infrastructure**: PostgreSQL, Redis, RabbitMQ

## Prerequisites

- JDK (see `backend/pom.xml` for the required Java version)
- Maven
- Node/pnpm (see `frontend/CLAUDE.md`) — required to build the frontend, Maven no longer installs these
- PostgreSQL, Redis, and RabbitMQ instances reachable via the environment variables below

## Running locally

Build the frontend, run the database migrations, then build and start the app from `backend/`:

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm run build

cd ../backend
./mvnw flyway:migrate
./mvnw spring-boot:run
```

This starts the API (serving the UI built above) on the configured port.

### Configuration

Key environment variables (see `backend/src/main/resources/application.yaml` for the full list and defaults):

| Variable | Purpose |
|---|---|
| `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` | PostgreSQL connection |
| `REDIS_URL`, `REDIS_PORT` | Redis connection |
| `SESSION_TOKEN_TTL`, `SESSION_REFRESH_TOKEN_TTL` | Auth session token lifetimes |
| `OTP_TTL` | OTP validity window |
| `EMAIL_API_KEY`, `EMAIL_API_URL`, `EMAIL_FROM_ADDRESS` | Transactional email provider (Brevo) for OTP delivery |
| `PASSWORD_RESET_TOKEN_TTL` | Password reset token lifetime |
| `UPLOAD_ICONS_DIR` | Local directory for uploaded icons |

## API docs

Once running, OpenAPI/Swagger UI is available via springdoc-openapi's default endpoints (`/v3/api-docs`, `/swagger-ui.html`).