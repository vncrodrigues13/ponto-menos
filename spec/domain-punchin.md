# Domain: Punch-in Module

This document details the specific implementation and context for the time-tracking functionality of Ponto Menos.

---

## 🏗️ Architecture
The `PunchinModule` is a feature-specific NestJS module managing the domain of user time-tracking.

### Components
- **`PunchinModule`** (`punchin.module.ts`): Registers the features, bringing together the controller and providers.
- **`PunchinController`** (`punchin.controller.ts`):
    - **`POST /punchin`**: Records a new punch-in event.
    - **`GET /punchin`**: Lists all recorded punch-in events.
    - **`GET /punchin?emailAddress={email}`**: Endpoint to list all punchins from a specific user (`getPunchinsFromUser`). Validates the `emailAddress` query parameter, returning a 400 if invalid, a 404 if the user does not exist, and a 200 with the list of punch-ins otherwise.
    - Prom-client integration: Maintains a custom `punchin_controller_counter` incrementing on each recorded event.
- **`PunchinService`** (`punchin.service.ts`):
    - Core business logic.
    - Resolves and validates the JWT `authToken` from incoming requests to extract the user's `emailAddress`.
    - Enforces authentication by throwing `UnauthorizedException` if the token is missing, empty, or strictly invalid.
    - **Validates User Existence:** Prior to translating and saving any new `PunchinEntry`, it looks up the explicit user via `UserService.findUserByEmailAddress()`; throwing a `NotFoundException` if the account does not actually exist.
    - Translates the incoming DTO to the internal `PunchinEntry` representation.
    - **`getPunchinsFromUser(emailAddress: string)`**: Retrieves all punch-ins associated with a specific user. Handles validation logic (e.g., verifying user existence) before requesting data from the repository.
- **`PunchinRepository`** (`punchin.repository.ts`):
    - The active data layer for this domain.
    - Asynchronously implements the generic `Repository<PunchinEntry>` interface, ensuring decoupled persistence.
    - Presently an in-memory array store meant to be substituted later with a permanent ORM/Database connection.
    - **`getPunchinsFromUser(emailAddress: string)`**: Queries the data layer to fetch all stored `PunchinEntry` records that match the provided `userEmail`.

---

## 📊 Data Models

### Internal Model: `PunchinEntry` (`punchin.model.ts`)
- `timestamp` (`Date`): UTC date representing when the event occurred.
- `platform` (`string`): The client application platform (e.g., "ios", "android", "windows").
- `userEmail` (`string`): Resolved email address identifying the user making the punch.

### Payload: `CreatePunchinDto` (`dto/create-punchin.dto.ts`)
- `timestamp` (`string`): ISO date string representation of the client's current time.
- `platform` (`string`): The originating platform.
- `authToken` (`string`): A secure JWT authentication token passed to the service to extract and verify the user's identity.
