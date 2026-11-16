/**
 * AD30 — Child-linked school conversation. The thread read returns its
 * complete message history; replies and closure are versioned backend actions.
 */
import { ApiError } from '../api/ApiError';

export class ConversationPresenter {
  constructor(messagesModel) {
    this.model = messagesModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this._conversationId = null;
    this.initialState = {
      status: 'loading',
      conversation: null,
      messages: [],
      sending: false,
      replyFailed: false,
      savingThread: false,
      notice: null,
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

  async load(conversationId) {
    if (!conversationId) return;
    this._conversationId = conversationId;
    this._setState({ status: 'loading', errorText: null, notice: null });
    try {
      try {
        await this.model.markRead(conversationId);
      } catch {
        // Opening a permitted thread should not depend on clearing its badge.
      }
      const conversation = await this.model.conversationById(conversationId);
      this._setState({
        status: 'content',
        conversation,
        messages: conversation.messages ?? [],
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not open this conversation.',
      });
    }
  }

  onRetry() {
    return this.load(this._conversationId);
  }

  async onSend(text) {
    const body = String(text ?? '').trim();
    if (!body || this.state.sending || !this._conversationId) return false;
    const conversation = this.state.conversation;
    if (!conversation || conversation.state !== 'OPEN') {
      this._setState({
        replyFailed: true,
        errorText: 'This conversation is closed. A closed thread cannot receive replies.',
      });
      return false;
    }

    this._setState({ sending: true, replyFailed: false, errorText: null, notice: null });
    try {
      const updated = await this.model.sendMessage(conversation, { body });
      this._setState({
        sending: false,
        conversation: updated,
        messages: updated.messages ?? [],
        errorText: null,
        notice: 'Message sent.',
      });
      return true;
    } catch (error) {
      this._setState({
        sending: false,
        replyFailed: true,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The message was not sent. Your text is still available to retry.',
      });
      return false;
    }
  }

  async closeConversation(reason) {
    if (!this._conversationId || this.state.savingThread) return false;
    const trimmed = String(reason ?? '').trim();
    if (trimmed.length < 5) {
      this._setState({ errorText: 'Enter a closure reason of at least five characters.' });
      return false;
    }
    const conversation = this.state.conversation;
    if (!conversation || conversation.state !== 'OPEN') {
      this._setState({ errorText: 'This conversation is already closed.' });
      return false;
    }

    this._setState({ savingThread: true, errorText: null, notice: null });
    try {
      const updated = await this.model.closeConversation(conversation, trimmed);
      this._setState({
        savingThread: false,
        conversation: updated,
        messages: updated.messages ?? this.state.messages,
        notice: 'Conversation closed. Replies are now blocked.',
      });
      return true;
    } catch (error) {
      this._setState({
        savingThread: false,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The conversation could not be closed.',
      });
      return false;
    }
  }
}

export default ConversationPresenter;
