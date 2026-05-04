# ADR-001: Use ESLint Flat Config (v9) with Legacy Workspace Configs

## Status

Accepted

## Context

The project previously had zero ESLint configuration across all workspaces (client, server, admin). CONTRIBUTING.md referenced ESLint/Prettier but neither existed. We needed to add linting to a Vue 3 + TypeScript monorepo.

## Decision

We adopt a hybrid approach:

- **Root level**: ESLint 9 flat config format (`eslint.config.mjs`) for tooling files
- **Workspace level**: Legacy `.eslintrc.cjs` format for client/server/admin, for compatibility with `eslint-config-prettier` and `eslint-plugin-vue`

Each workspace has its own ESLint config tailored to its framework:

- `client/`: Vue 3 + Three.js + TypeScript
- `server/`: Express + TypeScript (Node.js environment)
- `admin/`: Vue 3 + Element Plus + TypeScript

## Consequences

- **Positive**: Modern config at root, framework-specific rules per workspace, IDE integration works out of the box
- **Negative**: Two config formats in same project (acceptable tradeoff for Vue plugin compatibility)
- **Neutral**: Migration to full flat config can happen when Vue ESLint plugin supports it natively

## References

- [ESLint 9 Flat Config Migration](https://eslint.org/docs/latest/use/configure/migration-guide)
