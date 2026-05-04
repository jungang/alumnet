# ADR-002: Database Migration Strategy

## Status

Accepted

## Context

The project had scattered SQL files: root-level `create_table.sql` + `fix_db.sql`, 4 numbered migrations in `server/src/db/migrations/`, and many `fix_*.sql` files in `server/src/db/`. This caused confusion about which files represent the canonical schema.

## Decision

1. **Canonical schema**: `server/src/db/init.sql` is the single source of truth for full schema creation
2. **Versioned migrations**: Numbered SQL files in `server/src/db/migrations/` (001-004) for incremental schema changes
3. **Seed data**: `server/src/db/seed.sql` for sample/demo data
4. **Cleanup**: Remove all `fix_*.sql` files as they are either redundant or their changes are captured in init.sql

Future schema changes MUST use numbered migration files.

## Consequences

- **Positive**: One authoritative schema file, clear migration history, no duplicate definitions
- **Negative**: init.sql and migrations must be kept in sync when adding new migrations
- **Neutral**: No formal migration tool (like Flyway) — migrations run manually via psql

## References

- [Database Migration Patterns](https://flywaydb.org/documentation/migrations)
