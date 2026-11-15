/**
 * AD33 — Bring in or download school data. Three record kinds now share one
 * screen, one paste-and-validate flow, and one export path:
 *   • students  — export shares a CSV of student records; import enrols each
 *                 row through the normal AD03 endpoint.
 *   • teachers  — export shares a CSV of teacher records; import posts each
 *                 row to the AD08 /teachers/import endpoint (the server runs
 *                 the same validation as the manual form).
 *   • parents   — export shares a CSV of guardian records; import creates a
 *                 guardian (and an optional first child link) per row.
 *
 * Export writes one row per record; import accepts pasted CSV rows (with or
 * without the header line), validates them, and writes each row through the
 * same endpoint the corresponding screen uses, so the same code path works
 * when the real Java API is connected.
 */
import { ApiError } from '../api/ApiError';
import { toCsv, parseCsv, shareOrCopyCsv } from '../api/csv';
import {
  cleanText,
  isValidClassLabel,
  isValidDateOfBirth,
  isValidEmail,
  isValidPhone,
  normalizeClassLabel,
  normalizeEmail,
  normalizePhone,
} from '../utils/validators';

const CLASS_HELP = 'class must be one of: JSS1 A, JSS1 B, JSS2 A, JSS3 A, SSS1 A, SSS2 A, SSS3 A';

// The export writes ONE row per student. The import reads these back BY COLUMN
// NAME (the header row carries "fullName", "class", "guardianPhone"…), so an
// exported file re-imports without the old "class must be one of…" error that
// came from positional mapping. Columns match the live Java export shape.
const EXPORT_COLUMNS = [
  { key: 'admissionNumber', header: 'admissionNumber' },
  { key: 'fullName', header: 'fullName' },
  { key: 'classLabel', header: 'class' },
  { key: 'department', header: 'department' },
  { key: 'gender', header: 'gender' },
  { key: 'dateOfBirth', header: 'dateOfBirth' },
  { key: 'status', header: 'status' },
  { key: 'guardianName', header: 'guardianName' },
  { key: 'guardianPhone', header: 'guardianPhone' },
  { key: 'guardianEmail', header: 'guardianEmail' },
];

// Teachers — export one row per teacher. The import reads these back BY NAME
// (the header carries fullName/phone/email/subjects/formClass), so an exported
// file re-imports cleanly. `subjects` is written pipe-separated ("Biology|Chemistry")
// and read back the same way, matching the manual teacher form's expected
// shape for the AD08 /teachers/import endpoint.
const TEACHER_EXPORT_COLUMNS = [
  { key: 'staffNumber', header: 'staffNumber' },
  { key: 'fullName', header: 'fullName' },
  { key: 'phone', header: 'phone' },
  { key: 'email', header: 'email' },
  { key: 'subjects', header: 'subjects' }, // pipe-separated on import/export
  { key: 'formClass', header: 'formClass' },
  { key: 'status', header: 'status' },
];

// Parents / guardians — export one row per guardian with the children joined
// pipe-separated ("Amara Okafor SSS1 A|Tunde Balogun SSS2 A"). The import
// creates a guardian and (when a child is named) links them to the matching
// active student by name + class.
const PARENT_EXPORT_COLUMNS = [
  { key: 'fullName', header: 'fullName' },
  { key: 'phone', header: 'phone' },
  { key: 'email', header: 'email' },
  { key: 'relationship', header: 'relationship' },
  { key: 'status', header: 'status' },
  { key: 'children', header: 'children' }, // pipe-separated "name|class" pairs
];

// The import accepts EITHER of these two column shapes (the export shape
// below, or the manual first-name/last-name template). When a header row is
// present, columns are read BY NAME, so an exported file re-imports cleanly
// even though its order differs from the manual template. When there is no
// header, the manual template order is assumed.
const MANUAL_TEMPLATE_COLUMNS = [
  'firstName',
  'lastName',
  'gender',
  'dateOfBirth',
  'class',
  'department',
  'guardianName',
  'guardianPhone',
  'guardianEmail',
];

