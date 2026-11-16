/** AD21 — Fee plans and their reviewable issue batches. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

const itemsOf = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const moneyLabel = (minor) => {
  const value = Number(minor);
  if (!Number.isFinite(value)) return 'Amount unavailable';
  return '₦' + (value / 100).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const FeePlanModel = {
  async list(filters = {}) {
    const raw = await api.get(endpoints.finance.feePlans, null, {
      termId: filters.termId,
    });
    const page = normalizePage(raw);
    const classPage = await api.get('classes');
    const classById = new Map(itemsOf(classPage).map((item) => [
      item.id,
      [item.level, item.arm].filter(Boolean).join(' ') || item.classLabel || 'Class',
    ]));

    const plans = await Promise.all(page.items.map(async (summary) => {
      const detail = await api.get(endpoints.finance.feePlanById, { planId: summary.id });
      const classIds = itemsOf(detail.classIds);
      const labels = classIds.map((id) => classById.get(id) ?? 'Assigned class');
      return {
        ...detail,
        id: detail.id ?? summary.id,
        classIds,
        classLabel: labels.join(', ') || 'No class scope',
        title: detail.name ?? summary.name ?? 'Fee plan',
        status: detail.state === 'PUBLISHED' ? 'Published' : 'Draft',
        amountMinor: detail.totalMinor ?? 0,
        amountLabel: moneyLabel(detail.totalMinor),
        dueDate: detail.dueOn ?? summary.dueOn ?? '',
      };
    }));

    return { items: plans, total: plans.length, page: 1, pages: 1 };
  },

  async byId(planId) {
    return api.get(endpoints.finance.feePlanById, { planId });
  },

  async create(body) {
    return api.post(endpoints.finance.feePlans, null, body);
  },

  async update(planId, body, version) {
    return api.put(
      endpoints.finance.feePlanById,
      { planId },
      body,
      { version },
    );
  },

  async publish(planId, version) {
    return api.post(
      endpoints.finance.publishFeePlan,
      { planId },
      undefined,
      { version },
    );
  },

  async issuePreview(planId, body = {}) {
    return api.post(
      endpoints.finance.issuePreview,
      { planId },
      { classIds: body.classIds ?? null },
    );
  },

  async batchById(batchId) {
    return api.get(endpoints.finance.feeBatchById, { batchId });
  },

  async confirmIssue(batchId, version) {
    return api.post(
      endpoints.finance.issuePlan,
      { batchId },
      undefined,
      { version },
    );
  },
};

export default FeePlanModel;
