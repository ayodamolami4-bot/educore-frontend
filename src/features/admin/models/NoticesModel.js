/** AD28 — School announcements (notices): the broadcast system's admin surface. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

export const NoticesModel = {
  async list(query) {
    return normalizePage(await api.get(endpoints.notices.list, null, query));
  },

  async byId(noticeId) {
    return api.get(endpoints.notices.byId, { noticeId });
  },

  async create(body) {
    return api.post(endpoints.notices.list, null, body);
  },

  async update(noticeId, body) {
    return api.patch(endpoints.notices.byId, { noticeId }, body);
  },

  /** Publish sends it to the selected audience (families/teachers see it). */
  async publish(noticeId) {
    return api.post(endpoints.notices.publish, { noticeId });
  },

  async archive(noticeId) {
    return api.post(endpoints.notices.archive, { noticeId });
  },
};

export default NoticesModel;