// Known column names across all three kinds. Used to detect a header row when
// pasting — students add firstName/lastName/fullName/class, teachers add
// staffNumber/subjects/formClass, parents add relationship/children.
const TEACHER_TEMPLATE_COLUMNS = ['fullName', 'phone', 'email', 'subjects', 'formClass'];
const PARENT_TEMPLATE_COLUMNS = ['fullName', 'phone', 'email', 'relationship', 'children'];

// Split a single "fullName" cell ("Amara Okafor") into first/last the same way
// the enrol form does — the first token is the first name, the rest is last.
function splitFullName(full) {
  const parts = String(full || '')
    .trim()
    .split(/\s+/);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' };
}

// Map one CSV row (an array of cells) to a student, using the header map when
// available. Unknown header names are ignored, so the export's extra
// admissionNumber/status columns do not break the import.
function fieldsToStudent(fields, headerMap) {
  const get = (key) => {
    const lookup = String(key).toLowerCase();
    if (headerMap && headerMap.has(lookup)) {
      const idx = headerMap.get(lookup);
      return idx < fields.length ? fields[idx] : '';
    }
    return '';
  };
  const hasHeader = Boolean(headerMap);
  let firstName = '';
  let lastName = '';
  if (hasHeader) {
    // Export uses fullName; the manual template uses firstName/lastName.
    const fullName = get('fullName');
    if (fullName) {
      const split = splitFullName(fullName);
      firstName = split.firstName;
      lastName = split.lastName;
    } else {
      firstName = get('firstName');
      lastName = get('lastName');
    }
  } else {
    // Manual template order (no header).
    [firstName, lastName] = [fields[0] || '', fields[1] || ''];
  }
  const classLabel = hasHeader ? get('class') : fields[4] || '';
  return {
    firstName: cleanText(firstName),
    lastName: cleanText(lastName),
    gender: cleanText(hasHeader ? get('gender') : fields[2] || ''),
    dateOfBirth: cleanText(hasHeader ? get('dateOfBirth') : fields[3] || ''),
    classLabel: normalizeClassLabel(classLabel),
    department: cleanText(hasHeader ? get('department') : fields[5] || ''),
    guardianName: cleanText(hasHeader ? get('guardianName') : fields[6] || ''),
    guardianPhone: normalizePhone(hasHeader ? get('guardianPhone') : fields[7] || ''),
    guardianEmail: normalizeEmail(hasHeader ? get('guardianEmail') : fields[8] || ''),
  };
}

// Decide whether a row is a header: it must contain at least one known column
// name AND no value that looks like real data (a name or class label). Header
// names are matched CASE-INSENSITIVELY (export uses "fullName"/"classLabel",
// the manual template uses "firstName"/"class") and the map stores lowercased
// keys; get() looks them up lowercased too, so "FullName" and "fullName" both
// resolve. The known-name set is kind-aware so a teachers paste does not
// match the student column "class" against a header like "formClass" by
// accident (and vice-versa).
function buildHeaderMap(cells, kind) {
  const base = new Set(
    (kind === 'teachers'
      ? TEACHER_TEMPLATE_COLUMNS
      : kind === 'parents'
        ? PARENT_TEMPLATE_COLUMNS
        : [
            ...MANUAL_TEMPLATE_COLUMNS,
            'fullName',
            'admissionNumber',
            'classLabel',
            'class',
            'status',
          ]
    ).map((s) => s.toLowerCase()),
  );
  const matches = cells.filter((c) =>
    base.has(
      String(c || '')
        .trim()
        .toLowerCase(),
    ),
  );
  if (matches.length < 2) return null; // not enough column names to be a header
  const map = new Map();
  cells.forEach((cell, idx) => {
    const name = String(cell || '')
      .trim()
      .toLowerCase();
    if (base.has(name)) map.set(name, idx);
  });
  return map;
}

export const IMPORT_CSV_HEADER =
  'firstName,lastName,gender,dateOfBirth,class,department,guardianName,guardianPhone,guardianEmail';

