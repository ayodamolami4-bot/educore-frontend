/** AD29/AD30 ,Messages: conversation recipients, threads, messages, read state. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

export const MessagesModel = {
  async recipients(query) {
    return api.get(endpoints.messages.recipients, null, query);
  },

  async conversations(query) {
    return normalizePage(await api.get(endpoints.messages.conversations, null, query));
  },

  async startConversation(body) {
    return api.post(endpoints.messages.conversations, null, body);
  },

  async conversationById(conversationId) {
    return api.get(endpoints.messages.conversationById, { conversationId });
  },

  async messages(conversationId, query) {
    return normalizePage(await api.get(endpoints.messages.messages, { conversationId }, query));
  },

  async sendMessage(conversationId, body) {
    return api.post(endpoints.messages.messages, { conversationId }, body);
  },

  async markRead(conversationId) {
    return api.put(endpoints.messages.markRead, { conversationId });
  },

  async closeConversation(conversationId) {
    return api.post(endpoints.messages.close, { conversationId });
  },

  async reopenConversation(conversationId) {
    return api.post(endpoints.messages.reopen, { conversationId });
  },
};

export default MessagesModel;
