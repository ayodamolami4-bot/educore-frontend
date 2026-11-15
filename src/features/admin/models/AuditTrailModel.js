/** AD34 — School change history: who changed what, and when. */
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';

export const AuditTrailModel = {
  async list(filters = {}) {
    return api.get(endpoints.auditTrail, null, filters);
  },
};

export default AuditTrailModel;