// The placeholder shown in the paste box is kind-specific so the office sees
// the right template for the kind they picked.
export function importCsvHeaderFor(kind) {
  if (kind === 'teachers') {
    return 'fullName,phone,email,subjects,formClass';
  }
  if (kind === 'parents') {
    return 'fullName,phone,email,relationship,children';
  }
  return IMPORT_CSV_HEADER;
}

// ── Teachers ──────────────────────────────────────────────────────────────
// One CSV row → one teacher import row. `subjects` is a pipe-separated list
// ("Biology|Chemistry"); an empty string means "no subjects yet".
function fieldsToTeacher(fields, headerMap) {
  const get = (key) => {
    const lookup = String(key).toLowerCase();
    if (headerMap && headerMap.has(lookup)) {
      const idx = headerMap.get(lookup);
      return idx < fields.length ? fields[idx] : '';
    }
    // No header → assume the template order: fullName, phone, email, subjects, formClass.
    const order = { fullname: 0, phone: 1, email: 2, subjects: 3, formclass: 4 };
    const i = order[lookup];
    return i === undefined ? '' : fields[i] || '';
  };
  const subjectsRaw = cleanText(get('subjects'));
  const subjects = subjectsRaw
    ? subjectsRaw
        .split('|')
        .map((s) => cleanText(s))
        .filter(Boolean)
    : [];
  return {
    fullName: cleanText(get('fullName')),
    phone: normalizePhone(get('phone')),
    email: normalizeEmail(get('email')),
    subjects,
    formClass: cleanText(get('formClass')) || null,
  };
}

function validateTeacherRow(t) {
  if (!t.fullName) return 'fullName is empty';
  if (!t.phone) return 'phone is empty';
  if (!isValidPhone(t.phone)) return 'phone must be a valid number, e.g. +234 810 111 2020';
  if (t.email && !isValidEmail(t.email)) return 'email must be a valid email address';
  if (t.formClass && !isValidClassLabel(t.formClass)) return CLASS_HELP;
  return null;
}

// ── Parents / guardians ───────────────────────────────────────────────────
// One CSV row → one guardian. `children` is a pipe-separated list of
// "Name|Class" pairs (e.g. "Amara Okafor|SSS1 A|Tunde Balogun|SSS2 A"); each
// pair is parsed into { name, classLabel } for linking.
function parseChildrenCell(cell) {
  if (!cell) return [];
  return String(cell)
    .split('|')
    .map((pair) => {
      const parts = pair.split(',').map((p) => cleanText(p));
      // Accept "Name|Class" (pipe inside the children cell is the pair
      // separator, comma separates name from class within a pair) OR a bare
      // name with no class.
      if (parts.length >= 2) return { name: parts[0], classLabel: normalizeClassLabel(parts[1]) };
      const trimmed = cleanText(pair);
      return trimmed ? { name: trimmed, classLabel: '' } : null;
    })
    .filter(Boolean);
}

function fieldsToParent(fields, headerMap) {
  const get = (key) => {
    const lookup = String(key).toLowerCase();
    if (headerMap && headerMap.has(lookup)) {
      const idx = headerMap.get(lookup);
      return idx < fields.length ? fields[idx] : '';
    }
    const order = { fullname: 0, phone: 1, email: 2, relationship: 3, children: 4 };
    const i = order[lookup];
    return i === undefined ? '' : fields[i] || '';
  };
  return {
    fullName: cleanText(get('fullName')),
    phone: normalizePhone(get('phone')),
    email: normalizeEmail(get('email')),
    relationship: cleanText(get('relationship')) || null,
    children: parseChildrenCell(get('children')),
  };
}

function validateParentRow(p) {
  if (!p.fullName) return 'fullName is empty';
  if (!p.phone && !p.email) return 'enter at least a phone or an email';
  if (p.phone && !isValidPhone(p.phone))
    return 'phone must be a valid number, e.g. +234 803 111 2233';
  if (p.email && !isValidEmail(p.email)) return 'email must be a valid email address';
  return null;
}

