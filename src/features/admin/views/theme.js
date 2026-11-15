/**
 * Design tokens taken from the EduCore design handoff (page 2, DESIGN SYSTEM):
 * layout 390x844 reference, Title 23px, body 13-14px, input 14px, labels 12px,
 * touch targets at least 44x44.
 */
export const colors = {
  primary: '#0b5e52',
  text: '#192c33',
  surface: '#faf9f4',
  positive: '#eaf3e7',
  attention: '#fff0d4',
  error: '#fbe9e6',
  onPrimary: '#ffffff',
  muted: '#5b6b71',
  border: '#e3e0d6',
  white: '#ffffff',
};

export const typography = {
  title: { fontSize: 23, fontWeight: '700', color: colors.text },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.text },
  input: { fontSize: 14, color: colors.text },
  label: { fontSize: 12, fontWeight: '600', color: colors.muted },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const touchTarget = { minWidth: 44, minHeight: 44 };

export const statusTone = {
  Active: 'positive',
  Published: 'positive',
  Approved: 'positive',
  Enrolled: 'positive',
  Paid: 'positive',
  Submitted: 'positive',
  Draft: 'muted',
  Pending: 'attention',
  Flagged: 'attention',
  Withdrawn: 'attention',
  Graduated: 'info',
  Blocked: 'muted',
  PartiallyPaid: 'attention',
  Overdue: 'error',
  Rejected: 'error',
  Failed: 'error',
  Completed: 'info',
  // AD16/AD19/AD24/AD31 — the list screens built after AD02
  Missing: 'error',
  Unreconciled: 'attention',
  Unmatched: 'attention',
  Reconciled: 'positive',
  RefundRequested: 'attention',
  Open: 'attention',
  'In review': 'attention',
  New: 'attention',
  Resolved: 'positive',
  Closed: 'muted',
  ReadyToPublish: 'attention',
  ReturnedForCorrections: 'error',
  'On Leave': 'attention',
  Inactive: 'error',
  Archived: 'muted',
};
