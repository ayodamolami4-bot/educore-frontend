/**
 * AD07 — Teachers list (View). Search box plus status filter chips; every
 * row opens the teacher's profile. Re-fetches on focus.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { PrimaryButton } from './AdminHomeView';
import { TeacherListPresenter } from '../../presenters/TeacherListPresenter';
import { TeacherModel } from '../../models';
import { colors, typography, spacing } from '../theme';

const STATUSES = ['all', 'Active', 'On Leave', 'Inactive'];

export default function TeacherListView({ navigation }) {
  const [presenter] = useState(() => new TeacherListPresenter(TeacherModel));
  const [state, setState] = useState(presenter.initialState);
  const [csvText, setCsvText] = useState('');
  const loadedOnce = useRef(false);

  // Import problems pop up AND stay listed under the box — nothing wrong
  // with the data can pass silently.
  useActionErrorAlert(state.errorText);

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    // Staff status changes as the office registers or edits teachers, so
    // re-fetch on every focus after the first.
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current) presenter.load({ showLoading: false });
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation]);

  const rows = state.rows.map((t) => ({
    id: t.id,
    title: t.name,
    meta: `${t.staffNumber} · ${(t.subjects || []).join(', ') || 'No subjects yet'}${
      t.formClass ? ` · Form teacher of ${t.formClass}` : ''
    }`,
    status: t.status,
    raw: t,
  }));

  return (
    <AdminScaffold
      eyebrow="People"
      title="Teachers list"
      subtitle="Staff, their subjects and responsibilities"
    >
      {state.status === 'loading' ? <LoadingView label="Loading the teachers…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' ? (
        <View>
          <TextInput
            style={styles.search}
            placeholder="Search name, staff number or subject"
            placeholderTextColor={colors.muted}
            value={state.query.q}
            onChangeText={(t) => presenter.onSearch(t)}
          />
          <View style={styles.chipRow}>
            {STATUSES.map((s) => (
              <Pressable
                key={s}
                style={[styles.chip, state.query.status === s && styles.chipOn]}
                onPress={() => presenter.onFilterStatus(s)}
              >
                <Text style={[styles.chipText, state.query.status === s && styles.chipTextOn]}>
                  {s === 'all' ? 'All' : s}
                </Text>
              </Pressable>
            ))}
          </View>
          <RecordList
            items={rows}
            onPressItem={(row) => presenter.onOpenTeacher(row.raw)}
            emptyText="No teachers match — try clearing the search or filter."
          />

          <Text style={styles.section}>Import teachers from CSV</Text>
          <Text style={styles.hint}>
            One teacher per line: Full name, Email, Phone, Subjects (| separated), Form class.
            Every line is checked with the same rules as the form.
          </Text>
          <TextInput
            style={[styles.search, styles.csvBox]}
            placeholder={'Mr. Emeka Obi, emeka.obi@gmail.com, 0810 123 4567, Mathematics|Basic Science, JSS2 A'}
            placeholderTextColor={colors.muted}
            value={csvText}
            onChangeText={setCsvText}
            multiline
            autoCapitalize="none"
          />
          <View style={styles.importWrap}>
            <PrimaryButton
              label={state.importing ? 'Importing…' : 'Import these lines'}
              disabled={state.importing || !csvText.trim()}
              onPress={async () => {
                const ok = await presenter.importCsv(csvText);
                if (ok) setCsvText('');
              }}
            />
          </View>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
          {state.errorText ? <Text style={styles.inlineError}>{state.errorText}</Text> : null}
          {state.importResult && state.importResult.failed.length ? (
            <RecordList
              items={state.importResult.failed.map((f, i) => ({
                id: `fail-${f.row}-${i}`,
                title: `Line ${f.row}: ${f.name}`,
                meta: f.error,
                status: 'Fix',
                static: true,
              }))}
              emptyText=""
            />
          ) : null}
        </View>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  search: {
    ...typography.input,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 46,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  notice: { ...typography.body, color: colors.primary, marginTop: spacing.md },
  inlineError: { ...typography.body, color: '#a33a2a', marginTop: spacing.md },
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.muted, marginBottom: spacing.sm },
  csvBox: { minHeight: 96, textAlignVertical: 'top' },
  importWrap: { marginTop: spacing.md },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.label, color: colors.muted },
  chipTextOn: { color: colors.white },
});
