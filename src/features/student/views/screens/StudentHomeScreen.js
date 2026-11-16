/**
 * ST01 — Student home. A quick dashboard of the signed-in student's class,
 * subjects, open assignments and latest report. Tiles deep-link into the
 * matching ST pages (assignments, results, timetable, attendance, notices,
 * profile).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import StudentScaffold from '../components/StudentScaffold';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { StudentHomePresenter } from '../../presenters/StudentHomePresenter';
import { StudentModel } from '../../models';
import { colors, typography, spacing } from '../theme';

function Tile({ label, value, onPress, accent }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        pressed && { opacity: 0.7 },
        accent && styles.tileAccent,
      ]}
    >
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

export default function StudentHomeScreen({ route }) {
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
  const bannerDetails = [ov?.classLabel, ov?.sessionLabel, ov?.termLabel]
    .filter(Boolean)
    .join(' · ');
  const homeDetails = [
    ov?.classLabel,
    ov?.formTeacherName ? `Form teacher: ${ov.formTeacherName}` : '',
  ].filter(Boolean).join(' · ');

  const go = (screen, params = {}) => {
    const targetParams = { studentId, ...params };
    const tabs = navigation.getParent();

    if (screen === 'Assignments' || screen === 'AssignmentDetail') {
      tabs?.navigate('AssignmentsTab', { screen, params: targetParams });
      return;
    }
    if (screen === 'Reports') {
      tabs?.navigate('ReportsTab', { screen: 'Reports', params: targetParams });
      return;
    }
    if (screen === 'Notices') {
      tabs?.navigate('NoticesTab', { screen: 'Notices' });
      return;
    }
    if (screen === 'Profile') {
      tabs?.navigate('ProfileTab', { screen: 'Profile', params: targetParams });
      return;
    }

    navigation.navigate(screen, targetParams);
  };

  return (
    <StudentScaffold
      bannerTop={ov ? ov.studentName : 'Loading…'}
      bannerBottom={ov ? bannerDetails : ''}
      eyebrow="Home"
      title={`Welcome, ${ov ? ov.studentName.split(' ')[0] : ''}`}
      subtitle={ov ? homeDetails : ''}
    >
      {state.status === 'loading' ? <LoadingView label="Loading your home…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry(studentId)} />
      ) : null}
      {state.status === 'content' && ov ? (
        <View>
          <View style={styles.tiles}>
            <Tile label="Subjects" value={ov.subjects.length} onPress={() => go('MyClass')} />
            <Tile
              label="Open tasks"
              value={ov.openAssignments.length}
              onPress={() => go('Assignments')}
              accent
            />
            <Tile
              label="Latest avg"
              value={ov.latestReport ? `${ov.latestReport.average}%` : '—'}
              onPress={() => go('Reports')}
            />
          </View>

          <Text style={styles.section}>Open assignments</Text>
          {ov.openAssignments.length === 0 ? (
            <Text style={styles.empty}>No open assignments — you are up to date.</Text>
          ) : (
            ov.openAssignments.map((a) => (
              <Pressable
                key={a.id}
                style={styles.row}
                onPress={() => go('AssignmentDetail', { assignmentId: a.id })}
              >
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{a.title}</Text>
                  <Text style={styles.rowMeta}>
                    {a.subject} · {a.dueAt ? `due ${a.dueAt}` : 'No due date'}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))
          )}

          <Text style={styles.section}>Quick links</Text>
          <View style={styles.links}>
            <Pressable style={styles.link} onPress={() => go('Timetable')}>
              <Text style={styles.linkText}>Timetable</Text>
            </Pressable>
            <Pressable style={styles.link} onPress={() => go('Attendance')}>
              <Text style={styles.linkText}>Attendance</Text>
            </Pressable>
            <Pressable style={styles.link} onPress={() => go('Learning')}>
              <Text style={styles.linkText}>Learning materials</Text>
            </Pressable>
            <Pressable style={styles.link} onPress={() => go('Notices')}>
              <Text style={styles.linkText}>Notices</Text>
            </Pressable>
            <Pressable style={styles.link} onPress={() => go('Profile')}>
              <Text style={styles.linkText}>My profile</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </StudentScaffold>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  tile: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  tileAccent: { borderColor: colors.primary, borderWidth: 2 },
  tileValue: { ...typography.title, color: colors.primary },
  tileLabel: { ...typography.label, marginTop: 4 },
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  empty: { ...typography.body, color: colors.muted, paddingVertical: spacing.sm },
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
  links: { flexDirection: 'column', gap: spacing.sm },
  link: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  linkText: { ...typography.body, color: colors.primary, fontWeight: '600' },
});