function validateRow(student) {
  if (!student.firstName) return 'firstName is empty';
  if (!student.lastName) return 'lastName is empty';
  if (!student.classLabel) return 'class is empty';
  if (!isValidClassLabel(student.classLabel)) return CLASS_HELP;
  if (student.dateOfBirth && !isValidDateOfBirth(student.dateOfBirth)) {
    return 'dateOfBirth must be a real date in YYYY-MM-DD format';
  }
  if (student.guardianPhone && !isValidPhone(student.guardianPhone)) {
    return 'guardianPhone must be a valid number, e.g. +234 803 111 2233';
  }
  if (student.guardianEmail && !isValidEmail(student.guardianEmail)) {
    return 'guardianEmail must be a valid email address';
  }
  return null;
}

export class ImportsExportsPresenter {
  /**
   * kind: 'students' | 'teachers' | 'parents'. The students flow keeps its
   * original studentModel; the teachers/parents flows take a teachersModel /
   * guardiansModel with the same list/listFull-style methods. Each kind keeps
   * its own existing-record snapshot and its own import path.
   */
  constructor(studentModel, kind = 'students', altModel = null) {
    this.model = studentModel;
    this.kind = kind;
    this.altModel = altModel; // teachersModel for 'teachers', guardiansModel for 'parents'
    this._render = null;
    this._alive = false;
    this._existingStudents = null; // cached snapshot for duplicate checks
    this._existingAlt = null; // cached teachers/guardians snapshot
    this.initialState = {
      pasted: '',
      rows: [], // valid, ready to import
      problems: [], // { rowNumber, problem }
      importing: false,
      notice: null,
      errorText: null,
      exporting: false,
      exportNotice: null,
    };
    this.state = this.initialState;
  }

