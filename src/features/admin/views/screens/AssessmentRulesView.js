/**
 * AD18 — Set exams and grading rules (View). CA/exam weights, pass mark and
 * the grade bands; the arithmetic is checked on save and refusals pop up.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { digitsOnly } from '../../utils/validators';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { AssessmentRulesPresenter } from '../../presenters/AssessmentRulesPresenter';
import { AssessmentModel } from '../../models';
import { colors, typography, spacing } from '../theme';

export default function AssessmentRulesView({ navigation }) {
  const [presenter] = useState(() => new AssessmentRulesPresenter(AssessmentModel));
  const [state, setState] = useState(presenter.initialState);
  const [caText, setCaText] = useState('');
  const [examText, setExamText] = useState('');
  const [passText, setPassText] = useState('');
  const [bandTexts, setBandTexts] = useState({});

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    return () => presenter.detach();
  }, [presenter, navigation]);

  // Arithmetic refusals (weights must sum to 100, bands must descend) pop up.
  useActionErrorAlert(state.errorText, 'Grading rules');

  const policy = state.policy;

  // Adjust the typed fields when a different policy arrives (load / save /
  // lock) — done during render, not in an effect, so there is no cascading
  // render pass. Failed saves and locks keep the same policy object, so the
  // values the admin typed stay on screen to be fixed.
  const [syncedPolicy, setSyncedPolicy] = useState(null);
  if (policy && policy !== syncedPolicy) {
    setSyncedPolicy(policy);
    setCaText(String(policy.caWeight));
    setExamText(String(policy.examWeight));
    setPassText(String(policy.passMark));
    setBandTexts(
      Object.fromEntries(policy.grades.map((g) => [g.grade, String(g.minScore)])),
    );
  }

  // Live range hints: the weights are percentages of the WHOLE term, so a
  // single weight above 100 can never be right — say so as it is typed,
  // not only when Save refuses it.
  const over100 = (t) => t.trim() && Number(t) > 100;
  const passOutOfRange = (t) => t.trim() && (Number(t) < 34 || Number(t) > 100);
  const bandOutOfRange = (t) => t.trim() && (Number(t) < 0 || Number(t) > 100);

  const currentFields = () => {
    const digits = (t) => Number(String(t).replace(/[^0-9.]/g, '')) || 0;
    return {
      caWeight: digits(caText),
      examWeight: digits(examText),
      passMark: digits(passText),
      grades: policy
        ? policy.grades.map((g) => ({ ...g, minScore: digits(bandTexts[g.grade]) }))
        : undefined,
    };
  };

  const onSave = () => {
    presenter.save(currentFields());
  };

  if (state.status === 'loading') {
    return (
      <AdminScaffold eyebrow="Academics" title="Set exams and grading rules">
        <LoadingView label="Loading the grading rules…" />
      </AdminScaffold>
    );
  }
  if (state.status === 'error') {
    return (
      <AdminScaffold eyebrow="Academics" title="Set exams and grading rules">
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      </AdminScaffold>
    );
  }
  if (!policy) {
    return (
      <AdminScaffold eyebrow="Academics" title="Set exams and grading rules">
        <ErrorState message="No grading policy yet — create one by saving below." />
      </AdminScaffold>
    );
  }

  const locked = policy.locked;

  return (
    <AdminScaffold
      eyebrow="Academics"
      title="Set exams and grading rules"
      subtitle={`${policy.term} · CA ${policy.caWeight}% / exam ${policy.examWeight}% · pass at ${policy.passMark}%`}
    >
      {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
      {locked ? (
        <Text style={styles.lockedNote}>
          This policy is locked for the term — marks entry uses it as it is.
        </Text>
      ) : null}

      <Text style={styles.section}>Continuous assessment vs exam</Text>
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.fieldLabel}>CA weight (%)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={caText}
            onChangeText={(t) => setCaText(digitsOnly(t))}
            editable={!locked}
            placeholder="30"
            placeholderTextColor={colors.muted}
          />
        </View>
        <View style={styles.half}>
          <Text style={styles.fieldLabel}>Exam weight (%)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={examText}
            onChangeText={(t) => setExamText(digitsOnly(t))}
            editable={!locked}
            placeholder="70"
            placeholderTextColor={colors.muted}
          />
        </View>
      </View>
      <Text style={styles.hint}>The two weights must add up to exactly 100.</Text>
          {over100(caText) || over100(examText) ? (
            <Text style={styles.fieldError}>
              A weight above 100 cannot be right — the CA and exam together are always 100%.
            </Text>
          ) : null}

      <Text style={styles.section}>Pass mark</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={passText}
        onChangeText={(t) => setPassText(digitsOnly(t))}
        editable={!locked}
        placeholder="40"
        placeholderTextColor={colors.muted}
      />
      {passOutOfRange(passText) ? (
        <Text style={styles.fieldError}>The pass mark must be between 34 and 100.</Text>
      ) : null}
      <Text style={styles.hint}>Must be above 33 — the school&apos;s floor is 34%, and 100 at most.</Text>

      <Text style={styles.section}>Grade bands — the score each grade starts at</Text>
      {policy.grades.map((g) => (
        <View key={g.grade} style={styles.bandRow}>
          <Text style={styles.bandLabel}>
            {g.grade} · {g.remark} — from
          </Text>
          <TextInput
            style={styles.bandInput}
            keyboardType="number-pad"
            value={bandTexts[g.grade] ?? ''}
            onChangeText={(t) => setBandTexts((prev) => ({ ...prev, [g.grade]: digitsOnly(t) }))}
            editable={!locked}
            placeholderTextColor={colors.muted}
          />
        </View>
      ))}
      {policy.grades.some((g) => bandOutOfRange(bandTexts[g.grade] ?? '')) ? (
        <Text style={styles.fieldError}>
          Band scores are percentages — 0 to 100, each grade starting above the one below it.
        </Text>
      ) : null}
      <Text style={styles.hint}>A starts at 70, B below it, and so on — each band must start lower than the one above.</Text>

      <View style={styles.actions}>
        <PrimaryButton
          label={state.saving ? 'Saving…' : 'Save grading rules'}
          disabled={state.saving || locked}
          onPress={onSave}
        />
        {!locked ? (
          <SecondaryButton
            label={state.saving ? 'Working…' : 'Lock for the term'}
            disabled={state.saving}
            onPress={() => presenter.lock(currentFields())}
          />
        ) : (
          <SecondaryButton
            label={state.saving ? 'Working…' : 'Unlock to edit again'}
            disabled={state.saving}
            onPress={() => presenter.unlock()}
          />
        )}
      </View>
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  notice: { ...typography.body, color: colors.primary, marginBottom: spacing.sm },
  fieldError: { ...typography.label, color: '#a33a2a', marginBottom: spacing.xs },
  lockedNote: { ...typography.label, color: colors.muted, marginBottom: spacing.sm },
  section: { ...typography.sectionTitle, marginTop: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  fieldLabel: { ...typography.label, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  hint: { ...typography.label, color: colors.muted, marginTop: spacing.xs },
  bandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  bandLabel: { ...typography.body, flex: 1 },
  bandInput: {
    width: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textAlign: 'center',
    ...typography.body,
  },
  actions: { marginTop: spacing.md, gap: spacing.sm },
});
