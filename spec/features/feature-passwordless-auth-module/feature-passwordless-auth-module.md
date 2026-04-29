# Feature: Passwordless Auth Module

## Goal

Allow registered users to log in with only their email address. After the user submits an email, the system sends a one-time code to that email. The user submits the code to receive a JWT access token.

## Context

Ponto Menos currently supports user registration and punch event creation, but it does not provide a login flow. Punch events already rely on JWT identity, so the Auth module should become the source of those tokens.

Check-in and checkout do not need separate persisted types for the MVP. They can be derived from the user's punch event count:

- Even number of events: no open work session.
- Odd number of events: checkout is pending.

## Proposed API

### `POST /auth/request-code`

Request body:

```json
{
  "emailAddress": "user@example.com"
}
```

Behavior:

- Validate that `emailAddress` is present and valid.
- Normalize `emailAddress` with `trim().toLowerCase()` before any processing.
- Return `202` for valid email formats, whether or not the user exists, to avoid account enumeration.
- Generate a one-time numeric code only when the user exists.
- Store the code with expiration and attempt metadata.
- Invalidate any previous active code for that user when a new code is requested.
- Only one active login code may exist per normalized email address.
- Send the code to the user's email only when the user exists.

### `POST /auth/login`

Request body:

```json
{
  "emailAddress": "user@example.com",
  "code": "123456"
}
```

Behavior:

- Validate that `emailAddress` and `code` are present and valid.
- Normalize `emailAddress` with `trim().toLowerCase()` before any processing.
- Reject code values that are not exactly 6 numeric digits with `400`.
- Validate the code for the email address.
- Reject missing active codes, expired codes, consumed codes, and wrong codes with `401`.
- Reject blocked codes with `429`.
- Consume the code after successful use.
- Return a JWT access token containing `emailAddress` and `companyId` claims.

Response body:

```json
{
  "accessToken": "<jwt>"
}
```

## Prerequisites

The following changes to existing modules are required before or as part of this feature. They are in scope.

### 1. Normalize emails at user registration

`UserService.registerUser` must normalize `dto.emailAddress` with `trim().toLowerCase()` before persisting. This ensures auth lookup by normalized email always finds the correct user. Without this, users registered with mixed-case emails would silently fail to log in.

### 2. Align PunchinService JWT fallback secret

`PunchinService.resolveEmail` currently falls back to `'my-super-secret-key'` when `JWT_SECRET` is not set. This fallback must be changed to `'dev-secret'` so that auth-issued tokens and punch-in verification use the same secret in local development. The change is a single-line edit in `src/punchin/punchin.service.ts`.

## Implementation Plan

1. **Prerequisite:** Normalize email in `UserService.registerUser` (trim + lowercase before save and lookup).
2. **Prerequisite:** Change `PunchinService` JWT fallback from `'my-super-secret-key'` to `'dev-secret'`.
3. Create `AuthModule` and import it in `AppModule`.
4. Add `AuthController` with `requestCode` and `login` endpoints.
5. Add `AuthService` for code generation, validation, consumption, and token signing.
6. Add DTOs: `RequestLoginCodeDto` and `LoginWithCodeDto`.
7. Add `AuthCodeRepositoryPort` with `save`, `findActiveByEmail`, `consume`, `incrementAttempts`, and `invalidateActiveByEmail`.
8. Implement `InMemoryAuthCodeRepository`, matching the current repository style.
9. Add `EmailSenderPort`; use a logging implementation for local development.
10. Move JWT settings to environment variables: `JWT_SECRET` and `JWT_EXPIRES_IN`.
11. Later, update punch endpoints to read `Authorization: Bearer <token>` instead of `authToken` in the request body.

## Acceptance Criteria

