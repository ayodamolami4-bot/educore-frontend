/** Legacy AD34 adapter backed by the role-aware audit stream model. */
import { AuditTrailModel } from './AuditTrailModel';

export const AuditModel = {
  async events(query) {
    return AuditTrailModel.list(query);
  },

  async eventById(eventId) {
    const page = await AuditTrailModel.list({ limit: 100 });
    const event = page.items.find((item) => String(item.id) === String(eventId));
    if (!event) throw new Error('This history entry is not in the currently loaded audit window.');
    return event;
  },
};

export default AuditModel;
