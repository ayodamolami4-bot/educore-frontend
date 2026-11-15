/** AD20 — Reports catalogue (report cards and school reports) and exports. */
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';

export const ReportsModel = {
  async catalogue() {
    return api.get(endpoints.reports.catalogue);
  },

  /** One learner's report (AD04 links here too). */
  async learnerReport(studentId, reportId) {
    return api.get(endpoints.learnerReports.byId, { studentId, reportId });
  },

  /** Export rows the user may access; body carries the filter selection. */
  async export(body) {
    return api.post(endpoints.exports, null, body);
  },
};

export default ReportsModel;
