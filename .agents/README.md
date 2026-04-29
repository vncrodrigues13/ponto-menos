# Project Agents

This directory defines the project collaboration agents used for planning, implementation, and validation.

## Available Agents

- `@pm` - planner: turns requests into scoped work plans and acceptance criteria.
- `@tl` - tech leader: converts feature definitions into technical direction, security considerations, and implementation constraints.
- `@dev` - producer: implements approved work in the codebase.
- `@qa` - validator: reviews behavior, tests, and release readiness.

## Workflow

1. Start with `@pm` for ambiguous or multi-step requests and capture the product definition in `*.feature.md` when needed.
2. Send the feature definition to `@tl` to produce the technical definition in `*.feature.tech.md`.
3. Send scoped implementation tasks to `@dev`.
4. Ask `@qa` to validate the result before merging.

Keep agent outputs grounded in this repository's structure: NestJS modules in `src/`, e2e tests in `test/`, and product/domain notes in `spec/`.
