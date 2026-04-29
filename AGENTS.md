# Repository Guidelines

## Project Structure & Module Organization

This is a NestJS TypeScript service. Application code lives in `src/`, grouped by domain:

- `src/user/`: user controller, service, repositories, DTOs, validators, and specs.
- `src/punchin/`: punch-in controller, service, repositories, DTOs, model, and specs.
- `src/common/`: shared interfaces and reusable contracts.
- `src/main/resources/`: runtime resources such as Prometheus config.
- `test/`: end-to-end Jest specs and request helper scripts.
- `spec/`: domain, architecture, feature, and bug notes.
- `grafana/`: local monitoring provisioning.

Generated outputs such as `dist/` and `coverage/` should not be edited by hand.

## Build, Test, and Development Commands

Use npm scripts from `package.json`:

- `npm run start:dev`: run the app in watch mode.
- `npm run build`: compile the app into `dist/`.
- `npm run lint`: run ESLint with auto-fix for TypeScript files.
- `npm run format`: format `src/**/*.ts` and `test/**/*.ts` with Prettier.
- `npm test`: run unit tests under `src/`.
- `npm run test:e2e`: run e2e specs using `test/jest-e2e.json`.
- `npm run test:cov`: run Jest with coverage output in `coverage/`.

Use `docker-compose.yaml` for local infrastructure checks.

## Coding Style & Naming Conventions

Follow NestJS conventions: modules use `*.module.ts`, controllers use `*.controller.ts`, services use `*.service.ts`, DTOs live in `dto/`, and repository abstractions use `*.repository.port.ts`. Prefer domain-focused names such as `user.service.ts` or `mongopunchin.repository.ts`.

Code is TypeScript with type-aware ESLint rules and Prettier formatting. Run `npm run lint` and `npm run format` before submitting. Keep constructor injection and provider wiring aligned with existing NestJS patterns.

## Testing Guidelines

Unit tests are Jest specs colocated with source files and named `*.spec.ts`, for example `src/user/user.service.spec.ts`. E2E tests live in `test/` and use `*.e2e-spec.ts`.

Run `npm test` for domain/service changes. Run `npm run test:e2e` when controllers, routes, validation, or module wiring change. Use `npm run test:cov` for shared behavior or repository contracts.

## Commit & Pull Request Guidelines

Recent history uses short, lower-case commit subjects such as `add tests and update the documentation` and `updating README`. Keep commits focused on one logical change.

Pull requests should include a brief description, affected modules, test commands run, and any linked spec or bug document from `spec/`. Include sample API requests when changing Swagger output, controller behavior, or responses.

## Agent-Specific Instructions

Project role agents live in `.agents/`: `@pm` plans work, `@tl` defines the technical approach and security constraints, `@dev` implements it, and `@qa` validates it. `@pm` feature files use `*.feature.md`; `@tl` outputs `*.feature.tech.md`. Keep changes scoped to the requested behavior. Do not rewrite generated folders (`dist/`, `coverage/`) or unrelated specs. When repository behavior is ambiguous, check the domain documents in `spec/` before inventing new rules.
