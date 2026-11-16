/**
 * AD26 — Prepare and review a promotion preview from published school records.
 * Decisions are local until saved individually through the versioned API.
 */
import { ApiError } from '../api/ApiError';

const itemsOf = (value) =>
  Array.isArray(value?.items) ? value.items : Array.isArray(value) ? value : [];

const decisionLabel = (value) => ({
  PROMOTE: 'Promote',
  REPEAT: 'Repeat',
  JSS_COMPLETE: 'Complete JSS',
  GRADUATE: 'Graduate',
  REVIEW: 'Review required',
}[String(value ?? '').toUpperCase()] ?? 'Needs decision');

const classLabelOf = (item) =>
  [item?.level, item?.arm].filter(Boolean).join(' ') || 'School class';

function previewView(raw, classes, sessions) {
  const sourceClass = classes.find((item) => item.id === raw.sourceClassId) ?? {};
  const sourceSession = sessions.find((item) => item.id === raw.sourceSessionId) ?? {};
  const targetClasses = classes.filter((item) => item.sessionId === raw.targetSessionId);
  const rows = itemsOf(raw.rows).map((row) => {
    const recommendation = row.recommendation ?? {};
    const recommendationCode = String(recommendation.recommendation ?? '').toUpperCase();
    const decisionCode = row.decision ? String(row.decision).toUpperCase() : null;
    const targetClass = classes.find((item) => item.id === row.targetClassId);
    return {
      ...row,
      fullName: row.studentName ?? 'Student record',
      recommendationCode,
      recommendationReasons: itemsOf(recommendation.reasons),
      average: recommendation.annualMean ?? null,
      passPercent: recommendation.passPercent ?? null,
      decisionCode,
      decision: decisionLabel(decisionCode),
      decisionReason: row.reason ?? '',
      evidenceReference: row.evidenceReference ?? '',
      department: row.department ?? '',
      targetClassLabel: targetClass ? classLabelOf(targetClass) : '',
    };
  });
  const countBy = (codes) => rows.filter((row) =>
    codes.includes(row.decisionCode ?? row.recommendationCode)
  ).length;

  return {
    ...raw,
    classLabel: classLabelOf(sourceClass),
    sessionLabel: sourceSession.name ?? 'Academic session',
    sourceLevel: raw.sourceLevel ?? sourceClass.level ?? '',
    status: String(raw.state).toUpperCase() === 'CONFIRMED' ? 'Confirmed' : 'Preview',
    rows,
    targetClasses,
    summary: {
      promote: countBy(['PROMOTE', 'JSS_COMPLETE']),
      repeat: countBy(['REPEAT']),
      graduate: countBy(['GRADUATE']),
      review: countBy(['REVIEW']),
    },
  };
}

export class PromotionPreviewPresenter {
  constructor(promotionModel, structureModel, calendarModel) {
    this.model = promotionModel;
    this.structureModel = structureModel;
    this.calendarModel = calendarModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading',
      previews: [],
      classOptions: [],
      sessions: [],
      preview: null,
      notice: null,
      errorText: null,
      saving: false,
    };
    this.state = this.initialState;
  }

  attach(render, navigation) {
    this._render = render;
    this._navigation = navigation;
    this._alive = true;
  }

  detach() {
    this._alive = false;
  }

  _setState(patch) {
    if (!this._alive || !this._render) return;
    this.state = { ...this.state, ...patch };
    this._render(this.state);
  }

  _view(raw) {
    return previewView(raw, this.state.classOptions, this.state.sessions);
  }

  async load() {
    this._setState({ status: 'loading', errorText: null });
    try {
      const [page, classesPayload, sessionOptions] = await Promise.all([
        this.model.previews(),
        this.structureModel.classes(),
        this.calendarModel.sessionOptions(),
      ]);
      const classes = itemsOf(classesPayload).map((item) => ({
        ...item,
        classLabel: classLabelOf(item),
      }));
      const sessions = itemsOf(sessionOptions.sessions);
      const rawPreviews = itemsOf(page);
      const details = await Promise.all(
        rawPreviews.map((item) => this.model.previewById(item.id)),
      );
      this._setState({
        status: 'content',
        previews: details.map((item) => this._view(item)),
        classOptions: classes,
        sessions,
        errorText: null,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load promotion sessions, classes and previews.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  async buildPreview(selection) {
    if (this.state.saving) return;
    if (!selection?.sourceSessionId || !selection?.sourceClassId) {
      this._setState({ errorText: 'Choose the source session and class first.' });
      return;
    }
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      const result = await this.model.createPreview(selection);
      const preview = this._view(result);
      this._setState({
        saving: false,
        previews: [preview, ...this.state.previews.filter((item) => item.id !== preview.id)],
        preview,
        notice: `${preview.classLabel} preview computed from published reports. Review each student and save explicit outcomes.`,
      });
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The preview could not be computed.',
      });
    }
  }

  async open(previewId) {
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      const result = await this.model.previewById(previewId);
      const preview = this._view(result);
      this._setState({ saving: false, preview });
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not open the preview.',
      });
    }
  }

  closePreview() {
    this._setState({ preview: null, notice: null, errorText: null });
  }

  setDecision(studentId, decisionCode, details = {}) {
    const preview = this.state.preview;
    if (!preview || preview.status === 'Confirmed') return;
    const rows = preview.rows.map((row) =>
      String(row.studentId) === String(studentId)
        ? {
            ...row,
            decisionCode,
            decision: decisionLabel(decisionCode),
            decisionReason: String(details.reason ?? '').trim(),
            targetClassId: details.targetClassId ?? null,
            department: details.department ?? '',
            evidenceReference: String(details.evidenceReference ?? '').trim(),
            targetClassLabel:
              preview.targetClasses.find((item) => item.id === details.targetClassId)?.classLabel ?? '',
          }
        : row,
    );
    const countBy = (codes) => rows.filter((row) => codes.includes(row.decisionCode)).length;
    this._setState({
      preview: {
        ...preview,
        rows,
        summary: {
          promote: countBy(['PROMOTE', 'JSS_COMPLETE']),
          repeat: countBy(['REPEAT']),
          graduate: countBy(['GRADUATE']),
          review: rows.length - countBy(['PROMOTE', 'JSS_COMPLETE', 'REPEAT', 'GRADUATE']),
        },
      },
    });
  }

  async saveDecisions() {
    const preview = this.state.preview;
    if (!preview || this.state.saving) return;
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      const result = await this.model.saveDecisions(preview);
      const updated = this._view(result);
      this._setState({
        saving: false,
        preview: updated,
        previews: this.state.previews.map((item) => item.id === updated.id ? updated : item),
        notice: `Reviewed outcomes saved for ${updated.classLabel}. Students do not move until the Principal confirms this batch.`,
      });
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The decisions were not saved.',
      });
    }
  }
}

export default PromotionPreviewPresenter;
