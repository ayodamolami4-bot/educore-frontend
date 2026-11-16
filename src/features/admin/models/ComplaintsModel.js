/** AD31/AD32 — Complaint detail, public replies, office-only notes and state changes. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

const itemsOf = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const statusLabel = (value) => ({
  NEW: 'New',
  IN_REVIEW: 'In review',
  WAITING_FOR_PARENT: 'Waiting for parent',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}[String(value ?? '').toUpperCase()] ?? String(value ?? ''));

const entryView = (entry) => ({
  id: entry.id,
  at: entry.createdAt ?? '',
  author: entry.authorId ?? 'School participant',
  text: entry.body ?? '',
  files: itemsOf(entry.files),
});

export const ComplaintsModel = {
  async list(filters = {}) {
    const items = [];
    let cursor;
    let response;
    do {
      response = await api.get(endpoints.complaints.list, null, {
        cursor,
        limit: 100,
      });
      const page = normalizePage(response);
      items.push(...page.items);
      cursor = response?.hasMore
        ? (response.nextCursor ?? page.items.at(-1)?.id ?? null)
        : null;
    } while (cursor);

    const statusFilter = String(filters.status ?? 'all').toLowerCase();
    const search = String(filters.q ?? filters.search ?? '').trim().toLowerCase();
    const mapped = items.map((item) => ({
      ...item,
      status: statusLabel(item.state),
      guardianName: 'Linked guardian',
      studentName: item.studentId ? 'Student record' : 'No student linked',
      classLabel: '',
      channel: item.intakeChannel ?? '',
      openedAt: item.createdAt ?? '',
      owner: item.ownerId ? 'Assigned' : 'Unassigned',
      subject: item.subject ?? item.category ?? 'School case',
    }));
    const filtered = mapped.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status.toLowerCase() === statusFilter;
      const haystack = [
        item.subject,
        item.category,
        item.studentName,
        item.studentId,
        item.channel,
        item.status,
      ].join(' ').toLowerCase();
      return matchesStatus && (!search || haystack.includes(search));
    });
    return { items: filtered, total: filtered.length, pages: 1 };
  },

  async create(body) {
    return api.post(endpoints.complaints.list, null, body);
  },

  async byId(caseId) {
    const [raw, historyPage] = await Promise.all([
      api.get(endpoints.complaints.byId, { caseId }),
      api.get(endpoints.complaints.history, { caseId }),
    ]);
    const entries = itemsOf(raw.entries);
    const publicEntries = entries.filter((entry) => entry.visibility === 'PUBLIC').map(entryView);
    const privateEntries = entries.filter((entry) => entry.visibility === 'INTERNAL').map(entryView);
    const history = itemsOf(historyPage).map((item, index) => ({
      id: item.id ?? String(item.createdAt ?? 'event') + '-' + index,
      at: item.createdAt ?? '',
      text: [
        item.action,
        item.beforeState && item.afterState ? item.beforeState + ' → ' + item.afterState : '',
        item.reason ?? '',
      ].filter(Boolean).join(' · '),
    }));

    return {
      ...raw,
      status: statusLabel(raw.state),
      owner: raw.ownerId ? 'Assigned' : 'Unassigned',
      guardianName: 'Linked guardian',
      openedAt: publicEntries[0]?.at ?? '',
      channel: raw.intakeChannel ?? '',
      detail: publicEntries[0]?.text ?? '',
      history,
      replies: publicEntries,
      notes: privateEntries,
    };
  },

  async replies(caseId) {
    const complaint = await this.byId(caseId);
    return { items: complaint.replies };
  },

  async addReply(caseId, body, version) {
    return api.post(
      endpoints.complaints.replies,
      { caseId },
      { body: String(body?.body ?? '').trim(), internal: false, fileIds: body?.fileIds ?? [] },
      { version },
    );
  },

  async internalNotes(caseId) {
    const complaint = await this.byId(caseId);
    return { items: complaint.notes };
  },

  async addInternalNote(caseId, body, version) {
    return api.post(
      endpoints.complaints.replies,
      { caseId },
      { body: String(body?.body ?? '').trim(), internal: true, fileIds: body?.fileIds ?? [] },
      { version },
    );
  },

  async assignOwner(caseId, body, version) {
    return api.put(
      endpoints.complaints.owner,
      { caseId },
      { ownerId: body?.ownerId ?? null, reason: String(body?.reason ?? '').trim() },
      { version },
    );
  },

  async stateAction(caseId, body, version) {
    const action = ({
      'start-review': 'START_REVIEW',
      'wait-for-parent': 'WAIT_FOR_PARENT',
      resolve: 'RESOLVE',
      close: 'CLOSE',
    })[body?.action] ?? body?.action;
    return api.post(
      endpoints.complaints.stateActions,
      { caseId },
      { action, reason: String(body?.reason ?? '').trim() },
      { version },
    );
  },

  async history(caseId) {
    return normalizePage(await api.get(endpoints.complaints.history, { caseId }));
  },
};

export default ComplaintsModel;
