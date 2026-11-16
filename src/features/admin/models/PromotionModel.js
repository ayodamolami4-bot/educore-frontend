/** AD26/AD27 — Promotion preview, per-student decisions and final approval. */
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';

const VALID_DECISIONS = new Set(['PROMOTE', 'REPEAT', 'JSS_COMPLETE', 'GRADUATE']);

export const PromotionModel = {
  async previews() {
    return api.get(endpoints.promotion.previews);
  },

  async createPreview(body) {
    if (!body?.sourceSessionId || !body?.sourceClassId) {
      throw new Error('Choose the source academic session and class.');
    }
    return api.post(endpoints.promotion.previews, null, {
      sourceSessionId: body.sourceSessionId,
      targetSessionId: body.targetSessionId || null,
      sourceClassId: body.sourceClassId,
    });
  },

  async previewById(previewId) {
    return api.get(endpoints.promotion.previewById, { previewId });
  },

  async saveDecisions(preview) {
    if (!preview?.id || !Array.isArray(preview.rows) || preview.rows.length === 0) {
      throw new Error('Open a promotion preview before saving decisions.');
    }
    const unresolved = preview.rows.filter((row) => !VALID_DECISIONS.has(row.decisionCode));
    if (unresolved.length) {
      throw new Error(`${unresolved.length} student(s) still need an explicit promotion decision.`);
    }

    let latest = null;
    for (const row of preview.rows) {
      if (!Number.isSafeInteger(row.version) || row.version < 1) {
        throw new Error(`Refresh the preview before saving ${row.fullName ?? 'a student'}'s decision.`);
      }
      const reason = String(row.decisionReason ?? '').trim();
      if (reason.length < 5) {
        throw new Error(`Enter a reason of at least five characters for ${row.fullName ?? 'each student'}.`);
      }
      const needsTarget = !['GRADUATE'].includes(row.decisionCode);
      if (needsTarget && !row.targetClassId) {
        throw new Error(`Choose the target class for ${row.fullName ?? 'each student'}.`);
      }
      const targetClass = preview.targetClasses?.find((item) => item.id === row.targetClassId);
      const department = row.department || null;
      if (needsTarget && targetClass?.level?.startsWith('SSS') && !department) {
        throw new Error(`Choose an SSS department for ${row.fullName ?? 'each student'}.`);
      }
      const recommendation = String(row.recommendationCode ?? '').toUpperCase();
      const overridesRecommendation =
        recommendation !== 'PROMOTE' &&
        ['PROMOTE', 'JSS_COMPLETE', 'GRADUATE'].includes(row.decisionCode);
      const evidenceReference = String(row.evidenceReference ?? '').trim() || null;
      if (overridesRecommendation && (!evidenceReference || reason.length < 10)) {
        throw new Error(`An exception for ${row.fullName ?? 'this student'} needs documented evidence and a reason of at least ten characters.`);
      }

      latest = await api.put(
        endpoints.promotion.decisions,
        { previewId: preview.id, studentId: row.studentId },
        {
          decision: row.decisionCode,
          targetClassId: needsTarget ? row.targetClassId : null,
          department: needsTarget ? department : null,
          reason,
          evidenceReference,
        },
        { version: row.version },
      );
    }
    return latest ?? this.previewById(preview.id);
  },

  validate(preview) {
    if (!preview || !Array.isArray(preview.rows) || preview.rows.length === 0) {
      throw new Error('There are no students in this preview.');
    }
    const unresolved = preview.rows.filter((row) => !VALID_DECISIONS.has(row.decisionCode));
    if (unresolved.length) {
      throw new Error(`${unresolved.length} student(s) still need an explicit outcome before the preview can be confirmed.`);
    }
    const missingReason = preview.rows.find((row) => String(row.decisionReason ?? '').trim().length < 5);
    if (missingReason) {
      throw new Error(`Add a reason for ${missingReason.fullName ?? 'every student'} and save decisions before confirmation.`);
    }
    return { valid: true };
  },

  async confirm(preview) {
    if (!preview?.id || !Number.isSafeInteger(preview.version) || preview.version < 1) {
      throw new Error('Refresh the promotion preview before final approval.');
    }
    return api.post(
      endpoints.promotion.confirm,
      { previewId: preview.id },
      undefined,
      { version: preview.version },
    );
  },
};

export default PromotionModel;
