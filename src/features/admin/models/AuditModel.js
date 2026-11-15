/** AD34 — School change history (audit trail). Backend records every change. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

export const AuditModel = {
  async events(query) {
    return normalizePage(await api.get(endpoints.audit.events, null, query));
  },

  async eventById(eventId) {
    return api.get(endpoints.audit.eventById, { eventId });
  },
};

export default AuditModel;
