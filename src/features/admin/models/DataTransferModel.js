/** AD33 — Reviewed academic CSV imports. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

export const DataTransferModel = {
  async template(kind) {
    return api.get(endpoints.imports.template, { importType: String(kind).toUpperCase() });
  },

  async batches() {
    return normalizePage(await api.get(endpoints.imports.batches));
  },

  async createPreview(body) {
    return api.post(endpoints.imports.preview, null, {
      kind: String(body.kind).toUpperCase(),
      sessionId: body.sessionId,
      csv: body.csv,
      columnMapping: body.columnMapping ?? null,
    });
  },

  async batchById(batchId) {
    return api.get(endpoints.imports.batchById, { batchId });
  },

  async correctRow(batchId, rowId, body, version) {
    return api.put(
      endpoints.imports.correctRow,
      { batchId, rowId },
      {
        fields: body.fields,
        reason: body.reason,
      },
      { version },
    );
  },

  async confirmBatch(batchId, body, version) {
    return api.post(
      endpoints.imports.confirm,
      { batchId },
      {
        relationshipsVerified: Boolean(body.relationshipsVerified),
        duplicatesReviewed: Boolean(body.duplicatesReviewed),
        reason: String(body.reason ?? '').trim(),
      },
      { version },
    );
  },

  async downloadErrors(batchId) {
    return api.download(endpoints.imports.errorsCsv, { batchId });
  },
};

export default DataTransferModel;
