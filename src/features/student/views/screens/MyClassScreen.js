/**
 * ST02 — My class / subjects. Reads the same overview payload as the home
 * screen and lists the student's subjects. Tapping a subject opens the
 * learning-materials page filtered to that subject.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import StudentScaffold from '../components/StudentScaffold';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { StudentHomePresenter } from '../../presenters/StudentHomePresenter';
import { StudentModel } from '../../models';
import { colors, typography, spacing } from '../theme';

export default function MyClassScreen({ route }) {
  const studentId = route.params?.studentId;
  const navigation = useNavigation();
  const [presenter] = useState(() => new StudentHomePresenter(StudentModel));
  const [state, setState] = useState(presenter.initialState);

  useEffect(() => {
    presenter.attach(setState);
    presenter.load(studentId);
    const unsubscribe = navigation.addListener('focus', () => presenter.load(studentId));
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation, studentId]);

  useActionErrorAlert(state.errorText);

  const ov = state.overview;

  return (
    <StudentScaffold
      bannerTop={ov ? ov.studentName : 'Loading…'}
      bannerBottom={ov ? `${ov.classLabel} · ${ov.termLabel}` : ''}
      eyebrow="My class"
      title={ov ? ov.classLabel : 'My class'}
      subtitle={ov ? `${ov.subjects.length} subjects · form teacher ${ov.formTeacherName}` : ''}
    >
      {state.status === 'loading' ? <LoadingView label="Loading your class…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry(studentId)} />
      ) : null}
      {state.status === 'content' && ov ? (
        <View>
          <Text style={styles.section}>Subjects</Text>
          {ov.subjects.map((s) => (
            <Pressable
              key={s.id}
              style={styles.row}
              onPress={() => navigation.navigate('Learning', { studentId, subject: s.name })}
            >
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{s.name}</Text>
                {s.department ? <Text style={styles.rowMeta}>{s.department}</Text> : null}
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </StudentScaffold>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.sectionTitle, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  rowMain: { flex: 1 },
  rowTitle: { ...typography.body, fontWeight: '600' },
  rowMeta: { ...typography.label, marginTop: 2 },
  chevron: { ...typography.title, color: colors.muted },
});
