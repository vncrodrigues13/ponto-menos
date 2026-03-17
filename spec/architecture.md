# System Architecture - Ponto Menos

This document serves as the high-level Software Design Document (SDD) for the **Ponto Menos** project. It outlines the core technology stack, global conventions, and system-wide design patterns.

---

## 🏗️ Core Technology Stack
The system is built as a monolithic REST API using the following technologies:
- **Framework:** NestJS (Node.js)
- **Design Pattern:** Modular and decoupled (Feature-based modules like `UserModule`, `PunchinModule`).
- **Language:** TypeScript
- **Containerization:** Docker (`node:18-alpine` base image)

## 🔐 Global Authentication Strategy
- **Token Format:** JSON Web Tokens (JWT).
- **Transport:** Standard HTTP Headers via `Authorization: Bearer <token>`.
- **Validation:** Tokens must be validated at the service layer (or through a NestJS Auth Guard) utilizing the `jsonwebtoken` library.
- **Payload Strategy:** Tokens should ideally encapsulate standard non-changing identities (e.g., `emailAddress`, `userId`). Services must validate that a token is not null, empty, or missing required payload fields, throwing an `UnauthorizedException` upon failure.

## 📊 Observability & Monitoring
A core architectural pillar is built-in telemetry:
- **Metrics Engine:** Powered by `prom-client`.
- **Exposed Endpoint:** System and custom metrics are available at `/metrics` via the `AppController`.
- **Telemetry Infrastructure:**
  - **Prometheus:** Configured to scrape the application every 15 seconds (5s locally). Configuration at `src/main/resources/prometheus.yml`.
  - **Grafana:** Pre-orchestrated via `docker-compose.yaml` with an attached monitoring network for data visualization.
- **Logging:** Application-wide logging leverages `pino` for structured output.

## 🐳 Infrastructure & Tooling
The environment emphasizes deterministic execution across platforms:
- **Composition:** A single `docker-compose.yaml` manages the `app`, `prometheus`, and `grafana` services.
- **Local Testing:** Shell-based test scripts using `curl` simulate API traffic (e.g., `test/punchin-tests-requests.sh`).
- **Data Persistence:** Currently leveraging in-memory array stores (`ArrayList`) behind Repository classes (`*Repository`). This abstract layered design prepares the system for easy migration to a fully persisted database using an ORM like TypeORM or Prisma in the future.
