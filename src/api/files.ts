import type { ApiClient } from './client';
import { schoolPath } from './client';
import type { PrivateFile } from './contracts';
/** Role-specific pickers supply FormData; native file selection stays in the feature. */
export class FileApi {
  constructor(private client: ApiClient) {}
  upload(schoolId: string, form: FormData, idempotencyKey: string) {
    return this.client.request<PrivateFile>(schoolPath(schoolId, '/files'), {
      method: 'POST',
      body: form,
      idempotencyKey,
    });
  }
  status(schoolId: string, fileId: string) {
    return this.client.request<PrivateFile>(
      schoolPath(schoolId, `/files/${encodeURIComponent(fileId)}`),
    );
  }
  download(schoolId: string, fileId: string, signal?: AbortSignal) {
    return this.client.download(
      schoolPath(schoolId, `/files/${encodeURIComponent(fileId)}/content`),
      signal,
    );
  }
}
