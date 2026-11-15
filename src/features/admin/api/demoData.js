/**
 * Built-in demo data — used ONLY while no real backend is configured.
 *
 * Why this exists: until a Java API is connected there is nowhere real to
 * fetch from, so every screen showed "Network error — check your connection"
 * (web additionally logged CORS blocks for the placeholder domain). In demo
 * mode (API_CONFIG.demo in client.js) the central client routes every request
 * through demoRequest() below instead of the network, and the built screens
 * render realistic Greenfield sample content on any device — no server, no
 * CORS errors on web, no network errors on the phone.
 *
 * Covered routes (everything else answers benignly so nothing crashes):
 *   GET  dashboard                     → AD01 Admin home
 *   GET  students                      → AD02 list (search + filters + paging)
 *   GET  students/{id}                 → AD04 profile header
 *   GET  students/{id}/enrolments      → AD04 enrolment history
 *   GET  students/{id}/fee-status      → AD04 fee summary line
 *   POST students/{id}/class-moves     → AD04 action (updates the demo record)
 *   POST students/{id}/withdrawals     → AD04 action (marks the demo record)
 *   GET  finance/invoices              → AD22 list (status filter + paging)
 *   GET/POST notices + publish/archive → AD28 announcements
 *
 * To connect the real Java API later: create a .env file in the project root
 * with  EXPO_PUBLIC_API_URL=https://your-api.example.com/api/v1  and restart
 * with `npx expo start -c`. Demo mode switches off automatically and every
 * call goes to the network again.
 */

import {
  emailError,
  phoneError,
  timeError,
  minutesOf,
} from './validation.js';
import {
  cleanText,
  normalizeEmail,
  normalizePhone,
  normalizeClassLabel,
  calendarDateError,
  nextClassOf,
  canonicalPhone,
} from '../utils/validators.js';

const SCHOOL_NAME = 'Greenfield Secondary School';
const SESSION_LABEL = '2026/2027';

/* ── AD01 — Admin home ──────────────────────────────────────────────── */

const DASHBOARD = {
  schoolName: SCHOOL_NAME,
  sessionLabel: SESSION_LABEL,
  termLabel: 'First Term',
  staffName: 'Admin',
  registersSubmitted: 21,
  registersExpected: 24,
  missingRegisters: 3,
  absentStudents: 12,
  lateArrivals: 4,
  attention: [
    {
      id: 'atn-1',
      type: 'results',
      title: 'Result packages returned for corrections',
      detail: 'SSS1 A and SSS2 A mathematics sheets need teacher sign-off',
      countLabel: '3 pending',
    },
    {
      id: 'atn-2',
      type: 'payment',
      title: 'Paystack settlements to reconcile',
      detail: 'Two card payments need matching to invoices',
      countLabel: '2 open',
    },
    {
      id: 'atn-3',
      type: 'complaint',
      title: 'New guardian complaint',
      detail: 'Transport route change request for JSS2 A',
      countLabel: '1 new',
    },
  ],
  todaySchedule: [
    { id: 'sch-1', time: '08:00', subject: 'Morning assembly', detail: 'Main hall · all classes' },
    { id: 'sch-2', time: '10:30', subject: 'SSS1 A · Mathematics', detail: 'Continuous assessment marks close today' },
    { id: 'sch-3', time: '14:00', subject: 'Staff briefing', detail: 'Staff room · first-term review' },
  ],
};

/* ── AD02/AD04 — Students ───────────────────────────────────────────── */

const STUDENTS = [
  { id: 1, fullName: 'Amara Okafor', admissionNumber: 'GSS/2026/0141', classLabel: 'SSS1 A', department: 'Science', status: 'Active', dateOfBirth: '2010-04-17', gender: 'Female', admissionDate: '2026-09-14', guardianName: 'Mrs. Ngozi Okafor', guardianPhone: '+234 803 111 2233', guardianEmail: 'ngozi.okafor@example.com', address: '12 Palm Grove Road, Enugu' },
  { id: 2, fullName: 'Chiamaka Eze', admissionNumber: 'GSS/2026/0142', classLabel: 'SSS1 A', department: 'Science', status: 'Active', dateOfBirth: '2010-08-02', gender: 'Female', admissionDate: '2026-09-14', guardianName: 'Mr. Chidi Eze', guardianPhone: '+234 805 222 3344', guardianEmail: 'chidi.eze@example.com', address: '4 Abakpa Nike Street, Enugu' },
  { id: 3, fullName: 'Ngozi Ibe', admissionNumber: 'GSS/2026/0143', classLabel: 'SSS1 A', department: 'Science', status: 'Active', dateOfBirth: '2010-01-25', gender: 'Female', admissionDate: '2026-09-15', guardianName: 'Mrs. Ada Ibe', guardianPhone: '+234 807 333 4455', guardianEmail: 'ada.ibe@example.com', address: '8 Ogui Road, Enugu' },
  { id: 4, fullName: 'Tunde Balogun', admissionNumber: 'GSS/2026/0144', classLabel: 'SSS2 A', department: 'Business / Commercial', status: 'Active', dateOfBirth: '2009-06-11', gender: 'Male', admissionDate: '2026-09-14', guardianName: 'Mr. Kunle Balogun', guardianPhone: '+234 802 444 5566', guardianEmail: 'kunle.balogun@example.com', address: '23 New Haven Road, Enugu' },
  { id: 5, fullName: 'Fatima Bello', admissionNumber: 'GSS/2026/0145', classLabel: 'SSS2 A', department: 'Humanities / Arts', status: 'Active', dateOfBirth: '2009-12-30', gender: 'Female', admissionDate: '2026-09-14', guardianName: 'Alhaji Sani Bello', guardianPhone: '+234 806 555 6677', guardianEmail: 'sani.bello@example.com', address: '5 Garki Avenue, Enugu' },
  { id: 6, fullName: 'Daniel Ogun', admissionNumber: 'GSS/2026/0146', classLabel: 'SSS3 A', department: 'Science', status: 'Active', dateOfBirth: '2008-03-09', gender: 'Male', admissionDate: '2026-09-14', guardianName: 'Dr. Kemi Ogun', guardianPhone: '+234 809 666 7788', guardianEmail: 'kemi.ogun@example.com', address: '17 Independence Layout, Enugu' },
  { id: 7, fullName: 'Zainab Musa', admissionNumber: 'GSS/2026/0147', classLabel: 'SSS3 A', department: 'Business / Commercial', status: 'Active', dateOfBirth: '2008-07-21', gender: 'Female', admissionDate: '2026-09-14', guardianName: 'Alhaji Yusuf Musa', guardianPhone: '+234 803 777 8899', guardianEmail: 'yusuf.musa@example.com', address: '31 New Market Road, Enugu' },
  { id: 8, fullName: 'Emeka Nwosu', admissionNumber: 'GSS/2026/0148', classLabel: 'JSS1 A', department: null, status: 'Active', dateOfBirth: '2012-05-14', gender: 'Male', admissionDate: '2026-09-14', guardianName: 'Mr. Obi Nwosu', guardianPhone: '+234 808 888 9900', guardianEmail: 'obi.nwosu@example.com', address: '9 Achara Layout, Enugu' },
  { id: 9, fullName: 'Aisha Mohammed', admissionNumber: 'GSS/2026/0149', classLabel: 'JSS1 A', department: null, status: 'Active', dateOfBirth: '2012-09-28', gender: 'Female', admissionDate: '2026-09-15', guardianName: 'Hajiya Amina Mohammed', guardianPhone: '+234 805 999 0011', guardianEmail: 'amina.mohammed@example.com', address: '14 Coal City Gardens, Enugu' },
  { id: 10, fullName: 'Kelechi Umeh', admissionNumber: 'GSS/2026/0150', classLabel: 'JSS2 A', department: null, status: 'Active', dateOfBirth: '2011-11-03', gender: 'Male', admissionDate: '2026-09-14', guardianName: 'Mrs. Ify Umeh', guardianPhone: '+234 802 101 1122', guardianEmail: 'ify.umeh@example.com', address: '2 Trans Ekulu Road, Enugu' },
  { id: 11, fullName: 'Yusuf Abubakar', admissionNumber: 'GSS/2026/0151', classLabel: 'JSS2 A', department: null, status: 'Active', dateOfBirth: '2011-02-19', gender: 'Male', admissionDate: '2026-09-14', guardianName: 'Alhaji Bello Abubakar', guardianPhone: '+234 806 202 2233', guardianEmail: 'bello.abubakar@example.com', address: '6 Emene Road, Enugu' },
  { id: 12, fullName: 'Blessing Adeyemi', admissionNumber: 'GSS/2025/0098', classLabel: 'JSS3 A', department: null, status: 'Withdrawn', dateOfBirth: '2011-04-08', gender: 'Female', admissionDate: '2025-09-15', guardianName: 'Pastor Samuel Adeyemi', guardianPhone: '+234 807 303 3344', guardianEmail: 'samuel.adeyemi@example.com', address: '19 Uwani, Enugu' },
];

const PREVIOUS_CLASS = {
  'SSS3 A': 'SSS2 A',
  'SSS2 A': 'SSS1 A',
  'SSS1 A': 'JSS3 A',
  'JSS3 A': 'JSS2 A',
  'JSS2 A': 'JSS1 A',
  'JSS1 A': 'Primary 6',
};

function findStudent(id) {
  return STUDENTS.find((s) => s.id === Number(id)) || null;
}