- Registered users can request a login code.
- Unknown users receive a generic `202` from code request but no code is stored or sent.
- Valid codes return a JWT.
- JWTs include `emailAddress` and `companyId`.
- Missing email or code fields are rejected with `400`.
- Wrong, expired, or reused codes are rejected.
- Missing active login codes are rejected.
- Invalid code format is rejected with `400`.
- Codes are single-use.
- New login-code requests invalidate previous active codes for the same user.
- Code attempts are limited.
- Auth tests cover success, unknown user, invalid payloads, invalid code, expired code, reused code, replacement code, JWT claims, and attempt limit.

## Final Implementation Rules

### Code lifecycle

- Login codes are exactly 6 numeric digits, for example `123456`.
- Login codes expire after 10 minutes.
- A code is valid only while `now < expiresAt`; it is expired when `now >= expiresAt`.
- A login code allows up to 5 failed attempts.
- Wrong codes increment attempts.
- Expired, consumed, blocked, missing, and invalid-format codes do not increment attempts.
- Once a login code reaches the failed-attempt limit, it is blocked. Further login attempts for that code return `429`, even if the submitted code matches.
- Only one active login code may exist per normalized email address.
- Requesting a new code invalidates previous active codes before storing the new code.

### Active code definition

An **active** code satisfies all of the following:

- `consumedAt` is `null`.
- `invalidatedAt` is `null`.
- `expiresAt > now` (not expired).

A code with `attempts >= 5` (blocked) is still considered active by the repository layer. The service layer is responsible for checking the attempt count and returning `429` when the code is blocked. This ensures the `429` status code is used instead of `401` (missing code).

### JWT

- JWT access tokens expire after 1 hour unless `JWT_EXPIRES_IN` is configured.
- JWT payloads include exactly these domain claims: `emailAddress` and `companyId`.
- Use the raw `jsonwebtoken` library for signing and verification, matching the existing `PunchinService` pattern. Do not introduce `@nestjs/jwt` in this feature.
- `JWT_SECRET` is required when `NODE_ENV === "production"`. Local development and tests may use the fallback `'dev-secret'`.
- The production guard must throw an error in `AuthModule.onModuleInit()` if `NODE_ENV` is `"production"` and `JWT_SECRET` is not set. This makes the failure testable via the NestJS lifecycle.

### Email handling

- Email addresses are normalized with `trim().toLowerCase()` before lookup and code storage.
- `POST /auth/request-code` returns `202` with `{ "message": "If the email is registered, a login code will be sent." }`.
- `AuthService` looks up users via `UserService.findUserByEmailAddress`. When that method throws `NotFoundException` (user does not exist), `AuthService` must catch the exception silently and return the generic `202` without storing a code or sending an email. The exception must not propagate to the controller.

### Email sending

- The first email sender implementation logs the code with `pino`; real SMTP or provider integration is out of scope for this MVP.

### Error responses

- Error responses can use NestJS default shapes.
- Tests should assert status codes and key response fields, not exact default NestJS error response bodies.

### Storage

- In-memory code storage may store the plain code for the MVP; production persistence should store a hash.

### Rate limiting

- Request-code rate limiting is out of scope for this feature.

## Data Contracts

### `AuthCode` model

Defined as a TypeScript `interface` in `src/auth/auth-code.model.ts`, following the `User` model pattern. No `id` field — `emailAddress` is the natural key for the in-memory MVP.

Fields:

| Field | Type | Description |
|---|---|---|
| `emailAddress` | `string` | Normalized email address. |
| `code` | `string` | 6-digit numeric code as a string to preserve leading zeros. |
| `expiresAt` | `Date` | Expiration timestamp (10 minutes after creation). |
| `consumedAt` | `Date \| null` | Set after successful login; `null` until consumed. |
| `attempts` | `number` | Failed attempt count, starts at `0`. |
| `invalidatedAt` | `Date \| null` | Set when replaced by a newer code; `null` while current. |
| `createdAt` | `Date` | Creation timestamp. |

### `AuthCodeRepositoryPort`