  attach(render) {
    this._render = render;
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

  /** Load every existing student ONCE so the duplicate check has the full
      roster to compare against (not just other rows in the same paste). The
      snapshot is cached for the life of the presenter so repeated pastes do
      not re-walk the list. */
  async _ensureExistingStudents() {
    if (this._existingStudents) return this._existingStudents;
    try {
      this._existingStudents = await this.model.listAll();
    } catch {
      this._existingStudents = []; // offline/demo hiccup — fall back to row-only checks
    }
    return this._existingStudents;
  }

  // Teachers/guardians: walk every page of the list endpoint once so the
  // duplicate check has the full set. The snapshot is cached for the life of
  // the presenter.
  async _ensureExistingAlt() {
    if (this._existingAlt) return this._existingAlt;
    if (!this.altModel) {
      this._existingAlt = [];
      return this._existingAlt;
    }
    try {
      const items = [];
      let page = 1;
      let pages = 1;
      do {
        const result = await this.altModel.list({ page });
        items.push(...(result.items || []));
        pages = result.pages || 1;
        page += 1;
      } while (page <= pages);
      this._existingAlt = items;
    } catch {
      this._existingAlt = [];
    }
    return this._existingAlt;
  }

  // Teachers duplicate check: same phone (the unique handle) or same email as
  // another accepted row in this paste or an existing teacher. The server's
  // own validateTeacherRow is the source of truth at import time; this is a
  // faster pre-flight so the office sees the duplicates before tapping Import.
  _duplicateTeacherProblem(teacher, acceptedRows) {
    const phone = teacher.phone || '';
    const email = teacher.email || '';
    for (const row of acceptedRows) {
      const t = row.row;
      if (phone && t.phone && t.phone === phone) {
        return `duplicate teacher — same phone as row ${row.rowNumber}`;
      }
      if (email && t.email && t.email === email) {
        return `duplicate teacher — same email as row ${row.rowNumber}`;
      }
    }
    for (const ex of this._existingAlt || []) {
      const exPhone = normalizePhone(ex.phone || '');
      const exEmail = normalizeEmail(ex.email || '');
      if (phone && exPhone && exPhone === phone) {
        return 'duplicate teacher — a teacher with this phone already exists';
      }
      if (email && exEmail && exEmail === email) {
        return 'duplicate teacher — a teacher with this email already exists';
      }
    }
    return null;
  }

  // Parents duplicate check: same phone or same email against accepted rows
  // and the existing guardian list. A parent with the same phone IS the same
  // guardian account in this domain (phone is the unique handle).
  _duplicateParentProblem(parent, acceptedRows) {
    const phone = parent.phone || '';
    const email = parent.email || '';
    for (const row of acceptedRows) {
      const p = row.row;
      if (phone && p.phone && p.phone === phone) {
        return `duplicate parent — same phone as row ${row.rowNumber}`;
      }
      if (email && p.email && p.email === email) {
        return `duplicate parent — same email as row ${row.rowNumber}`;
      }
    }
    for (const ex of this._existingAlt || []) {
      const exPhone = normalizePhone(ex.phone || '');
      const exEmail = normalizeEmail(ex.email || '');
      if (phone && exPhone && exPhone === phone) {
        return 'duplicate parent — a guardian with this phone already exists';
      }
      if (email && exEmail && exEmail === email) {
        return 'duplicate parent — a guardian with this email already exists';
      }
    }
    return null;
  }

  /** Detect a duplicate of `student` against the existing roster OR the
      other rows already accepted in this paste. Returns a human message or
      null. A duplicate is the same guardian phone, the same guardian email,
      or the same first+last name in the same class. */
  _duplicateProblem(student, acceptedRows) {
    const firstName = (student.firstName || '').toLowerCase();
    const lastName = (student.lastName || '').toLowerCase();
    const phone = student.guardianPhone || '';
    const email = student.guardianEmail || '';
    const classLabel = student.classLabel || '';
    // 1) Against other accepted rows in the same paste.
    for (const row of acceptedRows) {
      const s = row.student;
      if (phone && s.guardianPhone && s.guardianPhone === phone) {
        return `duplicate student/data — same phone as row ${row.rowNumber}`;
      }
      if (email && s.guardianEmail && s.guardianEmail === email) {
        return `duplicate student/data — same email as row ${row.rowNumber}`;
      }
      if (
        firstName &&
        lastName &&
        classLabel &&
        firstName === (s.firstName || '').toLowerCase() &&
        lastName === (s.lastName || '').toLowerCase() &&
        classLabel === s.classLabel
      ) {
        return `duplicate student/data — same name + class as row ${row.rowNumber}`;
      }
    }
    // 2) Against the existing roster.
    for (const ex of this._existingStudents || []) {
      const exFirst = (ex.firstName || '').toLowerCase();
      const exLast = (ex.lastName || '').toLowerCase();
      const exName = (ex.fullName || ex.name || '').toLowerCase();
      const exPhone = normalizePhone(ex.guardianPhone || '');
      const exEmail = normalizeEmail(ex.guardianEmail || '');
      const exClass = ex.classLabel || ex.className || '';
      const sameName =
        firstName && lastName
          ? firstName === exFirst && lastName === exLast
          : `${firstName} ${lastName}`.trim() === exName;
      if (phone && exPhone && exPhone === phone) {
        return 'duplicate student/data — a student with this guardian phone already exists';
      }
      if (email && exEmail && exEmail === email) {
        return 'duplicate student/data — a student with this guardian email already exists';
      }
      if (sameName && classLabel && classLabel === exClass) {
        return 'duplicate student/data — a student with this name + class already exists';
      }
    }
    return null;
  }

  /** Re-parse and re-validate on every paste/keystroke. The kind decides the
      row mapper, the validator, and the duplicate check. */
  async onPasteChange(text) {
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      this._setState({ pasted: text, rows: [], problems: [], notice: null, errorText: null });
      return;
    }
    if (this.kind === 'teachers' || this.kind === 'parents') {
      await this._ensureExistingAlt();
    } else {
      // Make sure the existing-roster snapshot is loaded before we judge any row
      // — the duplicate check needs it to catch a pasted row that matches an
      // existing student (not just another row in the same paste).
      await this._ensureExistingStudents();
    }
    // Detect a header row: if the first row's cells match known column names,
    // build a name→index map and read every data row BY COLUMN NAME. This is
    // what makes an exported file re-import cleanly (the export order differs
    // from the manual template order, and export uses "fullName" while the
    // template uses firstName/lastName).
    const headerMap = buildHeaderMap(parsed[0], this.kind);
    const dataRows = headerMap ? parsed.slice(1) : parsed;
    const rows = [];
    const problems = [];
    dataRows.forEach((fields, index) => {
      // Skip a trailing empty line that survived the trim filter.
      if (fields.every((f) => !String(f || '').trim())) return;
      if (this.kind === 'teachers') {
        const teacher = fieldsToTeacher(fields, headerMap);
        const fieldProblem = validateTeacherRow(teacher);
        if (fieldProblem) {
          problems.push({ rowNumber: index + 1, problem: fieldProblem });
          return;
        }
        const dupProblem = this._duplicateTeacherProblem(teacher, rows);
        if (dupProblem) {
          problems.push({ rowNumber: index + 1, problem: dupProblem });
          return;
        }
        rows.push({ rowNumber: index + 1, row: teacher });
        return;
      }
      if (this.kind === 'parents') {
        const parent = fieldsToParent(fields, headerMap);
        const fieldProblem = validateParentRow(parent);
        if (fieldProblem) {
          problems.push({ rowNumber: index + 1, problem: fieldProblem });
          return;
        }
        const dupProblem = this._duplicateParentProblem(parent, rows);
        if (dupProblem) {
          problems.push({ rowNumber: index + 1, problem: dupProblem });
          return;
        }
        rows.push({ rowNumber: index + 1, row: parent });
        return;
      }
      const student = fieldsToStudent(fields, headerMap);
      const fieldProblem = validateRow(student);
      if (fieldProblem) {
        problems.push({ rowNumber: index + 1, problem: fieldProblem });
        return;
      }
      // Duplicate check against already-accepted rows in this paste AND the
      // existing roster. A row that duplicates an earlier accepted row is
      // reported and dropped, so the import never creates twins.
      const dupProblem = this._duplicateProblem(student, rows);
      if (dupProblem) {
        problems.push({ rowNumber: index + 1, problem: dupProblem });
        return;
      }
      rows.push({ rowNumber: index + 1, student });
    });
    this._setState({ pasted: text, rows, problems, notice: null, errorText: null });
  }

