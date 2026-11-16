/**
 * AD29 — Office/Principal child-linked conversation workflow.
 * The backend does not support broadcasts or arbitrary recipient groups:
 * every thread belongs to one student, one eligible guardian and one target.
 */
import { ApiError } from '../api/ApiError';

const itemsOf = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const labelOfStudent = (student) => {
  const enrolments = itemsOf(student.enrolments);
  const placement = enrolments.find((item) => !item.endsOn) ?? enrolments[0] ?? {};
  const classLabel = [placement.level, placement.arm].filter(Boolean).join(' ') ||
    placement.classLabel || student.classLabel || '';
  return {
    id: student.id,
    name: student.fullName ?? student.name ?? 'Student record',
    classLabel,
    status: String(student.status ?? '').toUpperCase(),
  };
};

export class MessageInboxPresenter {
  constructor(messagesModel, studentModel, context) {
    this.model = messagesModel;
    this.students = studentModel;
    this.context = context ?? {};
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading',
      conversations: [],
      students: [],
      guardians: [],
      selectedStudentId: '',
      selectedGuardianId: '',
      selectedTarget: '',
      targets: [],
      contacts: null,
      starting: false,
      errorText: null,
      notice: null,
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

  async load() {
    if (!['PRINCIPAL', 'SCHOOL_OFFICE'].includes(this.context.role)) {
      this._setState({
        status: 'error',
        errorText: 'School conversations are available to Principal and School Office roles only.',
      });
      return;
    }
    this._setState({ status: 'loading', errorText: null });
    try {
      const [result, students] = await Promise.all([
        this.model.conversations({ limit: 30 }),
        this.students.listAll(),
      ]);
      const studentIndex = new Map(
        students.map((student) => {
          const view = labelOfStudent(student);
          return [view.id, view];
        }),
      );
      const conversations = result.items.map((item) => {
        const student = studentIndex.get(item.studentId);
        return {
          ...item,
          studentLabel: student
            ? student.name + (student.classLabel ? ' · ' + student.classLabel : '')
            : 'Linked student record',
          stateLabel: item.state === 'OPEN' ? 'Open' : item.state,
        };
      });
      this._setState({
        status: conversations.length === 0 ? 'empty' : 'content',
        conversations,
        students: [...studentIndex.values()].filter((item) =>
          !['WITHDRAWN', 'GRADUATED'].includes(item.status)
        ),
        errorText: null,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load school conversations.',
      });
    }
  }

  async loadRecipients(onReady) {
    if (this.state.students.length > 0) {
      if (onReady) onReady();
      return;
    }
    try {
      const students = await this.students.listAll();
      const options = students.map(labelOfStudent).filter((item) =>
        !['WITHDRAWN', 'GRADUATED'].includes(item.status)
      );
      this._setState({ students: options, errorText: null });
      if (onReady) onReady();
      if (options.length === 0) {
        this._setState({ notice: 'No active student records are available for a new conversation.' });
      }
    } catch (error) {
      this._setState({
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load the student list.',
      });
    }
  }

  async loadPeople(studentId) {
    if (!studentId) return;
    this._setState({
      selectedStudentId: studentId,
      selectedGuardianId: '',
      guardians: [],
      contacts: null,
      selectedTarget: '',
      errorText: null,
      notice: null,
    });
    try {
      const contacts = await this.model.recipients({ studentId });
      const guardians = itemsOf(contacts.guardians)
        .filter((guardian) => guardian.learningAccess)
        .map((guardian, index) => ({
          id: guardian.id,
          label: guardian.primaryContact
            ? 'Primary linked guardian'
            : 'Linked guardian ' + (index + 1),
          primaryContact: Boolean(guardian.primaryContact),
        }));
      const classTeacherAvailable = Boolean(contacts.classTeacherId);
      const targets = this.context.role === 'SCHOOL_OFFICE'
        ? [{ value: 'OFFICE', label: 'School Office' }]
        : [
            ...(classTeacherAvailable
              ? [{ value: 'CLASS_TEACHER', label: 'Current class teacher' }]
              : []),
            { value: 'OFFICE', label: 'School Office' },
          ];
      this._setState({
        contacts,
        guardians,
        selectedGuardianId: guardians[0]?.id ?? '',
        targets,
        selectedTarget: targets[0]?.value ?? '',
        notice: guardians.length === 0
          ? 'No linked guardian with learning access is recorded for this student.'
          : null,
      });
    } catch (error) {
      this._setState({
        contacts: null,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load this student’s authorised contacts.',
      });
    }
  }

  async onStartConversation({ subject, body }) {
    if (this.state.starting) return false;
    const student = this.state.students.find((item) => item.id === this.state.selectedStudentId);
    if (!student || !this.state.selectedGuardianId || !this.state.selectedTarget) {
      this._setState({ errorText: 'Choose a student, an eligible linked guardian and a destination.' });
      return false;
    }
    if (String(subject ?? '').trim().length < 3 || String(body ?? '').trim().length < 2) {
      this._setState({ errorText: 'Enter a subject and first message before starting the conversation.' });
      return false;
    }

    this._setState({ starting: true, errorText: null, notice: null });
    try {
      const conversation = await this.model.startConversation({
        studentId: student.id,
        guardianId: this.state.selectedGuardianId,
        target: this.state.selectedTarget,
        subject: String(subject).trim(),
        body: String(body).trim(),
        fileIds: [],
      });
      await this.load();
      if (this._navigation && conversation?.id) {
        this._navigation.navigate('Conversation', { conversationId: conversation.id });
      }
      return Boolean(conversation?.id);
    } catch (error) {
      this._setState({
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The conversation could not be started.',
      });
      return false;
    } finally {
      this._setState({ starting: false });
    }
  }

  onRetry() {
    return this.load();
  }

  onOpenConversation(conversation) {
    if (this._navigation && conversation?.id) {
      this._navigation.navigate('Conversation', { conversationId: conversation.id });
    }
  }
}

export default MessageInboxPresenter;
