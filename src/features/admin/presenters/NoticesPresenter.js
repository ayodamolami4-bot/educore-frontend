/**
 * AD28 — School announcements. The backend accepts school, class or
 * department audiences and requires versioned publish/archive decisions.
 */
import { ApiError } from '../api/ApiError';

const itemsOf = (value) =>
  Array.isArray(value?.items) ? value.items : Array.isArray(value) ? value : [];

const classLabelOf = (item) =>
  [item?.level, item?.arm].filter(Boolean).join(' ') || 'Selected class';

export class NoticesPresenter {
  constructor(noticesModel, structureModel) {
    this.model = noticesModel;
    this.structureModel = structureModel;
    this._render = null;
    this._alive = false;
    this.initialState = {
      status: 'loading',
      notices: [],
      classes: [],
      errorText: null,
      composer: {
        state: 'draft',
        title: '',
        body: '',
        audience: 'SCHOOL',
        classId: '',
        department: '',
        errorText: null,
        validationErrors: {},
      },
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

  _setComposer(patch) {
    this._setState({ composer: { ...this.state.composer, ...patch } });
  }

  async load() {
    this._setState({ status: 'loading', errorText: null });
    try {
      const [result, classesPayload] = await Promise.all([
        this.model.list(),
        this.structureModel.classes(),
      ]);
      const classes = itemsOf(classesPayload).map((item) => ({
        ...item,
        classLabel: classLabelOf(item),
      }));
      const notices = result.items.map((notice) => {
        const selectedClass = classes.find((item) => item.id === notice.classId);
        return {
          ...notice,
          audienceLabel: notice.scope === 'SCHOOL'
            ? 'Everyone in the school'
            : notice.scope === 'DEPARTMENT'
              ? `${notice.department} · ${selectedClass?.classLabel ?? 'Selected class'}`
              : selectedClass?.classLabel ?? 'Selected class',
        };
      });
      this._setState({
        status: notices.length === 0 ? 'empty' : 'content',
        notices,
        classes,
        errorText: null,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load notices and class audiences.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  onPullToRefresh() {
    return this.load();
  }

  onComposerChange(field, value) {
    const patch = { [field]: value };
    if (field === 'audience') {
      patch.classId = '';
      patch.department = '';
    }
    if (field === 'classId') patch.department = '';
    this._setComposer(patch);
  }

  validateComposer() {
    const { composer } = this.state;
    const errors = {};
    if (!composer.title.trim()) errors.title = 'Give the notice a title.';
    if (!composer.body.trim()) errors.body = 'Write the message families will read.';
    if (!['SCHOOL', 'CLASS', 'DEPARTMENT'].includes(composer.audience)) {
      errors.audience = 'Choose a supported school, class or department audience.';
    }
    if (['CLASS', 'DEPARTMENT'].includes(composer.audience) && !composer.classId) {
      errors.classId = 'Choose the class that should receive this notice.';
    }
    if (composer.audience === 'DEPARTMENT' && !composer.department) {
      errors.department = 'Choose Science, Arts or Commercial.';
    }
    const chosenClass = this.state.classes.find((item) => item.id === composer.classId);
    if (composer.audience === 'DEPARTMENT' && chosenClass && !['SSS1', 'SSS2', 'SSS3'].includes(chosenClass.level)) {
      errors.department = 'Department notices are only available for SSS classes.';
    }
    return errors;
  }

  async submitNotice() {
    const { composer } = this.state;
    if (composer.state === 'saving') return;
    const validationErrors = this.validateComposer();
    if (Object.keys(validationErrors).length > 0) {
      this._setComposer({ validationErrors });
      return;
    }

    this._setComposer({ state: 'saving', validationErrors: {}, errorText: null });
    try {
      await this.model.create({
        title: composer.title.trim(),
        body: composer.body.trim(),
        scope: composer.audience,
        classId: composer.classId || null,
        department: composer.department || null,
        fileIds: [],
      });
      this._setComposer({ state: 'accepted' });
      await this.load();
    } catch (error) {
      this._setComposer({
        state: 'failed',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The notice was not accepted.',
      });
    }
  }

  resetComposer() {
    this._setComposer({
      state: 'draft',
      title: '',
      body: '',
      audience: 'SCHOOL',
      classId: '',
      department: '',
      errorText: null,
      validationErrors: {},
    });
  }

  async publishNotice(notice) {
    await this._rowAction(() => this.model.publish(notice));
  }

  async archiveNotice(notice, reason) {
    await this._rowAction(() => this.model.archive(notice, reason));
  }

  async _rowAction(action) {
    try {
      await action();
      await this.load();
    } catch (error) {
      this._setState({
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The notice action was not accepted. Refresh and try again.',
      });
    }
  }
}

export default NoticesPresenter;