  async onExport() {
    this._setState({ exporting: true, exportNotice: null });
    try {
      if (this.kind === 'teachers') {
        const items = await this._walkList(this.altModel);
        if (items.length === 0) {
          this._setState({ exportNotice: 'There are no teachers to export yet.' });
          return;
        }
        // Flatten subjects to a pipe-separated string for the CSV cell. The
        // TeacherModel.list shape uses `name` (the list view's label); the
        // export column is `fullName`, so map it back so the cell is not empty.
        const flat = items.map((t) => ({
          ...t,
          fullName: t.fullName || t.name || '',
          subjects: (t.subjects || []).join('|'),
        }));
        const csv = toCsv(flat, TEACHER_EXPORT_COLUMNS);
        const notice = await shareOrCopyCsv('teachers.csv', csv);
        this._setState({ exportNotice: `${notice} (${items.length} teachers)` });
        return;
      }
      if (this.kind === 'parents') {
        const items = await this._walkList(this.altModel);
        if (items.length === 0) {
          this._setState({ exportNotice: 'There are no parents to export yet.' });
          return;
        }
        // The list view shape uses `name`; the export column is `fullName`.
        // Fetch each guardian's full record so the children cell has the names
        // AND the fullName field, then flatten children to "Name,Class|Name,Class".
        const fulls = [];
        for (const g of items) {
          fulls.push(await this.altModel.byId(g.id));
        }
        const flat = fulls.map((g) => ({
          ...g,
          fullName: g.fullName || g.name || '',
          children: (g.children || [])
            .map((c) => [c.name, c.classLabel].filter(Boolean).join(','))
            .join('|'),
        }));
        const csv = toCsv(flat, PARENT_EXPORT_COLUMNS);
        const notice = await shareOrCopyCsv('parents.csv', csv);
        this._setState({ exportNotice: `${notice} (${items.length} parents)` });
        return;
      }
      // Walk every page so the CSV holds ALL students, not just the first 10.
      const items = [];
      let page = 1;
      let pages = 1;
      do {
        const result = await this.model.listFull({ page });
        items.push(...(result.items || []));
        pages = result.pages || 1;
        page += 1;
      } while (page <= pages);
      if (items.length === 0) {
        this._setState({ exportNotice: 'There are no students to export yet.' });
        return;
      }
      const csv = toCsv(items, EXPORT_COLUMNS);
      const notice = await shareOrCopyCsv('students.csv', csv);
      this._setState({ exportNotice: `${notice} (${items.length} students)` });
    } catch {
      this._setState({ exportNotice: 'The export failed — try again in a moment.' });
    } finally {
      if (this._alive) this._setState({ exporting: false });
    }
  }

