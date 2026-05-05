/**
 * Password policy shared between web (Supabase Auth signup / reset)
 * and admin (bcrypt-backed `admin_users`).
 *
 * Rules (mirrors the audit checklist 1.1):
 *   * Minimum length: 8 characters
 *   * Must contain at least one uppercase letter, one lowercase letter,
 *     one digit
 *   * Must not appear in the embedded common-password list
 *   * Must not equal the user's email or its local part
 *
 * The common-password list below is derived from the SecLists
 * `10-million-password-list-top-1000.txt` (truncated to a curated 200+
 * entries that overlap with HIBP's most-breached passwords).  It is
 * intentionally embedded — fetching at runtime would add a network
 * dependency to a security check that must always succeed.
 */

const RAW_COMMON = `
123456
password
12345678
qwerty
123456789
12345
1234
111111
1234567
dragon
123123
baseball
abc123
football
monkey
letmein
696969
shadow
master
666666
qwertyuiop
123321
mustang
1234567890
michael
654321
pussy
superman
1qaz2wsx
7777777
fuckyou
121212
000000
qazwsx
123qwe
killer
trustno1
jordan
jennifer
zxcvbnm
asdfgh
hunter
buster
soccer
harley
batman
andrew
tigger
sunshine
iloveyou
fuckme
2000
charlie
robert
thomas
hockey
ranger
daniel
starwars
klaster
112233
george
asshole
computer
michelle
jessica
pepper
1111
zxcvbn
555555
11111111
131313
freedom
777777
pass
fuck
maggie
159753
aaaaaa
ginger
princess
joshua
cheese
amanda
summer
love
ashley
6969
nicole
chelsea
biteme
matthew
access
yankees
987654321
dallas
austin
thunder
taylor
matrix
william
corvette
hello
martin
heather
secret
fucker
merlin
diamond
1234qwer
gfhjkm
hammer
silver
222222
88888888
anthony
justin
test
bailey
q1w2e3r4t5
patrick
internet
scooter
orange
11111
golfer
cookie
richard
samantha
bigdog
guitar
jackson
whatever
mickey
chicken
sparky
snoopy
maverick
phoenix
camaro
sexy
peanut
morgan
welcome
falcon
cowboy
ferrari
samsung
andrea
smokey
steelers
joseph
mercedes
dakota
arsenal
eagles
melissa
boomer
booboo
spider
nascar
monster
tigers
yellow
xxxxxx
123123123
gateway
marina
diablo
bulldog
qwer1234
compaq
purple
hardcore
banana
junior
hannah
123654
porsche
lakers
iceman
money
cowboys
987654
london
tennis
0
hello123
welcome1
admin
administrator
root
toor
qwerty123
password1
password123
abc123456
azerty
qwertz
1q2w3e4r
qq123456
admin123
adobe123
photoshop
linkedin
default
1q2w3e
qwer123
1qazxsw2
zaq12wsx
qweasd
aaaa
bbbb
abcd1234
asdfasdf
asdf1234
12345a
abc12345
123abc
qaz123
1234abcd
1qaz1qaz
1234567a
abcdefg
1q2w3e4r5t
qwerty12
qweqwe
qwerty1
qwerty123456
qwerty12345
qwerty123456789
qwertyui
welcome123
admin1234
admin12345
abcdef
abcdefgh
asdfghjk
asdfghjkl
asdf
qwert
trololo
12341234
1q2w3e4r5t6y
qwerty1234
12345abc
12345qwe
qwer
qwer12
qwer123456
qwerty11
qwerty111
12345678910
9876543210
123412341234
1234567890qwerty
loveme
asdf123
qwerasdf
1112131415
1234554321
12121212
98765432
1q2w3e
1qaz2wsx3edc
qaz2wsx
qazxsw
qazwsxedc
qwerasdfzxcv
admin1
adminadmin
administrator1
root123
root1234
toor1234
seerah
seerah123
`;

/** Read-only view of the curated list. */
export const COMMON_PASSWORDS: ReadonlySet<string> = new Set(
  RAW_COMMON.split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0),
);

