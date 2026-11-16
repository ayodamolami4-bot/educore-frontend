/**
 * AD30 — One private conversation (View). The message history with a
 * separator line between rows, then the reply box. Reached from AD29 by
 * tapping a conversation in the inbox.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import StatusBadge from '../components/StatusBadge';
import { LoadingView, EmptyState, ErrorState } from '../components/FeedbackViews';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { ConversationPresenter } from '../../presenters/ConversationPresenter';
import { MessagesModel } from '../../models';
import { colors, typography, spacing } from '../theme';

export default function ConversationView({ route, navigation: _navigation }) {
  const [presenter] = useState(() => new ConversationPresenter(MessagesModel));
  const [state, setState] = useState(presenter.initialState);
  const [replyText, setReplyText] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const conversationId = route.params?.conversationId;

  useEffect(() => {
    presenter.attach(setState);
    if (conversationId) presenter.load(conversationId);
    return () => presenter.detach();
  }, [presenter, conversationId]);

  const c = state.conversation;
  const isClosed = Boolean(c && c.closed);

  if (!conversationId) {
    return (
      <AdminScaffold eyebrow="Messages" title="Conversation">
        <EmptyState
          title="No conversation selected"
          hint="Open a thread from School messages, or start one with the New message button there."
        />
      </AdminScaffold>
    );
  }

  return (
    <AdminScaffold
      eyebrow="Messages"
      title={c ? c.title : 'Conversation'}
      subtitle={c ? `With ${c.participantLabel}` : undefined}
    >
      {state.status === 'loading' ? <LoadingView label="Loading the conversation…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' ? (
        <View>
          {isClosed ? (
            <View style={styles.closedBanner}>
              <StatusBadge label="Closed" tone="muted" />
              <Text style={styles.closedHint}>
                This thread is closed — the backend does not permit reopening it.
              </Text>
            </View>
          ) : null}
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}

          {state.messages.length === 0 ? (
            <Text style={styles.empty}>
              No messages yet — {isClosed ? 'reopen the thread and ' : ''}write the first one below.
            </Text>
          ) : (
            state.messages.map((m) => (
              <View key={m.id} style={styles.messageRow}>
                <Text style={styles.author}>{m.author}</Text>
                <Text style={styles.messageText}>{m.text}</Text>
                <Text style={styles.time}>{m.at}</Text>
              </View>
            ))
          )}

          {state.errorText && state.replyFailed ? (
            <Text style={styles.error}>{state.errorText}</Text>
          ) : null}
          {!isClosed ? (
            <>
              <TextInput
                style={styles.input}
                multiline
                placeholder="Write a message…"
                placeholderTextColor={colors.muted}
                value={replyText}
                onChangeText={setReplyText}
              />
              <View style={styles.sendBtn}>
                <PrimaryButton
                  label={state.sending ? 'Sending…' : 'Send message'}
                  disabled={!replyText.trim() || state.sending || state.savingThread}
                  onPress={async () => {
                    const sent = await presenter.onSend(replyText);
                    if (sent) setReplyText('');
                  }}
                />
              </View>
            </>
          ) : null}

          {!isClosed ? (
            <View style={styles.threadActions}>
              <Text style={styles.hint}>Closure reason (required for the audit record)</Text>
              <TextInput
                style={styles.input}
                value={closeReason}
                onChangeText={setCloseReason}
                placeholder="Explain why this conversation is being closed"
                placeholderTextColor={colors.muted}
                editable={!state.savingThread}
                maxLength={500}
              />
              <SecondaryButton
                label={state.savingThread ? 'Closing…' : 'Close conversation'}
                disabled={state.savingThread || closeReason.trim().length < 5}
                onPress={async () => {
                  const closed = await presenter.closeConversation(closeReason);
                  if (closed) setCloseReason('');
                }}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  messageRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  author: { ...typography.label, color: colors.primary, marginBottom: 2 },
  messageText: { ...typography.body },
  time: { ...typography.label, color: colors.muted, marginTop: 2 },
  empty: { ...typography.body, color: colors.muted, marginTop: spacing.sm },
  error: { ...typography.label, color: '#a33a2a', marginBottom: spacing.sm },
  notice: { ...typography.label, color: colors.primary, marginBottom: spacing.sm },
  closedBanner: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  closedHint: { ...typography.label, color: colors.muted },
  hint: { ...typography.label, color: colors.muted, marginTop: spacing.sm },
  sendBtn: { marginTop: spacing.md },
  threadActions: { marginTop: spacing.md },
  input: {
    ...typography.input,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
    marginTop: spacing.md,
  },
});
