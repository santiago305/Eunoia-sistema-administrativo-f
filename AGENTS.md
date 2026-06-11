# Repository Guidelines

## Project Structure & Module Organization

This is a Vite + React + TypeScript frontend. Application code lives in `src/`, with entry points in `src/main.tsx` and `src/App.tsx`. Feature work belongs under `src/features/` (for example `sale-orders`, `warehouse`, `mail`, and `workflows`). Shared UI, hooks, config, services, schemas, types, assets, and utilities belong under `src/shared/`. Routing is in `src/routes/`, pages are in `src/pages/`, API helpers are in `src/api/`, and app setup is in `src/app/`. Static files go in `public/`; tests are in `test/` or colocated in `src/`.

## Build, Test, and Development Commands

Use `pnpm`; this repo includes `pnpm-lock.yaml`.

- `pnpm dev`: starts Vite locally.
- `pnpm build`: runs TypeScript checks and writes `dist/`.
- `pnpm build:analyze`: builds with `dist/stats.html`.
- `pnpm preview`: serves the built app locally.
- `pnpm lint`: runs ESLint over the repository.
- `pnpm test`: starts Vitest in watch mode.
- `pnpm test:unit`: runs unit tests once.
- `pnpm test:unit:coverage`: runs tests with V8 coverage output in `coverage/`.

## Coding Style & Naming Conventions

Write TypeScript and React components in `.ts` and `.tsx` files. Follow the ESLint flat config: recommended JavaScript and TypeScript rules, React Hooks rules, and React Refresh checks. Use the `@` alias for imports from `src`, for example `@/shared/utils/...`. Keep feature code colocated and move only reusable code to `src/shared/`. Use PascalCase for React components, camelCase for functions and variables, and kebab-case for matching feature directories.

## Testing Guidelines

Vitest runs in `jsdom` with setup from `test/vitest.setup.ts`. Name tests `*.spec.ts(x)` or `*.test.ts(x)`. Prefer focused tests for routing, permissions, search helpers, and business logic. Add or update tests when changing shared helpers, route guards, schemas, or cross-feature behavior. Run `pnpm test:unit` before submitting and `pnpm test:unit:coverage` for riskier changes.

## Commit & Pull Request Guidelines

Recent history uses short, imperative messages, sometimes with Conventional Commit prefixes such as `feat:`. Prefer messages like `feat: add sale order filters` or `fix: correct warehouse search matching`. Pull requests should include a summary, affected feature areas, linked issue or ticket when available, test results, and screenshots or recordings for UI changes. Keep PRs scoped to one feature or fix.

## Security & Configuration Tips

Keep secrets out of commits. `.env` is present locally; document required variables without exposing values. Treat `eunoia.sql` and `sql.sql` as database references unless the task explicitly requires changes.
