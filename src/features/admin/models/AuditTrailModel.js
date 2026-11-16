/** AD34 — School change history across role-authorised service audit streams. */
import { api } from '../api/client';
import { getActiveContext } from '../api/client';

const DOMAIN_LABELS = {
  academics: 'Academics',
  finance: 'Finance',
  communication: 'Communication',
  identity: 'Identity',
};

const permittedDomains = (role) => {
  const value = String(role ?? '').toUpperCase();
  if (value === 'PRINCIPAL') return ['academics', 'finance', 'communication', 'identity'];
  if (value === 'SCHOOL_OFFICE') return ['academics'];
  if (value === 'ACCOUNTS') return ['finance'];
  return [];
};

const detailOf = (row) => {
  const details = row.details && typeof row.details === 'object'
    ? Object.entries(row.details).map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    : [];
  return [
    row.reason,
    row.resourceType ? `Record: ${row.resourceType}` : '',
    row.resourceId ? `ID: ${row.resourceId}` : '',
    ...details,
  ].filter(Boolean).join(' · ') || 'No further detail recorded';
};

const viewOf = (row, domain) => ({
  ...row,
  domain,
  category: DOMAIN_LABELS[domain] ?? domain,
  at: row.createdAt ?? '',
  actor: row.actorId ? `Account ${String(row.actorId).slice(0, 8)}` : 'School system',
  detail: detailOf(row),
});

export const AuditTrailModel = {
  permittedDomains() {
    return permittedDomains(getActiveContext().role);
  },

  async list(filters = {}) {
    const allowed = permittedDomains(getActiveContext().role);
    if (allowed.length === 0) throw new Error('This role cannot open the school change history.');

    const selected = filters.domain
      ? String(filters.domain).toLowerCase()
      : null;
    const domains = selected
      ? allowed.includes(selected) ? [selected] : []
      : allowed;
    if (domains.length === 0) throw new Error('This audit stream is not available to your school role.');

    const pages = await Promise.all(domains.map(async (domain) => {
      const page = await api.get('activity/{domain}', { domain }, {
        from: filters.from,
        to: filters.to,
        cursor: filters.cursor,
        limit: filters.limit ?? 30,
      });
      const items = Array.isArray(page?.items) ? page.items : [];
      return items.map((row) => viewOf(row, domain));
    }));
    const items = pages.flat().sort((left, right) =>
      String(right.at).localeCompare(String(left.at))
    );
    return { items, total: items.length, hasMore: pages.some((page) => page.length >= (filters.limit ?? 30)) };
  },
};

export default AuditTrailModel;