Defined as a **standalone abstract class** in `src/auth/authcode.repository.port.ts`. Does **not** extend `Repository<T>` from `src/common/interfaces/repository.interface.ts` because the generic CRUD methods (`findById`, `findAll`, `update`, `delete`, `count`) are not applicable to auth codes.

Methods:

| Method | Signature | Description |
|---|---|---|
| `save` | `save(authCode: AuthCode): Promise<AuthCode>` | Persist a new auth code. |
| `findActiveByEmail` | `findActiveByEmail(emailAddress: string): Promise<AuthCode \| null>` | Return the single active code for the email, or `null`. Active means: `consumedAt` is `null`, `invalidatedAt` is `null`, and `expiresAt > now`. Blocked codes (attempts ≥ 5) are still returned. |
| `consume` | `consume(authCode: AuthCode): Promise<void>` | Set `consumedAt` to the current timestamp. |
| `incrementAttempts` | `incrementAttempts(authCode: AuthCode): Promise<void>` | Increment `attempts` by 1. |
| `invalidateActiveByEmail` | `invalidateActiveByEmail(emailAddress: string): Promise<void>` | Set `invalidatedAt` on the current active code for the email, if one exists. |

### `EmailSenderPort`

Defined as an abstract class in `src/auth/email-sender.port.ts`.

| Method | Signature |
|---|---|
| `sendLoginCode` | `sendLoginCode(emailAddress: string, code: string, expiresAt: Date): Promise<void>` |

## Module Wiring

### `AuthModule`

```
imports: [UserModule]
controllers: [AuthController]
providers:
  - AuthService
  - { provide: AuthCodeRepositoryPort, useClass: InMemoryAuthCodeRepository }
  - { provide: EmailSenderPort, useClass: LoggingEmailSender }
```

`AuthModule` imports `UserModule` to access `UserService` via dependency injection, following the same cross-module pattern used by `PunchinModule`.

### `AppModule`

Add `AuthModule` to `imports`:

```typescript
@Module({
  imports: [PunchinModule, UserModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## File Structure

```
src/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── auth.service.spec.ts
├── auth-code.model.ts
├── authcode.repository.port.ts
├── inmemory.authcode.repository.ts
├── email-sender.port.ts
├── logging-email-sender.ts
└── dto/
    ├── request-login-code.dto.ts
    └── login-with-code.dto.ts
```

## Swagger & Observability

### Swagger

Add `@ApiTags('auth')`, `@ApiOperation`, and `@ApiResponse` decorators to `AuthController` endpoints to match the existing Swagger setup in `main.ts`.

### Prometheus Metrics

Add basic Prometheus metrics to `AuthService` following the `UserService` pattern:

| Metric | Type | Description |
|---|---|---|
| `auth_request_code_total` | Counter | Total login code requests (includes unknown-user requests). |
| `auth_login_success_total` | Counter | Successful logins. |
| `auth_login_fail_total` | Counter | Failed logins (wrong code, expired, consumed, blocked, missing). |
| `auth_login_duration_seconds` | Histogram | Duration of login attempts. |

## Code Generation

One-time code generation must use a cryptographically secure random source, such as Node's `crypto.randomInt`, and preserve leading zeros so every code is exactly 6 digits.

Example:

```typescript
import { randomInt } from 'crypto';

function generateLoginCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}
```

## Gherkin Scenarios

The scenarios below serve as the **authoritative specification**. They are implemented as Jest unit and e2e tests, not as Cucumber step definitions. The standalone `passwordless-auth-module.feature` file is kept for readability but is not executed directly.

```gherkin
Feature: Passwordless authentication
  Registered users can request a one-time email code and exchange it for a JWT.

  Background:
    Given a registered user exists with email "user@example.com" and companyId 123

  Scenario: Registered user requests a login code
    When the user requests a login code for "user@example.com"
    Then the response status should be 202
    And the response message should be "If the email is registered, a login code will be sent."
    And a one-time code should be stored for "user@example.com"
    And the stored login code should be exactly 6 numeric digits
    And the login code should expire 10 minutes after it was created
    And the login code should start with 0 failed attempts
    And an email containing the code should be sent to "user@example.com"
    And the login code should be logged for local delivery

  Scenario: User logs in with a valid code
    Given an active login code "123456" exists for "user@example.com"
    When the user logs in with email "user@example.com" and code "123456"
    Then the response status should be 200
    And the response should contain an access token
    And the access token should include exactly the domain claims emailAddress "user@example.com" and companyId 123
    And the access token should expire in 1 hour
    And the code "123456" should be consumed

  Scenario: Configured JWT expiration is used
    Given JWT_EXPIRES_IN is configured as "15m"
    And an active login code "123456" exists for "user@example.com"
    When the user logs in with email "user@example.com" and code "123456"
    Then the response status should be 200
    And the access token should expire in "15m"

  Scenario: Production requires a JWT secret
    Given NODE_ENV is "production"
    And JWT_SECRET is not configured
    When the auth module starts
    Then startup should fail with an error in onModuleInit because JWT_SECRET is required

  Scenario: Unknown email receives generic response without a usable code
    When the user requests a login code for "missing@example.com"
    Then the response status should be 202
    And the response message should be "If the email is registered, a login code will be sent."
    And no login code should be stored for "missing@example.com"
    And no email should be sent to "missing@example.com"

  Scenario: AuthService catches NotFoundException for unknown users
    When the user requests a login code for "missing@example.com"
    Then UserService.findUserByEmailAddress should throw NotFoundException
    And AuthService should catch the exception silently
    And the response status should be 202

  Scenario: Email is normalized before requesting a code
    When the user requests a login code for " USER@EXAMPLE.COM "
    Then the response status should be 202
    And a one-time code should be stored for "user@example.com"
    And no login code should be stored for " USER@EXAMPLE.COM "
    And an email containing the code should be sent to "user@example.com"

  Scenario: Email is normalized before login
    Given an active login code "123456" exists for "user@example.com"
    When the user logs in with email " USER@EXAMPLE.COM " and code "123456"
    Then the response status should be 200
    And the access token should include exactly the domain claims emailAddress "user@example.com" and companyId 123
    And the code "123456" should be consumed

  Scenario: Missing email is rejected when requesting a code
    When the user requests a login code without an email
    Then the response status should be 400
    And no login code should be stored

  Scenario: Invalid email format is rejected when requesting a code
    When the user requests a login code for "not-an-email"
    Then the response status should be 400
    And no login code should be stored

  Scenario: Missing email is rejected during login
    Given an active login code "123456" exists for "user@example.com"
    When the user logs in without an email and code "123456"
    Then the response status should be 400
    And no access token should be returned

  Scenario: Missing code is rejected during login
    When the user logs in with email "user@example.com" and no code
    Then the response status should be 400
    And no access token should be returned

  Scenario: Invalid email format is rejected during login
    When the user logs in with email "not-an-email" and code "123456"
    Then the response status should be 400
    And no access token should be returned

  Scenario Outline: Invalid code format is rejected during login
    Given an active login code "123456" exists for "user@example.com"
    When the user logs in with email "user@example.com" and code "<code>"
    Then the response status should be 400
    And no access token should be returned
    And the failed attempt count should not increase

    Examples:
      | code    |
      | abc123  |
      | 12345   |
      | 1234567 |
      | 123 456 |

  Scenario: Missing active code is rejected during login
    Given no active login code exists for "user@example.com"
    When the user logs in with email "user@example.com" and code "123456"
    Then the response status should be 401
    And no access token should be returned
    And the failed attempt count should not increase

  Scenario: Wrong code is rejected
    Given an active login code "123456" exists for "user@example.com"
    When the user logs in with email "user@example.com" and code "000000"
    Then the response status should be 401
    And the code "123456" should not be consumed
    And the failed attempt count should increase

  Scenario: Expired code is rejected at the expiration boundary
    Given a login code "123456" exists for "user@example.com" that expires at the current instant
    When the user logs in with email "user@example.com" and code "123456"
    Then the response status should be 401
    And the response should explain that the code is expired or invalid
    And the failed attempt count should not increase

  Scenario: Expired code is rejected after the expiration boundary
    Given an expired login code "123456" exists for "user@example.com"
    When the user logs in with email "user@example.com" and code "123456"
    Then the response status should be 401
    And the response should explain that the code is expired or invalid
    And the failed attempt count should not increase

  Scenario: Reused code is rejected
    Given a consumed login code "123456" exists for "user@example.com"
    When the user logs in with email "user@example.com" and code "123456"
    Then the response status should be 401
    And no access token should be returned
    And the failed attempt count should not increase

  Scenario: Too many invalid attempts blocks the code
    Given an active login code "123456" exists for "user@example.com"
    And the code has reached the maximum of 5 failed attempts
    When the user logs in with email "user@example.com" and code "123456"
    Then the response status should be 429
    And no access token should be returned
    And the failed attempt count should not increase

  Scenario: Blocked code is found by findActiveByEmail but rejected by service
    Given an active login code "123456" exists for "user@example.com"
    And the code has reached the maximum of 5 failed attempts
    When findActiveByEmail is called for "user@example.com"
    Then the code "123456" should be returned
    And the service should reject the login with 429

  Scenario: Requesting a new code invalidates the previous active code
    Given an active login code "123456" exists for "user@example.com"
    When the user requests a login code for "user@example.com"
    Then the response status should be 202
    And the response message should be "If the email is registered, a login code will be sent."
    And the code "123456" should be invalidated
    And a new one-time code should be stored for "user@example.com"
    And only one active login code should exist for "user@example.com"
