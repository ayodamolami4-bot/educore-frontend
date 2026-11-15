/** AD12/AD13 — Classes, subjects, rooms, curriculum drafts, class workspace/roster. */
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';

export const AcademicStructureModel = {
  async classes() {
    return api.get(endpoints.academics.classes);
  },

  async createClass(body) {
    return api.post(endpoints.academics.classes, null, body);
  },

  async updateClass(classId, body) {
    return api.patch(endpoints.academics.classById, { classId }, body);
  },

  async classWorkspace(classId) {
    return api.get(endpoints.academics.classWorkspace, { classId });
  },

  async classRoster(classId) {
    return api.get(endpoints.academics.classRoster, { classId });
  },

  async classCurriculum(classId) {
    return api.get(endpoints.academics.classCurriculum, { classId });
  },

  async createCurriculumDraft(classId, body) {
    return api.post(endpoints.academics.curriculumDrafts, { classId }, body);
  },

  async subjects() {
    return api.get(endpoints.academics.subjects);
  },

  async createSubject(body) {
    return api.post(endpoints.academics.subjects, null, body);
  },

  async updateSubject(subjectId, body) {
    return api.patch(endpoints.academics.subjectById, { subjectId }, body);
  },

  async rooms() {
    return api.get(endpoints.academics.rooms);
  },

  async createRoom(body) {
    return api.post(endpoints.academics.rooms, null, body);
  },

  async updateRoom(roomId, body) {
    return api.patch(endpoints.academics.roomById, { roomId }, body);
  },

  async curriculumDraftById(draftId) {
    return api.get(endpoints.academics.curriculumDraftById, { draftId });
  },

  async saveCurriculumDraft(draftId, body) {
    return api.put(endpoints.academics.curriculumDraftById, { draftId }, body);
  },

  async publishCurriculumDraft(draftId) {
    return api.post(endpoints.academics.publishCurriculumDraft, { draftId });
  },
};

export default AcademicStructureModel;
