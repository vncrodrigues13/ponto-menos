# Domain: User Module

This document defines the core structure, operational expectations, and data rules for user management within Ponto Menos.

---

## 🏗️ Core Architecture
The User module is tasked with user identity, onboarding, and profile discovery, conforming to the modular decoupling guidelines of the `AppModule`.

### Data Model (`User`)
- `fullName` (`string`): The user's full name.
- `birthdate` (`Date`): Date of birth.
- `emailAddress` (`string`): Primary user identification and login credential.
- `companyId` (`long`): A foreign reference to the associated company (part of an upcoming multi-tenant configuration).

---

## ⚙️ Core Logic

The module exports the following primary functionalities:
- **`registerUser()`**: Administers the lifecycle integration of new users joining the system.
- **`findUserByEmailAddress()`**: Locates and retrieves an existing user profile utilizing their primary email key.

---

## 🛡️ Validation & Constraints
Incoming data integrity is rigorously checked using the `ValidationPipe` and `class-validator` package directly against the module's DTOs:

- **Email**: `emailAddress` must be mandatory and evaluated structurally using `@IsEmail()`.
- **Required Fields**: `fullName`, `emailAddress`, `birthdate`, and `companyId` are absolutely mandatory.
- **Birthdate Bounds**: Must reflect a valid ISO 8601 date (YYYY-MM-DD); the user must be >= 18 years old.
- **Company Context**: `companyId` must be a strictly numeric value > 0.

---

## 📊 Observability Specs
To conform with the system-wide focus on "day-two" observabilities, the User module must implement:

### Metrics Strategy
Track the following KPIs using the application's prometheus implementation:
- Volume tracking: When a user registers successfully.
- Volume tracking: When a user cannot be found by email.
- Volume tracking: When a registration attempt fails due to a pre-existing email address.
- Volume tracking: When a user profile is found by email.
- Latency tracking: Average time to complete a `registerUser` operation.
- Latency tracking: Average time to complete a `findUserByEmailAddress` operation.

### Logging Strategy
Using `pino`, log structured events for:
- Successful user registrations.
- Successful user discoveries via email.
- Negative flows: Failed registrations on pre-existing emails.
- General exceptions and errors encountered during registration.
- General exceptions and errors encountered during user discovery.
