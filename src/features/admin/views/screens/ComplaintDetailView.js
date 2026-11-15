/**
 * AD32 — Complaint details and resolution (View). Case facts at the top,
 * the reply box and internal notes in the middle, the state-machine buttons
 * at the bottom. Closing asks twice (confirm alert) per the handoff.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import StatusBadge from '../components/StatusBadge';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { ComplaintDetailPresenter } from '../../presenters/ComplaintDetailPresenter';
import { ComplaintsModel } from '../../models';
import { colors, typography, spacing, statusTone } from '../theme';

export default function ComplaintDetailView({ route, navigation }) {
  const [presenter] = useState(() => new ComplaintDetailPresenter(ComplaintsModel));
  const [state, setState] = useState(presenter.initialState);
  const [replyText, setReplyText] = useState('');
  const [noteText, setNoteText] = useState('');
  const caseId = route.params?.caseId;
  const loadedOnce = useRef(false);

  useEffect(() => {
    presenter.attach(setState);
    if (caseId) presenter.load(caseId);
    // The case can change elsewhere (state moves, replies), so re-fetch on
    // every focus after the first.
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current && caseId) presenter.load(caseId);
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, caseId, navigation]);

  const c = state.complaint;

  const confirmClose = () => {
    Alert.alert('Close this case?', 'Closed cases stay in the history but stop counting as open.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Close case', style: 'destructive', onPress: () => presenter.onStateAction('close') },
    ]);
  };

  // State-machine refusals pop up instead of inline text.
  useActionErrorAlert(state.errorText);

  if (!caseId) {
    return (
      <AdminScaffold eyebrow="Complaint" title="Complaint details">
        <ErrorState
          message="Open a case from the complaints list — this page shows one complaint's full details."
          onRetry={null}
        />
      </AdminScaffold>
    );
  }

  return (
    <AdminScaffold
      eyebrow="Complaint"
      title={c ? c.subject : 'Complaint'}
      subtitle={c ? `${c.guardianName} · opened ${c.openedAt}` : undefined}
    >
      {state.status === 'loading' ? <LoadingView label="Loading the case…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' && c ? (
        <View>
          <View style={styles.badgeRow}>
            <StatusBadge label={c.status} tone={statusTone[c.status] || 'muted'} />
            <Text style={styles.owner}>Owner: {c.owner}</Text>
          </View>

          <Text style={styles.section}>What the guardian said</Text>
          <Text style={styles.body}>
            {c.detail || 'No detail recorded — see the office log.'}
          </Text>
          <Text style={styles.meta}>
            Student: {c.studentName || '—'} ({c.classLabel || '—'}) · Channel: {c.channel}
          </Text>

          <Text style={styles.section}>History</Text>
          {(c.history || []).map((h) => (
            <Text key={h.id} style={styles.line}>
              {h.at} · {h.text}
            </Text>
          ))}

          <Text style={styles.section}>Replies to the guardian</Text>
          {state.replies.length === 0 ? (
            <Text style={styles.muted}>No reply sent yet.</Text>
          ) : (
            state.replies.map((r) => (
              <Text key={r.id} style={styles.line}>
                {r.at} · {r.author}: {r.text}
              </Text>
            ))
          )}
          {c.status === 'Closed' ? (
            <Text style={styles.closedHint}>
              This case is closed — replies are blocked. Reopen it below to send a new reply.
            </Text>
          ) : (
            <>
              <TextInput
                style={styles.input}
                multiline
                placeholder="Write a reply…"
                placeholderTextColor={colors.muted}
                value={replyText}
                onChangeText={setReplyText}
              />
              <View style={styles.sendBtn}>
                <PrimaryButton
                  label={state.saving === 'reply' ? 'Sending…' : 'Send reply'}
                  disabled={!replyText.trim() || Boolean(state.saving)}
                  onPress={() => {
                    presenter.onReply(replyText);
                    setReplyText('');
                  }}
                />
              </View>
            </>
          )}

          <Text style={styles.section}>Internal notes</Text>
          <Text style={styles.hint}>Notes stay inside the office — guardians never see them.</Text>
          {state.notes.length === 0 ? (
            <Text style={styles.muted}>No internal notes yet.</Text>
          ) : (
            state.notes.map((n) => (
              <Text key={n.id} style={styles.line}>
                {n.at} · {n.author}: {n.text}
              </Text>
            ))
          )}
          <TextInput
            style={styles.input}
            multiline
            placeholder="Write an internal note…"
            placeholderTextColor={colors.muted}
            value={noteText}
            onChangeText={setNoteText}
          />
          <View style={styles.sendBtn}>
            <SecondaryButton
              label={state.saving === 'note' ? 'Saving…' : 'Add internal note'}
              disabled={!noteText.trim() || Boolean(state.saving)}
              onPress={() => {
                presenter.onAddNote(noteText);
                setNoteText('');
              }}
            />
          </View>

          <Text style={styles.section}>Move this case</Text>
          <View style={styles.actions}>
            <SecondaryButton
              label={state.saving === 'start-review' ? 'Saving…' : 'Start review'}
              disabled={Boolean(state.saving) || c.status !== 'New'}
              onPress={() => presenter.onStateAction('start-review')}
            />
            <SecondaryButton
              label={state.saving === 'resolve' ? 'Saving…' : 'Mark resolved'}
              disabled={Boolean(state.saving) || c.status === 'Resolved' || c.status === 'Closed'}
              onPress={() => presenter.onStateAction('resolve')}
            />
            {c.status === 'Closed' ? (
              <SecondaryButton
                label={state.saving === 'reopen' ? 'Saving…' : 'Reopen case'}
                disabled={Boolean(state.saving)}
                onPress={() => presenter.onStateAction('reopen')}
              />
            ) : (
              <SecondaryButton
                label={state.saving === 'close' ? 'Saving…' : 'Close case'}
                disabled={Boolean(state.saving) || c.status === 'Closed'}
                onPress={confirmClose}
              />
            )}
          </View>
        </View>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  owner: { ...typography.label },
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  body: { ...typography.body },
  meta: { ...typography.label, marginTop: spacing.sm },
  line: { ...typography.body, marginBottom: spacing.xs },
  muted: { ...typography.body, color: colors.muted },
  hint: { ...typography.label, marginBottom: spacing.sm },
  closedHint: { ...typography.label, color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.sm, fontStyle: 'italic' },
  error: { ...typography.label, color: '#a33a2a', marginBottom: spacing.sm },
  input: {
    ...typography.input,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
    marginTop: spacing.sm,
  },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
  sendBtn: { marginTop: spacing.md },
});
