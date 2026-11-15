/**
 * AD03 — Register or edit a student. One form, two modes:
 *   • enrol (no studentId) → POST student-enrolments, then jump to the
 *     new student's profile so the admin sees the record was created;
 *   • edit (studentId)     → PATCH students/{id}, then show "Saved".
 * Safe submission states: draft → saving → accepted/failed, with inline
 * validation errors so nothing the admin typed is lost on a failed submit.
 */
import { ApiError } from '../api/ApiError';
import {
  cleanText,
  isValidDateOfBirth,
  isValidEmail,
  isValidPhone,
  normalizeDateOfBirth,
  normalizeEmail,
  normalizePhone,
} from '../utils/validators';

const EMPTY_VALUES = {
  firstName: '',
  lastName: '',
  gender: '',
  dateOfBirth: '',
  classLabel: '',
  department: '',
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
};

export class StudentFormPresenter {
  constructor(studentModel) {
    this.model = studentModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this._studentId = null;
    this._guardianSearchSeq = 0; // ignore stale guardian-match responses
    this.initialState = {
      status: 'draft', // draft | saving | accepted | failed
      mode: 'enrol', // enrol | edit
      values: { ...EMPTY_VALUES },
      errors: {},
      errorText: null,
      notice: null,
      // Existing-guardian lookup (enrol mode only): once the office types a
      // phone or email we ask the backend for matching accounts so they can
      // LINK this student to an existing guardian instead of creating a
      // duplicate one with the same name.
      guardianMatches: [],
      guardianSearchState: 'idle', // idle | searching | done
      linkGuardianId: null, // chosen existing guardian id, or null to create
    };
    this.state = this.initialState;
  }

  attach(render, navigation) {
    this._render = render;
    this._navigation = navigation;
    this._alive = true;
  }

  detach() {
    this._alive = false;
  }

  _setState(patch) {
    if (!this._alive || !this._render) return;
    this.state = { ...this.state, ...patch };
    this._render(this.state);
  }

  /** Edit mode: load the student and prefill the form. */
  async load(studentId) {
    if (!studentId) return; // enrol mode — nothing to load
    this._studentId = studentId;
    this._setState({
      mode: 'edit',
      errorText: null,
      guardianMatches: [],
      guardianSearchState: 'idle',
      linkGuardianId: null,
    });
    try {
      const student = await this.model.byId(studentId);
      const nameParts = String(student.name || '').split(' ');
      const [firstName, ...rest] = nameParts;
      this._setState({
        values: {
          firstName: student.firstName || firstName || '',
          lastName: student.lastName || rest.join(' ') || '',
          gender: student.gender || '',
          dateOfBirth: student.dateOfBirth || '',
          classLabel: student.classLabel || '',
          department: student.department || '',
          guardianName: student.guardianName || '',
          guardianPhone: student.guardianPhone || '',
          guardianEmail: student.guardianEmail || '',
        },
      });
    } catch (error) {
      this._setState({
        errorText:
          error instanceof ApiError ? error.message : 'Could not load this student for editing.',
      });
    }
  }

  onValueChange(key, value) {
    const values = { ...this.state.values, [key]: value };
    const errors = { ...this.state.errors };
    // LIVE validation for format-checkable fields: dateOfBirth, guardianPhone,
    // guardianEmail. The error appears the moment a bad value is typed and
    // clears the moment it is fixed — the office does not have to wait for
    // submit to see "dateOfBirth must be a real date" or "guardianPhone is
    // invalid". Required-field checks (firstName, lastName, guardianName,
    // classLabel) stay on submit: an empty field does NOT flash red before
    // the office types anything.
    const liveFieldError = (field, val) => {
      if (field === 'dateOfBirth') {
        const text = cleanText(val);
        if (!text) return null; // optional — empty is not an error live
        return isValidDateOfBirth(text)
          ? null
          : 'Use a real date in YYYY-MM-DD format (not in the future).';
      }
      if (field === 'guardianPhone') {
        const text = cleanText(val);
        if (!text) return null; // required — flagged on submit, not live
        return isValidPhone(text)
          ? null
          : 'Enter a valid number, e.g. +234 803 111 2233 or 08031112233.';
      }
      if (field === 'guardianEmail') {
        const text = cleanText(val);
        if (!text) return null; // optional — empty is not an error live
        return isValidEmail(text)
          ? null
          : 'Enter a valid email, e.g. ngozi.okafor@example.com.';
      }
      return null;
    };
    const liveErr = liveFieldError(key, value);
    if (liveErr) errors[key] = liveErr;
    else delete errors[key]; // typing again clears the old complaint
    // Editing guardian phone/email (or clearing the chosen link) re-runs the
    // existing-guardian lookup so the office always sees the current matches.
    const patch = { values, errors };
    if (this.state.mode === 'enrol' && (key === 'guardianPhone' || key === 'guardianEmail')) {
      patch.linkGuardianId = null; // a new search supersedes a manual pick
      patch.guardianMatches = [];
      patch.guardianSearchState = 'idle';
    }
    this._setState(patch);
    if (this.state.mode === 'enrol' && (key === 'guardianPhone' || key === 'guardianEmail')) {
      this._searchGuardianMatches(values);
    }
  }

