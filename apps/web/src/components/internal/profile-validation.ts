/* ============================================================
   Inclusive profile validators — shared by account-level surfaces (the top
   bar's account control brought them here when AccountMenu folded into
   TopBar, v4.8.0). They never throw: each returns a result the caller
   surfaces to the UI. Re-exported from TopBar (the public seam).
   ============================================================ */

/** The outcome of a validator: either a cleaned value, or a message to show. */
export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

// Validation bounds — logic constants, not layout: a name caps at 80
// characters, an email at the RFC-practical 254.
const NAME_MAX = 80;
const EMAIL_MAX = 254;

/** A person's display name, sanitized and validated INCLUSIVELY: one
 *  free-text field, never split first/last, so it holds mononyms, multiple
 *  names, and any culture's marks. Strips control chars and collapses
 *  whitespace; keeps Unicode letters + marks and the ordinary separators
 *  (space, hyphen, apostrophe, period, middot); requires at least one
 *  letter; blocks angle brackets; caps length. */
export function validateDisplayName(raw: string): ValidationResult {
  // Strip control chars, collapse whitespace runs, trim. Spaces, hyphens,
  // apostrophes, and periods are KEPT (ordinary name separators); Unicode
  // letters and marks pass, so mononyms and any culture are welcome.
  const stripped = raw.replace(/\p{Cc}/gu, "").replace(/\s+/g, " ").trim();
  if (!stripped) return { ok: false, error: "A name can't be blank." };
  if (stripped.length > NAME_MAX)
    return { ok: false, error: `A name can be at most ${NAME_MAX} characters.` };
  if (/[<>]/.test(stripped)) return { ok: false, error: "A name can't contain < or >." };
  if (!/\p{L}/u.test(stripped)) return { ok: false, error: "A name needs at least one letter." };
  return { ok: true, value: stripped };
}

/** An email address, sanitized and validated to the standard shape. Strips
 *  control chars, trims, caps length, and checks the ordinary
 *  local@domain.tld form. Never throws. */
export function validateEmail(raw: string): ValidationResult {
  const email = raw.replace(/\p{Cc}/gu, "").trim();
  if (email.length > EMAIL_MAX) return { ok: false, error: "That email is too long." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "That doesn't look like an email." };
  return { ok: true, value: email };
}
