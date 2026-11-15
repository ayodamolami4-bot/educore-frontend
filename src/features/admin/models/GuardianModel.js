/** AD05/AD06 — Parents and guardians, child links, account invitations. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

export const GuardianModel = {
  async list(filters = {}) {
    const page = normalizePage(await api.get(endpoints.guardians.list, null, filters));
    return {
      ...page,
      items: page.items.map((g) => ({
        id: g.id,
        name: g.fullName || g.name || '',
        phone: g.phone || '',
        email: g.email || '',
        childrenCount: g.childrenCount ?? 0,
        status: g.status || 'Active',
      })),
    };
  },

  async byId(guardianId) {
    return api.get(endpoints.guardians.byId, { guardianId });
  },

  async update(guardianId, body) {
    return api.patch(endpoints.guardians.byId, { guardianId }, body);
  },

  /** AD33 — create one guardian (and optionally link their first children) from
      a CSV import row. Returns { guardian, unlinked } where unlinked is the
      list of child names that did not match an active student. */
  async createGuardian(body) {
    return api.post(endpoints.guardians.create, null, body);
  },

  /** Link a guardian to a child (with relationship, e.g. mother/father). */
  async createLink(body) {
    return api.post(endpoints.guardians.links, null, body);
  },

  async updateLink(linkId, body) {
    return api.patch(endpoints.guardians.linkById, { linkId }, body);
  },

  /** Revoke access —,the child disappears from that Parent app after this. */
  async revokeLink(linkId) {
    return api.post(endpoints.guardians.revokeLink, { linkId });
  },

  /** Invite a guardian account by email/SMS . */
  async invite(body) {
    return api.post(endpoints.students.inviteAccount, null, body);
  },
};

export default GuardianModel;
