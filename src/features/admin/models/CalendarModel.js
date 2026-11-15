/** AD11 — School calendar, sessions/school days, calendar drafts with validation. */
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';

export const CalendarModel = {
  async sessions() {
    return api.get(endpoints.calendar.sessions);
  },

  async createSession(body) {
    return api.post(endpoints.calendar.sessions, null, body);
  },

  async updateSession(sessionId, body) {
    return api.patch(endpoints.calendar.sessionById, { sessionId }, body);
  },

  async activateSession(sessionId) {
    return api.post(endpoints.calendar.activateSession, { sessionId });
  },

  async calendar() {
    return api.get(endpoints.calendar.calendar);
  },

  /** Add a key date ("Science fair", mid-term break…). */
  async addKeyDate(body) {
    return api.post(endpoints.calendar.events, null, body);
  },

  /** Add an activity to "Today at school". */
  async addTodayItem(body) {
    return api.post(endpoints.calendar.today, null, body);
  },

  async drafts() {
    return api.get(endpoints.calendar.drafts);
  },

  async createDraft(body) {
    return api.post(endpoints.calendar.drafts, null, body);
  },

  async draftById(draftId) {
    return api.get(endpoints.calendar.draftById, { draftId });
  },

  async saveDraft(draftId, body) {
    return api.put(endpoints.calendar.draftById, { draftId }, body);
  },

  /** Backend returns validation issues; the Presenter surfaces them inline. */
  async validateDraft(draftId) {
    return api.post(endpoints.calendar.validateDraft, { draftId });
  },

  async publishDraft(draftId) {
    return api.post(endpoints.calendar.publishDraft, { draftId });
  },
};

export default CalendarModel;
