/** AD05/AD06 — Guardian directory and child links using school APIs. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

export const GuardianModel = {
  async list(filters = {}) {
    const page = normalizePage(await api.get(endpoints.guardians.list, null, {
      search: String(filters.q ?? filters.search ?? '').trim() || undefined,
      childId: filters.childId,
      activeLink: filters.activeLink,
      cursor: filters.cursor,
      limit: filters.limit ?? 30,
    }));
    return {
      ...page,
      items: page.items.map((guardian) => ({
        ...guardian,
        name: guardian.fullName ?? '',
        phone: guardian.phone ?? '',
        email: guardian.email ?? '',
        // The directory endpoint does not return account activation state or
        // child counts. Do not fabricate either from the guardian record.
        status: 'Linked guardian',
      })),
    };
  },

  async byId(guardianId) {
    const raw = await api.get(endpoints.guardians.byId, { guardianId });
    const children = Array.isArray(raw.children) ? raw.children : [];
    return {
      ...raw,
      childrenCount: children.length,
      children: children.map((child) => ({
        ...child,
        name: child.studentName ?? 'Student record',
        classLabel: '',
        linkStatus: child.active ? 'Active link' : 'Revoked link',
      })),
    };
  },

  async update(guardianId, body, version) {
    if (!Number.isSafeInteger(version) || version < 1) {
      throw new Error('Refresh the guardian record before saving contact changes.');
    }
    return api.patch(
      endpoints.guardians.byId,
      { guardianId },
      {
        fullName: body.fullName,
        phone: body.phone,
        email: body.email,
        reason: String(body.reason ?? '').trim(),
      },
      { version },
    );
  },

  async createGuardian() {
    throw new Error('A new guardian is registered and linked during student enrolment. There is no separate guardian-create endpoint.');
  },

  async createLink() {
    throw new Error('Guardian links are created during student enrolment. There is no standalone link-creation endpoint.');
  },

  async updateLink() {
    throw new Error('The backend does not expose a standalone guardian-link edit endpoint.');
  },

  async revokeLink(studentId, guardianId, reason) {
    if (!studentId || !guardianId) {
      throw new Error('The student and guardian IDs are required to revoke a link.');
    }
    const explanation = String(reason ?? '').trim();
    if (explanation.length < 5) {
      throw new Error('Enter a reason of at least five characters to revoke the guardian link.');
    }
    return api.post(
      endpoints.guardians.revokeLink,
      { studentId, guardianId },
      { reason: explanation },
    );
  },

  async invite(body) {
    if (!body?.subjectId) throw new Error('Choose a registered guardian before issuing an activation slip.');
    return api.post(
      endpoints.students.inviteAccount,
      { type: String(body.type ?? 'GUARDIAN').toUpperCase(), subjectId: body.subjectId },
    );
  },
};

export default GuardianModel;
