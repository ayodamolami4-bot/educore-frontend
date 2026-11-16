/** AD14/AD15 — Term timetable plans and individual teaching-assignment lessons. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

export const TimetableModel = {
  /** The backend returns only active teaching assignments for this class. */
  async assignmentCandidates(query = {}) {
    return normalizePage(await api.get(
      endpoints.timetable.assignmentCandidates,
      null,
      { classId: query.classId },
    ));
  },

  async drafts(termId) {
    return normalizePage(await api.get(
      endpoints.timetable.drafts,
      null,
      { termId },
    ));
  },

  async createDraft(body) {
    return api.post(endpoints.timetable.drafts, null, {
      termId: body.termId,
      effectiveFrom: body.effectiveFrom,
      sourcePlanId: body.sourcePlanId ?? null,
    });
  },

  /** Review is the backend's read model for both draft editing and publication. */
  async draftById(draftId) {
    return api.get(endpoints.timetable.draftReview, { draftId });
  },

  async addLesson(draftId, body, version) {
    return api.post(
      endpoints.timetable.addLesson,
      { draftId },
      {
        assignmentId: body.assignmentId,
        weekday: body.weekday,
        start: body.start,
        durationMinutes: body.durationMinutes,
        room: body.room ?? '',
      },
      { version },
    );
  },

  async updateLesson(draftId, lessonId, body, version) {
    return api.put(
      endpoints.timetable.replaceLesson,
      { draftId, lessonId },
      {
        assignmentId: body.assignmentId,
        weekday: body.weekday,
        start: body.start,
        durationMinutes: body.durationMinutes,
        room: body.room ?? '',
      },
      { version },
    );
  },

  async removeLesson(draftId, lessonId, version) {
    return api.post(
      endpoints.timetable.removeLesson,
      { draftId, lessonId },
      undefined,
      { version },
    );
  },

  async reviewDraft(draftId) {
    return api.get(endpoints.timetable.draftReview, { draftId });
  },

  async publishDraft(draftId, version) {
    return api.post(
      endpoints.timetable.publishDraft,
      { draftId },
      undefined,
      { version },
    );
  },

  async published(query = {}) {
    return api.get(endpoints.timetable.published, null, {
      classId: query.classId,
      on: query.on,
    });
  },
};

export default TimetableModel;
