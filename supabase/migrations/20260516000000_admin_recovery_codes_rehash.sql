-- =============================================================================
-- 20260516000000_admin_recovery_codes_rehash.sql
-- Follow-up to 20260513000000_admin_recovery_codes.sql.
--
-- The original generator hashed the raw code WITH dashes (e.g.
-- "a1b2-c3d4-e5f6"), but the consumer normalizes user input (strips
-- whitespace and dashes) BEFORE hashing.  As a result every recovery
-- code currently in `admin_recovery_codes` is unusable: the stored hash
-- can never match what the consumer computes from any human input.
--
-- An admin who lost their authenticator after enrollment is therefore
-- permanently locked out, exactly the failure mode the codes were
-- designed to prevent.
--
-- The application code now hashes `normalize(raw)` at generation, but
-- existing rows are still under the old (dashed) hash.  We cannot rehash
-- them in place because we never stored the raw codes.  The only safe
-- option is to delete the unused rows so admins are prompted to
-- regenerate from `/settings/recovery-codes`.  Already-consumed rows
-- (`used_at is not null`) are kept for the audit trail, even though
-- their hashes are no longer meaningful for verification.
--
-- We also clear `admin_users.recovery_codes_generated_at` for any admin
-- whose only batch was wiped, so the settings page shows "0 unused
-- codes" rather than a stale timestamp.
-- =============================================================================

delete from public.admin_recovery_codes
 where used_at is null;

update public.admin_users
   set recovery_codes_generated_at = null
 where id not in (
   select admin_id
     from public.admin_recovery_codes
    where used_at is null
 );
