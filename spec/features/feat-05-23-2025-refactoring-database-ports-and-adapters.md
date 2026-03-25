Let's create an adaptive Repository, where i can change the database easily.
Using ports & adapters concept. The application would adapt to the database, not the other way around.

## Goal
Ensure that if has the need of change the database, it will be easy to do it.

## Step:
1. [x] Analyse the current implementation of the Repository.
2. [x] Generate a new interface for the Repository.
3. [x] Implement this interface on each repository
4. [x] This new interface should be the only way to interact with the database.
5. [x] This interface should have methods like:
    - save(entity: T) : Promise<T>
    - update(entity: T) : Promise<T>
    - delete(entity: T) : Promise<T>
    - findById(id: string) : Promise<T | null>
    - findAll() : Promise<T[]>
    - findBy(query: Partial<T>) : Promise<T[]>
    - count() : Promise<number>
6. [x] The methods that are not being used on the current repositories, should be added and return an empty array or null, depending on the method.
7. [x] The current implementation of the Repository should be refactored to use this new interface.
8. [x] Update the project specification document to reflect the changes.

## Additional Steps for Pure Ports & Adapters (Dependency Inversion)
9. [x] Define abstract classes (Ports) for the domain repositories (e.g., `UserRepositoryPort`, `PunchinRepositoryPort`) to allow NestJS Dependency Injection.
10. [x] Refactor Services (`UserService`, `PunchinService`) to inject the abstract Ports rather than concrete classes.
11. [x] Rename current concrete classes to reflect their adapter nature (e.g., `InMemoryUserRepository`, `InMemoryPunchinRepository`).
12. [x] Configure NestJS Modules (`UserModule`, `PunchinModule`) to bind the abstract Ports to the in-memory Adapters using custom providers (`useClass`).