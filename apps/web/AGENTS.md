# Repository Guidelines

## Project Structure & Module Organization

The Next.js app lives under `app/`, where each route segment contains its `page.tsx`, `layout.tsx`, and colocated UI assets. Feature flows reside in `modules/`, while shared clients and adapters live in `services/` and `lib/`. Place MDX content in `content/` and static assets in `public/`. Automation and tooling scripts belong in `scripts/`. Keep tests near their targets: colocated suites in `__tests__/` and curated harnesses in `tests/` (`unit`, `integration`, `e2e`, `load`).

## Build, Test, and Development Commands

Hydrate dependencies with `pnpm install` from the repo root. Use `pnpm dev` to start the Turbo-powered Next.js dev server, and `pnpm build` followed by `pnpm start` for production bundles. Run `pnpm lint` and `pnpm type-check` before opening a PR. Execute `pnpm test`, `pnpm test:watch`, or `pnpm test:coverage` for Vitest suites, and `pnpm e2e` / `pnpm e2e:ci` for Playwright journeys.

## Coding Style & Naming Conventions

Default to TypeScript across the app. Follow workspace formatting (Biome + Next lint) with two-space indentation, trailing commas, and single quotes. Component and route files use PascalCase, utilities camelCase, and route folders stay kebab-case to match URL paths. Hooks must start with `use`, and server-only logic should live in `services/` or `lib/` helpers.

## Testing Guidelines

Vitest handles unit and integration coverage; new specs should land beside their modules in `__tests__/` or under `tests/unit`. For end-to-end coverage, rely on Playwright suites in `tests/e2e`. Reference `tests/setup.ts` for global configuration, reset mocks between cases, and expand coverage targets when adding branching logic.

## Commit & Pull Request Guidelines

Adopt Conventional Commit messages (`type(scope): summary`) as seen in history; keep scopes short and descriptive. PRs should ship with a clear problem statement, solution notes, and evidence of `pnpm lint && pnpm test`. Include screenshots or recordings for UI changes, link relevant issues, and request reviewers familiar with the touched module.

## Security & Configuration Tips

Load environment values through `source.config.ts`; never commit `.env` files. Audit Sentry hooks (`sentry.*.config.ts`) whenever new routes ship, and scrub personal data before logging. Coordinate with the database team when adjusting `@snapback/*` workspace packages to keep migrations synchronized.
