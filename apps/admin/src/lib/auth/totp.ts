import * as OTPAuth from "otpauth";

import { TOTP_ISSUER } from "./constants";

/**
 * Build an OTPAuth.TOTP instance from a stored base32 secret. Settings match
 * the bootstrap script (SHA-1, 30 s period, 6 digits, 160-bit secret) which
 * are also Google Authenticator / Authy defaults.
 */
function buildTotp(secret: string, label: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

/**
 * Verify a TOTP code with ±1-period drift tolerance (60 s window).  Returns
 * true on match.  Codes are normalised: spaces stripped, ASCII digits only.
 */
export function verifyTotp(secret: string, label: string, code: string): boolean {
  const cleaned = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;

  const totp = buildTotp(secret, label);
  const delta = totp.validate({ token: cleaned, window: 1 });
  return delta !== null;
}

export interface NewTotpEnrollment {
  base32: string;
  uri: string;
}

/** Generate a fresh 160-bit TOTP secret for a given admin email. */
export function newTotpEnrollment(label: string): NewTotpEnrollment {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });
  return { base32: secret.base32, uri: totp.toString() };
}
