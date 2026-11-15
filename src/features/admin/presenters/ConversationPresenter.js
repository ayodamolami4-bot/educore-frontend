/**
 * AD30 — One private conversation (Presenter). Loads the conversation and
 * its full message history, marks it read on open, and sends replies with
 * the same safe-submission pattern as the other screens (draft → sending →
 * done/failed) so nothing the office typed is lost on a failure.
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
      status: 'loading', // loading | content | error
      conversation: null,
      messages: [],
      sending: false,
      replyFailed: false,
      savingThread: false, // close/reopen in flight
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

  /** Walk every page so long threads are never truncated. */
  async _fetchMessages(conversationId) {
    const messages = [];
    let page = 1;
    let pages = 1;
    do {
      const result = await this.model.messages(conversationId, { page });
      messages.push(...(result.items || []));
      pages = result.pages || 1;
      page += 1;
    } while (page <= pages);
    return messages;
  }

  async load(conversationId) {
    if (!conversationId) return;
    this._conversationId = conversationId;
    this._setState({ status: 'loading', errorText: null });
    try {
      // markRead is best-effort: clearing the badge must not block the thread.
      try {
        await this.model.markRead(conversationId);
      } catch {
        /* unread count stays — the thread still opens */
      }
      const messages = await this._fetchMessages(conversationId);
      const conversation = await this.model.conversationById(conversationId);
      this._setState({ status: 'content', conversation, messages });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText:
          error instanceof ApiError ? error.message : 'Could not open this conversation.',
      });
    }
  }

  onRetry() {
    return this.load(this._conversationId);
  }

  async onSend(text) {
    const body = String(text ?? '').trim();
    if (!body || this.state.sending || !this._conversationId) return;
    // A closed thread refuses new replies — the View disables the box too, but
    // the server-side check is the real guard (so a stale screen cannot post).
    if (this.state.conversation && this.state.conversation.closed) {
      this._setState({
        replyFailed: true,
        errorText: 'This thread is closed — reopen it to send a new message.',
      });
      return;
    }
    this._setState({ sending: true, replyFailed: false });
    try {
      await this.model.sendMessage(this._conversationId, { text: body });
      const messages = await this._fetchMessages(this._conversationId);
      this._setState({ sending: false, messages, errorText: null });
    } catch (error) {
      this._setState({
        sending: false,
        replyFailed: true,
        errorText:
          error instanceof ApiError ? error.message : 'The message was not sent. Try again.',
      });
    }
  }

  /** Close (block) a thread — no further replies are accepted until it is
      reopened. The history stays intact. */
  async closeConversation() {
    if (!this._conversationId || this.state.savingThread) return;
    this._setState({ savingThread: true, errorText: null });
    try {
      const result = await this.model.closeConversation(this._conversationId);
      const conversation = (result && result.conversation) || {
        ...this.state.conversation,
        closed: true,
      };
      this._setState({ savingThread: false, conversation, notice: 'Thread closed — replies are blocked.' });
    } catch (error) {
      this._setState({
        savingThread: false,
        errorText: error instanceof ApiError ? error.message : 'The thread could not be closed.',
      });
    }
  }

  /** Reopen a closed thread so replies are accepted again. */
  async reopenConversation() {
    if (!this._conversationId || this.state.savingThread) return;
    this._setState({ savingThread: true, errorText: null });
    try {
      const result = await this.model.reopenConversation(this._conversationId);
      const conversation = (result && result.conversation) || {
        ...this.state.conversation,
        closed: false,
      };
      this._setState({ savingThread: false, conversation, notice: 'Thread reopened — replies are accepted again.' });
    } catch (error) {
      this._setState({
        savingThread: false,
        errorText: error instanceof ApiError ? error.message : 'The thread could not be reopened.',
      });
    }
  }
}

export default ConversationPresenter;