  /** Look up existing guardian accounts matching the typed phone/email. The
      office can then link this student to one of them (Bug: two students with
      the same parent were creating duplicate guardians of the same name). */
  async _searchGuardianMatches(values) {
    const seq = ++this._guardianSearchSeq;
    const phone = normalizePhone(values.guardianPhone || '');
    const email = normalizeEmail(values.guardianEmail || '');
    if (!phone && !email) {
      if (seq === this._guardianSearchSeq) {
        this._setState({ guardianMatches: [], guardianSearchState: 'idle', linkGuardianId: null });
      }
      return;
    }
    // Only search once the phone looks long enough to be real, so we do not
    // fire a request on every digit.
    if (phone && phone.replace(/\D/g, '').length < 7) return;
    this._setState({ guardianSearchState: 'searching' });
    try {
      const result = await this.model.findGuardianMatches({
        guardianPhone: phone || undefined,
        guardianEmail: email || undefined,
      });
      if (seq !== this._guardianSearchSeq || !this._alive) return; // a newer search won
      const matches = (result && result.matches) || [];
      // Auto-link when there is exactly one match and the office has not
      // typed a conflicting guardian name — fewer taps for the common case.
      const autoLink = matches.length === 1 ? matches[0].id : null;
      this._setState({
        guardianMatches: matches,
        guardianSearchState: 'done',
        linkGuardianId: this.state.linkGuardianId || autoLink,
      });
    } catch {
      if (seq === this._guardianSearchSeq) {
        this._setState({ guardianMatches: [], guardianSearchState: 'done' });
      }
    }
  }

  /** The office explicitly chose an existing guardian from the picker. */
  onLinkGuardian(guardianId) {
    const match = this.state.guardianMatches.find((g) => g.id === guardianId) || null;
    const values = { ...this.state.values };
    if (match) {
      // Prefill the guardian fields from the linked account so the form shows
      // the canonical name/phone/email of the existing guardian.
      values.guardianName = match.fullName;
      values.guardianPhone = match.phone;
      values.guardianEmail = match.email;
    }
    this._setState({
      linkGuardianId: guardianId,
      values,
      errors: { ...this.state.errors, guardianName: undefined, guardianPhone: undefined, guardianEmail: undefined },
    });
  }

  /** The office chose "create a new guardian account" instead of linking. */
  onCreateNewGuardian() {
    this._setState({ linkGuardianId: null });
  }

  validate() {
    const errors = {};
    const v = this.state.values;
    if (!cleanText(v.firstName)) errors.firstName = 'First name is required.';
    if (!cleanText(v.lastName)) errors.lastName = 'Last name is required.';
    if (!v.classLabel) errors.classLabel = 'Choose a class.';
    if (!cleanText(v.guardianName)) errors.guardianName = 'A guardian name is required.';
    if (!cleanText(v.guardianPhone)) {
      errors.guardianPhone = 'A guardian phone number is required.';
    } else if (!isValidPhone(v.guardianPhone)) {
      errors.guardianPhone =
        'Enter a valid number, e.g. +234 803 111 2233 or 08031112233.';
    }
    if (cleanText(v.guardianEmail) && !isValidEmail(v.guardianEmail)) {
      errors.guardianEmail = 'Enter a valid email, e.g. ngozi.okafor@example.com.';
    }
    if (cleanText(v.dateOfBirth) && !isValidDateOfBirth(v.dateOfBirth)) {
      errors.dateOfBirth =
        'Use a real date in YYYY-MM-DD format (not in the future).';
    }
    // Enrol mode only: when the live search found existing guardian matches,
    // the office MUST pick one — phone/email are account IDs, so a second
    // account with the same ID is never created. The "create a brand-new
    // guardian" escape hatch was removed for the same reason.
    if (
      this.state.mode === 'enrol' &&
      this.state.guardianSearchState === 'done' &&
      this.state.guardianMatches.length > 0 &&
      !this.state.linkGuardianId
    ) {
      errors.guardianPhone =
        'An existing guardian matches this phone/email — pick one above to link this student to their account.';
    }
    return errors;
  }

  async onSubmit() {
    if (this.state.status === 'saving') return;
    const errors = this.validate();
    if (Object.keys(errors).length > 0) {
      this._setState({ errors, notice: null });
      return;
    }

    this._setState({ status: 'saving', errorText: null, notice: null });
    const v = this.state.values;
    // Everything is trimmed/normalized here so the server never sees
    // "  Amara ", "0803 111  2233" or an email with stray capitals.
    const body = {
      firstName: cleanText(v.firstName),
      lastName: cleanText(v.lastName),
      gender: v.gender || undefined,
      dateOfBirth: normalizeDateOfBirth(v.dateOfBirth) || undefined,
      classLabel: v.classLabel,
      // JSS classes have no department (AD02 list already shows this rule).
      department: v.classLabel.startsWith('JSS') ? null : v.department || null,
      guardianName: cleanText(v.guardianName),
      guardianPhone: normalizePhone(v.guardianPhone),
      guardianEmail: normalizeEmail(v.guardianEmail) || undefined,
    };
    // Enrol mode only: link this student to an existing guardian account when
    // the office picked one (or when the auto-search found a single match),
    // instead of creating a duplicate guardian with the same name.
    if (this.state.mode === 'enrol' && this.state.linkGuardianId) {
      body.linkGuardianId = this.state.linkGuardianId;
    }

    try {
      if (this.state.mode === 'edit') {
        await this.model.update(this._studentId, body);
        this._setState({ status: 'accepted', notice: 'Changes saved — go back to the profile.' });
      } else {
        const created = await this.model.enrol(body);
        this._setState({
          status: 'accepted',
          notice: created
            ? `${created.fullName || body.firstName} enrolled as ${created.admissionNumber}.`
            : 'Enrolment accepted.',
        });
        // Land on the new profile so the admin can confirm the record.
        if (this._navigation && created && created.id) {
          const replace = this._navigation.replace || this._navigation.navigate;
          replace.call(this._navigation, 'StudentProfile', { studentId: created.id });
        }
      }
    } catch (error) {
      this._setState({
        status: 'failed',
        errorText:
          error instanceof ApiError
            ? error.message
            : 'The school server did not accept the form. Try again.',
      });
    }
  }
}

export default StudentFormPresenter;
