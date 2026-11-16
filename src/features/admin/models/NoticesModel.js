/** AD28 — School notices using the communication backend's scoped audience model. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

const noticeView = (notice) => ({
  ...notice,
  status: ({
    DRAFT: 'Draft',
    PUBLISHED: 'Published',
    ARCHIVED: 'Archived',
  })[String(notice.state ?? '').toUpperCase()] ?? String(notice.state ?? 'Unknown'),
  audience: notice.scope,
  audienceLabel: ({
    SCHOOL: 'Everyone in the school',
    CLASS: notice.classLabel ?? 'Selected class',
    DEPARTMENT: `${notice.department ?? 'Selected'} department`,
  })[String(notice.scope ?? '').toUpperCase()] ?? 'School audience',
});

export const NoticesModel = {
  async list(query) {
    const page = normalizePage(await api.get(endpoints.notices.list, null, query));
    return { ...page, items: page.items.map(noticeView) };
  },

  async byId(noticeId) {
    return noticeView(await api.get(endpoints.notices.byId, { noticeId }));
  },

  async create(body) {
    return noticeView(await api.post(endpoints.notices.list, null, {
      title: String(body.title ?? '').trim(),
      body: String(body.body ?? '').trim(),
      scope: String(body.scope ?? 'SCHOOL').toUpperCase(),
      classId: body.classId ?? null,
      department: body.department ?? null,
      fileIds: body.fileIds ?? [],
    }));
  },

  async update(notice, body) {
    if (!notice?.id || !Number.isSafeInteger(notice.version) || notice.version < 1) {
      throw new Error('Refresh this notice before editing it.');
    }
    return noticeView(await api.put(
      endpoints.notices.byId,
      { noticeId: notice.id },
      {
        title: String(body.title ?? notice.title).trim(),
        body: String(body.body ?? notice.body).trim(),
        scope: body.scope ?? notice.scope,
        classId: body.classId ?? notice.classId ?? null,
        department: body.department ?? notice.department ?? null,
        fileIds: body.fileIds ?? [],
      },
      { version: notice.version },
    ));
  },

  async publish(notice) {
    if (!notice?.id || !Number.isSafeInteger(notice.version) || notice.version < 1) {
      throw new Error('Refresh this notice before publishing it.');
    }
    return noticeView(await api.post(
      endpoints.notices.publish,
      { noticeId: notice.id },
      undefined,
      { version: notice.version },
    ));
  },

  async archive(notice, reason) {
    if (!notice?.id || !Number.isSafeInteger(notice.version) || notice.version < 1) {
      throw new Error('Refresh this notice before archiving it.');
    }
    const explanation = String(reason ?? '').trim();
    if (explanation.length < 5) {
      throw new Error('Enter an archive reason of at least five characters.');
    }
    return noticeView(await api.post(
      endpoints.notices.archive,
      { noticeId: notice.id },
      { reason: explanation },
      { version: notice.version },
    ));
  },
};

export default NoticesModel;
