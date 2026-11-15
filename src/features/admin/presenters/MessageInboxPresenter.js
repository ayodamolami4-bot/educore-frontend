/**
 * AD29 — School messages (the notifications inbox). One row per conversation:
 * guardians, staff groups, broadcast threads. Unread counts come from the
 * backend's read state.
 *
 * The "new message" flow now matches how the office actually addresses
 * people: the two whole-school broadcasts, an individual picker (1+ teachers
 * AND guardians, with a Send-to-all shortcut), and EVERY live class — tap a
 * class and choose its teachers, its guardians, or both.
 */
import { ApiError } from '../api/ApiError';

export class MessageInboxPresenter {
  constructor(messagesModel) {
    this.model = messagesModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | empty | error
      conversations: [],
      recipients: [], // step-1 audiences: broadcasts, the individual picker, every class
      people: [], // step-2 options or the individual people list
      starting: false,
      errorText: null,
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
    this._setState({ status: 'loading', errorText: null });
    try {
      const result = await this.model.conversations({ page: 1 });
      this._setState({
        status: result.items.length === 0 ? 'empty' : 'content',
        conversations: result.items,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the messages.',
      });
    }
  }

  /** Fetch the step-1 audience list, then hand control back to the View. */
  async loadRecipients(onReady) {
    if (this.state.recipients.length > 0) {
      if (onReady) onReady();
      return;
    }
    try {
      const result = await this.model.recipients({ page: 1 });
      const items = Array.isArray(result) ? result : result.items || [];
      this._setState({ recipients: items });
      if (onReady) onReady();
    } catch {
      this._setState({ errorText: 'Could not load the recipient list — try again.' });
    }
  }

  /** New message step 2: the options or people inside the step-1 choice. */
  async loadPeople(group, onReady) {
    try {
      const result = await this.model.recipients({ page: 1, group });
      const items = Array.isArray(result) ? result : result.items || [];
      this._setState({ people: items });
      if (onReady) onReady();
    } catch {
      this._setState({ errorText: 'Could not load that recipient list — try again.' });
    }
  }

  /** One conversation addressed to a whole group (broadcast) or a person. */
  async onStartConversation(recipientValue, title) {
    if (this.state.starting || !recipientValue) return;
    this._setState({ starting: true });
    try {
      const conversation = await this.model.startConversation({
        recipient: recipientValue,
        title: title || recipientValue,
      });
      await this.load();
      if (this._navigation && conversation && conversation.id) {
        this._navigation.navigate('Conversation', { conversationId: conversation.id });
      }
    } catch (error) {
      this._setState({
        errorText:
          error instanceof ApiError ? error.message : 'The conversation could not be started.',
      });
    } finally {
      this._setState({ starting: false });
    }
  }

  /** The individual picker: 1+ selected people become ONE group thread.
      `allValues` + `allTitle` power the "Send to all" shortcut. */
  async startForSelection(values, allValues, allTitle) {
    const chosen = Array.isArray(values) ? values.filter(Boolean) : [];
    const sendAll = Array.isArray(allValues) && allValues.length > chosen.length;
    const list = sendAll ? allValues : chosen;
    if (!list.length) {
      this._setState({ errorText: 'Tick at least one person — or use Send to all.' });
      return;
    }
    const title = sendAll
      ? allTitle
      : list.length === 1
        ? String(list[0]).split(':').slice(1).join(':') || 'New message'
        : `Group message · ${list.length} recipients`;
    const recipient = list.length === 1 ? String(list[0]) : `multi:${list.join('|')}`;
    await this.onStartConversation(recipient, title);
  }

  onRetry() {
    return this.load();
  }

  onOpenConversation(conversation) {
    if (this._navigation) {
      this._navigation.navigate('Conversation', { conversationId: conversation.id });
    }
  }
}

export default MessageInboxPresenter;
