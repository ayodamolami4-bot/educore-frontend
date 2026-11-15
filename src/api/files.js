import { schoolPath } from './client';
/** Role-specific pickers supply FormData; native file selection stays in the feature. */
export class FileApi {
  client;
  constructor(client) {
    this.client = client;
  }
  upload(schoolId, form, idempotencyKey) {
    return this.client.request(schoolPath(schoolId, '/files'), {
      method: 'POST',
      body: form,
      idempotencyKey,
    });
  }
  status(schoolId, fileId) {
    return this.client.request(schoolPath(schoolId, `/files/${encodeURIComponent(fileId)}`));
  }
  download(schoolId, fileId, signal) {
    return this.client.download(
      schoolPath(schoolId, `/files/${encodeURIComponent(fileId)}/content`),
      signal,
    );
  }
}
