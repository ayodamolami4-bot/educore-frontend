/**
 * Shared field validation — ONE opinion, used by every form (manual entry,
 * CSV import) AND by the demo server handlers, so client and server can
 * never disagree. Pure functions, no react-native imports, so node tests
 * run them too.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normal email shape — any domain works (gmail, yahoo, the school's own). */
export function emailError(value) {
  if (!value) return null; // empty stays the field's own "required" problem
  if (!EMAIL_RE.test(String(value).trim())) {
    return 'That email address does not look right — it needs a name, an @ and a domain, e.g. name@gmail.com or office@yourschool.edu.ng.';
  }
  return null;
}

/** Nigerian phone: 11 digits starting 0 (local) or +234 followed by 10
    digits. Spaces, dashes and brackets typed for readability are fine. */
export function nigerianPhoneDigits(value) {
  return String(value || '').replace(/[\s\-()]/g, '');
}

export function phoneError(value) {
  const digits = nigerianPhoneDigits(value);
  if (!digits) return null;
  if (/^0\d{10}$/.test(digits)) return null;
  if (/^\+234\d{10}$/.test(digits)) return null;
  return 'Nigerian numbers are 11 digits starting with 0 (e.g. 0810 123 4567), or +234 followed by 10 digits (e.g. +234 810 123 4567).';
}

/** HH:MM 24-hour clock. */
export function timeError(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!m) return 'Enter times on the 24-hour clock as HH:MM — e.g. 08:00 or 13:45.';
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) {
    return 'That time is not on the clock — hours 00-23, minutes 00-59, e.g. 08:00 or 13:45.';
  }
  return null;
}

export function minutesOf(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
