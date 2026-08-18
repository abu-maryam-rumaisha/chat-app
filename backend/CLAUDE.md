# chat-app backend

Spring Boot API for chat-app. See root `CLAUDE.md` for how this integrates with `frontend/`.

## Stack

- Spring Boot 4.0.7, Java 25
- spring-boot-starter-web, data-jpa, validation, websocket, amqp, data-redis
- PostgreSQL (`org.postgresql`), Flyway migrations in `db/migrations` (flyway-maven-plugin)
- Lombok, spring-security-crypto, springdoc-openapi (2.5.0)

## Build integration

`pom.xml` uses the `frontend-maven-plugin` during `generate-sources` to build `../frontend` with pnpm, then `maven-resources-plugin` copies its `dist/` output into `src/main/resources/static`. `src/main/resources/static` is generated output — treat it as a build artifact, not hand-edited source (see root `CLAUDE.md` for details).

## Coding rules

- Never buffer generated file content (images, compressed files, reports, etc.) in application memory as `byte[]`. Write it to disk (or stream it directly) and hand back an `InputStreamResource`/similar instead — holding the full bytes in the JVM heap doesn't scale with file size.
- For columns with a fixed set of values (e.g. a `status` column), use a Java `enum` mapped with `@Enumerated(EnumType.STRING)` instead of a raw `String` field — don't represent fixed value sets as strings.
- For JSON request/response bodies, define a dedicated class (a record or DTO) instead of using `Map<String, Object>` — don't represent JSON payloads as maps.
- Put data-access logic in a dedicated component class suffixed `Repository` (not inline in services/controllers).
- Don't put `@Transactional` on service methods — they also do non-DB work (Redis, HTTP calls, file I/O) and a service-level transaction holds a DB connection open across all of it. Instead, put insert/update/delete methods in a dedicated `*RepositoryWriter` class (e.g. `UserRepositoryWriter`/`DefaultUserRepositoryWriter`) separate from the read-only `*Repository`, and annotate each write method (not the class) with `@Transactional`. If a single logical write spans multiple inserts/updates that must be atomic (e.g. creating a conversation plus its participants), expose one composite method on the writer that performs them all, rather than having the caller invoke several writer methods separately — separate calls each run in their own transaction.
- For working with time/date, always use `java.time` classes instead of `java.util` (e.g. `Date`, `Calendar`), and use `ZoneOffset.UTC` for zone time.
- For an insert guarded by a unique constraint (e.g. a dedup/signature key), run the insert in its own transaction; if it fails with a constraint violation, catch it and fall back to a select by that unique key instead of letting the failure propagate — this handles concurrent duplicate inserts without a racy check-then-insert.
