/** AD29/AD30 — School conversations use the current child-linked thread contract. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

const itemsOf = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

function conversationView(raw) {
  return {
    ...raw,
    title: raw.subject ?? 'School conversation',
    participantLabel: raw.target === 'OFFICE'
      ? 'School Office'
      : raw.target === 'CLASS_TEACHER'
        ? 'Class teacher and linked guardian'
        : 'School conversation',
    closed: raw.state === 'CLOSED',
    messages: itemsOf(raw.messages).map((message) => ({
      id: message.id,
      author: message.authorId ?? 'School participant',
      text: message.body ?? '',
      at: message.createdAt ?? '',
      files: itemsOf(message.files),
    })),
  };
}

export const MessagesModel = {
  async recipients(query = {}) {
    if (!query.studentId) {
      throw new Error('Choose a student first so the server can return only eligible linked guardians.');
    }
    return api.get(endpoints.messages.recipients, null, { studentId: query.studentId });
  },

  async conversations(query) {
    const page = normalizePage(await api.get(endpoints.messages.conversations, null, query));
    return {
      ...page,
      items: page.items.map((item) => ({
        ...item,
        title: item.subject ?? 'School conversation',
        participantLabel: item.target === 'OFFICE'
          ? 'School Office'
          : item.target === 'CLASS_TEACHER'
            ? 'Class teacher and linked guardian'
            : 'School conversation',
        lastMessage: item.lastMessage ?? '',
        lastAt: item.createdAt ?? '',
        unread: Number(item.unread ?? 0),
      })),
    };
  },

  async startConversation(body) {
    if (!body?.studentId || !body?.guardianId || !body?.target) {
      throw new Error('Choose a student, eligible linked guardian and message destination.');
    }
    return conversationView(await api.post(endpoints.messages.conversations, null, {
      studentId: body.studentId,
      guardianId: body.guardianId,
      target: body.target,
      subject: body.subject,
      body: body.body,
      fileIds: body.fileIds ?? [],
    }));
  },

  async conversationById(conversationId) {
    return conversationView(await api.get(endpoints.messages.conversationById, { conversationId }));
  },

  async messages(conversationId) {
    const conversation = await this.conversationById(conversationId);
    return normalizePage({ items: conversation.messages, hasMore: false });
  },

  async sendMessage(conversation, body) {
    if (!conversation?.id || !Number.isSafeInteger(conversation.version) || conversation.version < 1) {
      throw new Error('Refresh the conversation before sending a reply.');
    }
    return conversationView(await api.post(
      endpoints.messages.messages,
      { conversationId: conversation.id },
      { body: String(body?.body ?? '').trim(), fileIds: body?.fileIds ?? [] },
      { version: conversation.version },
    ));
  },

  async markRead(conversationId) {
    return api.put(endpoints.messages.markRead, { conversationId });
  },

  async closeConversation(conversation, reason) {
    if (!conversation?.id || !Number.isSafeInteger(conversation.version) || conversation.version < 1) {
      throw new Error('Refresh the conversation before closing it.');
    }
    return conversationView(await api.post(
      endpoints.messages.close,
      { conversationId: conversation.id },
      { reason: String(reason ?? '').trim() },
      { version: conversation.version },
    ));
  },
};

export default MessagesModel;
