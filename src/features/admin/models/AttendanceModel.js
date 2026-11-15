/** AD16/AD17 — Attendance overview, registers, corrections, follow-ups, absence alerts. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

export const AttendanceModel = {
  /** AD01/AD16 — submitted vs missing registers, absent/late totals. */
  async overview(query) {
    return api.get(endpoints.attendance.overview, null, query);
  },

  async registers(query) {
    return normalizePage(await api.get(endpoints.attendance.registers, null, query));
  },

  async registerById(registerId) {
    return api.get(endpoints.attendance.registerById, { registerId });
  },

  /** AD17 — admin correction of a register row. */
  async correctRegister(registerId, body) {
    return api.post(endpoints.attendance.corrections, { registerId }, body);
  },

  /** Notify parents of absentees for a register. */
  async sendAbsenceAlerts(registerId, body) {
    return api.post(endpoints.attendance.absenceAlerts, { registerId }, body);
  },

  async correctionRequests(query) {
    return normalizePage(await api.get(endpoints.attendance.correctionRequests, null, query));
  },

  async declineCorrection(requestId, body) {
    return api.post(endpoints.attendance.declineCorrection, { requestId }, body);
  },

  async followUps(query) {
    return normalizePage(await api.get(endpoints.attendance.followUps, null, query));
  },

  async updateFollowUp(followUpId, body) {
    return api.patch(endpoints.attendance.followUpById, { followUpId }, body);
  },
};

export default AttendanceModel;
