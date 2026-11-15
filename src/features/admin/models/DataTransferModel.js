/** AD33 — Imports (CSV/Excel batches) and exports. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

export const DataTransferModel = {
  /** Column template for an import type (students, guardians, fees...). */
  async template(importType) {
    return api.get(endpoints.imports.template, { importType });
  },

  async batches(query) {
    return normalizePage(await api.get(endpoints.imports.batches, null, query));
  },

  async createBatch(body) {
    return api.post(endpoints.imports.batches, null, body);
  },

  async batchById(batchId) {
    return api.get(endpoints.imports.batchById, { batchId });
  },

  async saveMapping(batchId, body) {
    return api.put(endpoints.imports.mapping, { batchId }, body);
  },

  /** Dry-run: backend returns per-row problems without writing anything. */
  async validateBatch(batchId) {
    return api.post(endpoints.imports.validate, { batchId });
  },

  async rows(batchId, query) {
    return normalizePage(await api.get(endpoints.imports.rows, { batchId }, query));
  },

  async approveOpeningBalances(batchId, body) {
    return api.post(endpoints.imports.openingBalanceApproval, { batchId }, body);
  },

  /** Commit the import. */
  async confirmBatch(batchId) {
    return api.post(endpoints.imports.confirm, { batchId });
  },

  async retryFailed(batchId) {
    return api.post(endpoints.imports.retryFailed, { batchId });
  },

  async export(body) {
    return api.post(endpoints.exports, null, body);
  },
};

export default DataTransferModel;
