/**
 * Cost factor used by every place that calls `bcrypt.hash` for an admin
 * password.  Kept here so the bootstrap script and the login action can
 * never drift apart — if they did, the dummy hash below would be cheaper
 * than a real one and become a timing oracle for account enumeration.
 *
 * 12 is the OWASP-suggested floor for bcrypt (~250 ms on a modern CPU).
 *
 * NOTE: this file deliberately does NOT use `server-only`.  The bootstrap
 * script (`apps/admin/scripts/bootstrap-admin.ts`) imports BCRYPT_COST too,
 * and that script is run from plain Node.  Both values are non-secret
 * constants so client-side exposure would be harmless anyway.
 */
export const BCRYPT_COST = 12;

/**
 * A constant pre-computed bcrypt hash whose cost factor MUST match
 * BCRYPT_COST.  We compare submitted passwords against this hash on the
 * "unknown email" + "locked account" branches of the login flow so that
 * the response time is indistinguishable from a real lookup-and-compare.
 *
 * Generated with:
 *   node -e "console.log(require('bcryptjs').hashSync('not-a-real-password-do-not-match', 12))"
 */
export const DUMMY_PASSWORD_HASH = "$2a$12$uUkspBJyc5MReddxYoVLDeXZn3i1bQze4/pOhjAXhIZTQNmuTQb3q";
