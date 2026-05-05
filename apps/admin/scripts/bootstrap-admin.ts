/**
 * scripts/bootstrap-admin.ts
 * ─────────────────────────────────────────────────────────────────────────
 * One-shot bootstrap of the first super_admin.
 *
 * Usage:
 *   ADMIN_BOOTSTRAP_EMAIL=you@seerah.com \
 *   ADMIN_BOOTSTRAP_PASSWORD=...        \
 *   NEXT_PUBLIC_SUPABASE_URL=...        \
 *   SUPABASE_SERVICE_ROLE_KEY=...       \
 *   pnpm --filter @seerah/admin bootstrap
 *
 * The script:
 *   1. Reads creds from the env (or .env.local).
 *   2. Validates email + password complexity.
 *   3. bcrypts the password (cost 12).
 *   4. Generates a fresh TOTP secret.
 *   5. Calls public.bootstrap_first_admin(...) which only succeeds when the
 *      admin_users table is empty — an idempotent guard against running this
 *      twice and silently creating a second super_admin.
 *   6. Prints the QR (Google Authenticator / Authy) + the base32 secret to
 *      the terminal exactly once.  Nothing is persisted to disk.
 *
 * If you lose the device, an existing super_admin can clear the secret via
 * the admin panel ("Reset 2FA" on the admin row) and the next login will
 * walk that admin back through the QR flow.
 */

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";
import * as OTPAuth from "otpauth";
import path from "node:path";
import qrcode from "qrcode-terminal";

import { validatePassword } from "@seerah/api/security";

import { BCRYPT_COST } from "../src/lib/auth/password";

// Load env from apps/admin/.env.local first, then repo root .env, in that
// order.  Subsequent files do NOT override earlier ones (Next.js convention).
const HERE = path.resolve(__dirname, "..");
loadEnv({ path: path.join(HERE, ".env.local") });
loadEnv({ path: path.resolve(HERE, "..", "..", ".env") });

const TOTP_ISSUER = "Seerah Admin";

interface BootstrapEnv {
  email: string;
  password: string;
  supabaseUrl: string;
  serviceRoleKey: string;
}

function readEnv(): BootstrapEnv {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const missing: string[] = [];
  if (!email) missing.push("ADMIN_BOOTSTRAP_EMAIL");
  if (!password) missing.push("ADMIN_BOOTSTRAP_PASSWORD");
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Missing required env var(s): ${missing.join(", ")}. ` +
        `Set them in apps/admin/.env.local or your shell, then re-run.`,
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email!)) {
    throw new Error(`ADMIN_BOOTSTRAP_EMAIL is not a valid email address.`);
  }

  // Apply the shared password policy (length, complexity, common-password
  // list) — same rules as user-facing signup.  Admin passwords must clear
  // the same floor; the real defence is bcrypt + TOTP, but a Lock1 / Pass1
  // bootstrap password would still leak through the policy gap.
  const policyErrors = validatePassword(password!, { email: email! });
  if (policyErrors.length > 0) {
    const reasons = policyErrors.map((e) => e.messageEn).join("; ");
    throw new Error(`ADMIN_BOOTSTRAP_PASSWORD rejected by policy: ${reasons}`);
  }

  return {
    email: email!,
    password: password!,
    supabaseUrl: supabaseUrl!,
    serviceRoleKey: serviceRoleKey!,
  };
}

async function main(): Promise<void> {
  const env = readEnv();

  const passwordHash = await bcrypt.hash(env.password, BCRYPT_COST);

  // 160-bit secret, SHA1, 30s window — Authy / Google Authenticator default.
  const totpSecret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: env.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: totpSecret,
  });

  const supabase = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("bootstrap_first_admin", {
    p_email: env.email,
    p_password_hash: passwordHash,
    p_totp_secret: totpSecret.base32,
  });

  if (error) {
    throw new Error(`bootstrap_first_admin RPC failed: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      `Refusing to bootstrap — at least one admin already exists. ` +
        `Use the admin panel UI to add additional admins, or reset 2FA from a super_admin account if you are locked out.`,
    );
  }

  const adminId = data as string;
  const otpauthUrl = totp.toString();

  // Print the QR + secret once, to the terminal only.
  // eslint-disable-next-line no-console
  console.log("\n=========================================================");
  // eslint-disable-next-line no-console
  console.log(" Seerah Admin — bootstrap complete");
  // eslint-disable-next-line no-console
  console.log("=========================================================\n");
  // eslint-disable-next-line no-console
  console.log(`Admin id   : ${adminId}`);
  // eslint-disable-next-line no-console
  console.log(`Email      : ${env.email}`);
  // eslint-disable-next-line no-console
  console.log(`Role       : super_admin`);
  // eslint-disable-next-line no-console
  console.log(`TOTP secret: ${totpSecret.base32}`);
  // eslint-disable-next-line no-console
  console.log(`OTPauth URI: ${otpauthUrl}\n`);
  // eslint-disable-next-line no-console
  console.log("Scan the QR below with Google Authenticator / Authy / 1Password:\n");

  qrcode.generate(otpauthUrl, { small: true });

  // eslint-disable-next-line no-console
  console.log(
    "\nKeep the secret somewhere safe (password manager) as a recovery copy. " +
      "You will not see it again.\n",
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(`\n[bootstrap] ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
