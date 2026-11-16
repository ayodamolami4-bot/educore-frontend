/** AD18 — Fixed grading policy and assessment-cycle approvals. */
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';

const cycleView = (raw = {}) => ({
  ...raw,
  id: raw.id,
  termId: raw.termId ?? raw.term_id,
  classId: raw.classId ?? raw.class_id,
  state: raw.state,
  version: Number(raw.version ?? 0),
  revision: raw.revision ?? 1,
  opensAt: raw.opensAt ?? raw.opens_at ?? null,
  closesAt: raw.closesAt ?? raw.closes_at ?? null,
  policyApprovedAt: raw.policyApprovedAt ?? raw.policy_approved_at ?? null,
  policyApprovedBy: raw.policyApprovedBy ?? raw.policy_approved_by ?? null,
  sessionId: raw.sessionId ?? raw.session_id ?? null,
  sessionName: raw.sessionName ?? raw.session_name ?? null,
  termNumber: raw.number ?? raw.termNumber ?? null,
  termStartsOn: raw.starts_on ?? raw.startsOn ?? null,
  termEndsOn: raw.ends_on ?? raw.endsOn ?? null,
  level: raw.level ?? null,
  arm: raw.arm ?? null,
  classLabel: raw.classLabel ?? [raw.level, raw.arm].filter(Boolean).join(' '),
  policy: raw.policy ?? null,
});

export const AssessmentModel = {
  async policies() {
    return api.get(endpoints.assessment.policies);
  },

  async cycles(query = {}) {
    const payload = await api.get(endpoints.assessment.cycles, null, query);
    return {
      ...payload,
      items: (payload.items ?? []).map(cycleView),
    };
  },

  async cycleById(cycleId) {
    return cycleView(await api.get(endpoints.assessment.cycleById, { cycleId }));
  },

  async createCycle(body) {
    return api.post(endpoints.assessment.cycles, null, body);
  },

  async approvePolicy(cycleId, body, version) {
    return api.post(
      'assessment-cycles/{cycleId}/approve-policy',
      { cycleId },
      {
        policyVersion: body.policyVersion,
        reason: String(body.reason ?? '').trim(),
      },
      { version },
    );
  },

  async openCycle(cycleId, body, version) {
    return api.post(
      'assessment-cycles/{cycleId}/open',
      { cycleId },
      {
        opensAt: body.opensAt,
        closesAt: body.closesAt,
        reason: String(body.reason ?? '').trim(),
      },
      { version },
    );
  },
};

export default AssessmentModel;