```

## Validation

Run:

```bash
npm test
npm run test:e2e
npm run lint
npm run build
```

Note: `npx cucumber-js` is not used. The `.feature` file is a specification document only. All scenarios are implemented as Jest tests.

## Implementation Assumptions

- User lookup for auth uses the existing `User` domain as the source of truth. Email normalization (`trim().toLowerCase()`) is applied at registration time (prerequisite 1) and at auth lookup time, ensuring consistent matching.
- `companyId` follows the current `User.companyId` contract in `src/user/user.model.ts`, which is `number`. The Gherkin examples use `companyId 123` (numeric). If the user model changes to `string`, update the scenarios accordingly.
- Auth-issued JWTs and punch-in JWT validation use the same signing secret. Both the auth module and `PunchinService` use `JWT_SECRET` with the same fallback `'dev-secret'` (prerequisite 2 aligns the PunchinService fallback).
- Updating punch endpoints to read `Authorization: Bearer <token>` is out of scope for this feature's first implementation, matching the implementation plan's "Later" item. Initial auth work creates valid tokens without changing the current punch-in request DTO.
- One-time code generation uses a cryptographically secure random source (`crypto.randomInt`) and preserves leading zeros so every code is exactly 6 digits.
- `AuthCodeRepositoryPort` is a standalone abstract class that does not extend `Repository<T>`, since the generic CRUD interface does not apply to auth codes.
- `AuthModule` imports `UserModule` to inject `UserService`, following the cross-module pattern used by `PunchinModule`.
- `AuthService` catches `NotFoundException` thrown by `UserService.findUserByEmailAddress` when the user does not exist, suppresses it, and returns the generic 202 response.
- JWT signing uses the raw `jsonwebtoken` library, matching the existing `PunchinService` pattern. `@nestjs/jwt` is not introduced in this feature.
- The production `JWT_SECRET` guard throws in `AuthModule.onModuleInit()`.
- The `AuthCode.code` field is typed as `string` to preserve leading zeros.
- The `.feature` file is a specification document; all scenarios are implemented as Jest unit and e2e tests, not Cucumber step definitions.