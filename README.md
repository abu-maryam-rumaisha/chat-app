# chat-app

A chat application with a Spring Boot API backend and a Lit-based frontend, built and served as a single deployable jar.

## Project layout

- **`backend/`** — Spring Boot API (Java, PostgreSQL, Redis, RabbitMQ, WebSocket). See `backend/CLAUDE.md`.
- **`frontend/`** — Lit + Vite UI. See `frontend/CLAUDE.md`.
- **`db/migrations/`** — Flyway SQL migrations, applied against PostgreSQL.

## Build integration

The frontend is not served separately — it is compiled and folded into the Spring Boot jar:

1. `backend/pom.xml` uses the `frontend-maven-plugin` during the `generate-sources` phase to install a local Node/pnpm toolchain and run `pnpm install` + `pnpm run build` against the sibling `frontend/` project.
2. `maven-resources-plugin` then copies the Vite `dist/` output into `backend/src/main/resources/static`, which Spring Boot serves as static resources.
3. `backend/src/main/resources/static` is generated output (gitignored) — it's a build artifact, not hand-edited source.

## Stack

- **Backend**: Spring Boot 4.0.7, Java, Spring Web/Data JPA/Validation/WebSocket/AMQP/Data Redis, PostgreSQL, Flyway, Lombok, springdoc-openapi
- **Frontend**: Lit 3, Vite, TypeScript, Tailwind CSS, Web Awesome
- **Infrastructure**: PostgreSQL, Redis, RabbitMQ

## Prerequisites

- JDK (see `backend/pom.xml` for the required Java version)
- Maven
- PostgreSQL, Redis, and RabbitMQ instances reachable via the environment variables below
- Node/pnpm are installed automatically by the Maven build — a manual install is only needed for standalone frontend development (see `frontend/CLAUDE.md`)

## Running locally

Run the database migrations, then build and start the app from `backend/`:

```bash
cd backend
./mvnw flyway:migrate
./mvnw spring-boot:run
```

This builds the frontend and starts the API (serving the UI) on the configured port.

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
