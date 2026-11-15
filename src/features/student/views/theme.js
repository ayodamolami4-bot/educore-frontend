/**
 * Student app design tokens. Mirrors the admin design system (page 2 of the
 * EduCore design handoff): the same palette, type scale and spacing the admin
 * screens use, so a student signing in sees the same visual language as the
 * office. Kept in the student feature module so the student app is fully
 * self-contained and can be lifted to its own repo without the admin folder.
 */
export const colors = {
  primary: '#0b5e52',
  primaryDark: '#084a40',
  text: '#192c33',
  muted: '#5b6b71',
  surface: '#faf9f4',
  positive: '#eaf3e7',
  attention: '#fff0d4',
  error: '#fbe9e6',
  danger: '#a6323d',
  onPrimary: '#ffffff',
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

export const spacing = { xs: 4, sm: 8, md: 12, lg: 20, xl: 28, xxl: 40 };

// Minimum touch target height (44pt) from the design handoff.
export const touchTarget = 44;
