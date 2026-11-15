/**
 * Front-end validators shared by the admin forms.
 *
 * Why they exist: React Native TextInputs never run the browser's
 * "default" validation (that is an HTML5 form feature — keyboardType only
 * changes which keys the phone shows), so every rule the backend enforces
 * needs a matching front-end check to give the office a friendly inline
 * error instead of a failed save. The backend re-checks everything.
 *
 * Phone rules are THE Nigerian rules (api/validation.js — one opinion for
 * forms, CSV imports and the demo server): 11 digits starting 0, or
 * +234 followed by 10 digits.
 */
import { phoneError as sharedPhoneError } from '../api/validation.js';

/** Collapse runs of spaces and trim — the shape every stored text takes. */
export function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/** Digits only — number pads still allow PASTED text, so every numeric
    field (weights, pass mark, amounts) strips anything else as it types.
    Validation on save stays the second line of defence. */
export function digitsOnly(value) {
  return String(value ?? '').replace(/[^0-9]/g, '');
}

/** Drop spaces, dashes, dots and brackets; keep digits and one leading +. */
export function normalizePhone(value) {
  const text = String(value ?? '').trim();
  const hadPlus = text.startsWith('+');
  const digits = text.replace(/[^\d]/g, '');
  return (hadPlus ? '+' : '') + digits;
}

export function isValidPhone(value) {
  const phone = normalizePhone(value);
  if (!phone) return false;
  return !sharedPhoneError(phone);
}

/** Trim + lowercase — emails are stored lowercase everywhere. */
export function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);
  if (!email) return false;
  // one @, no spaces, and a dot with at least two letters after it
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/** Trim — dates are already validated to YYYY-MM-DD before this. */
export function normalizeDateOfBirth(value) {
  return cleanText(value);
}

export function isValidDateOfBirth(value) {
  const text = cleanText(value);
  if (!text) return true; // the field is optional
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  // Reject 2026-02-31 and friends: real dates only.
  const date = new Date(Date.UTC(year, month - 1, day));
  const isReal =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isReal) return false;
  if (year < 1900) return false;
  return date.getTime() <= Date.now(); // no future births
}

/** The classes this school actually runs (mirrors the AD03 dropdown). */
export const CLASS_LABELS = ['JSS1 A', 'JSS1 B', 'JSS2 A', 'JSS3 A', 'SSS1 A', 'SSS2 A', 'SSS3 A'];

/** "jss3 a" / "JSS 3A" / "jss3a" → "JSS3 A"; anything else comes back trimmed. */
export function normalizeClassLabel(value) {
  const squashed = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const match = /^(JSS|SSS)(\d)([A-Z])$/.exec(squashed);
  return match ? `${match[1]}${match[2]} ${match[3]}` : String(value ?? '').trim();
}

export function isValidClassLabel(value) {
  return CLASS_LABELS.includes(normalizeClassLabel(value));
}

/** Where a promotion decision sends the student: JSS3 A promotes into SSS1 A
    (same suffix), SSS3 graduates, repeating stays in the same class. Used on
    the preview cards ("Average 38% — repeat · stays in JSS1 A"). */
export function nextClassOf(classLabel) {
  const text = String(classLabel || '');
  const m = /^(JSS|SSS)(\d)/.exec(text.toUpperCase());
  if (!m) return 'the next class';
  const suffix = text.split(' ').slice(1).join(' ') || 'A';
  // JSS3 crosses into the senior school; SSS3 graduates.
  if (m[1] === 'JSS' && m[2] === '3') return `SSS1 ${suffix}`;
  if (m[1] === 'SSS' && m[2] === '3') return 'Graduates';
  return `${m[1]}${Number(m[2]) + 1} ${suffix}`;
}

export function destinationLabel(classLabel, decision) {
  if (decision === 'Promote') return `promote · moves to ${nextClassOf(classLabel)}`;
  if (decision === 'Repeat') return `repeat · stays in ${classLabel}`;
  return 'graduate · leaves with their result slip';
}

/** The grading-policy arithmetic (AD18) — the SAME check the demo server
    runs on save and on lock, mirrored on the client so Lock can refuse a
    wrong policy BEFORE anything reaches the server. Returns the problem
    message or null. */
export function gradingArithmeticError(p) {
  const ca = Number(p.caWeight);
  const exam = Number(p.examWeight);
  const pass = Number(p.passMark);
  if (!Number.isFinite(ca) || !Number.isFinite(exam) || ca < 0 || exam < 0) {
    return 'Enter the CA and exam weights as numbers.';
  }
  if (ca + exam !== 100) {
    return `CA (${ca}%) + exam (${exam}%) must add up to exactly 100%.`;
  }
  if (!Number.isFinite(pass) || pass < 34 || pass > 100) {
    return 'The pass mark must be between 34 and 100.';
  }
  const grades = Array.isArray(p.grades) ? p.grades : [];
  for (let i = 1; i < grades.length; i++) {
    if (Number(grades[i - 1].minScore) <= Number(grades[i].minScore)) {
      return `Grade ${grades[i - 1].grade} must start above grade ${grades[i].grade} — check the minimum scores.`;
    }
  }
  const belowPass = grades.filter((g) => g.grade !== 'F' && Number(g.minScore) < pass);
  if (belowPass.length) {
    return `Grade ${belowPass[0].grade} starts below the pass mark — every grade except F must start at ${pass}% or above.`;
  }
  return null;
}

/** Real-calendar date for ANY date field (key dates, sessions, fees):
    YYYY-MM-DD with a month 01-12 and a day that exists in that month —
    so 2026-09-56 and 2026-02-31 are refused everywhere. Returns the
    problem message or null. */
export function calendarDateError(value) {
  const text = cleanText(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) {
    return 'Enter the date as YYYY-MM-DD — e.g. 2026-12-18.';
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isReal =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (month < 1 || month > 12 || !isReal) {
    return `${text} is not a real date — there is no day ${day} in month ${month}. Use YYYY-MM-DD, e.g. 2026-12-18.`;
  }
  return null;
}

/** One phone format everywhere: +234 followed by 10 digits, shown with one
    space ("+234 810 444 5050") — the same shape the staff list already uses.
    A local 0-prefixed number (0810…) converts to its +234 form. Returns the
    canonical string; numbers that are not valid Nigerian numbers are left
    for the validator to refuse. */
export function canonicalPhone(value) {
  const phone = normalizePhone(value);
  if (!phone) return '';
  let body = phone;
  if (body.startsWith('+234')) {
    body = body.slice(4);
  } else if (body.startsWith('234') && body.length === 13) {
    body = body.slice(3);
  } else if (body.startsWith('0') && body.length === 11) {
    body = body.slice(1);
  } else {
    return phone; // not a normalisable Nigerian number — leave it for the validator
  }
  // 3-3-4 grouping, the way Nigerian numbers are usually written.
  return `+234 ${body.slice(0, 3)} ${body.slice(3, 6)} ${body.slice(6)}`;
}
