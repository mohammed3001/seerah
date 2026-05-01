-- =============================================================================
-- 20260501120000_extensions.sql
-- Required PostgreSQL extensions.
-- =============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- case-insensitive text
create extension if not exists "unaccent";   -- slug normalization