  // Walk every page of a generic list endpoint (teachers/guardians share the
  // { items, pages } shape). Used by both export kinds.
  async _walkList(model) {
    const items = [];
    let page = 1;
    let pages = 1;
    do {
      const result = await model.list({ page });
      items.push(...(result.items || []));
      pages = result.pages || 1;
      page += 1;
    } while (page <= pages);
    return items;
  }

  async onImport() {
    if (this.state.importing || this.state.rows.length === 0) return;
    this._setState({ importing: true, errorText: null, notice: null });
    let imported = 0;
    try {
      if (this.kind === 'teachers') {
        // The AD08 /teachers/import endpoint accepts the full row array in one
        // post and returns per-row { imported, failed }. We forward every
        // accepted row; the server re-validates with the same rules as the
        // manual form, so a row that slipped past the pre-flight is reported
        // here.
        const payload = this.state.rows.map((r) => r.row);
        const result = await this.altModel.importRows(payload);
        const ok = (result && result.imported) || [];
        const bad = (result && result.failed) || [];
        imported = ok.length;
        if (bad.length > 0) {
          this._setState({
            importing: false,
            pasted: '',
            rows: [],
            problems: bad.map((b) => ({ rowNumber: b.row, problem: b.error })),
            notice: `Imported ${imported} teachers — ${bad.length} row(s) were rejected by the server.`,
            errorText: null,
          });
          return;
        }
        this._setState({
          importing: false,
          pasted: '',
          rows: [],
          problems: [],
          notice: `Imported ${imported} teachers — they are at the END of the teacher list.`,
        });
        return;
      }
      if (this.kind === 'parents') {
        // Parents have no single bulk endpoint in the demo backend; create each
        // guardian (and their first child link) one row at a time so a failure
        // stops cleanly with a count.
        for (const row of this.state.rows) {
          const p = row.row;
          await this.altModel.createGuardian({
            fullName: p.fullName,
            phone: p.phone,
            email: p.email,
            relationship: p.relationship,
            children: p.children,
          });
          imported += 1;
        }
        this._setState({
          importing: false,
          pasted: '',
          rows: [],
          problems: [],
          notice: `Imported ${imported} parents — they are at the END of the guardian list.`,
        });
        return;
      }
      for (const row of this.state.rows) {
        const s = row.student;
        await this.model.enrol({
          firstName: s.firstName,
          lastName: s.lastName,
          gender: s.gender || undefined,
          dateOfBirth: s.dateOfBirth || undefined,
          classLabel: s.classLabel,
          department: s.classLabel.startsWith('JSS') ? null : s.department || null,
          guardianName: s.guardianName || undefined,
          guardianPhone: s.guardianPhone || undefined,
          guardianEmail: s.guardianEmail || undefined,
        });
        imported += 1;
      }
      this._setState({
        importing: false,
        pasted: '',
        rows: [],
        problems: [],
        notice: `Imported ${imported} students — they are at the END of the student list (last pages).`,
      });
    } catch (error) {
      const label =
        this.kind === 'teachers' ? 'teachers' : this.kind === 'parents' ? 'parents' : 'students';
      this._setState({
        importing: false,
        errorText:
          error instanceof ApiError
            ? error.message
            : imported > 0
              ? `The import stopped after ${imported} ${label}. Fix the CSV and import the rest.`
              : 'The import failed — check the pasted rows and try again.',
        notice: imported > 0 ? `${imported} ${label} were imported before the stop.` : null,
      });
    }
  }
}

export default ImportsExportsPresenter;
