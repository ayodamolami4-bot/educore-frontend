/**
 * ST12 — Notices. The school's published notices (announcements) for the
 * student. Tapping one opens its full body.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import StudentScaffold from '../components/StudentScaffold';
import RecordList from '../components/RecordList';
import {
  LoadingView,
  ErrorState,
  EmptyState,
  useActionErrorAlert,
} from '../components/FeedbackViews';
import { StudentNoticesPresenter } from '../../presenters/StudentReadPresenters';
import { StudentModel } from '../../models';
import { colors, typography, spacing } from '../theme';

export default function NoticesScreen({ route: _route }) {
  const [presenter] = useState(() => new StudentNoticesPresenter(StudentModel));
  const [state, setState] = useState(presenter.initialState);

  useEffect(() => {
    presenter.attach(setState);
    presenter.load();
    return () => presenter.detach();
  }, [presenter]);

  useActionErrorAlert(state.errorText);

  const notice = state.notice;

  return (
    <StudentScaffold
      eyebrow="Notices"
      title={notice ? notice.title : 'School notices'}
      subtitle={
        notice
          ? notice.publishedAt
            ? `Published ${notice.publishedAt}`
            : ''
          : 'Announcements from the school'
      }
    >
      {!notice && state.status === 'loading' ? <LoadingView label="Loading notices…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {!notice && state.status === 'content' ? (
        state.items.length === 0 ? (
          <EmptyState title="No notices" hint="School announcements appear here." />
        ) : (
          <RecordList
            items={state.items.map((n) => ({
              id: n.id,
              title: n.title,
              meta: n.publishedAt ? `Published ${n.publishedAt}` : '',
              status: n.status,
            }))}
            onPressItem={(row) => presenter.open(row.id)}
            emptyText="No notices yet."
          />
        )
      ) : null}

      {notice ? (
        <View>
          <Pressable style={styles.backLink} onPress={() => presenter.closeNotice()}>
            <Text style={styles.backText}>‹ All notices</Text>
          </Pressable>
          <Text style={styles.section}>{notice.title}</Text>
          <Text style={styles.meta}>
            {notice.audienceLabel || notice.audience || 'Whole school'}
            {notice.publishedAt ? ` · ${notice.publishedAt}` : ''}
          </Text>
          <Text style={styles.body}>{notice.body}</Text>
        </View>
      ) : null}
    </StudentScaffold>
  );
}

const styles = StyleSheet.create({
  backLink: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  backText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  section: { ...typography.sectionTitle, marginBottom: spacing.xs },
  meta: { ...typography.label, marginBottom: spacing.sm },
  body: { ...typography.body },
});
