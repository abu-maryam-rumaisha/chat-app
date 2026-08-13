# chat-app backend

Spring Boot API for chat-app. See root `CLAUDE.md` for how this integrates with `frontend/`.

## Stack

- Spring Boot 4.0.7, Java 24
- spring-boot-starter-web, data-jpa, validation, websocket, amqp, data-redis
- PostgreSQL (`org.postgresql`), Flyway migrations in `db/migrations` (flyway-maven-plugin)
- Lombok, spring-security-crypto, springdoc-openapi (2.5.0)

## Build integration

`pom.xml` uses the `frontend-maven-plugin` during `generate-sources` to build `../frontend` with pnpm, then `maven-resources-plugin` copies its `dist/` output into `src/main/resources/static`. `src/main/resources/static` is generated output — treat it as a build artifact, not hand-edited source (see root `CLAUDE.md` for details).

## Coding rules

- Never buffer generated file content (images, compressed files, reports, etc.) in application memory as `byte[]`. Write it to disk (or stream it directly) and hand back an `InputStreamResource`/similar instead — holding the full bytes in the JVM heap doesn't scale with file size.
- For columns with a fixed set of values (e.g. a `status` column), use a Java `enum` mapped with `@Enumerated(EnumType.STRING)` instead of a raw `String` field — don't represent fixed value sets as strings.
- For JSON request/response bodies, define a dedicated class (a record or DTO) instead of using `Map<String, Object>` — don't represent JSON payloads as maps.
