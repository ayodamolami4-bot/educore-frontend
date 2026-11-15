/**
 * ST03 — Subject workspace / learning materials. Lists the materials
 * published for the student's class (optionally filtered by subject from the
 * My-class page). Tapping a material opens its detail (summary + type).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import StudentScaffold from '../components/StudentScaffold';
import RecordList from '../components/RecordList';
import { LoadingView, ErrorState, EmptyState, useActionErrorAlert } from '../components/FeedbackViews';
import { StudentLearningPresenter } from '../../presenters/StudentReadPresenters';
import { StudentModel } from '../../models';
import { colors, typography, spacing } from '../theme';

export default function LearningScreen({ route }) {
  const studentId = route.params?.studentId;
  const subjectFilter = route.params?.subject;
  const navigation = useNavigation();
  const [presenter] = useState(() => new StudentLearningPresenter(StudentModel));
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

  const items = state.items || [];
  const filtered = subjectFilter
    ? items.filter((m) => m.subject === subjectFilter)
    : items;

  // Detail overlay (ST03 materialById).
  const material = state.material;

  return (
    <StudentScaffold
      bannerTop={subjectFilter ? subjectFilter : 'Learning materials'}
      bannerBottom={subjectFilter ? 'Subject workspace' : ''}
      eyebrow={subjectFilter ? 'Subject' : 'Learning'}
      title={subjectFilter ? subjectFilter : 'Learning materials'}
      subtitle={subjectFilter ? 'Materials for this subject' : 'Materials published for your class'}
    >
      {state.status === 'loading' && !material ? <LoadingView label="Loading materials…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry(studentId)} />
      ) : null}
      {state.status === 'content' && filtered.length === 0 ? (
        <EmptyState title="No materials yet" hint="Your teachers will publish materials here." />
      ) : null}
      {state.status === 'content' && filtered.length > 0 ? (
        <RecordList
          items={filtered.map((m) => ({
            id: m.id,
            title: m.title,
            meta: `${m.subject} · ${m.type} · ${m.publishedAt}`,
            status: m.subject === subjectFilter ? null : m.subject,
          }))}
          onPressItem={(row) => presenter.open(row.id)}
          emptyText="No materials yet."
        />
      ) : null}

      {material ? (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{material.title}</Text>
            <Text style={styles.cardMeta}>
              {material.subject} · {material.type} · published {material.publishedAt}
            </Text>
            <Text style={styles.cardBody}>{material.summary}</Text>
            <Pressable style={styles.closeBtn} onPress={() => presenter.closeMaterial()}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </StudentScaffold>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: spacing.lg },
  cardTitle: { ...typography.sectionTitle, marginBottom: spacing.xs },
  cardMeta: { ...typography.label, marginBottom: spacing.sm },
  cardBody: { ...typography.body, marginBottom: spacing.md },
  closeBtn: { alignSelf: 'flex-end' },
  closeText: { ...typography.body, color: colors.primary, fontWeight: '600' },
});
