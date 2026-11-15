/**
 * ST06/ST07/ST08 — Assignment details, prepare/submit, and submission
 * feedback. One screen: the brief at the top, the student's last submission
 * (with any teacher feedback) below, and a submit box at the bottom. The
 * latest submission replaces any prior, so the student always sees one
 * current submission per assignment.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import StudentScaffold from '../components/StudentScaffold';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { StudentAssignmentsPresenter } from '../../presenters/StudentAssignmentsPresenter';
import { StudentModel } from '../../models';
import { colors, typography, spacing } from '../theme';

export default function AssignmentDetailScreen({ route }) {
  const studentId = route.params?.studentId;
  const assignmentId = route.params?.assignmentId;
  const [presenter] = useState(() => new StudentAssignmentsPresenter(StudentModel));
  const [state, setState] = useState(presenter.initialState);

  useEffect(() => {
    presenter.attach(setState);
    presenter.open(studentId, assignmentId);
    return () => presenter.detach();
  }, [presenter, studentId, assignmentId]);

  useActionErrorAlert(state.errorText);

  const a = state.detail;
  const sub = state.submission;
  const submitted = String(sub?.status ?? '').toUpperCase() === 'SUBMITTED';

  return (
    <StudentScaffold
      eyebrow={a ? a.subject : 'Assignment'}
      title={a ? a.title : 'Assignment'}
      subtitle={a ? `Due ${a.dueAt} · ${a.maxScore} marks` : ''}
    >
      {state.status === 'loading' ? <LoadingView label="Loading this assignment…" /> : null}
      {state.status === 'error' ? (
        <ErrorState
          message={state.errorText}
          onRetry={() => presenter.open(studentId, assignmentId)}
        />
      ) : null}
      {state.status === 'content' && a ? (
        <View>
          <Text style={styles.section}>Brief</Text>
          <Text style={styles.body}>{a.brief}</Text>

          {sub ? (
            <View style={styles.subBlock}>
              <Text style={styles.section}>Your last submission</Text>
              <Text style={styles.subMeta}>
                Submitted {sub.submittedAt} · {sub.status}
              </Text>
              <Text style={styles.body}>{sub.content}</Text>
              {sub.feedback ? (
                <View style={styles.feedbackBox}>
                  <Text style={styles.feedbackLabel}>Teacher feedback</Text>
                  <Text style={styles.body}>{sub.feedback}</Text>
                  {sub.score != null ? (
                    <Text style={styles.score}>
                      Score: {sub.score}/{a.maxScore}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.section}>{sub ? 'Resubmit' : 'Submit your work'}</Text>
          <TextInput
            style={styles.input}
            multiline
            numberOfLines={5}
            editable={!submitted}
            value={state.draft}
            onChangeText={(text) => presenter.setDraft(text)}
            placeholder="Type your answer, or paste your work here…"
            textAlignVertical="top"
          />
          <Pressable
            style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.7 }]}
            onPress={() => presenter.submit(studentId, assignmentId)}
            disabled={state.submitting || submitted}
          >
            <Text style={styles.submitText}>
              {state.submitting ? 'Submitting...' : submitted ? 'Submitted' : sub ? 'Resubmit' : 'Submit'}
            </Text>
          </Pressable>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
        </View>
      ) : null}
    </StudentScaffold>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.xs },
  body: { ...typography.body, marginBottom: spacing.sm },
  subBlock: { marginTop: spacing.md },
  subMeta: { ...typography.label, marginBottom: spacing.xs },
  feedbackBox: {
    backgroundColor: colors.positive,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  feedbackLabel: { ...typography.label, marginBottom: 4, color: colors.text },
  score: { ...typography.body, fontWeight: '700', marginTop: spacing.xs, color: colors.primary },
  input: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 120,
    ...typography.input,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  submitText: { color: colors.onPrimary, fontWeight: '700', ...typography.body },
  notice: { ...typography.label, color: colors.muted, marginTop: spacing.sm, textAlign: 'center' },
});