function filterStudents(query) {
  const q = (query.q || query.search || '').toString().trim().toLowerCase();
  const classId = query.classId && query.classId !== 'all' ? query.classId : null;
  const department = query.department && query.department !== 'all' ? query.department : null;
  const status = query.status && query.status !== 'all' ? query.status : null;

  return STUDENTS.filter((s) => {
    if (classId && s.classLabel !== classId) return false;
    if (department && s.department !== department) return false;
    if (status && s.status !== status) return false;
    if (q) {
      const haystack = `${s.fullName} ${s.admissionNumber}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function enrolmentsFor(id) {
  const s = findStudent(id);
  if (!s) return [];
  const rows = [
    {
      id: `${s.id}-2026`,
      session: SESSION_LABEL,
      sessionLabel: `${SESSION_LABEL} · First Term`,
      classLabel: s.classLabel,
      status: s.status,
    },
  ];
  if (PREVIOUS_CLASS[s.classLabel]) {
    rows.push({
      id: `${s.id}-2025`,
      session: '2025/2026',
      sessionLabel: '2025/2026 · Third Term',
      classLabel: PREVIOUS_CLASS[s.classLabel],
      status: 'Completed',
    });
  }
  return rows;
}

function feeStatusFor(id) {
  const s = findStudent(id);
  if (!s) return null;
  const invoice = INVOICES.find((inv) => inv.studentName === s.fullName);
  if (s.status === 'Withdrawn') {
    return { summary: 'Account closed — nothing outstanding', planName: '—' };
  }
  if (!invoice || invoice.status === 'Paid') {
    return { summary: 'Up to date — nothing outstanding', planName: invoice ? invoice.planName : 'First Term 2026/2027 fees' };
  }
  const owing = (invoice.balanceLabel || '').replace('Balance ', '');
  return { summary: `${owing} outstanding for ${invoice.planName}`, planName: invoice.planName };
}

/* ── AD22 — Invoices ────────────────────────────────────────────────── */

const INVOICES = [
  { id: 'inv-1', number: 'INV-2026-0141', studentName: 'Amara Okafor', planName: 'First Term tuition 2026/2027', amountLabel: '₦85,000', balanceLabel: 'Balance ₦0', status: 'Paid', dueDate: '2026-09-28', amount: 85000, paid: 85000 },
  { id: 'inv-2', number: 'INV-2026-0142', studentName: 'Chiamaka Eze', planName: 'First Term tuition 2026/2027', amountLabel: '₦85,000', balanceLabel: 'Balance ₦45,000', status: 'PartiallyPaid', dueDate: '2026-09-28', amount: 85000, paid: 40000 },
  { id: 'inv-3', number: 'INV-2026-0144', studentName: 'Tunde Balogun', planName: 'Tuition + boarding 2026/2027', amountLabel: '₦120,000', balanceLabel: 'Balance ₦120,000', status: 'Overdue', dueDate: '2026-09-28', amount: 120000, paid: 0 },
  { id: 'inv-4', number: 'INV-2026-0145', studentName: 'Fatima Bello', planName: 'First Term tuition 2026/2027', amountLabel: '₦85,000', balanceLabel: 'Balance ₦0', status: 'Paid', dueDate: '2026-09-28', amount: 85000, paid: 85000 },
  { id: 'inv-5', number: 'INV-2026-0146', studentName: 'Daniel Ogun', planName: 'First Term tuition 2026/2027', amountLabel: '₦85,000', balanceLabel: 'Balance ₦30,000', status: 'PartiallyPaid', dueDate: '2026-09-28', amount: 85000, paid: 55000 },
  { id: 'inv-6', number: 'INV-2026-0148', studentName: 'Emeka Nwosu', planName: 'First Term tuition 2026/2027', amountLabel: '₦85,000', balanceLabel: 'Balance ₦85,000', status: 'Draft', dueDate: '2026-09-28', amount: 85000, paid: 0 },
  { id: 'inv-7', number: 'INV-2026-0147', studentName: 'Zainab Musa', planName: 'First Term tuition 2026/2027', amountLabel: '₦85,000', balanceLabel: 'Balance ₦0', status: 'Paid', dueDate: '2026-09-28', amount: 85000, paid: 85000 },
];

// AD23 — payments already recorded on each invoice (office + online).
const INVOICE_PAYMENTS = {
  'inv-2': [
    { id: 'ipm-1', method: 'Paystack (online)', amountLabel: '₦40,000', reference: 'PSK-2201-0920-E', paidAt: '2026-09-20' },
    { id: 'ipm-2', method: 'Cash (office)', amountLabel: '₦15,000', reference: 'RCP-0112', paidAt: '2026-09-05' },
  ],
  'inv-3': [],
  'inv-5': [
    { id: 'ipm-3', method: 'Transfer (office)', amountLabel: '₦55,000', reference: 'RCP-0134', paidAt: '2026-09-18' },
  ],
};

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

function applyInvoicePayment(invoice, amount, method, reference, channel = 'office') {
  // Money rules live in the Java API on the real backend. The demo keeps the
  // same rules locally: never overpay, and status follows balance + due date.
  const applied = Math.max(0, Math.min(amount, invoice.amount - invoice.paid));
  invoice.paid += applied;
  const balance = invoice.amount - invoice.paid;
  invoice.balanceLabel = `Balance ${naira(balance)}`;
  invoice.status =
    balance === 0 ? 'Paid' : invoice.dueDate < todayLabel() ? 'Overdue' : 'PartiallyPaid';
  const row = {
    id: `ipm-${Date.now()}`,
    method: `${method} (${channel})`,
    amountLabel: naira(applied),
    reference: reference || 'Office receipt',
    paidAt: todayLabel(),
  };
  INVOICE_PAYMENTS[invoice.id] = INVOICE_PAYMENTS[invoice.id] || [];
  INVOICE_PAYMENTS[invoice.id].push(row);
  return { applied, row };
}

// AD25 — refund requests raised against payments. State machine:
// Pending → Approved / Rejected → Refunded (Paystack execute or manual).
const REFUND_REQUESTS = [
  {
    id: 'rfr-1',
    paymentId: 'pay-2',
    reference: 'PSK-7719-1102-B',
    studentName: 'Daniel Ogun',
    amountLabel: '₦30,000',
    reason: 'Duplicate payment — the guardian also paid at the office.',
    status: 'Pending',
    createdAt: '2026-11-09',
  },
  {
    id: 'rfr-2',
    paymentId: 'pay-5',
    reference: 'OFF-2026-0032',
    studentName: 'Chiamaka Eze',
    amountLabel: '₦40,000',
    reason: 'Guardian paid at the office after the bank transfer had already gone through.',
    status: 'Pending',
    createdAt: '2026-11-10',
  },
];

// AD05/AD06 — guardians and the children linked to them. Student ids match
// the STUDENTS seed so a child row opens that student's profile.
const GUARDIANS = [
  {
    id: 'gd-1', fullName: 'Mrs. Ngozi Okafor', phone: '+234 803 111 2233', email: 'ngozi.okafor@example.com',
    relationship: 'Mother', status: 'Active', childrenCount: 1,
    children: [{ studentId: 1, name: 'Amara Okafor', classLabel: 'SSS1 A', relationship: 'Mother' }],
  },
  {
    id: 'gd-2', fullName: 'Mr. Chibueze Eze', phone: '+234 805 222 3344', email: 'chibueze.eze@example.com',
    relationship: 'Father', status: 'Active', childrenCount: 2,
    children: [
      { studentId: 2, name: 'Chiamaka Eze', classLabel: 'SSS1 A', relationship: 'Father' },
      { studentId: 12, name: 'Blessing Adeyemi', classLabel: 'JSS3 A', relationship: 'Father' },
    ],
  },
  {
    id: 'gd-3', fullName: 'Alhaji Sani Musa', phone: '+234 806 333 4455', email: 'sani.musa@example.com',
    relationship: 'Father', status: 'Invited', childrenCount: 1,
    children: [{ studentId: 7, name: 'Zainab Musa', classLabel: 'SSS3 A', relationship: 'Father' }],
  },
  {
    id: 'gd-4', fullName: 'Mrs. Funke Balogun', phone: '+234 807 444 5566', email: 'funke.balogun@example.com',
    relationship: 'Mother', status: 'Active', childrenCount: 1,
    children: [{ studentId: 4, name: 'Tunde Balogun', classLabel: 'SSS2 A', relationship: 'Mother' }],
  },
  {
    id: 'gd-5', fullName: 'Mr. Emeka Bello', phone: '+234 808 555 6677', email: 'emeka.bello@example.com',
    relationship: 'Father', status: 'Active', childrenCount: 1,
    children: [{ studentId: 5, name: 'Fatima Bello', classLabel: 'SSS2 A', relationship: 'Father' }],
  },
  {
    id: 'gd-6', fullName: 'Mrs. Adaeze Ogun', phone: '+234 809 666 7788', email: 'adaeze.ogun@example.com',
    relationship: 'Mother', status: 'Active', childrenCount: 1,
    children: [{ studentId: 6, name: 'Daniel Ogun', classLabel: 'SSS3 A', relationship: 'Mother' }],
  },
];

// AD07/AD09 — teachers, their subjects and form-class responsibilities.
const TEACHERS = [
  {
    id: 'tch-1', fullName: 'Mrs. Ifeoma Eze', staffNumber: 'GST/014', phone: '+234 810 111 2020',
    email: 'ifeoma.eze@greenfield.edu.ng', status: 'Active', formClass: 'SSS1 A',
    subjects: ['Biology', 'Agricultural Science', 'Chemistry'],
  },
  {
    id: 'tch-2', fullName: 'Mr. Ademola Adeyinka', staffNumber: 'GST/022', phone: '+234 810 222 3030',
    email: 'ademola.adeyinka@greenfield.edu.ng', status: 'Active', formClass: 'SSS2 A',
    subjects: ['Economics', 'Commerce', 'Government'],
  },
  {
    id: 'tch-3', fullName: 'Mr. Kabiru Lawal', staffNumber: 'GST/031', phone: '+234 810 333 4040',
    email: 'kabiru.lawal@greenfield.edu.ng', status: 'On Leave', formClass: null,
    subjects: ['Further Mathematics'],
  },
  {
    id: 'tch-4', fullName: 'Miss Chioma Obi', staffNumber: 'GST/040', phone: '+234 810 444 5050',
    email: 'chioma.obi@greenfield.edu.ng', status: 'Active', formClass: 'JSS1 A',
    subjects: ['English Language', 'Literature', 'Igbo Language'],
  },
  {
    id: 'tch-5', fullName: 'Mr. Danladi Yusuf', staffNumber: 'GST/053', phone: '+234 810 555 6060',
    email: 'danladi.yusuf@greenfield.edu.ng', status: 'Active', formClass: null,
    subjects: ['Basic Science', 'Mathematics', 'Physics'],
  },
];

// AD21 — fee plans per class. Draft until the office issues the bills; issuing
// creates one invoice per ACTIVE student in that class.
const FEE_PLANS = [
  {
    id: 'fp-1', classLabel: 'JSS1 A', title: 'First Term tuition 2026/2027',
    term: '2026/2027 · First Term', amount: 85000, amountLabel: '₦85,000',
    dueDate: '2026-09-28', status: 'Issued', issuedCount: 3,
  },
  {
    id: 'fp-2', classLabel: 'SSS3 A', title: 'First Term tuition 2026/2027',
    term: '2026/2027 · First Term', amount: 85000, amountLabel: '₦85,000',
    dueDate: '2026-09-28', status: 'Issued', issuedCount: 2,
  },
  {
    id: 'fp-3', classLabel: 'JSS2 A', title: 'First Term tuition 2026/2027',
    term: '2026/2027 · First Term', amount: 85000, amountLabel: '₦85,000',
    dueDate: '2026-12-15', status: 'Draft', studentsCount: 2,
  },
  {
    id: 'fp-4', classLabel: 'SSS1 A', title: 'Excursion levy — First Term',
    term: '2026/2027 · First Term', amount: 15000, amountLabel: '₦15,000',
    dueDate: '2026-11-30', status: 'Draft', studentsCount: 3,
  },
];

// AD12/AD13 — the class list and the subject list. Class rows are computed
// from STUDENTS/TEACHERS at read time, so counts survive moves and withdrawals.
const CLASS_NAMES = ['JSS1 A', 'JSS1 B', 'JSS2 A', 'JSS3 A', 'SSS1 A', 'SSS2 A', 'SSS3 A'];
const SSS_DEPARTMENTS = {
  'SSS1 A': 'Science',
  'SSS2 A': 'Science',
  'SSS3 A': 'Science',
};
const SUBJECTS = [
  { id: 'sub-1', name: 'Mathematics', department: 'Core', departments: ['Core'], classes: CLASS_NAMES.slice() },
  { id: 'sub-2', name: 'English Language', department: 'Core', departments: ['Core'], classes: CLASS_NAMES.slice() },
  { id: 'sub-3', name: 'Basic Science', department: 'JSS', departments: ['JSS'], classes: ['JSS1 A', 'JSS1 B', 'JSS2 A', 'JSS3 A'] },
  { id: 'sub-4', name: 'Igbo Language', department: 'Core', departments: ['Core'], classes: CLASS_NAMES.slice() },
  { id: 'sub-5', name: 'Biology', department: 'Science', departments: ['Science'], classes: ['SSS1 A', 'SSS2 A', 'SSS3 A'] },
  { id: 'sub-6', name: 'Chemistry', department: 'Science', departments: ['Science'], classes: ['SSS1 A', 'SSS2 A', 'SSS3 A'] },
  { id: 'sub-7', name: 'Physics', department: 'Science', departments: ['Science'], classes: ['SSS1 A', 'SSS2 A', 'SSS3 A'] },
  { id: 'sub-8', name: 'Agricultural Science', department: 'JSS', departments: ['JSS', 'Science'], classes: ['JSS3 A', 'SSS1 A'] },
  { id: 'sub-9', name: 'Economics', department: 'Humanities / Arts', departments: ['Humanities / Arts', 'Business / Commercial'], classes: ['SSS1 A', 'SSS2 A', 'SSS3 A'] },
  { id: 'sub-10', name: 'Government', department: 'Humanities / Arts', departments: ['Humanities / Arts'], classes: ['SSS2 A', 'SSS3 A'] },
  { id: 'sub-11', name: 'Literature', department: 'Humanities / Arts', departments: ['Humanities / Arts'], classes: ['SSS2 A', 'SSS3 A'] },
  { id: 'sub-12', name: 'Commerce', department: 'Business / Commercial', departments: ['Business / Commercial'], classes: ['SSS1 A', 'SSS2 A', 'SSS3 A'] },
];

function buildClasses() {
  return CLASS_NAMES.map((name, i) => {
    const form = TEACHERS.find((t) => t.formClass === name && t.status === 'Active');
    return {
      id: `cls-${i + 1}`,
      classLabel: name,
      department: SSS_DEPARTMENTS[name] || null, // JSS classes have no department yet
      formTeacherName: form ? form.fullName : 'Not assigned yet',
      studentCount: STUDENTS.filter((s) => s.classLabel === name).length,
      subjectCount: SUBJECTS.filter((s) => s.classes.includes(name)).length,
    };
  });
}

/** Live class rows with FRESH counts, built from the LIVE CLASSES array —
    created and renamed classes are included, so "Class not found" can never
    happen for a class the office just made (workspace, roster, reports). */
function liveClassRows() {
  return CLASSES.map((cls) => {
    const form = TEACHERS.find((t) => t.formClass === cls.classLabel && t.status === 'Active');
    return {
      ...cls,
      formTeacherName: form ? form.fullName : 'Not assigned yet',
      studentCount: STUDENTS.filter((s) => s.classLabel === cls.classLabel).length,
      subjectCount: SUBJECTS.filter((s) => s.classes.includes(cls.classLabel)).length,
    };
  });
}

/** The LIVE class list — created and renamed classes count everywhere at
    once (timetables, promotion, subject rules, the student form). */
const CLASSES = buildClasses();

function liveClassNames() {
  return CLASSES.map((c) => c.classLabel);
}

/** Parse a class label: a JSS/SSS level (1-3) plus any letter suffix —
    "A", "C", "Diamond", "Gold Silver". Returns { level, label } or null.
    The suffix is normalised to a single-space form but keeps its original
    letter case so "Diamond" stays "Diamond". Duplicate checks compare the
    label case-insensitively (see liveClassNames/CLASSES clash checks) —
    "JSS1 a" and "JSS1 A" are the SAME class and must be refused. */
function parseClassLabel(raw) {
  const text = String(raw || '').trim().replace(/\s+/g, ' ');
  const m = /^((?:JSS|SSS)\d)\s+([A-Za-z][A-Za-z ]{0,11})$/i.exec(text);
  if (!m) return null;
  const level = m[1].toUpperCase();
  const suffix = m[2].trim().replace(/\s+/g, ' ');
  return { level, label: `${level} ${suffix}` };
}

/** Case-insensitive "does this class label already exist?" — used by both
    the create and rename guards so "JSS1 a" cannot sneak past "JSS1 A". */
function classLabelExists(label, exceptId) {
  const target = String(label || '').trim().toLowerCase();
  return CLASSES.some((c) => c.id !== exceptId && c.classLabel.toLowerCase() === target);
}

function classLabelFormatError() {
  return 'Classes look like "JSS1 A" or "SSS2 Diamond" — pick a JSS/SSS level (1-3) and any letter suffix (A, B, Diamond, Gold…).';
}

// AD14/AD15 — timetable drafts. 5 days × 6 periods; each class gets its own
// teacher offset so the seeded drafts never clash with each other.
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIOD_TIMES = [
  '08:00 – 08:40', '08:45 – 09:25', '09:30 – 10:10',
  '10:40 – 11:20', '11:25 – 12:05', '12:10 – 12:50',
];
const PERIOD_START_END = PERIOD_TIMES.map((t) => {
  const [start, end] = t.split('–').map((x) => x.trim());
  return { start, end };
});

function makeSlots(classLabel, filledDays) {
  const subjects = SUBJECTS.filter((s) => s.classes.includes(classLabel)).map((s) => s.name);
  const teachers = TEACHERS.filter((t) => t.status === 'Active');
  // A period's teacher is the subject's assigned teacher — the same rule the
  // PATCH guard enforces. Subject cycle is offset per class so two classes
  // never need the same teacher at the same time in the seeded drafts.
  const teacherFor = (subject) => {
    const match = teachers.find((t) => (t.subjects || []).includes(subject));
    return match ? match.fullName : null;
  };
  const offset = Math.max(0, CLASS_NAMES.indexOf(classLabel)); // custom classes start at 0
  const slots = [];
  DAYS.forEach((day, d) => {
    PERIOD_TIMES.forEach((time, p) => {
      const base = {
        day,
        period: p + 1,
        time,
        start: PERIOD_START_END[p].start,
        end: PERIOD_START_END[p].end,
      };
      if (d < filledDays && subjects.length > 0) {
        const subject = subjects[(d * PERIOD_TIMES.length + p + offset) % subjects.length];
        slots.push({ ...base, subject, teacherName: teacherFor(subject), activity: null });
      } else {
        slots.push({ ...base, subject: null, teacherName: null, activity: null });
      }
    });
  });
  return slots;
}

/** A slot's time as { start, end } — structured fields when present, else
    parsed from the display label ("08:00 – 08:40", en dash or hyphen). */
function slotStartEnd(slot) {
  if (slot && slot.start && slot.end) return { start: slot.start, end: slot.end };
  const m = /^(.+?)\s*[–-]\s*(.+)$/.exec((slot && slot.time) || '');
  return m ? { start: m[1].trim(), end: m[2].trim() } : null;
}

function slotLabel(slot) {
  const se = slotStartEnd(slot);
  return se ? `${se.start} – ${se.end}` : slot.time || 'no time set';
}

function slotTimeError(slot) {
  const se = slotStartEnd(slot);
  if (!se) return null; // untouched periods keep their seeded labels
  const badStart = timeError(se.start);
  if (badStart) return `the start time is wrong — ${badStart}`;
  const badEnd = timeError(se.end);
  if (badEnd) return `the end time is wrong — ${badEnd}`;
  if (minutesOf(se.end) <= minutesOf(se.start)) {
    return 'the end must be after the start — e.g. 08:00 – 08:40, never the same time twice.';
  }
  return null;
}

/** Period times must run forward through the day: a later period may not
    start earlier than (or at the same minute as) the previous period's end. */
function slotOrderError(slots) {
  const days = [...new Set(slots.map((s) => s.day))];
  for (const day of days) {
    const list = slots.filter((s) => s.day === day).sort((a, b) => a.period - b.period);
    for (let i = 1; i < list.length; i++) {
      const prev = slotStartEnd(list[i - 1]);
      const cur = slotStartEnd(list[i]);
      if (!prev || !cur) continue;
      if (minutesOf(cur.start) < minutesOf(prev.end)) {
        return (
          `${day}: period ${list[i].period} (${cur.start}) starts before period ` +
          `${list[i - 1].period} ends (${prev.end}) — period times must run in order, ` +
          'never the same or backwards.'
        );
      }
    }
  }
  return null;
}

const TIMETABLE_DRAFTS = [
  { id: 'ttd-1', classLabel: 'JSS1 A', term: '2026/2027 · First Term', status: 'Ready to review', slots: makeSlots('JSS1 A', 5) },
  { id: 'ttd-2', classLabel: 'JSS1 B', term: '2026/2027 · First Term', status: 'Draft', slots: makeSlots('JSS1 B', 3) },
];

/** Shared rules for validating a draft: completeness, subject-class fit,
    time order, then clashes (same period or overlapping times). */
function timetableProblems(draft, allDrafts) {
  const empty = draft.slots.filter((s) => !s.subject && !s.activity).length;
  if (empty > 0) {
    return `${empty} period${empty === 1 ? ' is' : 's are'} still empty — fill them first.`;
  }
  for (const s of draft.slots) {
    if (
      s.subject &&
      !SUBJECTS.some((sub) => sub.name === s.subject && sub.classes.includes(draft.classLabel))
    ) {
      return (
        `${s.day}, period ${s.period}: ${s.subject} is not offered in ${draft.classLabel} — ` +
        'replace it with one of the class\u2019s own subjects.'
      );
    }
  }
  const order = slotOrderError(draft.slots);
  if (order) return order;
  const others = allDrafts.filter((d) => d.id !== draft.id && d.status !== 'Draft');
  for (const s of draft.slots) {
    if (!s.teacherName) continue; // activities have no teacher, no clashes
    const sSe = slotStartEnd(s);
    for (const o of others) {
      const twin = o.slots.find((t) => {
        if (t.day !== s.day || t.teacherName !== s.teacherName) return false;
        if (t.period === s.period) return true;
        const tSe = slotStartEnd(t);
        if (!sSe || !tSe) return false;
        return (
          minutesOf(tSe.start) < minutesOf(sSe.end) && minutesOf(sSe.start) < minutesOf(tSe.end)
        );
      });
      if (twin) {
        return (
          `Timetable clash: ${s.teacherName} teaches ${o.classLabel} at overlapping times ` +
          `on ${s.day} (${slotLabel(s)} here, ${slotLabel(twin)} in ${o.classLabel}).`
        );
      }
    }
  }
  return null;
}

function filterInvoices(query) {
  const q = (query.q || query.search || '').toString().trim().toLowerCase();
  const status = query.status && query.status !== 'all' ? query.status : null;
  return INVOICES.filter((inv) => {
    if (status && inv.status !== status) return false;
    if (q) {
      const haystack = `${inv.studentName} ${inv.number}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/* ── AD28 — Notices (kept mutable so create / publish / archive work) ── */

let NOTICES = [
  {
    id: 'ntc-1',
    title: 'Mid-term break — Thursday 29 to Friday 30 October',
    body: 'School closes at 1:00 pm on Wednesday 28 October and resumes on Monday 2 November. Boarders return by 4:00 pm on Sunday.',
    audience: 'ALL',
    audienceLabel: 'Whole school',
    status: 'Published',
    publishedAt: '2026-10-26',
  },
  {
    id: 'ntc-2',
    title: 'PTA general meeting — Saturday 14 November, 10:00 am',
    body: 'Agenda: first-term results timeline, school bus routes, and the science laboratory upgrade. All guardians are welcome.',
    audience: 'ALL',
    audienceLabel: 'Whole school',
    status: 'Published',
    publishedAt: '2026-11-02',
  },
  {
    id: 'ntc-3',
    title: 'Inter-house sports — staff duty roster',
    body: 'Please confirm your duty slot with the sports master before Friday.',
    audience: 'ROLE_TEACHERS',
    audienceLabel: 'All teachers',
    status: 'Draft',
    publishedAt: null,
  },
];

function audienceLabelFor(audience) {
  if (audience === 'ROLE_TEACHERS') return 'All teachers';
  if (audience === 'ROLE_PARENTS') return 'All parents';
  if (audience === 'CLASS') return 'One class';
  return 'Whole school';
}

/* ── AD16 — Attendance registers (today). Built with a loop so the home
      totals (submitted / expected / missing) stay exactly consistent. ──── */

const REGISTER_CLASSES = ['JSS1 A', 'JSS1 B', 'JSS2 A', 'JSS3 A', 'SSS1 A', 'SSS2 A', 'SSS3 A'];
const REGISTER_SLOTS = [
  { subject: 'Class register', time: '08:00' },
  { subject: 'Mathematics', time: '10:30' },
  { subject: 'English Language', time: '12:10' },
];
const REGISTER_TEACHERS = ['Mr. Ade Okafor', 'Mrs. Grace Umeh', 'Mr. Emeka Ubah', 'Miss Halima Yusuf'];

const ATTENDANCE_REGISTERS = (() => {
  const rows = [];
  let absentLeft = 12; // DASHBOARD.absentStudents — spread one per register
  let lateLeft = 4; // DASHBOARD.lateArrivals
  REGISTER_CLASSES.forEach((classLabel, ci) => {
    // Only active students sit on a register; a class with no active students
    // cannot record absences.
    const roster = STUDENTS.filter((s) => s.classLabel === classLabel && s.status === 'Active');
    REGISTER_SLOTS.forEach((slot, si) => {
      const missing = (ci === 1 && si === 0) || (ci === 4 && si === 2) || (ci === 6 && si === 1);
      const submitted = !missing;
      const canMark = submitted && roster.length > 0;
      const absentCount = canMark && absentLeft > 0 ? 1 : 0;
      if (absentCount) absentLeft -= 1;
      const lateCount = canMark && lateLeft > 0 ? 1 : 0;
      if (lateCount) lateLeft -= 1;
      rows.push({
        id: `reg-${ci}-${si}`,
        classLabel,
        subject: slot.subject,
        time: slot.time,
        teacher: REGISTER_TEACHERS[(ci + si) % REGISTER_TEACHERS.length],
        status: submitted ? 'Submitted' : 'Missing',
        absentCount,
        lateCount,
        submittedAt: submitted ? slot.time : null,
      });
    });
  });
  return rows;
})();

/* AD17 — per-student rows behind each submitted register. The first listed
   student carries the register's absence, the second the lateness, so the
   counts on the register and the rows always agree. */
const ATTENDANCE_ENTRIES = (() => {
  const entries = [];
  ATTENDANCE_REGISTERS.forEach((reg) => {
    if (reg.status !== 'Submitted') return;
    const roster = STUDENTS.filter((s) => s.classLabel === reg.classLabel && s.status === 'Active');
    let absentToPlace = reg.absentCount;
    let lateToPlace = reg.lateCount;
    roster.forEach((stu, i) => {
      let status = 'Present';
      if (absentToPlace > 0 && i === 0) {
        status = 'Absent';
        absentToPlace -= 1;
      } else if (lateToPlace > 0 && i === 1) {
        status = 'Late';
        lateToPlace -= 1;
      }
      entries.push({
        id: `ent-${reg.id}-${stu.id}`,
        registerId: reg.id,
        studentId: stu.id,
        studentName: stu.fullName,
        status,
      });
    });
  });
  return entries;
})();

// Keep AD01's headline numbers derived from the same register rows.
DASHBOARD.registersExpected = ATTENDANCE_REGISTERS.length;
DASHBOARD.registersSubmitted = ATTENDANCE_REGISTERS.filter((r) => r.status === 'Submitted').length;
DASHBOARD.missingRegisters = ATTENDANCE_REGISTERS.length - DASHBOARD.registersSubmitted;

const ATTENDANCE_CORRECTIONS = [
  { id: 'cor-1', classLabel: 'JSS1 B', subject: 'Class register', teacher: 'Mrs. Grace Umeh', detail: 'Chiamaka Eze marked absent — guardian says she arrived late', status: 'Pending', requestedAt: todayLabel() },
  { id: 'cor-2', classLabel: 'SSS3 A', subject: 'Mathematics', teacher: 'Mr. Ade Okafor', detail: 'Daniel Ogun absent but wrote the CA in the hall', status: 'Pending', requestedAt: todayLabel() },
];

/* ── AD19 — Results review (mark packages + report batches) ─────────── */

const MARK_PACKAGES = [
  { id: 'pkg-1', classLabel: 'SSS1 A', subject: 'Mathematics', termLabel: 'First Term', teacherName: 'Mr. Ade Okafor', status: 'ReturnedForCorrections', studentCount: 32, detail: 'CA totals do not match the exam sheet for 2 students', submittedAt: '2026-11-08' },
  { id: 'pkg-2', classLabel: 'SSS2 A', subject: 'Mathematics', termLabel: 'First Term', teacherName: 'Mr. Ade Okafor', status: 'ReturnedForCorrections', studentCount: 28, detail: 'Two absences need a recorded decision', submittedAt: '2026-11-08' },
  { id: 'pkg-3', classLabel: 'SSS1 A', subject: 'English Language', termLabel: 'First Term', teacherName: 'Mrs. Grace Umeh', status: 'Submitted', studentCount: 32, detail: 'Awaiting admin sign-off', submittedAt: '2026-11-09' },
  { id: 'pkg-4', classLabel: 'JSS2 A', subject: 'Basic Science', termLabel: 'First Term', teacherName: 'Mr. Emeka Ubah', status: 'Approved', studentCount: 30, detail: 'Signed off', submittedAt: '2026-11-07' },
];

const REPORT_BATCHES = [
  { id: 'batch-1', classLabel: 'SSS1 A', termLabel: 'First Term 2026/2027', status: 'ReadyToPublish', studentCount: 32, publishedAt: null },
  { id: 'batch-2', classLabel: 'JSS1 A', termLabel: 'First Term 2026/2027', status: 'Published', studentCount: 34, publishedAt: '2026-11-05' },
  { id: 'batch-3', classLabel: 'SSS3 A', termLabel: 'First Term 2026/2027', status: 'Draft', studentCount: 29, publishedAt: null },
];

/* ── AD24 — Payments, Paystack settlements, reconciliation ──────────── */

const SETTLEMENTS = [
  { id: 'set-1', provider: 'Paystack', reference: 'PSK-8842-1103-A', amountLabel: '₦85,000', status: 'Unmatched', paidAt: '2026-11-08', studentName: 'Emeka Nwosu', invoiceNumber: 'INV-2026-0148' },
  { id: 'set-2', provider: 'Paystack', reference: 'PSK-7719-1102-B', amountLabel: '₦30,000', status: 'Unmatched', paidAt: '2026-11-08', studentName: 'Daniel Ogun', invoiceNumber: 'INV-2026-0146' },
  { id: 'set-3', provider: 'Paystack', reference: 'PSK-6620-1101-C', amountLabel: '₦85,000', status: 'Matched', paidAt: '2026-11-06', studentName: 'Zainab Musa', invoiceNumber: 'INV-2026-0147' },
];

const PAYMENTS = [
  { id: 'pay-1', reference: 'PSK-8842-1103-A', studentName: 'Emeka Nwosu', channel: 'Card (Paystack)', amountLabel: '₦85,000', status: 'Unreconciled', paidAt: '2026-11-08 14:22' },
  { id: 'pay-2', reference: 'PSK-7719-1102-B', studentName: 'Daniel Ogun', channel: 'Card (Paystack)', amountLabel: '₦30,000', status: 'Unreconciled', paidAt: '2026-11-08 09:05' },
  { id: 'pay-3', reference: 'PSK-6620-1101-C', studentName: 'Zainab Musa', channel: 'Card (Paystack)', amountLabel: '₦85,000', status: 'Reconciled', paidAt: '2026-11-06 18:40' },
  { id: 'pay-4', reference: 'OFF-2026-0031', studentName: 'Amara Okafor', channel: 'Cash (office)', amountLabel: '₦85,000', status: 'Reconciled', paidAt: '2026-10-30 10:15' },
  { id: 'pay-5', reference: 'OFF-2026-0032', studentName: 'Chiamaka Eze', channel: 'Bank transfer', amountLabel: '₦40,000', status: 'RefundRequested', paidAt: '2026-11-02 11:30' },
];

const RECONCILIATIONS = [
  { id: 'rec-1', paymentRef: 'PSK-6620-1101-C', invoiceNumber: 'INV-2026-0147', amountLabel: '₦85,000', createdBy: 'Admin', createdAt: '2026-11-06' },
  { id: 'rec-2', paymentRef: 'OFF-2026-0031', invoiceNumber: 'INV-2026-0141', amountLabel: '₦85,000', createdBy: 'Admin', createdAt: '2026-10-30' },
];

const PAYMENT_EXCEPTIONS = [
  { id: 'exc-1', reference: 'PSK-5501-1030-D', detail: 'Webhook received for an unknown admission number', amountLabel: '₦25,000', status: 'Open', openedAt: '2026-10-30' },
];

/* ── AD31/AD32 — Complaints (mutable so replies and state moves work) ── */

const COMPLAINTS = [
  {
    id: 'cmp-1',
    guardianName: 'Mrs. Ify Umeh',
    studentName: 'Kelechi Umeh',
    classLabel: 'JSS2 A',
    channel: 'Phone',
    subject: 'Transport route change request',
    detail: 'Requests the afternoon bus to stop at Trans Ekulu junction from next week.',
    status: 'New',
    owner: 'Unassigned',
    openedAt: todayLabel(),
    replies: [],
    notes: [],
    history: [{ id: 'h-1', text: 'Complaint received (phone)', at: todayLabel() }],
  },
  {
    id: 'cmp-2',
    guardianName: 'Mr. Chidi Eze',
    studentName: 'Chiamaka Eze',
    classLabel: 'SSS1 A',
    channel: 'Email',
    subject: 'Extra lessons timing',
    detail: 'Asks whether Saturday extra lessons can move to the afternoon.',
    status: 'In review',
    owner: 'Admin',
    openedAt: '2026-11-06',
    replies: [
      { id: 'r-1', author: 'Admin (office)', text: 'Thank you — the dean of studies will confirm by Friday.', at: '2026-11-06' },
    ],
    notes: [{ id: 'n-1', author: 'Admin', text: 'Timetable committee to decide at the staff briefing.', at: '2026-11-06' }],
    history: [
      { id: 'h-1', text: 'Complaint received (email)', at: '2026-11-06' },
      { id: 'h-2', text: 'Status → In review', at: '2026-11-06' },
    ],
  },
  {
    id: 'cmp-3',
    guardianName: 'Hajiya Amina Mohammed',
    studentName: 'Aisha Mohammed',
    classLabel: 'JSS1 A',
    channel: 'In person',
    subject: 'Locker repair',
    detail: 'Locker door does not close; reported at the bursary.',
    status: 'Resolved',
    owner: 'Admin',
    openedAt: '2026-11-03',
    replies: [{ id: 'r-1', author: 'Admin (office)', text: 'Replaced the latch on 5 November.', at: '2026-11-05' }],
    notes: [],
    history: [{ id: 'h-1', text: 'Status → Resolved', at: '2026-11-05' }],
  },
];

function filterComplaints(query) {
  const q = (query.q || query.search || '').toString().trim().toLowerCase();
  const status = query.status && query.status !== 'all' ? query.status : null;
  return COMPLAINTS.filter((c) => {
    if (status && c.status !== status) return false;
    if (q) {
      const haystack = `${c.guardianName} ${c.studentName} ${c.subject}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/* ── AD11 — School calendar ─────────────────────────────────────────── */

const CALENDAR = {
  sessionLabel: SESSION_LABEL,
  termLabel: 'First Term',
  termStart: '2026-09-14',
  termEnd: '2026-12-11',
  nextTermStart: '2027-01-11',
  keyDates: [
    { id: 'kd-1', date: '2026-11-14', title: 'PTA general meeting', detail: '10:00 am · main hall' },
    { id: 'kd-2', date: '2026-11-27', title: 'Continuous assessment closes', detail: 'All subjects · all classes' },
    { id: 'kd-3', date: '2026-12-04', title: 'First-term examinations begin', detail: 'Timetable on the noticeboard' },
    { id: 'kd-4', date: '2026-12-11', title: 'Term ends / vacation', detail: 'Collection of results from 14 December' },
    { id: 'kd-5', date: '2027-01-11', title: 'Second term begins', detail: 'Boarders return 10 January' },
  ],
  todaySchedule: DASHBOARD.todaySchedule,
};

const SESSIONS_LIST = [
  { id: 'ses-1', label: '2026/2027', status: 'Active', terms: 'First: 14 Sep – 11 Dec 2026 · Second: 11 Jan – 2 Apr 2027 · Third: 26 Apr – 16 Jul 2027' },
  { id: 'ses-2', label: '2025/2026', status: 'Archived', terms: 'Archived — see reports' },
];

/* ── AD29 — Messages / notifications inbox ──────────────────────────── */

const CONVERSATIONS = [
  {
    id: 'cnv-1',
    title: 'Mrs. Ngozi Okafor',
    participantLabel: 'Guardian · Amara Okafor (SSS1 A)',
    unread: 2,
    lastMessage: 'Thank you — she will bring the fee teller tomorrow.',
    lastAt: '2026-11-10 08:05',
    messages: [
      { id: 'm-1', author: 'Admin (office)', text: 'Good morning — the balance on INV-2026-0141 is ₦0; nothing is owed.', at: '2026-11-09 17:20' },
      { id: 'm-2', author: 'Mrs. Ngozi Okafor', text: 'Thank you — she will bring the fee teller tomorrow.', at: '2026-11-10 08:05' },
    ],
  },
  {
    id: 'cnv-3',
    title: 'Mr. Obi Nwosu',
    participantLabel: 'Guardian · Emeka Nwosu (JSS1 A)',
    unread: 1,
    lastMessage: 'Is the bus running on Friday?',
    lastAt: '2026-11-10 07:12',
    messages: [
      { id: 'm-1', author: 'Mr. Obi Nwosu', text: 'Is the bus running on Friday?', at: '2026-11-10 07:12' },
    ],
  },
  {
    id: 'cnv-2',
    title: 'Staff briefing group',
    participantLabel: 'Group · all teachers',
    unread: 0,
    lastMessage: 'Slides for the first-term review are shared.',
    lastAt: '2026-11-09 16:45',
    messages: [
      { id: 'm-1', author: 'Admin (office)', text: 'Slides for the first-term review are shared.', at: '2026-11-09 16:45' },
    ],
  },
];

/* ── The demo router the API client calls in demo mode ──────────────── */


function paginate(items, page = 1, perPage = 20) {
  const p = Math.max(1, Number(page) || 1);
  const start = (p - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    total: items.length,
    page: p,
    pages: Math.max(1, Math.ceil(items.length / perPage)),
  };
}

function todayLabel() {
  return new Date().toISOString().slice(0, 10);
}

/* Records created in demo mode (AD03 enrol + AD33 import) — counters follow
   the seeded admission numbers (…0151 is the last seed). */
let nextStudentId = 13;
let nextAdmissionNumber = 152;

// AD18 — the grading policy the office edits (CA vs exam weight, pass mark,
// and what score each grade starts at).
const ASSESSMENT_POLICY = {
  id: 'pol-1',
  term: '2026/2027 · First Term',
  caWeight: 30,
  examWeight: 70,
  passMark: 40,
  locked: false,
  grades: [
    { grade: 'A', minScore: 70, remark: 'Excellent' },
    { grade: 'B', minScore: 60, remark: 'Very good' },
    { grade: 'C', minScore: 50, remark: 'Good' },
    { grade: 'D', minScore: 45, remark: 'Fair' },
    { grade: 'E', minScore: 40, remark: 'Pass' },
    { grade: 'F', minScore: 0, remark: 'Fail' },
  ],
};

/* ── AD20 — learner report cards (generated from the seed marks) ─────── */

const REPORT_CARDS = ['batch-1', 'batch-2'].map((batchId, i) => {
  const batch = REPORT_BATCHES.find((b) => b.id === batchId);
  const student = STUDENTS.find((s) => s.classLabel === batch.classLabel);
  const rows = SUBJECTS.filter((s) => s.classes.includes(batch.classLabel)).map((s, j) => {
    const caScore = 18 + ((j * 7) % 13);
    const examScore = 40 + ((j * 11) % 22);
    const total = caScore + examScore;
    const band = [...ASSESSMENT_POLICY.grades].reverse().find((g) => total >= g.minScore);
    return { subject: s.name, caScore, examScore, total, grade: band.grade, remark: band.remark };
  });
  const average = Math.round(rows.reduce((n, r) => n + r.total, 0) / rows.length);
  const form = liveClassRows().find((c) => c.classLabel === batch.classLabel);
  return {
    id: `rep-${i + 1}`,
    batchId,
    studentId: student.id,
    studentName: student.fullName,
    classLabel: batch.classLabel,
    termLabel: batch.termLabel,
    subjects: rows,
    average,
    position: i === 0 ? '9th of 32' : '4th of 34',
    formTeacherName: form ? form.formTeacherName : '—',
    overallRemark: average >= 50 ? 'A good term. Keep it up.' : 'Work harder next term.',
  };
});

/* ── ST01–ST13 — student app surface (the learner-facing endpoints). ──── */
/* The student app talks to `learners/{studentId}/...` paths (see the ST
   page table). These seeds are derived from the admin seeds so a student
   sees the same classes, subjects and reports the office manages. Each
   learner handler resolves the student by id and serves their slice. */

// Learning materials (ST03). The student app lists the materials published
// for their class + subjects; the detail route returns one material.
const LEARNER_MATERIALS = [
  {
    id: 'mat-1', classLabel: 'SSS1 A', subject: 'Mathematics', termLabel: 'First Term',
    title: 'Quadratic equations — worked examples', type: 'Note',
    summary: 'Factorisation, completing the square and the quadratic formula, with 12 examples.',
    publishedAt: '2026-09-21',
  },
  {
    id: 'mat-2', classLabel: 'SSS1 A', subject: 'Biology', termLabel: 'First Term',
    title: 'Cell structure — diagram pack', type: 'Diagram',
    summary: 'Labelled diagrams of plant and animal cells, plus organelle function cards.',
    publishedAt: '2026-09-28',
  },
  {
    id: 'mat-3', classLabel: 'SSS1 A', subject: 'English Language', termLabel: 'First Term',
    title: 'Comprehension passages — term 1 set', type: 'Passage',
    summary: 'Five graded passages with vocabulary and inference questions.',
    publishedAt: '2026-10-05',
  },
];

// Assignments (ST05/ST06/ST07/ST08). Each assignment belongs to a class +
// subject and has a status the student sees (Open / Submitted / Graded).
// Submissions are stored against the assignment so the feedback page (ST08)
// can show the student's last submission + the teacher's feedback.
const LEARNER_ASSIGNMENTS = [
  {
    id: 'asn-1', classLabel: 'SSS1 A', subject: 'Mathematics', termLabel: 'First Term',
    title: 'Quadratic equations — exercise 4.2', brief: 'Solve questions 1–20 by factorisation.',
    dueAt: '2026-11-20', status: 'Open', maxScore: 20,
  },
  {
    id: 'asn-2', classLabel: 'SSS1 A', subject: 'Biology', termLabel: 'First Term',
    title: 'Cell structure — labelled diagram', brief: 'Draw and label a plant cell. Submit a photo.',
    dueAt: '2026-11-18', status: 'Submitted', maxScore: 10,
    submission: {
      id: 'sub-1', submittedAt: '2026-11-12', status: 'Submitted',
      content: 'Photo of labelled plant cell diagram.',
      feedback: null, score: null,
    },
  },
  {
    id: 'asn-3', classLabel: 'SSS1 A', subject: 'English Language', termLabel: 'First Term',
    title: 'Essay — “A person I admire”', brief: '350–400 words. Due Friday.',
    dueAt: '2026-11-13', status: 'Graded', maxScore: 30,
    submission: {
      id: 'sub-2', submittedAt: '2026-11-10', status: 'Graded',
      content: 'Essay on my grandmother, 388 words.',
      feedback: 'Strong opening. Watch your paragraphing and check the conclusion.',
      score: 24,
    },
  },
];

// Attendance (ST11) — the last two weeks of school days for a sample student.
// `present` is a count, `absent` is the list of dates with a reason.
function learnerAttendance(student) {
  const days = [
    { date: '2026-11-04', status: 'Present' },
    { date: '2026-11-05', status: 'Present' },
    { date: '2026-11-06', status: 'Absent', reason: 'Illness (fever)' },
    { date: '2026-11-09', status: 'Present' },
    { date: '2026-11-10', status: 'Late', reason: 'Bus delay' },
    { date: '2026-11-11', status: 'Present' },
    { date: '2026-11-12', status: 'Present' },
    { date: '2026-11-13', status: 'Present' },
  ];
  const present = days.filter((d) => d.status === 'Present').length;
  const absent = days.filter((d) => d.status === 'Absent').length;
  const late = days.filter((d) => d.status === 'Late').length;
  return {
    studentId: student.id,
    studentName: student.fullName,
    termLabel: 'First Term',
    summary: { present, absent, late, rate: Math.round((present / days.length) * 100) },
    days,
  };
}

// Build the learner overview (ST01 + ST02) from the admin seeds. The same
// payload feeds the home page and the “my class / subjects” page.
function learnerOverview(student) {
  const subjects = SUBJECTS.filter((s) => s.classes.includes(student.classLabel)).map((s) => ({
    id: s.id,
    name: s.name,
    department: student.classLabel.startsWith('JSS') ? null : s.department,
  }));
  const formTeacher =
    TEACHERS.find((t) => t.formClass === student.classLabel) || null;
  const openAssignments = LEARNER_ASSIGNMENTS.filter(
    (a) => a.classLabel === student.classLabel && a.status === 'Open',
  );
  return {
    studentId: student.id,
    studentName: student.fullName,
    admissionNumber: student.admissionNumber,
    classLabel: student.classLabel,
    department: student.department,
    sessionLabel: SESSION_LABEL,
    termLabel: 'First Term',
    formTeacherName: formTeacher ? formTeacher.fullName : '—',
    subjects,
    openAssignments: openAssignments.map((a) => ({
      id: a.id, subject: a.subject, title: a.title, dueAt: a.dueAt,
    })),
    latestReport: null, // filled below if a report card exists
  };
}

// Profile (ST13) — the student's bio + academic history (terms enrolled + any
// external results). External results are seeded empty for the demo student.
function learnerProfile(student) {
  return {
    studentId: student.id,
    studentName: student.fullName,
    admissionNumber: student.admissionNumber,
    dateOfBirth: student.dateOfBirth,
    gender: student.gender,
    classLabel: student.classLabel,
    department: student.department,
    guardianName: student.guardianName,
    guardianPhone: student.guardianPhone,
    guardianEmail: student.guardianEmail,
    address: student.address,
    admissionDate: student.admissionDate,
    academicHistory: [
      {
        sessionLabel: SESSION_LABEL, termLabel: 'First Term',
        classLabel: student.classLabel, status: 'In progress',
      },
    ],
  };
}

// Timetable (ST04) — a 5-day × 6-period week for the student's class, drawn
// from the BASE_TIMES the timetable builder uses.
const LEARNER_BASE_TIMES = [
  '08:00 – 08:40', '08:45 – 09:25', '09:30 – 10:10',
  '10:40 – 11:20', '11:25 – 12:05', '12:10 – 12:50',
];
function learnerTimetable(student) {
  const subjects = SUBJECTS.filter((s) => s.classes.includes(student.classLabel)).map((s) => s.name);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  // Deterministic per class so the week is stable across reloads.
  const startIdx = CLASS_NAMES.indexOf(student.classLabel) * 3;
  return {
    studentId: student.id,
    classLabel: student.classLabel,
    termLabel: 'First Term',
    days: days.map((day, d) => ({
      day,
      periods: LEARNER_BASE_TIMES.map((time, p) => {
        const subj = subjects[(startIdx + d + p) % subjects.length];
        return { period: p + 1, time, subject: subj || 'Study Time', teacher: '—' };
      }),
    })),
  };
}

/* ── AD26/AD27 — promotion previews (computed from official marks) ───── */

function makePromotionRows(classLabel, graduating) {
  // Only ACTIVE students are up for promotion/graduation. A withdrawn or
  // already-graduated student is NOT in the roster, so the office cannot
  // accidentally graduate a withdrawn student (the badge never flips for them
  // because they are not on the preview at all).
  const roster = STUDENTS.filter(
    (s) => s.classLabel === classLabel && s.status === 'Active',
  );
  return roster.map((s, i) => {
    const average = 38 + ((i * 17) % 50); // 38-87, deterministic per student
    const computed = graduating
      ? average >= 40 ? 'Graduate' : 'Repeat'
      : average >= 40 ? 'Promote' : 'Repeat';
    return { studentId: s.id, fullName: s.fullName, average, decision: computed };
  });
}

function summariseRows(rows) {
  return {
    promote: rows.filter((r) => r.decision === 'Promote').length,
    repeat: rows.filter((r) => r.decision === 'Repeat').length,
    graduate: rows.filter((r) => r.decision === 'Graduate').length,
  };
}

const PROMOTION_PREVIEWS = [
  {
    id: 'prm-1', classLabel: 'JSS1 A', sessionLabel: '2026/2027', status: 'Draft',
    computedAt: '2026-11-10', rows: makePromotionRows('JSS1 A', false),
  },
  {
    id: 'prm-2', classLabel: 'SSS3 A', sessionLabel: '2026/2027', status: 'Draft',
    computedAt: '2026-11-10', rows: makePromotionRows('SSS3 A', true),
  },
].map((p) => ({ ...p, summary: summariseRows(p.rows) }));
let nextPreviewId = 3;

/* ── AD34 — school change history (who did what, when) ───────────────── */

const AUDIT_LOG = [
  { id: 'aud-1', at: '2026-11-12', actor: 'Admin (you)', category: 'Records', action: 'Corrected a register', detail: 'JSS1 A · morning — Amara Eze marked present' },
  { id: 'aud-2', at: '2026-11-11', actor: 'Mrs. Ifeoma Eze', category: 'Academics', action: 'Sent results for review', detail: 'SSS1 A · Biology · first term' },
  { id: 'aud-3', at: '2026-11-11', actor: 'Admin (you)', category: 'Finance', action: 'Issued fee bills', detail: 'JSS1 A · 34 bills · ₦85,000 each' },
  { id: 'aud-4', at: '2026-11-10', actor: 'Admin (you)', category: 'Staff', action: 'Registered a teacher', detail: 'Mr. Chidi Nwachukwu · Mathematics' },
  { id: 'aud-5', at: '2026-11-10', actor: 'Admin (you)', category: 'Academics', action: 'Published a timetable', detail: 'JSS1 A · first term week' },
  { id: 'aud-6', at: '2026-11-09', actor: 'Mr. Danladi Yusuf', category: 'Academics', action: 'Submitted marks', detail: 'JSS2 A · Mathematics · CA 2' },
  { id: 'aud-7', at: '2026-11-09', actor: 'Admin (you)', category: 'Records', action: 'Enrolled a student', detail: 'Kelechi Nwosu · JSS1 B' },
  { id: 'aud-8', at: '2026-11-08', actor: 'Admin (you)', category: 'Staff', action: 'Changed a teacher\'s subjects', detail: 'Mrs. Ifeoma Eze · + Government' },
  { id: 'aud-9', at: '2026-11-07', actor: 'Admin (you)', category: 'Finance', action: 'Recorded a payment', detail: 'INV-1042 · ₦85,000 · Paystack' },
  { id: 'aud-10', at: '2026-11-06', actor: 'Admin (you)', category: 'Academics', action: 'Locked the grading rules', detail: 'Pass mark 40 · CA 30 / exam 70' },
  { id: 'aud-11', at: '2026-11-05', actor: 'Admin (you)', category: 'Records', action: 'Published report batches', detail: 'JSS1 A · first term' },
  { id: 'aud-12', at: '2026-11-04', actor: 'Mrs. Bisi Adeoye', category: 'Staff', action: 'Signed in', detail: 'Admin app · Android' },
  { id: 'aud-13', at: '2026-11-03', actor: 'Admin (you)', category: 'Records', action: 'Promoted a transfer student', detail: 'From JSS2 B to JSS2 A' },
  { id: 'aud-14', at: '2026-11-02', actor: 'Admin (you)', category: 'Finance', action: 'Updated a fee plan', detail: 'SSS3 · boarding added · ₦40,000' },
];

/* Subject rules shared by create and edit: Core spans both levels; JSS is
   junior-only; the named departments are SSS-only. Teachers are assigned per
   subject and mirrored into the staff records the timetable checks. */
function subjectRulesProblem(departments, classes) {
  const allowsJss = departments.includes('Core') || departments.includes('JSS');
  const allowsSss =
    departments.includes('Core') ||
    departments.some((d) => ['Science', 'Humanities / Arts', 'Business / Commercial'].includes(d));
  const jssClass = classes.find((c) => c.startsWith('JSS'));
  const sssClass = classes.find((c) => !c.startsWith('JSS'));
  if (!allowsJss && jssClass) {
    return 'Science, Humanities and Business subjects are SSS only — JSS classes take Core or JSS subjects.';
  }
  if (!allowsSss && sssClass) {
    return 'Only-JSS subjects are taught in JSS classes only — SSS classes take Core or department subjects.';
  }
  return null;
}

const ACTIVE_TEACHERS = () => TEACHERS.filter((t) => t.status === 'Active');

/** Keep TEACHERS.subjects in step with a subject's assigned-teacher list. */
function syncSubjectTeachers(subject, teacherNames) {
  TEACHERS.forEach((t) => {
    const has = (t.subjects || []).includes(subject.name);
    const should = teacherNames.includes(t.fullName);
    if (should && !has) t.subjects = [...(t.subjects || []), subject.name];
    if (!should && has) t.subjects = (t.subjects || []).filter((s) => s !== subject.name);
  });
}

/** Refuse a teachers list that names somebody who is not active staff. */
function unknownTeacherProblem(teacherNames) {
  const bad = (teacherNames || []).find(
    (n) => !ACTIVE_TEACHERS().some((t) => t.fullName === n),
  );
  return bad ? `${bad} is not an active teacher.` : null;
}

/** Teacher-side subject sync — the mirror of syncSubjectTeachers: keep every
    subject's assigned-teachers list in step when a teacher's subjects change. */
function syncTeacherSubjects(teacher, subjectNames) {
  SUBJECTS.forEach((s) => {
    const has = (s.teachers || []).includes(teacher.fullName);
    const should = subjectNames.includes(s.name);
    if (should && !has) s.teachers = [...(s.teachers || []), teacher.fullName];
    if (!should && has) s.teachers = (s.teachers || []).filter((n) => n !== teacher.fullName);
  });
}

/** Next staff number — the highest GST/nnn on staff + 1 ("max + 1"), so the
    office never types one. */
function nextStaffNumber() {
  let max = 0;
  TEACHERS.forEach((t) => {
    const m = /(\d+)\s*$/.exec(t.staffNumber || '');
    if (m) max = Math.max(max, Number(m[1]));
  });
  return `GST/${String(max + 1).padStart(3, '0')}`;
}

/** Duplicate teacher detection shared by the create form, the edit guard and
    the CSV import — names the existing teacher so the office knows what to
    do (open their profile instead of registering a twin). */
function teacherDuplicates(b, excludeId) {
  const emailKey = String(b.email || '').trim().toLowerCase();
  // Phones compare in the ONE canonical +234 form, so "0810 444 5050" and
  // "+234 810 444 5050" are the same number — format differences can no
  // longer sneak a duplicate past this check.
  const phoneKey = canonicalPhone(b.phone);
  const emailTwin = emailKey
    ? TEACHERS.find(
        (t) => t.id !== excludeId && t.email && String(t.email).trim().toLowerCase() === emailKey,
      )
    : null;
  const phoneTwin = phoneKey
    ? TEACHERS.find(
        (t) => t.id !== excludeId && t.phone && canonicalPhone(t.phone) === phoneKey,
      )
    : null;
  if (emailTwin && phoneTwin) {
    return `A teacher already exists with the same email and phone number — ${emailTwin.fullName} (${emailTwin.staffNumber}). Use different details, or open that teacher's profile.`;
  }
  if (emailTwin) {
    return `A teacher already exists with this email — ${emailTwin.fullName} (${emailTwin.staffNumber}).`;
  }
  if (phoneTwin) {
    return `A teacher already exists with this phone number — ${phoneTwin.fullName} (${phoneTwin.staffNumber}).`;
  }
  return null;
}

/** One validation opinion for a teacher row — used by the create form, the
    CSV import and the PATCH guard, so manual entry and imports always obey
    the same rules. Returns an error string or null. */
function validateTeacherRow(b, excludeId) {
  if (!cleanText(b.fullName)) return "Enter the teacher's full name.";
  const email = emailError(b.email);
  if (email) return email;
  const phone = phoneError(b.phone);
  if (phone) return phone;
  const duplicate = teacherDuplicates(b, excludeId);
  if (duplicate) return duplicate;
  const subjects = Array.isArray(b.subjects) ? b.subjects.filter(Boolean) : [];
  const unknown = subjects.find((s) => !SUBJECTS.some((sub) => sub.name === s));
  if (unknown) return `${unknown} is not in the subject list.`;
  if (b.formClass && !liveClassNames().includes(b.formClass)) {
    return `${b.formClass} is not one of this school's classes.`;
  }
  return null;
}

/** The grading-policy arithmetic in ONE place: the save guard and the lock
    guard share it, so a wrong policy is refused on save AND can never be
    locked. Returns the problem message or null. */
function policyArithmeticError(p) {
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
    // One message for every out-of-range case (too small, 49494, NaN…).
    return 'The pass mark must be between 34 and 100.';
  }
  const grades = Array.isArray(p.grades) ? p.grades : [];
  for (let i = 1; i < grades.length; i++) {
    if (Number(grades[i - 1].minScore) <= Number(grades[i].minScore)) {
      return `Grade ${grades[i - 1].grade} must start above grade ${grades[i].grade} — check the minimum scores.`;
    }
  }
  // The passing grades start at the pass mark: only F may sit below it.
  const belowPass = grades.filter((g) => g.grade !== 'F' && Number(g.minScore) < pass);
  if (belowPass.length) {
    return `Grade ${belowPass[0].grade} starts below the pass mark — every grade except F must start at ${pass}% or above.`;
  }
  return null;
}

// AD10 — the school profile the office edits, and the admin memberships
// ("who can sign in to the admin app, and with what role").
const SETTINGS = {
  schoolName: SCHOOL_NAME,
  address: '14 College Road, Greenfield, Enugu State',
  phone: '+234 810 000 1010',
  email: 'office@greenfield.edu.ng',
  sessionLabel: SESSION_LABEL,
  termLabel: 'First Term',
  nextTermBegins: '2027-01-11',
};

const ADMIN_ROLES = ['Principal', 'Vice Principal', 'Admin', 'Bursar', 'Exams Officer'];

const ADMIN_MEMBERSHIPS = [
  { id: 'adm-1', fullName: 'Admin (you)', email: 'admin@greenfield.edu.ng', role: 'Principal', status: 'Active', lastLogin: 'Today · 07:40' },
  { id: 'adm-2', fullName: 'Mrs. Grace Nwankwo', email: 'grace.nwankwo@greenfield.edu.ng', role: 'Vice Principal', status: 'Active', lastLogin: 'Yesterday · 16:05' },
  { id: 'adm-3', fullName: 'Mr. Samuel Ojo', email: 'samuel.ojo@greenfield.edu.ng', role: 'Exams Officer', status: 'Suspended', lastLogin: '2 weeks ago' },
];
let nextAdminId = 4;

export async function demoRequest({ path: route, method = 'GET', query = {}, body = null }) {
  await new Promise((resolve) => setTimeout(resolve, 250)); // let loading states show
  const m = String(method || 'GET').toUpperCase();
  // The client URL-encodes path params (e.g. "JSS1 A" → "JSS1%20A") — decode
  // before splitting, or class lookups by label miss and say "Class not found".
  const seg = decodeURIComponent(String(route || '')).split('/').filter(Boolean);

  // AD01 — dashboard
  if (seg[0] === 'dashboard' && m === 'GET') {
    // Attendance tiles are computed live so corrections show on the home
    // screen too — the same numbers AD16 shows.
    const submitted = ATTENDANCE_REGISTERS.filter((r) => r.status === 'Submitted').length;
    return {
      ...DASHBOARD,
      registersSubmitted: submitted,
      registersExpected: ATTENDANCE_REGISTERS.length,
      missingRegisters: ATTENDANCE_REGISTERS.length - submitted,
      absentStudents: ATTENDANCE_REGISTERS.reduce((n, r) => n + r.absentCount, 0),
      lateArrivals: ATTENDANCE_REGISTERS.reduce((n, r) => n + r.lateCount, 0),
    };
  }

  // AD03 — guardian-account-matches. The enrol form calls this BEFORE saving
  // so the office can link a new student to an EXISTING guardian instead of
  // silently creating a duplicate guardian record with the same name. A
  // guardian matches on phone (the unique handle, normalised to digits) or
  // email; the response names each match so the form can offer "add this
  // student to {name}".
  if (seg[0] === 'guardian-account-matches' && m === 'POST') {
    const phone = normalizePhone((body && body.guardianPhone) || '');
    const email = normalizeEmail((body && body.guardianEmail) || '');
    if (!phone && !email) {
      return { ok: false, error: 'Enter a guardian phone or email to search for an existing account.' };
    }
    const matches = GUARDIANS.filter((g) => {
      const samePhone = phone && normalizePhone(g.phone) === phone;
      const sameEmail = email && normalizeEmail(g.email) === email;
      return samePhone || sameEmail;
    }).map((g) => ({
      id: g.id,
      fullName: g.fullName,
      phone: g.phone,
      email: g.email,
      relationship: g.relationship,
      childrenCount: g.childrenCount,
    }));
    return { ok: true, matches };
  }

  // AD03/AD33 — enrol one student (the import loop reuses this same route).
  // Values are re-cleaned here so hand-built or CSV-sourced rows arrive
  // trimmed and normalized even if a caller skips the form.
  //
  // Guardian linking: if linkGuardianId points at an existing guardian, the
  // student is added to that guardian's children (no duplicate account). If
  // the phone/email already matches a guardian (without an explicit id), the
  // existing guardian is reused too. Otherwise a brand-new guardian record is
  // created so the student is enrol-able with a real guardian account from the
  // first save — the old demo just stored the name on the student and never
  // made a guardian, which is why two students with the same parent ended up
  // with two "guardians" of the same name.
  if (seg[0] === 'student-enrolments' && m === 'POST') {
    const cls = (body && body.classLabel) || 'JSS1 A';
    const guardianName = cleanText(body && body.guardianName);
    const guardianPhone = normalizePhone((body && body.guardianPhone) || '');
    // Store the phone in the same spaced canonical form the seeded guardians
    // use ("+234 803 111 2233") so the student profile and exports read the
    // same way everywhere, and so a second enrol with the same number links.
    const guardianPhoneDisplay = canonicalPhone(guardianPhone) || guardianPhone;
    const guardianEmail = normalizeEmail((body && body.guardianEmail) || '');
    // AD03/AD33 — server-side duplicate guard. The import front-end checks
    // first (so the office sees the problem per row BEFORE import), but the
    // backend MUST refuse too: a duplicate student is the same guardian
    // phone, the same guardian email, or the same first+last name in the
    // same class as an existing student. Linking a sibling to an existing
    // guardian (linkGuardianId or matching phone) is NOT a duplicate — the
    // guardian is shared, the student is new — so the duplicate rule never
    // fires on phone/email alone when the names differ AND a link is set.
    const newFirst = cleanText(body && body.firstName).toLowerCase();
    const newLast = cleanText(body && body.lastName).toLowerCase();
    const dupStudent = STUDENTS.find((s) => {
      const sFirst = (s.firstName || String(s.fullName || '').split(' ')[0] || '').toLowerCase();
      const sLast = (s.lastName || String(s.fullName || '').split(' ').slice(1).join(' ') || '').toLowerCase();
      const sPhone = normalizePhone(s.guardianPhone || '');
      const sEmail = normalizeEmail(s.guardianEmail || '');
      const sameNameClass =
        newFirst && newLast && newFirst === sFirst && newLast === sLast && cls === (s.classLabel || '');
      const samePhone = guardianPhone && sPhone && sPhone === guardianPhone;
      const sameEmail = guardianEmail && sEmail && sEmail === guardianEmail;
      // A shared guardian is allowed when the office explicitly linked the
      // sibling (linkGuardianId) OR the names are different — the duplicate
      // rule only fires when the same phone/email comes with the SAME name,
      // i.e. a true twin, not a second child.
      if (samePhone || sameEmail) {
        if (newFirst && newLast && newFirst === sFirst && newLast === sLast) return true;
        return false; // sibling — different name, shared guardian is fine
      }
      return sameNameClass;
    });
    if (dupStudent) {
      return {
        ok: false,
        error:
          'duplicate student/data — same guardian phone, email, or name + class as an existing student.',
      };
    }
    const student = {
      id: nextStudentId,
      fullName: `${cleanText(body && body.firstName)} ${cleanText(body && body.lastName)}`.trim(),
      admissionNumber: `GSS/2026/${String(nextAdmissionNumber).padStart(4, '0')}`,
      classLabel: cls,
      department: cls.startsWith('JSS') ? null : (body && body.department) || null,
      status: 'Active',
      dateOfBirth: cleanText(body && body.dateOfBirth),
      gender: (body && body.gender) || '',
      admissionDate: todayLabel(),
      guardianName,
      guardianPhone: guardianPhoneDisplay,
      guardianEmail,
      address: cleanText(body && body.address),
    };
    nextStudentId += 1;
    nextAdmissionNumber += 1;
    STUDENTS.push(student);

    // Resolve the guardian: explicit linkGuardianId wins; otherwise match by
    // phone, then email; otherwise create a new guardian account.
    let guardian = null;
    if (body && body.linkGuardianId) {
      guardian = GUARDIANS.find((g) => g.id === body.linkGuardianId) || null;
    }
    if (!guardian && guardianPhone) {
      guardian = GUARDIANS.find((g) => normalizePhone(g.phone) === guardianPhone) || null;
    }
    if (!guardian && guardianEmail) {
      guardian = GUARDIANS.find((g) => normalizeEmail(g.email) === guardianEmail) || null;
    }
    if (guardian) {
      // Link: add this student as a child of the existing guardian (and keep
      // the student's guardianName in sync with the account). Never duplicate.
      if (!guardian.children.some((c) => c.studentId === student.id)) {
        guardian.children.push({
          studentId: student.id,
          name: student.fullName,
          classLabel: student.classLabel,
          relationship: (body && body.relationship) || guardian.relationship || 'Guardian',
        });
        guardian.childrenCount = guardian.children.length;
      }
      if (guardianName && guardianName !== guardian.fullName) {
        // Keep the name on the student record as typed, but the linked account
        // keeps its own name (the office may have typed a nickname).
        student.guardianName = guardianName;
      } else {
        student.guardianName = guardian.fullName;
      }
      student.guardianPhone = guardian.phone;
      student.guardianEmail = guardian.email;
    } else if (guardianName) {
      // No existing match — create a new guardian account so the parent can
      // sign in to the Parent app and see this child.
      const newGuardian = {
        id: `gd-${Date.now()}`,
        fullName: guardianName,
        phone: guardianPhoneDisplay,
        email: guardianEmail,
        relationship: (body && body.relationship) || 'Guardian',
        status: 'Invited',
        childrenCount: 1,
        children: [
          {
            studentId: student.id,
            name: student.fullName,
            classLabel: student.classLabel,
            relationship: (body && body.relationship) || 'Guardian',
          },
        ],
      };
      GUARDIANS.push(newGuardian);
    }
    return student;
  }

  // AD02/AD20/AD33 — export acknowledgement (the CSV itself is built on-device)
  if (seg[0] === 'exports' && m === 'POST') {
    return { ok: true, type: (body && body.type) || 'unknown', rowCount: STUDENTS.length };
  }

  // AD02/AD03/AD04 — students
  if (seg[0] === 'students') {
    if (seg.length === 1) {
      if (m === 'GET') return paginate(filterStudents(query), query.page);
      return { ok: true };
    }
    const student = findStudent(seg[1]);
    if (seg.length === 2) {
      if (m === 'GET') return student || STUDENTS[0];
      if (m === 'PATCH' && student) {
        // AD03 — edit core details; withdrawn students are read-only
        if (student.status === 'Withdrawn') {
          return {
            ok: false,
            error: 'Withdrawn students are read-only — readmit the student before editing their record.',
          };
        }
        const b = body || {};
        if (b.firstName || b.lastName) {
          const oldParts = String(student.fullName || '').split(' ');
          student.fullName = `${b.firstName || oldParts[0] || ''} ${
            b.lastName || oldParts.slice(1).join(' ') || ''
          }`.trim();
        }
        ['gender', 'dateOfBirth', 'guardianName', 'guardianPhone', 'guardianEmail', 'address'].forEach(
          (key) => {
            if (b[key] !== undefined) student[key] = b[key];
          },
        );
        if (b.classLabel) {
          student.classLabel = b.classLabel;
          student.department = b.classLabel.startsWith('JSS') ? null : b.department || student.department;
        } else if (b.department !== undefined) {
          student.department = b.department;
        }
        return student;
      }
      return { ok: true };
    }
    if (seg[2] === 'enrolments' && m === 'GET') return enrolmentsFor(seg[1]);
    if (seg[2] === 'fee-status' && m === 'GET') return feeStatusFor(seg[1]);
    if (seg[2] === 'class-moves' && student) {
      if (body && body.targetClassId) {
        const target = cleanText(body.targetClassId);
        // Only classes that actually exist — a made-up label is refused.
        if (!liveClassNames().includes(target)) {
          return { ok: false, error: `${target || 'That class'} is not a class in this school — pick from the list.` };
        }
        const from = student.classLabel;
        student.classLabel = target;
        student.department = target.startsWith('JSS') ? null : student.department;
        if (from !== target) {
          AUDIT_LOG.unshift({
            id: `aud-${Date.now()}`,
            at: todayLabel(),
            actor: 'Admin (you)',
            category: 'Records',
            action: 'Moved a student to another class',
            detail: `${student.fullName}: ${from} → ${target}`,
          });
        }
        return { ok: true, from, to: target };
      }
      return { ok: true };
    }
    if (seg[2] === 'withdrawals' && student) {
      if (student.status === 'Withdrawn') {
        return { ok: false, error: 'This student has already been withdrawn.' };
      }
      if (student.status === 'Graduated') {
        return { ok: false, error: 'This student has already graduated.' };
      }
      student.status = 'Withdrawn';
      // Defence in depth for Bug 10a: a withdrawn student must NOT appear on a
      // promote-students page. New previews (built after this) already filter
      // Withdrawn students via makePromotionRows, but a pre-existing preview
      // holds a snapshot of its roster at build time — its rows array still
      // carries this student until they are explicitly dropped here. Any
      // non-Confirmed preview that lists this student is rewritten without them
      // (and its summary is recomputed), so the office never sees a withdrawn
      // student on a promote page again.
      PROMOTION_PREVIEWS.forEach((preview) => {
        if (preview.status === 'Confirmed') return;
        const before = preview.rows.length;
        const kept = preview.rows.filter((r) => String(r.studentId) !== String(student.id));
        if (kept.length !== before) {
          preview.rows = kept;
          preview.summary = summariseRows(kept);
        }
      });
      return { ok: true };
    }
  }

  // AD12 — class list and subject list. Classes can be created and renamed
  // (JSS/SSS level + any letter suffix); every guard reads the LIVE list.
  if (seg[0] === 'classes' && seg.length === 1) {
    if (m === 'GET') return paginate(liveClassRows(), query.page);
    if (m === 'POST') {
      const parsed = parseClassLabel(body && body.classLabel);
      if (!parsed) return { ok: false, error: classLabelFormatError() };
      if (classLabelExists(parsed.label)) {
        return { ok: false, error: `${parsed.label} already exists — pick a different suffix.` };
      }
      const cls = {
        id: `cls-${Date.now()}`,
        classLabel: parsed.label,
        department: parsed.level.startsWith('SSS') ? SSS_DEPARTMENTS[parsed.level] || null : null,
        formTeacherName: 'Not assigned yet',
        studentCount: 0,
        subjectCount: 0,
      };
      CLASSES.push(cls);
      AUDIT_LOG.unshift({
        id: `aud-${Date.now()}`,
        at: todayLabel(),
        actor: 'Admin (you)',
        category: 'Records',
        action: 'Created a class',
        detail: parsed.label,
      });
      return { ok: true, class: cls };
    }
  }
  if (seg[0] === 'classes' && seg.length === 2) {
    const cls = CLASSES.find((c) => c.id === seg[1]);
    if (!cls) return { ok: false, error: 'Class not found.' };
    if (m === 'PATCH') {
      const parsed = parseClassLabel(body && body.classLabel);
      if (!parsed) return { ok: false, error: classLabelFormatError() };
      if (classLabelExists(parsed.label, cls.id)) {
        return { ok: false, error: `${parsed.label} already exists — pick a different suffix.` };
      }
      const old = cls.classLabel;
      cls.classLabel = parsed.label;
      // Cascade the rename so students, subjects, teachers, timetables and
      // promotion previews all follow the class.
      STUDENTS.forEach((s) => {
        if (s.classLabel === old) s.classLabel = parsed.label;
      });
      SUBJECTS.forEach((s) => {
        s.classes = s.classes.map((c) => (c === old ? parsed.label : c));
      });
      TEACHERS.forEach((t) => {
        if (t.formClass === old) t.formClass = parsed.label;
      });
      TIMETABLE_DRAFTS.forEach((d) => {
        if (d.classLabel === old) d.classLabel = parsed.label;
      });
      PROMOTION_PREVIEWS.forEach((p) => {
        if (p.classLabel === old) p.classLabel = parsed.label;
      });
      AUDIT_LOG.unshift({
        id: `aud-${Date.now()}`,
        at: todayLabel(),
        actor: 'Admin (you)',
        category: 'Records',
        action: 'Renamed a class',
        detail: `${old} → ${parsed.label}`,
      });
      return { ok: true, class: cls };
    }
  }
  // AD13 — one class workspace: the class, its roster, its subjects
  if (seg[0] === 'classes' && seg.length === 3 && seg[2] === 'workspace' && m === 'GET') {
    const cls = liveClassRows().find((c) => c.classLabel === seg[1]);
    if (!cls) return { ok: false, error: 'Class not found.' };
    return {
      ok: true,
      class: cls,
      students: STUDENTS.filter((s) => s.classLabel === seg[1]),
      subjects: SUBJECTS.filter((s) => s.classes.includes(seg[1])),
    };
  }
  if (seg[0] === 'classes' && seg.length === 3 && seg[2] === 'roster' && m === 'GET') {
    return paginate(STUDENTS.filter((s) => s.classLabel === seg[1]), query.page);
  }
  if (seg[0] === 'subjects' && seg.length === 1) {
    if (m === 'GET') return paginate(SUBJECTS, query.page);
    if (m === 'POST') {
      const name = ((body && body.name) || '').trim();
      const departments = Array.isArray(body && body.departments)
        ? body.departments.map((d) => String(d).trim()).filter(Boolean)
        : [];
      const classes = Array.isArray(body && body.classes)
        ? body.classes.filter((c) => liveClassNames().includes(c))
        : [];
      const teachers = Array.isArray(body && body.teachers) ? body.teachers : [];
      const KNOWN_DEPARTMENTS = ['Core', 'JSS', 'Science', 'Humanities / Arts', 'Business / Commercial'];
      const unknownDept = departments.find((d) => !KNOWN_DEPARTMENTS.includes(d));
      if (unknownDept) {
        return { ok: false, error: `${unknownDept} is not one of the school's departments.` };
      }
      if (!name) return { ok: false, error: 'Name the subject.' };
      if (departments.length === 0) {
        return { ok: false, error: 'Tag at least one department it belongs to.' };
      }
      const ruleProblem = subjectRulesProblem(departments, classes);
      if (ruleProblem) return { ok: false, error: ruleProblem };
      const teacherProblem = unknownTeacherProblem(teachers);
      if (teacherProblem) return { ok: false, error: teacherProblem };
      if (SUBJECTS.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
        return { ok: false, error: `${name} already exists in the subject list.` };
      }
      const subject = {
        id: `sub-${Date.now()}`,
        name,
        department: departments[0], // primary department, for older readers
        departments,
        classes,
        teachers,
      };
      SUBJECTS.push(subject);
      syncSubjectTeachers(subject, teachers);
      return { ok: true, subject };
    }
  }

  if (seg[0] === 'subjects' && seg.length === 2) {
    // AD12 — edit a subject later: name, departments, classes and teachers.
    const subject = SUBJECTS.find((s) => s.id === seg[1]);
    if (!subject) return { ok: false, error: 'Subject not found.' };
    if (m === 'GET') return subject;
    if (m === 'PATCH') {
      const b = body || {};
      if (b.name !== undefined) {
        const name = String(b.name).trim();
        if (!name) return { ok: false, error: 'Name the subject.' };
        if (
          SUBJECTS.some((s) => s.id !== subject.id && s.name.toLowerCase() === name.toLowerCase())
        ) {
          return { ok: false, error: `${name} already exists in the subject list.` };
        }
        // Renaming follows through to the staff records that list the subject.
        TEACHERS.forEach((t) => {
          if ((t.subjects || []).includes(subject.name)) {
            t.subjects = t.subjects.map((s) => (s === subject.name ? name : s));
          }
        });
        subject.name = name;
      }
      const departments = Array.isArray(b.departments) ? b.departments : subject.departments;
      const classes = Array.isArray(b.classes)
        ? b.classes.filter((c) => liveClassNames().includes(c))
        : subject.classes;
      const KNOWN_DEPARTMENTS = ['Core', 'JSS', 'Science', 'Humanities / Arts', 'Business / Commercial'];
      const unknownDept = departments.find((d) => !KNOWN_DEPARTMENTS.includes(d));
      if (unknownDept) return { ok: false, error: `${unknownDept} is not one of the school's departments.` };
      if (departments.length === 0) {
        return { ok: false, error: 'Tag at least one department it belongs to.' };
      }
      const ruleProblem = subjectRulesProblem(departments, classes);
      if (ruleProblem) return { ok: false, error: ruleProblem };
      subject.departments = departments;
      subject.department = departments[0];
      subject.classes = classes;
      const teachers = Array.isArray(b.teachers) ? b.teachers : subject.teachers || [];
      const teacherProblem = unknownTeacherProblem(teachers);
      if (teacherProblem) return { ok: false, error: teacherProblem };
      subject.teachers = teachers;
      syncSubjectTeachers(subject, teachers);
      return { ok: true, subject };
    }
  }

  // AD14/AD15 — timetable drafts: fill slots, send for review, validate, publish
  if (seg[0] === 'teaching-assignment-candidates' && m === 'GET') {
    return paginate(
      TEACHERS.filter((t) => t.status === 'Active').map((t) => ({
        id: t.id,
        fullName: t.fullName,
        subjects: t.subjects || [],
      })),
      query.page,
    );
  }
  // AD08 — register or edit a teacher. Creating queues the account
  // provisioning workflow (the same flow the backend runs); the profile
  // fields patch directly, subject assignments go through the changes
  // endpoint so the subject records stay in sync.
  if (seg[0] === 'teachers' && seg.length === 1 && m === 'POST') {
    const b = body || {};
    const rowProblem = validateTeacherRow(b);
    if (rowProblem) return { ok: false, error: rowProblem };
    const fullName = cleanText(b.fullName);
    const subjects = Array.isArray(b.subjects) ? b.subjects.filter(Boolean) : [];
    const formClass = b.formClass && liveClassNames().includes(b.formClass) ? b.formClass : null;
    const teacher = {
      id: `tch-${Date.now()}`,
      fullName,
      staffNumber: cleanText(b.staffNumber) || nextStaffNumber(),
      phone: canonicalPhone(b.phone),
      email: cleanText(b.email),
      status: 'Active',
      formClass,
      subjects,
      provisioning: 'Queued', // the account workflow runs server-side
    };
    TEACHERS.push(teacher);
    syncTeacherSubjects(teacher, subjects);
    return { ok: true, teacher, provisioning: { status: 'Queued', detail: 'We are creating the staff account — tap Retry if it stays queued.' } };
  }
  // AD08 — the staff number the next new teacher will get (shown read-only
  // in the form; the server assigns the same one on create).
  if (seg[0] === 'teachers' && seg[1] === 'next-staff-number' && m === 'GET') {
    return { ok: true, next: nextStaffNumber() };
  }
  // AD08 — CSV import. Every row runs through the SAME validateTeacherRow the
  // manual form uses; per-row results come back so the office sees exactly
  // which line failed and why.
  if (seg[0] === 'teachers' && seg[1] === 'import' && m === 'POST') {
    const rows = Array.isArray(body && body.rows) ? body.rows : [];
    if (!rows.length) {
      return {
        ok: false,
        error: 'No rows to import — paste one teacher per line: Full name, Email, Phone, Subjects (| separated), Form class.',
      };
    }
    const imported = [];
    const failed = [];
    rows.forEach((row, i) => {
      const problem = validateTeacherRow(row);
      if (problem) {
        failed.push({ row: i + 1, name: cleanText(row.fullName) || `(line ${i + 1})`, error: problem });
        return;
      }
      const teacher = {
        id: `tch-${Date.now()}-${i}`,
        fullName: cleanText(row.fullName),
        staffNumber: nextStaffNumber(),
        phone: canonicalPhone(row.phone),
        email: cleanText(row.email),
        subjects: (row.subjects || []).filter(Boolean),
        formClass: row.formClass && liveClassNames().includes(row.formClass) ? row.formClass : null,
        status: 'Active',
      };
      TEACHERS.push(teacher);
      syncTeacherSubjects(teacher, teacher.subjects);
      AUDIT_LOG.unshift({
        id: `aud-${Date.now()}-${i}`,
        at: todayLabel(),
        actor: 'Admin (you)',
        category: 'Staff',
        action: 'Registered a teacher (CSV import)',
        detail: `${teacher.fullName} · ${teacher.staffNumber}`,
      });
      imported.push({ row: i + 1, teacher });
    });
    // Per-row results ALWAYS come back — even when nothing imported — so the
    // office sees every problem line instead of a dead-end refusal.
    return { ok: true, imported, failed };
  }
  if (seg[0] === 'teachers' && seg.length === 2) {
    const teacher = TEACHERS.find((t) => t.id === seg[1]);
    if (!teacher) return { ok: false, error: 'Teacher not found.' };
    if (m === 'GET') return teacher;
    if (m === 'PATCH') {
      const b = body || {};
      if (b.fullName !== undefined && !cleanText(b.fullName)) {
        return { ok: false, error: 'Enter the teacher\'s full name.' };
      }
      const emailProblem = emailError(b.email);
      if (emailProblem) return { ok: false, error: emailProblem };
      const phoneProblem = phoneError(b.phone);
      if (phoneProblem) return { ok: false, error: phoneProblem };
      // Status changes (Active / On Leave / Inactive) land like every other
      // edit — validated and audited.
      if (b.status !== undefined && !['Active', 'On Leave', 'Inactive'].includes(b.status)) {
        return { ok: false, error: 'Status must be Active, On Leave or Inactive.' };
      }
      // Another teacher may already own that email or number.
      const duplicate = teacherDuplicates(b, teacher.id);
      if (duplicate) return { ok: false, error: duplicate };
      if (b.fullName !== undefined) teacher.fullName = cleanText(b.fullName);
      if (b.staffNumber !== undefined) teacher.staffNumber = cleanText(b.staffNumber);
      if (b.phone !== undefined) teacher.phone = canonicalPhone(b.phone);
      if (b.email !== undefined) teacher.email = cleanText(b.email);
      if (b.formClass !== undefined) {
        teacher.formClass = b.formClass && liveClassNames().includes(b.formClass) ? b.formClass : null;
      }
      if (b.status !== undefined && teacher.status !== b.status) {
        const prevStatus = teacher.status;
        teacher.status = b.status;
        AUDIT_LOG.unshift({
          id: `aud-${Date.now()}`,
          at: todayLabel(),
          actor: 'Admin (you)',
          category: 'Staff',
          action: 'Changed a teacher status',
          detail: `${teacher.fullName}: ${prevStatus} → ${b.status}`,
        });
      }
      return { ok: true, teacher };
    }
  }
  if (seg[0] === 'teachers' && seg.length === 3 && seg[2] === 'assignments' && m === 'GET') {
    const teacher = TEACHERS.find((t) => t.id === seg[1]);
    if (!teacher) return { ok: false, error: 'Teacher not found.' };
    return {
      ok: true,
      assignments: (teacher.subjects || []).map((subject, i) => ({
        id: `asg-${teacher.id}-${i}`,
        subject,
        classLabel: teacher.formClass || 'All classes',
        term: 'First Term',
      })),
    };
  }
  if (seg[0] === 'teachers' && seg.length === 3 && seg[2] === 'retry-provisioning' && m === 'POST') {
    const teacher = TEACHERS.find((t) => t.id === seg[1]);
    if (!teacher) return { ok: false, error: 'Teacher not found.' };
    teacher.provisioning = 'Provisioned';
    return { ok: true, provisioning: { status: 'Provisioned', detail: `${teacher.fullName}'s staff account is ready.` } };
  }
  if (seg[0] === 'teachers' && seg.length === 3 && seg[2] === 'access-change' && m === 'POST') {
    const teacher = TEACHERS.find((t) => t.id === seg[1]);
    if (!teacher) return { ok: false, error: 'Teacher not found.' };
    const status = (body && body.status) || '';
    if (!['Active', 'On Leave', 'Suspended'].includes(status)) {
      return { ok: false, error: 'Pick Active, On Leave or Suspended.' };
    }
    teacher.status = status;
    return { ok: true, teacher };
  }
  if (seg[0] === 'teaching-assignment-changes' && m === 'POST') {
    const teacher = TEACHERS.find((t) => t.id === (body && body.teacherId));
    if (!teacher) return { ok: false, error: 'Teacher not found.' };
    const subjects = Array.isArray(body && body.subjects) ? body.subjects.filter(Boolean) : [];
    const unknownSubject = subjects.find((s) => !SUBJECTS.some((sub) => sub.name === s));
    if (unknownSubject) {
      return { ok: false, error: `${unknownSubject} is not in the subject list.` };
    }
    teacher.subjects = subjects;
    syncTeacherSubjects(teacher, subjects);
    return { ok: true, teacher };
  }
  if (seg[0] === 'account-invitations' && m === 'POST') {
    const email = cleanText(body && body.email);
    if (!email.includes('@')) return { ok: false, error: 'Enter a valid email to invite.' };
    return {
      ok: true,
      invitation: { id: `inv-${Date.now()}`, email, role: (body && body.role) || 'Teacher', status: 'Invited' },
    };
  }

  // AD10 — school settings and admin access.
  if (seg[0] === 'settings' && m === 'GET') {
    return { ok: true, settings: SETTINGS };
  }
  if (seg[0] === 'settings' && m === 'PATCH') {
    const b = body || {};
    if (b.schoolName !== undefined && !cleanText(b.schoolName)) {
      return { ok: false, error: 'The school needs a name.' };
    }
    if (b.sessionLabel !== undefined) {
      const session = String(b.sessionLabel).replace(/\s+/g, '');
      const now = new Date();
      const currentSession = `${now.getFullYear()}-${now.getFullYear() + 1}`;
      if (session !== currentSession) {
        return {
          ok: false,
          error: `The session follows the device date and cannot be changed — it is ${currentSession}.`,
        };
      }
      SETTINGS.sessionLabel = session;
    }
    if (b.termLabel !== undefined && !['First Term', 'Second Term', 'Third Term'].includes(b.termLabel)) {
      return { ok: false, error: 'Pick First, Second or Third Term.' };
    }
    const settingsEmailProblem = emailError(b.email);
    if (settingsEmailProblem) return { ok: false, error: settingsEmailProblem };
    const settingsPhoneProblem = phoneError(b.phone);
    if (settingsPhoneProblem) return { ok: false, error: settingsPhoneProblem };
    if (b.nextTermBegins && !/^\d{4}-\d{2}-\d{2}$/.test(String(b.nextTermBegins).trim())) {
      return { ok: false, error: 'Next term begins must be a date like 2027-01-11.' };
    }
    if (b.schoolName !== undefined) SETTINGS.schoolName = cleanText(b.schoolName);
    if (b.address !== undefined) SETTINGS.address = cleanText(b.address);
    if (b.phone !== undefined) SETTINGS.phone = cleanText(b.phone);
    if (b.email !== undefined) SETTINGS.email = cleanText(b.email);
    if (b.termLabel !== undefined) SETTINGS.termLabel = cleanText(b.termLabel);
    if (b.nextTermBegins !== undefined) SETTINGS.nextTermBegins = cleanText(b.nextTermBegins);
    return { ok: true, settings: SETTINGS };
  }
  if (seg[0] === 'admin-memberships' && seg.length === 1 && m === 'GET') {
    return paginate(ADMIN_MEMBERSHIPS, query.page);
  }
  if (seg[0] === 'admin-memberships' && seg.length === 1 && m === 'POST') {
    const b = body || {};
    const fullName = cleanText(b.fullName);
    const email = cleanText(b.email);
    if (!fullName) return { ok: false, error: 'Enter the admin\'s full name.' };
    if (!email.includes('@')) return { ok: false, error: 'Enter a valid email address.' };
    if (ADMIN_MEMBERSHIPS.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: `${email} already has an admin account.` };
    }
    if (!ADMIN_ROLES.includes(b.role)) {
      return { ok: false, error: 'Pick one of the school\'s admin roles.' };
    }
    const membership = {
      id: `adm-${nextAdminId++}`,
      fullName,
      email,
      role: b.role,
      status: 'Active',
      lastLogin: 'Never — invitation sent',
    };
    ADMIN_MEMBERSHIPS.push(membership);
    return { ok: true, membership };
  }
  if (seg[0] === 'admin-memberships' && seg.length === 2 && m === 'PATCH') {
    const membership = ADMIN_MEMBERSHIPS.find((a) => a.id === seg[1]);
    if (!membership) return { ok: false, error: 'Admin account not found.' };
    const b = body || {};
    if (b.role !== undefined && !ADMIN_ROLES.includes(b.role)) {
      return { ok: false, error: 'Pick one of the school\'s admin roles.' };
    }
    if (b.status !== undefined && !['Active', 'Suspended'].includes(b.status)) {
      return { ok: false, error: 'An admin account is Active or Suspended.' };
    }
    if (b.role !== undefined) membership.role = b.role;
    if (b.status !== undefined) membership.status = b.status;
    return { ok: true, membership };
  }

  if (seg[0] === 'timetable-drafts' && seg.length === 1) {
    if (m === 'GET') return paginate(TIMETABLE_DRAFTS, query.page);
    if (m === 'POST') {
      const classLabel = ((body && body.classLabel) || '').trim();
      if (!classLabel) {
        return { ok: false, error: 'Pick a class from the list first, then try again.' };
      }
      if (!liveClassNames().includes(classLabel)) {
        return {
          ok: false,
          error: `"${classLabel}" is not one of this school's classes — pick from the class list.`,
        };
      }
      if (TIMETABLE_DRAFTS.some((d) => d.classLabel === classLabel && d.status !== 'Published')) {
        return {
          ok: false,
          error: `${classLabel} already has a timetable in progress — open it from the drafts list.`,
        };
      }
      // When re-opening a class whose only timetable is PUBLISHED, seed the new
      // editable draft with the published week's slots so the fields are NOT
      // empty — the office sees the periods they just published and edits
      // them in place. The published record stays as the historical copy.
      const published = TIMETABLE_DRAFTS.find(
        (d) => d.classLabel === classLabel && d.status === 'Published',
      );
      const seed = Array.isArray(body && body.seedSlots) && body.seedSlots.length > 0;
      const slots = seed
        ? body.seedSlots.map((s) => ({ ...s }))
        : makeSlots(classLabel, 0);
      const draft = {
        id: `ttd-${Date.now()}`,
        classLabel,
        term: '2026/2027 · First Term',
        status: 'Draft',
        slots,
      };
      if (published && seed) {
        // Mark the inherited-from-published state so the review/publish flow
        // and the View can show "this is an edit of the published timetable".
        draft.editedFrom = published.id;
      }
      TIMETABLE_DRAFTS.push(draft);
      return { ok: true, draft };
    }
  }
  if (seg[0] === 'timetable-drafts' && seg.length === 2) {
    const draft = TIMETABLE_DRAFTS.find((d) => d.id === seg[1]);
    if (!draft) return { ok: false, error: 'Timetable draft not found.' };
    if (m === 'GET') return { ok: true, draft };
    if (m === 'PATCH') {
      if (draft.status === 'Published') {
        return { ok: false, error: 'This timetable is published — reopen it before editing.' };
      }
      if (body && Array.isArray(body.slots)) {
        // Rule 1: a period is a taught subject (with its assigned teacher) or
        // an activity — never both, and activities need no teacher.
        const active = TEACHERS.filter((t) => t.status === 'Active');
        for (const s of body.slots) {
          if (s.subject && s.activity) {
            return {
              ok: false,
              error: `${s.day}, period ${s.period}: a period is either a subject or an activity, not both.`,
            };
          }
          if (s.subject && !s.teacherName) {
            return { ok: false, error: `Pick a teacher for ${s.day}, period ${s.period}.` };
          }
          if (s.subject && s.teacherName) {
            const teacher = active.find((t) => t.fullName === s.teacherName);
            if (!teacher) return { ok: false, error: `${s.teacherName} is not an active teacher.` };
            if (!(teacher.subjects || []).includes(s.subject)) {
              return {
                ok: false,
                error: `${s.teacherName} does not teach ${s.subject} — pick the subject's assigned teacher.`,
              };
            }
            // A subject only enters the classes that offer it — Physics never
            // lands on a JSS timetable by accident.
            if (!SUBJECTS.some((sub) => sub.name === s.subject && sub.classes.includes(draft.classLabel))) {
              return {
                ok: false,
                error: `${s.day}, period ${s.period}: ${s.subject} is not offered in ${draft.classLabel} — pick one of the class's own subjects.`,
              };
            }
          }
          if (s.activity && s.teacherName) {
            return {
              ok: false,
              error: `${s.activity} needs no teacher — leave the teacher empty.`,
            };
          }
          const timeProblem = slotTimeError(s);
          if (timeProblem) {
            return { ok: false, error: `${s.day}, period ${s.period}: ${timeProblem}` };
          }
        }
        const orderProblem = slotOrderError(body.slots);
        if (orderProblem) return { ok: false, error: orderProblem };
        draft.slots = body.slots;
      }
      return { ok: true, draft };
    }
  }
  if (seg[0] === 'timetable-drafts' && seg.length === 3 && seg[2] === 'validate' && m === 'POST') {
    const draft = TIMETABLE_DRAFTS.find((d) => d.id === seg[1]);
    if (!draft) return { ok: false, error: 'Timetable draft not found.' };
    const problem = timetableProblems(draft, TIMETABLE_DRAFTS);
    if (problem) return { ok: false, error: problem };
    return { ok: true, conflicts: [] };
  }
  if (seg[0] === 'timetable-drafts' && seg.length === 3 && seg[2] === 'request-review' && m === 'POST') {
    const draft = TIMETABLE_DRAFTS.find((d) => d.id === seg[1]);
    if (!draft) return { ok: false, error: 'Timetable draft not found.' };
    if (draft.status === 'Published') {
      return { ok: false, error: 'This timetable is already published.' };
    }
    const empty = draft.slots.filter((s) => !s.subject && !s.activity).length;
    if (empty > 0) {
      return {
        ok: false,
        error: `${empty} period${empty === 1 ? ' is' : 's are'} still empty — fill them before sending for review.`,
      };
    }
    draft.status = 'Ready to review';
    return { ok: true, draft };
  }
  if (seg[0] === 'timetable-drafts' && seg.length === 3 && seg[2] === 'publish' && m === 'POST') {
    const draft = TIMETABLE_DRAFTS.find((d) => d.id === seg[1]);
    if (!draft) return { ok: false, error: 'Timetable draft not found.' };
    if (draft.status === 'Published') {
      return { ok: false, error: 'This timetable is already published.' };
    }
    if (draft.status !== 'Ready to review') {
      return { ok: false, error: 'Send the timetable for review first — then publish it.' };
    }
    // Publishing runs the full check itself: nothing goes out with empty
    // periods or a teacher clash, even if the office skipped "validate".
    const problem = timetableProblems(draft, TIMETABLE_DRAFTS);
    if (problem) return { ok: false, error: problem };
    draft.status = 'Published';
    return { ok: true, draft };
  }

  // AD01/AD16 — one canonical, LIVE attendance overview. Counts are derived
  // from the registers every call, so corrections reflect everywhere at once.
  if (seg[0] === 'attendance' && seg[1] === 'overview' && seg.length === 2 && m === 'GET') {
    const submitted = ATTENDANCE_REGISTERS.filter((r) => r.status === 'Submitted').length;
    return {
      ok: true,
      registersSubmitted: submitted,
      registersExpected: ATTENDANCE_REGISTERS.length,
      missingRegisters: ATTENDANCE_REGISTERS.length - submitted,
      absentStudents: ATTENDANCE_REGISTERS.reduce((n, r) => n + r.absentCount, 0),
      lateArrivals: ATTENDANCE_REGISTERS.reduce((n, r) => n + r.lateCount, 0),
      correctionRequests: ATTENDANCE_CORRECTIONS.length,
    };
  }
  if (seg[0] === 'attendance' && seg[1] === 'registers' && seg.length === 2 && m === 'GET') {
    return paginate(ATTENDANCE_REGISTERS, query.page);
  }
  if (seg[0] === 'attendance' && seg[1] === 'registers' && seg.length === 3 && m === 'GET') {
    const register = ATTENDANCE_REGISTERS.find((r) => r.id === seg[2]);
    if (!register) return { ok: false, error: 'Register not found.' };
    return {
      ok: true,
      register,
      entries: ATTENDANCE_ENTRIES.filter((e) => e.registerId === register.id),
    };
  }
  if (
    seg[0] === 'attendance' && seg[1] === 'registers' && seg.length === 4 &&
    seg[3] === 'corrections' && m === 'POST'
  ) {
    const register = ATTENDANCE_REGISTERS.find((r) => r.id === seg[2]);
    if (!register) return { ok: false, error: 'Register not found.' };
    if (register.status !== 'Submitted') {
      return {
        ok: false,
        error: 'That register was never submitted — the teacher has to submit it before corrections.',
      };
    }
    const status = (body && body.status) || '';
    if (!['Present', 'Absent', 'Late', 'Excused'].includes(status)) {
      return { ok: false, error: 'Pick Present, Absent, Late or Excused.' };
    }
    const entry = ATTENDANCE_ENTRIES.find(
      (e) => e.registerId === register.id && e.studentId === (body && body.studentId),
    );
    if (!entry) return { ok: false, error: 'That student is not on this register.' };
    entry.status = status;
    // The register's counts stay derived from its rows.
    register.absentCount = ATTENDANCE_ENTRIES.filter(
      (e) => e.registerId === register.id && e.status === 'Absent',
    ).length;
    register.lateCount = ATTENDANCE_ENTRIES.filter(
      (e) => e.registerId === register.id && e.status === 'Late',
    ).length;
    return { ok: true, register, entry };
  }

  // AD18 — assessment policy (grading rules). One active policy per term;
  // the office edits it, the server checks the arithmetic, lock freezes it —
  // but lock runs the SAME arithmetic check first: a wrong policy cannot be
  // locked, it can only be fixed or unlocked.
  if (seg[0] === 'assessment-policies' && seg.length === 1) {
    if (m === 'GET') return paginate([ASSESSMENT_POLICY], query.page);
    if (m === 'POST') {
      if (ASSESSMENT_POLICY.locked) {
        return {
          ok: false,
          error: 'The grading policy is locked — it cannot change while marks are being entered.',
        };
      }
      const b = body || {};
      const candidate = {
        caWeight: Number(b.caWeight),
        examWeight: Number(b.examWeight),
        passMark: Number(b.passMark),
        grades: Array.isArray(b.grades) ? b.grades : ASSESSMENT_POLICY.grades,
      };
      const problem = policyArithmeticError(candidate);
      if (problem) return { ok: false, error: problem };
      ASSESSMENT_POLICY.caWeight = candidate.caWeight;
      ASSESSMENT_POLICY.examWeight = candidate.examWeight;
      ASSESSMENT_POLICY.passMark = candidate.passMark;
      if (Array.isArray(b.grades)) {
        ASSESSMENT_POLICY.grades = candidate.grades.map((g) => ({
          ...g,
          minScore: Number(g.minScore),
        }));
      }
      return { ok: true, policy: ASSESSMENT_POLICY };
    }
  }
  if (
    seg[0] === 'assessment-policies' && seg.length === 3 && seg[2] === 'lock' && m === 'POST'
  ) {
    // Locking a wrong policy would freeze the mistakes for the whole term —
    // the arithmetic must be right first.
    const lockProblem = policyArithmeticError(ASSESSMENT_POLICY);
    if (lockProblem) {
      return { ok: false, error: `${lockProblem} Fix the rules before locking.` };
    }
    ASSESSMENT_POLICY.locked = true;
    AUDIT_LOG.unshift({
      id: `aud-${Date.now()}`,
      at: todayLabel(),
      actor: 'Admin (you)',
      category: 'Academics',
      action: 'Locked the grading rules',
      detail: `Pass mark ${ASSESSMENT_POLICY.passMark} · CA ${ASSESSMENT_POLICY.caWeight} / exam ${ASSESSMENT_POLICY.examWeight}`,
    });
    return { ok: true, policy: ASSESSMENT_POLICY };
  }
  if (
    seg[0] === 'assessment-policies' && seg.length === 3 && seg[2] === 'unlock' && m === 'POST'
  ) {
    if (!ASSESSMENT_POLICY.locked) {
      return { ok: false, error: 'The grading rules are not locked.' };
    }
    ASSESSMENT_POLICY.locked = false;
    AUDIT_LOG.unshift({
      id: `aud-${Date.now()}`,
      at: todayLabel(),
      actor: 'Admin (you)',
      category: 'Academics',
      action: 'Unlocked the grading rules',
      detail: 'They can be edited again until the next lock.',
    });
    return { ok: true, policy: ASSESSMENT_POLICY };
  }

  // AD21 — fee plans: list, create, and issue the bills to a class
  if (seg[0] === 'finance' && seg[1] === 'fee-plans' && seg.length === 2) {
    if (m === 'GET') return paginate(FEE_PLANS, query.page);
    if (m === 'POST') {
      const classLabel = cleanText(body && body.classLabel);
      const title = cleanText(body && body.title);
      const amount = Number(body && body.amount);
      if (!classLabel) return { ok: false, error: 'Choose the class this plan bills.' };
      if (!title) return { ok: false, error: 'Name the plan, e.g. First Term tuition.' };
      if (!amount || amount <= 0) return { ok: false, error: 'Enter the amount in naira.' };
      // Same class + same name (case and extra spaces ignored) is a duplicate
      // — refused EVERY time, first or fourth, so two drafts can never drift.
      const dup = FEE_PLANS.find(
        (p) =>
          cleanText(p.classLabel).toLowerCase() === classLabel.toLowerCase() &&
          cleanText(p.title).toLowerCase() === title.toLowerCase(),
      );
      if (dup) {
        return {
          ok: false,
          error:
            `${classLabel} already has "${dup.title}" (${dup.amountLabel}, ` +
            `${dup.status === 'Issued' ? 'bills already issued' : 'draft'}) — ` +
            'issue or edit THAT plan instead of creating it again.',
        };
      }
      const plan = {
        id: `fp-${Date.now()}`,
        classLabel,
        title,
        term: (body && body.term) || '2026/2027 · First Term',
        amount,
        amountLabel: naira(amount),
        dueDate: (body && body.dueDate) || '2026-12-31',
        status: 'Draft',
        studentsCount: STUDENTS.filter(
          (s) => s.classLabel === classLabel && s.status === 'Active',
        ).length,
      };
      FEE_PLANS.unshift(plan);
      return { ok: true, plan };
    }
  }
  if (seg[0] === 'finance' && seg[1] === 'fee-plans' && seg.length === 3 && m === 'GET') {
    return FEE_PLANS.find((p) => p.id === seg[2]) || null;
  }
  if (seg[0] === 'finance' && seg[1] === 'fee-plans' && seg.length === 4 && m === 'POST') {
    const plan = FEE_PLANS.find((p) => p.id === seg[2]);
    if (!plan) return { ok: false, error: 'Fee plan not found.' };
    const billable = STUDENTS.filter(
      (s) => s.classLabel === plan.classLabel && s.status === 'Active',
    );
    if (seg[3] === 'issue-preview') {
      return { ok: true, studentCount: billable.length };
    }
    if (seg[3] === 'issue') {
      if (plan.status === 'Issued') {
        return { ok: false, error: 'These bills were already issued.' };
      }
      let num = Math.max(...INVOICES.map((i) => Number(String(i.number).split('-').pop()))) + 1;
      billable.forEach((s) => {
        INVOICES.push({
          id: `inv-${num}`,
          number: `INV-2026-${String(num).padStart(4, '0')}`,
          studentName: s.fullName,
          planName: plan.title,
          amount: plan.amount,
          paid: 0,
          balanceLabel: `Balance ${naira(plan.amount)}`,
          status: plan.dueDate < todayLabel() ? 'Overdue' : 'Draft',
          dueDate: plan.dueDate,
        });
        num += 1;
      });
      plan.status = 'Issued';
      plan.issuedCount = billable.length;
      return { ok: true, issued: billable.length };
    }
  }

  // AD22 — invoices
  if (seg[0] === 'finance' && seg[1] === 'invoices' && seg.length === 2 && m === 'GET') {
    return paginate(filterInvoices(query), query.page);
  }

  // AD23 — one invoice, the payments recorded on it, office payments
  const invoice =
    seg[0] === 'finance' && seg[1] === 'invoices' && seg[2]
      ? INVOICES.find((i) => i.id === seg[2])
      : null;
  if (invoice && seg.length === 3 && m === 'GET') return invoice;
  if (invoice && seg[3] === 'payments' && m === 'GET') {
    return { items: INVOICE_PAYMENTS[invoice.id] || [] };
  }
  if (invoice && seg[3] === 'manual-payments' && m === 'POST') {
    const amount = Number(body && body.amount);
    if (!amount || amount <= 0) return { ok: false, error: 'Enter an amount in naira.' };
    // Overpayments are refused here, in plain words: the office should never
    // see a silent partial apply or an "API" sentence.
    const balance = invoice.amount - invoice.paid;
    if (balance <= 0) {
      return {
        ok: false,
        error: `Bill ${invoice.number} for ${invoice.studentName} is already fully paid — there is nothing left to record. Check the payments list below.`,
      };
    }
    if (amount > balance) {
      return {
        ok: false,
        error:
          `That payment is ${naira(amount - balance)} more than what ${invoice.studentName} owes. ` +
          `Bill ${invoice.number} still has ${naira(balance)} outstanding — enter ${naira(balance)} or less.`,
      };
    }
    const result = applyInvoicePayment(invoice, amount, (body && body.method) || 'Cash', body && body.reference);
    return { ok: true, applied: result.applied, balanceAfter: invoice.amount - invoice.paid };
  }

  // AD16 — attendance registers (the overview handler above carries totals).
  if (seg[0] === 'attendance' && seg[1] === 'registers' && m === 'GET') {
    // One page holds the whole day — the overview screen shows every register.
    return paginate(ATTENDANCE_REGISTERS, query.page, 50);
  }
  if (seg[0] === 'attendance' && seg[1] === 'correction-requests' && m === 'GET') {
    return paginate(ATTENDANCE_CORRECTIONS, 1, 20);
  }

  // AD19 — results review (packages + report batches)
  if (seg[0] === 'mark-packages' && seg.length === 1 && m === 'GET') {
    return paginate(MARK_PACKAGES, query.page);
  }
  if (seg[0] === 'mark-packages' && seg[2] === 'return' && m === 'POST') {
    const pkg = MARK_PACKAGES.find((p) => p.id === seg[1]);
    if (pkg) {
      // An approved package can be re-opened for corrections too — the admin
      // office is allowed to undo an approval before the report batch is
      // published. After publishing, the batch (not the package) is the
      // source of truth and is reopened separately.
      pkg.status = 'ReturnedForCorrections';
      pkg.detail = (body && body.reason) || 'Returned for corrections';
    }
    return { ok: true };
  }
  // AD19 — admin signs off a submitted package. The office (the admin, "you")
  // is the only role that approves; teachers only submit. A package may move
  // from Submitted → Approved here, or from ReturnedForCorrections → Approved
  // (when the teacher's resubmission is good). An already-approved package is
  // a no-op idempotent success so a double-tap never errors.
  if (seg[0] === 'mark-packages' && seg[2] === 'approve' && m === 'POST') {
    const pkg = MARK_PACKAGES.find((p) => p.id === seg[1]);
    if (!pkg) return { ok: false, error: 'Mark package not found.' };
    if (pkg.status === 'Approved') return { ok: true };
    if (pkg.status !== 'Submitted' && pkg.status !== 'ReturnedForCorrections') {
      return {
        ok: false,
        error: `This package is ${pkg.status} — only a submitted or returned package can be approved.`,
      };
    }
    pkg.status = 'Approved';
    pkg.detail = (body && body.note) || 'Approved by the admin office';
    AUDIT_LOG.unshift({
      id: `aud-${Date.now()}`,
      at: todayLabel(),
      actor: 'Admin (you)',
      category: 'Academics',
      action: 'Approved a mark package',
      detail: `${pkg.classLabel} · ${pkg.subject} — ${pkg.teacherName}`,
    });
    return { ok: true };
  }
  if (seg[0] === 'class-report-batches' && seg.length === 1 && m === 'GET') {
    return paginate(REPORT_BATCHES, query.page);
  }
  if (seg[0] === 'class-report-batches' && seg[2] === 'publish' && m === 'POST') {
    const batch = REPORT_BATCHES.find((b) => b.id === seg[1]);
    if (batch) {
      batch.status = 'Published';
      batch.publishedAt = todayLabel();
    }
    return { ok: true };
  }
  if (seg[0] === 'class-report-batches' && seg[2] === 'reopen' && m === 'POST') {
    const batch = REPORT_BATCHES.find((b) => b.id === seg[1]);
    if (batch) {
      batch.status = 'Draft';
      batch.publishedAt = null;
    }
    return { ok: true };
  }

  // AD34 — school change history; newest first, filterable by category.
  if (seg[0] === 'audit-trail' && seg.length === 1 && m === 'GET') {
    let list = AUDIT_LOG;
    if (query.category && query.category !== 'All') {
      list = list.filter((e) => e.category === query.category);
    }
    return paginate(list, query.page);
  }

  // AD20 — reports catalogue (the class batches) and one learner's report
  // card. Published/ready batches carry a sample report id; drafts have none.
  if (seg[0] === 'reports' && seg[1] === 'catalogue' && m === 'GET') {
    const items = REPORT_BATCHES.map((b) => {
      const card = REPORT_CARDS.find((r) => r.batchId === b.id);
      return {
        ...b,
        sampleReportId: card ? card.id : null,
        sampleStudentId: card ? card.studentId : null,
      };
    });
    return paginate(items, query.page);
  }
  if (seg[0] === 'learners' && seg.length === 4 && seg[2] === 'reports' && m === 'GET') {
    const report = REPORT_CARDS.find((r) => r.id === seg[3] && String(r.studentId) === seg[1]);
    if (!report) return { ok: false, error: 'Report card not found.' };
    return { ok: true, report };
  }

  // ── ST01–ST13 — student app surface (learner-facing endpoints) ────────
  // All learner routes resolve the student by id from the shared STUDENTS
  // seed so the student app and the admin app see the same person. A
  // non-existent or non-active student returns a 404-shaped error the
  // student screens render as an empty state.
  function findLearner(id) {
    return STUDENTS.find((s) => String(s.id) === String(id) && s.status === 'Active');
  }

  // ST01/ST02 — home + my class/subjects. The overview is the same payload
  // for both pages (the home page highlights open assignments; the class page
  // lists subjects). `latestReport` is filled when a published report card
  // exists for this student.
  if (seg[0] === 'learners' && seg.length === 3 && seg[2] === 'overview' && m === 'GET') {
    const student = findLearner(seg[1]);
    if (!student) return { ok: false, error: 'Learner not found.' };
    const overview = learnerOverview(student);
    const report = REPORT_CARDS.find((r) => String(r.studentId) === String(student.id));
    if (report) {
      overview.latestReport = {
        id: report.id, termLabel: report.termLabel, average: report.average,
        position: report.position,
      };
    }
    return { ok: true, overview };
  }

  // ST03 — subject workspace: the learning materials for this student's
  // class. The student app's materials list is filtered to their class.
  if (seg[0] === 'learners' && seg.length === 3 && seg[2] === 'learning' && m === 'GET') {
    const student = findLearner(seg[1]);
    if (!student) return { ok: false, error: 'Learner not found.' };
    const items = LEARNER_MATERIALS.filter((m) => m.classLabel === student.classLabel);
    return paginate(items, query.page);
  }

  // ST03 — shared materials list + detail (the same routes the admin app
  // uses for AD20 exports). The student app filters by classId/subjectId in
  // the query; the demo handler returns the full LEARNER_MATERIALS set and
  // lets the model filter, matching the real backend's behaviour.
  if (seg[0] === 'materials' && seg.length === 1 && m === 'GET') {
    let items = LEARNER_MATERIALS.slice();
    if (query.classLabel) items = items.filter((m) => m.classLabel === query.classLabel);
    if (query.subject) items = items.filter((m) => m.subject === query.subject);
    return paginate(items, query.page);
  }
  if (seg[0] === 'materials' && seg.length === 2 && m === 'GET') {
    const material = LEARNER_MATERIALS.find((m) => m.id === seg[1]);
    if (!material) return { ok: false, error: 'Material not found.' };
    return { ok: true, material };
  }

  // ST04 — timetable + calendar.
  if (seg[0] === 'learners' && seg.length === 3 && seg[2] === 'timetable' && m === 'GET') {
    const student = findLearner(seg[1]);
    if (!student) return { ok: false, error: 'Learner not found.' };
    return { ok: true, timetable: learnerTimetable(student) };
  }
  // The shared calendar route (seg[0] === 'calendar') is handled below near
  // the other AD11 routes; the student app reads it as-is.

  // ST05 — assignments list for this student (their class only).
  if (seg[0] === 'learners' && seg.length === 3 && seg[2] === 'assignments' && m === 'GET') {
    const student = findLearner(seg[1]);
    if (!student) return { ok: false, error: 'Learner not found.' };
    const items = LEARNER_ASSIGNMENTS.filter((a) => a.classLabel === student.classLabel);
    return paginate(items, query.page);
  }

  // ST06 — one assignment's detail (brief + the student's last submission).
  if (
    seg[0] === 'learners' && seg.length === 4 && seg[2] === 'assignments' && m === 'GET'
  ) {
    const student = findLearner(seg[1]);
    if (!student) return { ok: false, error: 'Learner not found.' };
    const assignment = LEARNER_ASSIGNMENTS.find(
      (a) => a.id === seg[3] && a.classLabel === student.classLabel,
    );
    if (!assignment) return { ok: false, error: 'Assignment not found.' };
    return { ok: true, assignment };
  }

  // ST08 — list the student's submissions for one assignment (the last
  // submission + any feedback). ST07 (POST) appends a new submission.
  if (
    seg[0] === 'learners' && seg.length === 5 && seg[2] === 'assignments'
    && seg[4] === 'submissions'
  ) {
    const student = findLearner(seg[1]);
    if (!student) return { ok: false, error: 'Learner not found.' };
    const assignment = LEARNER_ASSIGNMENTS.find(
      (a) => a.id === seg[3] && a.classLabel === student.classLabel,
    );
    if (!assignment) return { ok: false, error: 'Assignment not found.' };
    if (m === 'GET') {
      // ST08 — return the last submission (or an empty list when none yet).
      const submissions = assignment.submission ? [assignment.submission] : [];
      return { ok: true, items: submissions, assignment };
    }
    if (m === 'POST') {
      // ST07 — record a new submission. The assignment flips to Submitted and
      // the new submission becomes the latest (a re-submit replaces it, so
      // the student sees one current submission per assignment).
      const content = cleanText((body && body.content) || '');
      if (!content) return { ok: false, error: 'Add your answer or upload before submitting.' };
      const submission = {
        id: `sub-${Date.now()}`,
        submittedAt: todayLabel(),
        status: 'Submitted',
        content,
        feedback: null,
        score: null,
      };
      assignment.submission = submission;
      assignment.status = 'Submitted';
      return { ok: true, submission };
    }
  }

  // ST09 — the student's report cards (list).
  if (seg[0] === 'learners' && seg.length === 3 && seg[2] === 'reports' && m === 'GET') {
    const student = findLearner(seg[1]);
    if (!student) return { ok: false, error: 'Learner not found.' };
    const items = REPORT_CARDS.filter((r) => String(r.studentId) === String(student.id));
    return paginate(items, query.page);
  }

  // ST11 — attendance.
  if (seg[0] === 'learners' && seg.length === 3 && seg[2] === 'attendance' && m === 'GET') {
    const student = findLearner(seg[1]);
    if (!student) return { ok: false, error: 'Learner not found.' };
    return { ok: true, attendance: learnerAttendance(student) };
  }

  // ST13 — profile + academic history.
  if (seg[0] === 'learners' && seg.length === 3 && seg[2] === 'profile' && m === 'GET') {
    const student = findLearner(seg[1]);
    if (!student) return { ok: false, error: 'Learner not found.' };
    return { ok: true, profile: learnerProfile(student) };
  }
  if (seg[0] === 'learners' && seg.length === 3 && seg[2] === 'external-results' && m === 'GET') {
    const student = findLearner(seg[1]);
    if (!student) return { ok: false, error: 'Learner not found.' };
    // No external results seeded for the demo student; the page shows an
    // empty state with the “add via the admin office” note.
    return { ok: true, items: [] };
  }
  if (seg[0] === 'learners' && seg.length === 3 && seg[2] === 'historical-report-attachments' && m === 'GET') {
    const student = findLearner(seg[1]);
    if (!student) return { ok: false, error: 'Learner not found.' };
    return { ok: true, items: [] };
  }

  // AD26/AD27 — promotion previews: compute, decide (PUT), validate, confirm.
  if (seg[0] === 'promotion-previews' && seg.length === 1) {
    if (m === 'GET') return paginate(PROMOTION_PREVIEWS, query.page);
    if (m === 'POST') {
      const classLabel = (body && body.classLabel) || '';
      if (!liveClassNames().includes(classLabel)) {
        return { ok: false, error: 'Pick a class from the list.' };
      }
      if (PROMOTION_PREVIEWS.some((p) => p.classLabel === classLabel && p.status !== 'Confirmed')) {
        // Not an error — the office taps "compute" twice; open what exists.
        const existing = PROMOTION_PREVIEWS.find(
          (p) => p.classLabel === classLabel && p.status !== 'Confirmed',
        );
        return { ok: true, preview: existing, existing: true };
      }
      const graduating = classLabel.startsWith('SSS3');
      const rows = makePromotionRows(classLabel, graduating);
      const preview = {
        id: `prm-${nextPreviewId++}`,
        classLabel,
        sessionLabel: '2026/2027',
        status: 'Draft',
        computedAt: todayLabel(),
        rows,
        summary: summariseRows(rows),
      };
      PROMOTION_PREVIEWS.push(preview);
      return { ok: true, preview };
    }
  }
  if (seg[0] === 'promotion-previews' && seg.length === 2 && m === 'GET') {
    const preview = PROMOTION_PREVIEWS.find((p) => p.id === seg[1]);
    if (!preview) return { ok: false, error: 'Promotion preview not found.' };
    return { ok: true, preview };
  }
  if (seg[0] === 'promotion-previews' && seg.length === 3 && seg[2] === 'decisions' && m === 'PUT') {
    const preview = PROMOTION_PREVIEWS.find((p) => p.id === seg[1]);
    if (!preview) return { ok: false, error: 'Promotion preview not found.' };
    if (preview.status === 'Confirmed') {
      return { ok: false, error: 'This preview is confirmed — its decisions are frozen.' };
    }
    const decisions = Array.isArray(body && body.decisions) ? body.decisions : [];
    decisions.forEach((d) => {
      const row = preview.rows.find((r) => String(r.studentId) === String(d.studentId));
      if (row && ['Promote', 'Repeat', 'Graduate'].includes(d.decision)) {
        row.decision = d.decision;
      }
    });
    preview.summary = summariseRows(preview.rows);
    preview.status = 'Decisions Saved';
    return { ok: true, preview };
  }
  if (seg[0] === 'promotion-previews' && seg.length === 3 && seg[2] === 'validate' && m === 'POST') {
    const preview = PROMOTION_PREVIEWS.find((p) => p.id === seg[1]);
    if (!preview) return { ok: false, error: 'Promotion preview not found.' };
    const undecided = preview.rows.filter((r) => !['Promote', 'Repeat', 'Graduate'].includes(r.decision));
    if (undecided.length) {
      return { ok: false, error: `${undecided.length} student(s) still need a decision before validation.` };
    }
    return { ok: true, problems: [] };
  }
  if (seg[0] === 'promotion-previews' && seg.length === 3 && seg[2] === 'confirm' && m === 'POST') {
    const preview = PROMOTION_PREVIEWS.find((p) => p.id === seg[1]);
    if (!preview) return { ok: false, error: 'Promotion preview not found.' };
    const undecided = preview.rows.filter((r) => !['Promote', 'Repeat', 'Graduate'].includes(r.decision));
    if (undecided.length) {
      return { ok: false, error: `${undecided.length} student(s) still need a decision before confirming.` };
    }
    preview.status = 'Confirmed';
    // Confirming ACTS on every student: promote changes their class (so the
    // student list, profile, fees and timetable all show the new class at
    // once), graduate sets their status, repeat leaves them where they are.
    preview.rows.forEach((r) => {
      const student = STUDENTS.find((st) => String(st.id) === String(r.studentId));
      if (!student) return;
      // Defence in depth: a withdrawn or already-graduated student never
      // moves here, even if a row for them slipped into the preview. They
      // are filtered out at compute time, but a stale decision set by the
      // office before a withdrawal must not graduate a withdrawn student.
      if (student.status !== 'Active') return;
      if (r.decision === 'Promote') {
        student.classLabel = nextClassOf(student.classLabel);
        student.department = student.classLabel.startsWith('JSS') ? null : student.department;
      } else if (r.decision === 'Graduate') {
        student.status = 'Graduated';
      }
    });
    AUDIT_LOG.unshift({
      id: `aud-${Date.now()}`,
      at: todayLabel(),
      actor: 'Admin (you)',
      category: 'Records',
      action: 'Confirmed a promotion preview',
      detail: `${preview.classLabel}: promote ${preview.summary.promote} · repeat ${preview.summary.repeat} · graduate ${preview.summary.graduate}`,
    });
    return { ok: true, preview };
  }

  // AD19 — Draft / returned batches move to ReadyToPublish on submit-review
  if (seg[0] === 'class-report-batches' && seg[2] === 'submit-review' && m === 'POST') {
    const batch = REPORT_BATCHES.find((b) => b.id === seg[1]);
    if (batch && (batch.status === 'Draft' || batch.status === 'ReturnedForCorrections')) {
      batch.status = 'ReadyToPublish';
    }
    return { ok: true };
  }

  // AD24 — payments, settlements, reconciliation, exceptions
  if (seg[0] === 'finance' && seg[1] === 'payments' && seg.length === 2 && m === 'GET') {
    return paginate(PAYMENTS, query.page);
  }

  // AD25 — one payment (payment detail)
  const paymentRow =
    seg[0] === 'finance' && seg[1] === 'payments' && seg[2]
      ? PAYMENTS.find((p) => p.id === seg[2])
      : null;
  if (paymentRow && seg.length === 3 && m === 'GET') return paymentRow;

  // AD25 — refund requests and their state machine
  if (seg[0] === 'finance' && seg[1] === 'refund-requests' && seg.length === 2) {
    if (m === 'GET') {
      const rows = query.paymentId
        ? REFUND_REQUESTS.filter((r) => r.paymentId === query.paymentId)
        : REFUND_REQUESTS;
      return paginate(rows, query.page);
    }
    if (m === 'POST') {
      const payment = PAYMENTS.find((p) => p.id === (body && body.paymentId));
      if (!payment) return { ok: false, error: 'Unknown payment.' };
      const request = {
        id: `rfr-${Date.now()}`,
        paymentId: payment.id,
        reference: payment.reference,
        studentName: payment.studentName,
        amountLabel: payment.amountLabel,
        reason: (body && body.reason) || '—',
        status: 'Pending',
        createdAt: todayLabel(),
      };
      REFUND_REQUESTS.unshift(request);
      return request;
    }
  }
  const refundRow =
    seg[0] === 'finance' && seg[1] === 'refund-requests' && seg[2]
      ? REFUND_REQUESTS.find((r) => r.id === seg[2])
      : null;
  if (refundRow && seg[3] === 'decision' && m === 'POST') {
    refundRow.status = (body && body.action) === 'approve' ? 'Approved' : 'Rejected';
    return { ok: true, status: refundRow.status };
  }
  if (refundRow && seg[3] === 'execute' && m === 'POST') {
    refundRow.status = 'Refunded';
    return { ok: true, status: 'Refunded' };
  }
  if (refundRow && seg[3] === 'manual-confirmation' && m === 'POST') {
    refundRow.status = 'Refunded';
    return { ok: true, status: 'Refunded' };
  }

  // AD05/AD06 — guardians list and one guardian's profile with child links
  if (seg[0] === 'guardians' && seg.length === 1 && m === 'GET') {
    const q = (query.q || query.search || '').toString().trim().toLowerCase();
    const status = query.status && query.status !== 'all' ? query.status : null;
    const rows = GUARDIANS.filter((g) => {
      if (status && g.status !== status) return false;
      if (q) {
        const kids = g.children.map((c) => c.name).join(' ');
        return `${g.fullName} ${g.email} ${g.phone} ${kids}`.toLowerCase().includes(q);
      }
      return true;
    });
    return paginate(rows, query.page);
  }
  // AD33 — create one guardian (and optionally link their first children) from
  // a CSV import row. The same validation the manual form uses is applied here
  // so a row that slipped past the pre-flight is rejected with a clear message.
  // Children are linked by name + class against ACTIVE students; a child that
  // does not match is reported in `unlinked` so the office can fix the name.
  if (seg[0] === 'guardians' && seg.length === 1 && m === 'POST') {
    const fullName = cleanText(body && body.fullName);
    if (!fullName) return { ok: false, error: 'Enter the guardian\'s full name.' };
    const phone = normalizePhone((body && body.phone) || '');
    const email = normalizeEmail((body && body.email) || '');
    if (!phone && !email) {
      return { ok: false, error: 'Enter at least a phone or an email for the guardian.' };
    }
    const phoneDisplay = canonicalPhone(phone) || phone;
    const dup = GUARDIANS.find(
      (g) =>
        (phone && normalizePhone(g.phone) === phone) ||
        (email && normalizeEmail(g.email) === email),
    );
    if (dup) return { ok: false, error: 'A guardian with this phone or email already exists.' };
    const childrenReq = Array.isArray(body && body.children) ? body.children : [];
    const linked = [];
    const unlinked = [];
    childrenReq.forEach((c) => {
      const name = cleanText(c && c.name);
      const cls = normalizeClassLabel(c && c.classLabel);
      if (!name) return;
      const student = STUDENTS.find(
        (s) =>
          s.status === 'Active' &&
          String(s.fullName || '').toLowerCase() === name.toLowerCase() &&
          (cls ? s.classLabel === cls : true),
      );
      if (student) {
        linked.push({
          studentId: student.id,
          name: student.fullName,
          classLabel: student.classLabel,
          relationship: cleanText(body && body.relationship) || 'Guardian',
        });
      } else {
        unlinked.push(name + (cls ? ` (${cls})` : ''));
      }
    });
    const guardian = {
      id: `gd-${Date.now()}`,
      fullName,
      phone: phoneDisplay,
      email,
      relationship: cleanText(body && body.relationship) || 'Guardian',
      status: 'Active',
      childrenCount: linked.length,
      children: linked,
    };
    GUARDIANS.push(guardian);
    AUDIT_LOG.unshift({
      id: `aud-${Date.now()}`,
      at: todayLabel(),
      actor: 'Admin (you)',
      category: 'Guardians',
      action: 'Registered a guardian (CSV import)',
      detail: `${guardian.fullName}${linked.length ? ` · ${linked.length} child(ren) linked` : ''}`,
    });
    return { ok: true, guardian, unlinked };
  }
  if (seg[0] === 'guardians' && seg.length === 2 && m === 'GET') {
    return GUARDIANS.find((g) => g.id === seg[1]) || null;
  }

  // AD07/AD09 — teachers list and one teacher's responsibilities
  if (seg[0] === 'teachers' && seg.length === 1 && m === 'GET') {
    const q = (query.q || query.search || '').toString().trim().toLowerCase();
    const status = query.status && query.status !== 'all' ? query.status : null;
    const rows = TEACHERS.filter((t) => {
      if (status && t.status !== status) return false;
      if (q) {
        const haystack = `${t.fullName} ${t.staffNumber} ${(t.subjects || []).join(' ')} ${
          t.formClass || ''
        }`.toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
    return paginate(rows, query.page);
  }
  if (seg[0] === 'teachers' && seg.length === 2 && m === 'GET') {
    return TEACHERS.find((t) => t.id === seg[1]) || null;
  }
  if (seg[0] === 'finance' && seg[1] === 'settlements' && seg.length === 2 && m === 'GET') {
    return paginate(SETTLEMENTS, query.page);
  }
  if (seg[0] === 'finance' && seg[1] === 'reconciliations' && seg.length === 2) {
    if (m === 'GET') return paginate(RECONCILIATIONS, query.page);
    if (m === 'POST') {
      const payment = PAYMENTS.find((p) => p.id === (body && body.paymentId));
      if (payment && payment.status === 'Reconciled') {
        return { ok: false, error: 'This settlement is already matched.' };
      }
      if (payment) {
        payment.status = 'Reconciled';
        payment.invoiceNumber = (body && body.invoiceNumber) || payment.invoiceNumber || '—';
        // The board's badge reads the settlement row, so flip it too.
        const settlement = SETTLEMENTS.find((s) => s.reference === payment.reference);
        if (settlement) settlement.status = 'Matched';
        // Money consistency: matched money lands on the invoice it pays.
        const invoice = INVOICES.find((inv) => inv.number === payment.invoiceNumber);
        if (invoice && invoice.amount - invoice.paid > 0) {
          const amount = Number(String(payment.amountLabel).replace(/[^0-9.]/g, ''));
          applyInvoicePayment(invoice, amount, 'Bank transfer', payment.reference, 'Paystack');
        }
      }
      RECONCILIATIONS.unshift({
        id: `rec-${Date.now()}`,
        paymentRef: payment ? payment.reference : '—',
        invoiceNumber: (body && body.invoiceNumber) || '—',
        amountLabel: payment ? payment.amountLabel : '—',
        createdBy: 'Admin',
        createdAt: todayLabel(),
      });
      return { ok: true };
    }
  }
  if (seg[0] === 'finance' && seg[1] === 'exceptions' && seg.length === 2 && m === 'GET') {
    return paginate(PAYMENT_EXCEPTIONS, 1, 20);
  }
  if (seg[0] === 'finance' && seg[1] === 'exceptions' && seg[3] === 'actions' && m === 'POST') {
    const exception = PAYMENT_EXCEPTIONS.find((e) => e.id === seg[2]);
    if (exception) {
      const action = (body && body.action) || 'resolve';
      exception.status = action === 'refund-flag' ? 'Refund flagged' : 'Resolved';
    }
    return { ok: true };
  }

  // AD31/AD32 — complaints: list, detail, replies, notes, state machine
  if (seg[0] === 'complaints' && seg.length === 1) {
    if (m === 'GET') return paginate(filterComplaints(query), query.page);
    if (m === 'POST') {
      const complaint = {
        id: `cmp-${Date.now()}`,
        guardianName: (body && body.guardianName) || 'Guardian',
        studentName: (body && body.studentName) || '',
        classLabel: (body && body.classLabel) || '',
        channel: (body && body.channel) || 'Phone',
        subject: (body && body.subject) || 'New complaint',
        detail: (body && body.detail) || '',
        status: 'New',
        owner: 'Unassigned',
        openedAt: todayLabel(),
        replies: [],
        notes: [],
        history: [{ id: 'h-1', text: 'Complaint received', at: todayLabel() }],
      };
      COMPLAINTS.unshift(complaint);
      return complaint;
    }
  }
  const complaint = seg[0] === 'complaints' && seg[1] ? COMPLAINTS.find((c) => c.id === seg[1]) : null;
  if (complaint && seg.length === 2 && m === 'GET') return complaint;
  if (complaint && seg[2] === 'replies') {
    if (m === 'GET') return { items: complaint.replies };
    // A CLOSED complaint refuses new replies — the office closes a case to end
    // the conversation, so it must not silently accept one. Reopen first.
    if (complaint.status === 'Closed') {
      return { ok: false, error: 'This case is closed — reopen it before sending a new reply.' };
    }
    complaint.replies.push({
      id: `r-${complaint.replies.length + 1}`,
      author: 'Admin (office)',
      text: (body && body.text) || '',
      at: todayLabel(),
    });
    complaint.history.push({ id: `h-${complaint.history.length + 1}`, text: 'Reply sent to guardian', at: todayLabel() });
    return { ok: true };
  }
  if (complaint && seg[2] === 'internal-notes') {
    if (m === 'GET') return { items: complaint.notes };
    complaint.notes.push({
      id: `n-${complaint.notes.length + 1}`,
      author: 'Admin',
      text: (body && body.text) || '',
      at: todayLabel(),
    });
    return { ok: true };
  }
  if (complaint && seg[2] === 'state-actions' && m === 'POST') {
    const actions = {
      'start-review': 'In review',
      resolve: 'Resolved',
      close: 'Closed',
      reopen: 'In review',
    };
    const next = actions[(body && body.action)];
    if (next) {
      complaint.status = next;
      if (next === 'In review' && complaint.owner === 'Unassigned') complaint.owner = 'Admin';
      complaint.history.push({
        id: `h-${complaint.history.length + 1}`,
        text: `Status → ${next}`,
        at: todayLabel(),
      });
    }
    return complaint;
  }

  // AD11 — school calendar and sessions
  if (seg[0] === 'calendar' && seg.length === 1 && m === 'GET') return CALENDAR;
  // AD11 — add a key date ("Science fair", mid-term break…), newest-sorted.
  if (seg[0] === 'calendar-events' && seg.length === 1 && m === 'POST') {
    const date = cleanText(body && body.date);
    const title = cleanText(body && body.title);
    // Real calendar dates only — 2026-09-56 or 2026-02-31 are refused here
    // exactly as the form refuses them (one shared validator).
    const dateProblem = calendarDateError(date);
    if (dateProblem) {
      return { ok: false, error: dateProblem };
    }
    if (!title) {
      return { ok: false, error: 'Give the key date a title — e.g. "Science fair".' };
    }
    const entry = {
      id: `kd-${Date.now()}`,
      date,
      title,
      detail: cleanText(body && body.detail) || 'Added by the office',
    };
    CALENDAR.keyDates = [...CALENDAR.keyDates, entry].sort((a, b) =>
      String(a.date).localeCompare(String(b.date)),
    );
    AUDIT_LOG.unshift({
      id: `aud-${Date.now()}`,
      at: todayLabel(),
      actor: 'Admin (you)',
      category: 'Records',
      action: 'Added a key date',
      detail: `${date} · ${title}`,
    });
    return { ok: true, calendar: CALENDAR };
  }
  // AD11 — add an activity to "Today at school" (assembly, briefing…).
  if (seg[0] === 'calendar-today' && seg.length === 1 && m === 'POST') {
    const rawTime = cleanText(body && body.time);
    const subject = cleanText(body && body.subject);
    // The office types digits only (915, 1415); "09:15" with a colon is fine too.
    let hh;
    let mm;
    const digits = rawTime.replace(/\D/g, '');
    if (/^\d{3,4}$/.test(digits)) {
      hh = Number(digits.slice(0, -2));
      mm = Number(digits.slice(-2));
    } else {
      const colon = /^(\d{1,2}):(\d{2})$/.exec(rawTime);
      if (colon) {
        hh = Number(colon[1]);
        mm = Number(colon[2]);
      }
    }
    if (hh === undefined || hh > 23 || mm > 59) {
      return {
        ok: false,
        error: 'Give the time on the 24-hour clock — digits only, e.g. 915 or 1415.',
      };
    }
    if (!subject) {
      return { ok: false, error: 'Give the activity a title — e.g. "Staff briefing".' };
    }
    const entry = {
      id: `sch-${Date.now()}`,
      time: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
      subject,
      detail: cleanText(body && body.detail) || 'Main school',
    };
    CALENDAR.todaySchedule = [...CALENDAR.todaySchedule, entry].sort((a, b) =>
      String(a.time).localeCompare(String(b.time)),
    );
    return { ok: true, calendar: CALENDAR };
  }
  if (seg[0] === 'sessions' && seg.length === 1 && m === 'GET') {
    return { items: SESSIONS_LIST };
  }
  // AD11 — plan the next session (2027/2028…). The CURRENT session stays
  // automatic — this is for looking ahead.
  if (seg[0] === 'sessions' && seg.length === 1 && m === 'POST') {
    const label = String((body && body.label) || '').trim().replace(/\s+/g, '');
    const years = /^(\d{4})\/(\d{4})$/.exec(label);
    if (!years || Number(years[2]) !== Number(years[1]) + 1) {
      return { ok: false, error: 'Sessions look like 2027/2028 — a year and the year after it.' };
    }
    if (SESSIONS_LIST.some((s) => s.label === label)) {
      return { ok: false, error: `${label} is already on the calendar.` };
    }
    const newest = Math.max(...SESSIONS_LIST.map((s) => Number(s.label.split('/')[0])));
    if (Number(years[1]) <= newest) {
      return {
        ok: false,
        error: `Add the NEXT session — the newest on the calendar is ${newest}/${newest + 1}.`,
      };
    }
    SESSIONS_LIST.push({
      id: `ses-${Date.now()}`,
      label,
      status: 'Planned',
      terms: 'Planned — set the term dates when the ministry releases them.',
    });
    SESSIONS_LIST.sort((a, b) => b.label.localeCompare(a.label)); // newest first
    return { ok: true, sessions: SESSIONS_LIST };
  }

  // AD29/AD30 — messages inbox and threads
  if (seg[0] === 'conversation-recipients' && m === 'GET') {
    // Step 2 of "new message": the people (or class audience) inside the
    // group picked in step 1.
    if (query.group) {
      const group = String(query.group);
      // A class picked in step 1 answers with WHO to send to inside it —
      // the office taps teachers, guardians, or both.
      if (
        group.startsWith('class:') &&
        !group.endsWith(':teachers') &&
        !group.endsWith(':guardians') &&
        !group.endsWith(':both')
      ) {
        const cls = group.slice('class:'.length);
        return {
          items: [
            { label: `All teachers in ${cls}`, value: `class:${cls}:teachers` },
            { label: `All guardians in ${cls}`, value: `class:${cls}:guardians` },
            { label: `Teachers AND guardians in ${cls}`, value: `class:${cls}:both` },
          ],
        };
      }
      // The individual pickers: teachers, guardians, or both in one list.
      const teacherItems = [...new Set(TEACHERS.map((t) => t.fullName))].map((name) => {
        const t = TEACHERS.find((x) => x.fullName === name);
        return {
          label: `${name} · Teacher${t && t.formClass ? ` (${t.formClass} form teacher)` : ''}`,
          value: `teacher:${name}`,
        };
      });
      const guardianItems = [];
      const seenGuardians = new Set();
      STUDENTS.forEach((s) => {
        if (!s.guardianName || seenGuardians.has(s.guardianName)) return;
        seenGuardians.add(s.guardianName);
        guardianItems.push({
          label: `${s.guardianName} · guardian of ${s.fullName} (${s.classLabel})`,
          value: `guardian:${s.guardianName}`,
        });
      });
      if (group === 'group:all-teachers') return { items: teacherItems };
      if (group === 'group:all-guardians') return { items: guardianItems };
      if (group === 'individuals') return { items: [...teacherItems, ...guardianItems] };
      return { items: [] };
    }
    // Step 1: every audience the office can message — the two broadcasts,
    // the individual picker, and EVERY class from the live class list
    // (created classes appear here immediately).
    return {
      items: [
        { label: 'All guardians', value: 'group:all-guardians' },
        { label: 'All teachers', value: 'group:all-teachers' },
        { label: 'Individual teachers & guardians…', value: 'individuals' },
        ...liveClassNames().map((c) => ({ label: c, value: `class:${c}` })),
      ],
    };
  }
  if (seg[0] === 'conversations' && seg.length === 1) {
    if (m === 'GET') return paginate(CONVERSATIONS, query.page);
    if (m === 'POST') {
      const recipient = (body && body.recipient) || 'Guardian';
      const conversation = {
        id: `cnv-${Date.now()}`,
        title: (body && body.title) || recipient,
        participantLabel: recipient,
        unread: 0,
        lastMessage: (body && body.text) || '',
        lastAt: todayLabel(),
        messages: [],
      };
      CONVERSATIONS.unshift(conversation);
      return conversation;
    }
  }
  const conversation =
    seg[0] === 'conversations' && seg[1] ? CONVERSATIONS.find((c) => c.id === seg[1]) : null;
  if (conversation && seg[2] === 'messages') {
    if (m === 'GET') return paginate(conversation.messages, query.page, 20);
    // A closed/blocked thread refuses new replies — the office closes a thread
    // to stop further messages, so it must not silently accept one.
    if (conversation.closed) {
      return { ok: false, error: 'This thread is closed — reopen it to send a new message.' };
    }
    conversation.messages.push({
      id: `m-${conversation.messages.length + 1}`,
      author: 'Admin (office)',
      text: (body && body.text) || '',
      at: todayLabel(),
    });
    conversation.lastMessage = (body && body.text) || conversation.lastMessage;
    return { ok: true };
  }
  if (conversation && seg[2] === 'read' && m === 'PUT') {
    conversation.unread = 0;
    return { ok: true };
  }
  // Close (block) and reopen a conversation thread. Closing is a soft state —
  // the history stays, but new replies are refused until the office reopens it.
  if (conversation && seg[2] === 'close' && m === 'POST') {
    conversation.closed = true;
    return { ok: true, conversation };
  }
  if (conversation && seg[2] === 'reopen' && m === 'POST') {
    conversation.closed = false;
    return { ok: true, conversation };
  }

  // AD28 — notices
  if (seg[0] === 'notices' && seg.length === 1) {
    if (m === 'GET') return paginate(NOTICES, 1, 20);
    if (m === 'POST') {
      const notice = {
        id: `ntc-${Date.now()}`,
        title: (body && body.title) || 'Untitled announcement',
        body: (body && body.body) || '',
        audience: (body && body.audience) || 'ALL',
        audienceLabel: audienceLabelFor(body && body.audience),
        status: 'Draft',
        publishedAt: null,
      };
      NOTICES = [notice, ...NOTICES];
      return notice;
    }
  }
  if (seg[0] === 'notices' && seg[2] === 'publish') {
    const notice = NOTICES.find((n) => n.id === seg[1]);
    if (notice) {
      notice.status = 'Published';
      notice.publishedAt = todayLabel();
    }
    return { ok: true };
  }
  if (seg[0] === 'notices' && seg[2] === 'archive') {
    const notice = NOTICES.find((n) => n.id === seg[1]);
    if (notice) notice.status = 'Archived';
    return { ok: true };
  }
  // ST12 — one notice by id (the student app opens a notice from the list).
  if (seg[0] === 'notices' && seg.length === 2 && m === 'GET') {
    const notice = NOTICES.find((n) => n.id === seg[1]);
    if (!notice) return { ok: false, error: 'Notice not found.' };
    return notice;
  }

  // Everything else: answer benignly so no screen ever crashes in demo mode.
  if (m === 'GET') return null;
  return { ok: true };
}
