/** AD21 — Fee plans: set a fee per class, then issue its bills to the class. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

export const FeePlanModel = {
  async list(filters = {}) {
    const page = normalizePage(await api.get(endpoints.finance.feePlans, null, filters));
    return { ...page, items: page.items.map((p) => ({ ...p })) };
  },

  async create(body) {
    return api.post(endpoints.finance.feePlans, null, body);
  },

  async issuePreview(planId) {
    return api.post(endpoints.finance.issuePreview, { planId }, {});
  },

  async issue(planId) {
    return api.post(endpoints.finance.issuePlan, { planId }, {});
  },
};

export default FeePlanModel;
