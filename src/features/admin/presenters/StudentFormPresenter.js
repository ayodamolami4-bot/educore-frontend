/**
 * AD03 — Student enrolment and core-record edit.
 * This Presenter sends the exact SchoolService.EnrolInput / StudentEdit
 * contracts. It never invents admission numbers, class identifiers,
 * metadata versions or guardian verification evidence.
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
  classId: '',
  classLabel: '',
  department: '',
  startsOn: '',
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
  guardianRelationship: 'PARENT/GUARDIAN',
  guardianVerificationReference: '',
  reason: '',
  subjectIds: {},
  fields: {},
};

function todayInLagos() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date()).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function enrolmentDateFor(classOption) {
  if (!classOption?.session?.startsOn || !classOption?.session?.endsOn) return '';
  const today = todayInLagos();
  return today >= classOption.session.startsOn && today <= classOption.session.endsOn
    ? today
    : classOption.session.startsOn;
}

export class StudentFormPresenter {
  constructor(studentModel) {
    this.model = studentModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this._studentId = null;
    this._guardianSearchSeq = 0;
    this._choiceSearchSeq = 0;
    this._metadata = null;
    this.initialState = {
      status: 'loading',
      mode: 'enrol',
      values: { ...EMPTY_VALUES, fields: {} },
      errors: {},
      errorText: null,
      notice: null,
      guardianMatches: [],
      guardianSearchState: 'idle',
      linkGuardianId: null,
      classOptions: [],
      metadataFields: [],
      metadataVersion: null,
      subjectChoiceGroups: [],
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

  async load(studentId) {
    this._studentId = studentId ?? null;
    this._setState({
      status: 'loading',
      mode: studentId ? 'edit' : 'enrol',
      errorText: null,
      guardianMatches: [],
      guardianSearchState: 'idle',
      linkGuardianId: null,
    });
    try {
      const [form, student] = await Promise.all([
        this.model.enrolmentForm(),
        studentId ? this.model.byId(studentId) : Promise.resolve(null),
      ]);
      this._metadata = form;
      const metadataFields = Array.isArray(form.definition?.studentFields)
        ? form.definition.studentFields
        : [];
      const classOptions = Array.isArray(form.classes) ? form.classes : [];
      const fields = Object.fromEntries(
        metadataFields.map((definition) => [definition.key, student?.fields?.[definition.key] ?? '']),
      );
      let values = { ...EMPTY_VALUES, fields };
      if (student) {
        const [firstName, ...lastName] = String(student.fullName ?? student.name ?? '').split(' ');
        const current = student.enrolments?.find((item) => !item.endsOn) ?? student.enrolments?.[0] ?? null;
        values = {
          ...values,
          firstName: firstName ?? '',
          lastName: lastName.join(' '),
          gender: String(student.sex ?? '').toUpperCase(),
          dateOfBirth: student.dateOfBirth ?? '',
          classId: current?.classId ?? '',
          classLabel: [current?.level, current?.arm].filter(Boolean).join(' '),
          department: current?.department ?? '',
        };
      } else {
        values.startsOn = enrolmentDateFor(classOptions.find((item) => item.sessionId === form.activeSessionId) ?? classOptions[0]);
      }
      this._setState({
        status: 'ready',
        mode: studentId ? 'edit' : 'enrol',
        values,
        classOptions,
        metadataFields,
        metadataVersion: form.metadataVersion,
        student,
        errors: {},
        errorText: null,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the school enrolment form.',
      });
    }
  }

  onValueChange(key, value) {
    const values = { ...this.state.values, [key]: value };
    const errors = { ...this.state.errors };

    if (key === 'classId') {
      const selected = this.state.classOptions.find((item) => item.id === value);
      values.classLabel = selected?.label ?? '';
      values.department = '';
      values.subjectIds = {};
      values.startsOn = enrolmentDateFor(selected);
    }
    if (key === 'department') {
      values.subjectIds = {};
    }
    if (key.startsWith('subjectChoice:')) {
      const groupKey = key.slice('subjectChoice:'.length);
      values.subjectIds = { ...values.subjectIds, [groupKey]: value };
      delete errors[key];
    }
    if (key.startsWith('field:')) {
      const fieldKey = key.slice('field:'.length);
      values.fields = { ...values.fields, [fieldKey]: value };
      delete errors[fieldKey];
    }

    if (key === 'dateOfBirth' && cleanText(value) && !isValidDateOfBirth(value)) {
      errors.dateOfBirth = 'Use a real date in YYYY-MM-DD format (not in the future).';
    } else if (key === 'dateOfBirth') {
      delete errors.dateOfBirth;
    }

    if (key === 'guardianPhone' && cleanText(value) && !isValidPhone(value)) {
      errors.guardianPhone = 'Enter a valid guardian phone number.';
    } else if (key === 'guardianPhone') {
      delete errors.guardianPhone;
    }

    if (key === 'guardianEmail' && cleanText(value) && !isValidEmail(value)) {
      errors.guardianEmail = 'Enter a valid email address.';
    } else if (key === 'guardianEmail') {
      delete errors.guardianEmail;
    }

    const patch = { values, errors };
    if (this.state.mode === 'enrol' && ['guardianPhone', 'guardianEmail'].includes(key)) {
      patch.linkGuardianId = null;
      patch.guardianMatches = [];
      patch.guardianSearchState = 'idle';
    }
    this._setState(patch);

    if (this.state.mode === 'enrol' && ['classId', 'department'].includes(key)) {
      void this._loadSubjectChoiceGroups(values.classId, values.department);
    }

    if (this.state.mode === 'enrol' && ['guardianPhone', 'guardianEmail'].includes(key)) {
      void this._searchGuardianMatches(values);
    }
  }

  async _loadSubjectChoiceGroups(classId, department) {
    const seq = ++this._choiceSearchSeq;
    if (!classId) {
      this._setState({ subjectChoiceGroups: [] });
      return;
    }
    const selectedClass = this.state.classOptions.find((item) => item.id === classId);
    if (selectedClass?.level?.startsWith('SSS') && !department) {
      this._setState({ subjectChoiceGroups: [] });
      return;
    }
    try {
      const groups = await this.model.subjectChoiceOptions(classId, department || null);
      if (!this._alive || seq !== this._choiceSearchSeq) return;
      this._setState({ subjectChoiceGroups: groups });
    } catch (error) {
      if (!this._alive || seq !== this._choiceSearchSeq) return;
      this._setState({
        subjectChoiceGroups: [],
        errorText: error instanceof ApiError
          ? error.message
          : 'Could not load the published subject-choice groups for this class.',
      });
    }
  }

  async _searchGuardianMatches(values) {
    const seq = ++this._guardianSearchSeq;
    const phone = normalizePhone(values.guardianPhone || '');
    const email = normalizeEmail(values.guardianEmail || '');
    const search = phone || email;
    if (!search || (phone && phone.replace(/\D/g, '').length < 7)) {
      this._setState({ guardianMatches: [], guardianSearchState: 'idle', linkGuardianId: null });
      return;
    }
    this._setState({ guardianSearchState: 'searching' });
    try {
      const result = await this.model.findGuardianMatches({
        guardianPhone: phone || undefined,
        guardianEmail: email || undefined,
      });
      if (!this._alive || seq !== this._guardianSearchSeq) return;
      const matches = result.matches ?? [];
      this._setState({
        guardianMatches: matches,
        guardianSearchState: 'done',
        linkGuardianId: matches.length === 1 ? matches[0].id : null,
      });
    } catch {
      if (this._alive && seq === this._guardianSearchSeq) {
        this._setState({ guardianMatches: [], guardianSearchState: 'error' });
      }
    }
  }

  onLinkGuardian(guardianId) {
    const match = this.state.guardianMatches.find((item) => item.id === guardianId);
    if (!match) return;
    this._setState({
      linkGuardianId: guardianId,
      values: {
        ...this.state.values,
        guardianName: match.fullName,
        guardianPhone: match.phone,
        guardianEmail: match.email,
      },
      errors: {},
    });
  }

  validate() {
    const errors = {};
    const value = this.state.values;
    const metadataFields = this.state.metadataFields ?? [];

    if (!cleanText(value.firstName)) errors.firstName = 'First name is required.';
    if (!cleanText(value.lastName)) errors.lastName = 'Last name is required.';
    if (!value.dateOfBirth || !isValidDateOfBirth(value.dateOfBirth)) {
      errors.dateOfBirth = 'A valid date of birth is required.';
    }
    if (!value.gender || !['MALE', 'FEMALE'].includes(value.gender.toUpperCase())) {
      errors.gender = 'Select the recorded sex.';
    }
    if (this.state.mode === 'enrol') {
      const selectedClass = this.state.classOptions.find((item) => item.id === value.classId);
      if (!selectedClass) errors.classId = 'Choose an actual class from the current school session.';
      if (selectedClass?.level?.startsWith('SSS') && !value.department) {
        errors.department = 'Choose the SSS department for this enrolment.';
      }
      for (const group of this.state.subjectChoiceGroups ?? []) {
        if (!value.subjectIds?.[group.key]) {
          errors[`subjectChoice:${group.key}`] = `Choose one subject for ${group.label}.`;
        }
      }
      if (!value.startsOn) errors.startsOn = 'Choose an enrolment start date.';
      else if (selectedClass?.session && (
        value.startsOn < selectedClass.session.startsOn ||
        value.startsOn > selectedClass.session.endsOn
      )) errors.startsOn = 'The enrolment date must fall within the selected class session.';
      if (!cleanText(value.guardianName)) errors.guardianName = 'A guardian name is required.';
      if (!value.guardianPhone || !isValidPhone(value.guardianPhone)) {
        errors.guardianPhone = 'A valid guardian phone number is required.';
      }
      if (cleanText(value.guardianEmail) && !isValidEmail(value.guardianEmail)) {
        errors.guardianEmail = 'Enter a valid guardian email address.';
      }
      if (!this.state.linkGuardianId && cleanText(value.guardianVerificationReference).length < 4) {
        errors.guardianVerificationReference = 'Record the in-person relationship verification reference.';
      }
      if (!cleanText(value.guardianRelationship)) {
        errors.guardianRelationship = 'Enter the guardian relationship.';
      }
    } else if (cleanText(value.reason).length < 5) {
      errors.reason = 'A reason of at least five characters is required for this record change.';
    }

    for (const definition of metadataFields) {
      const fieldValue = value.fields?.[definition.key];
      if (definition.required && !cleanText(fieldValue)) {
        errors[definition.key] = `${definition.key} is required by the current school enrolment form.`;
      }
      if (fieldValue != null && String(fieldValue).length > definition.maxLength) {
        errors[definition.key] = `${definition.key} exceeds the school limit of ${definition.maxLength} characters.`;
      }
    }
    return errors;
  }

  async onSubmit() {
    if (this.state.status === 'saving') return;
    const errors = this.validate();
    if (Object.keys(errors).length) {
      this._setState({ errors, notice: null });
      return;
    }

    this._setState({ status: 'saving', errorText: null, notice: null });
    const value = this.state.values;
    const fullName = `${cleanText(value.firstName)} ${cleanText(value.lastName)}`;
    const sex = value.gender.toUpperCase();

    try {
      if (this.state.mode === 'edit') {
        const saved = await this.model.update(
          this._studentId,
          {
            fullName,
            dateOfBirth: normalizeDateOfBirth(value.dateOfBirth),
            sex,
            fields: value.fields ?? {},
            metadataVersion: this.state.metadataVersion,
            reason: cleanText(value.reason),
          },
          this.state.student?.version,
        );
        this._setState({ status: 'accepted', student: saved, notice: 'Student record updated.' });
        return;
      }

      const selectedClass = this.state.classOptions.find((item) => item.id === value.classId);
      const guardian = this.state.linkGuardianId
        ? {
            existingGuardianId: this.state.linkGuardianId,
            relationship: cleanText(value.guardianRelationship),
          }
        : {
            fullName: cleanText(value.guardianName),
            phone: normalizePhone(value.guardianPhone),
            email: normalizeEmail(value.guardianEmail) || null,
            relationshipVerified: true,
            verificationReference: cleanText(value.guardianVerificationReference),
            relationship: cleanText(value.guardianRelationship),
          };

      const created = await this.model.enrol({
        fullName,
        dateOfBirth: normalizeDateOfBirth(value.dateOfBirth),
        sex,
        classId: selectedClass.id,
        startsOn: value.startsOn,
        department: selectedClass.level?.startsWith('JSS') ? null : value.department || null,
        metadataVersion: this.state.metadataVersion,
        fields: value.fields ?? {},
        guardian,
        admissionType: 'FRESH',
        subjectIds: Object.values(value.subjectIds ?? {}).filter(Boolean),
      });

      this._setState({
        status: 'accepted',
        notice: `${created.fullName} enrolled as ${created.admissionNumber}. Account provisioning has been queued.`,
      });
      if (this._navigation && created?.id) {
        const replace = this._navigation.replace || this._navigation.navigate;
        replace.call(this._navigation, 'StudentProfile', { studentId: created.id });
      }
    } catch (error) {
      this._setState({
        status: 'failed',
        errorText: error instanceof ApiError
          ? error.message
          : 'The school server did not accept the student record. Review the fields and try again.',
      });
    }
  }
}

export default StudentFormPresenter;