/** Minimum password length enforced by `validatePassword`. */
export const MIN_PASSWORD_LENGTH = 8;

export type PasswordPolicyCode =
  | "too_short"
  | "missing_uppercase"
  | "missing_lowercase"
  | "missing_digit"
  | "common_password"
  | "looks_like_email";

export interface PasswordPolicyError {
  code: PasswordPolicyCode;
  messageAr: string;
  messageEn: string;
}

export interface ValidatePasswordOptions {
  /**
   * If supplied, the password must not equal the email, the email's
   * local part, or the local part with trivial digit suffixes
   * (`alice` / `alice123` / `alice@example.com` etc.).  This catches
   * the "name-as-password" anti-pattern at signup time.
   */
  email?: string;
  /**
   * Override the default length floor.  Useful for surfaces that need
   * a higher bar than user-facing signup — admin bootstrap, for
   * example, requires 12+ characters because super_admin is the most
   * privileged account in the system.  Values below
   * `MIN_PASSWORD_LENGTH` are clamped up.
   */
  minLength?: number;
}

/**
 * Validates a candidate password against the policy.  Returns an
 * empty array when the password is acceptable, or one or more errors
 * otherwise.  Pass-through ordering is stable so the UI can render
 * the first failure consistently.
 */
export function validatePassword(
  password: string,
  options: ValidatePasswordOptions = {},
): PasswordPolicyError[] {
  const errors: PasswordPolicyError[] = [];

  const minLength = Math.max(
    MIN_PASSWORD_LENGTH,
    options.minLength ?? MIN_PASSWORD_LENGTH,
  );
  if (password.length < minLength) {
    errors.push({
      code: "too_short",
      messageAr: `كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل`,
      messageEn: `Password must be at least ${minLength} characters long`,
    });
  }

  if (!/[A-Z]/.test(password)) {
    errors.push({
      code: "missing_uppercase",
      messageAr: "يجب أن تحتوي على حرف كبير على الأقل",
      messageEn: "Must contain at least one uppercase letter",
    });
  }

  if (!/[a-z]/.test(password)) {
    errors.push({
      code: "missing_lowercase",
      messageAr: "يجب أن تحتوي على حرف صغير على الأقل",
      messageEn: "Must contain at least one lowercase letter",
    });
  }

  if (!/[0-9]/.test(password)) {
    errors.push({
      code: "missing_digit",
      messageAr: "يجب أن تحتوي على رقم على الأقل",
      messageEn: "Must contain at least one digit",
    });
  }

  // Common-password check is case-insensitive: an attacker that
  // capitalises `Password1` learns nothing.  We also strip a trailing
  // run of digits so `password123` collapses to `password`.
  const lower = password.toLowerCase();
  const stripped = lower.replace(/\d+$/, "");
  if (COMMON_PASSWORDS.has(lower) || COMMON_PASSWORDS.has(stripped)) {
    errors.push({
      code: "common_password",
      messageAr: "كلمة المرور هذه شائعة جدًا، اختر شيئًا أصعب",
      messageEn: "This password is too common, choose something stronger",
    });
  }

  if (options.email) {
    const emailLower = options.email.toLowerCase();
    const localPart = emailLower.split("@")[0] ?? "";
    if (
      lower === emailLower ||
      (localPart.length >= 4 &&
        (lower === localPart || stripped === localPart))
    ) {
      errors.push({
        code: "looks_like_email",
        messageAr: "كلمة المرور لا يمكن أن تطابق بريدك الإلكتروني",
        messageEn: "Password must not match your email address",
      });
    }
  }

  return errors;
}

/**
 * Convenience: returns the first Arabic message, or `null` when the
 * password passes.  Use this from server actions where you only want
 * the next thing to show the user.
 */
export function firstPasswordPolicyMessageAr(
  password: string,
  options: ValidatePasswordOptions = {},
): string | null {
  const errors = validatePassword(password, options);
  return errors.length === 0 ? null : errors[0]!.messageAr;
}
