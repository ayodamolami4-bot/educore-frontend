/** AD26/AD27 — Promotion / completion previews and approval. */
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';

export const PromotionModel = {
  async previews(query) {
    return api.get(endpoints.promotion.previews, null, query);
  },

  async createPreview(body) {
    return api.post(endpoints.promotion.previews, null, body);
  },

  /** Backend computes who is promoted/repeating/graduating from official marks. */
  async previewById(previewId) {
    return api.get(endpoints.promotion.previewById, { previewId });
  },

  /** Save per-student decisions (promote / repeat / graduate) before confirming. */
  async saveDecisions(previewId, body) {
    return api.put(endpoints.promotion.decisions, { previewId }, body);
  },

  async validate(previewId) {
    return api.post(endpoints.promotion.validate, { previewId });
  },

  /** Confirm is final: classes and graduation status change for the next session. */
  async confirm(previewId) {
    return api.post(endpoints.promotion.confirm, { previewId });
  },
};

export default PromotionModel;
