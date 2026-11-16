/**
 * ST05 — Assignments list. Shows the student's assignments with their status
 * (Open / Submitted / Graded). Tapping one opens the assignment detail
 * (ST06/07/08).
 */
import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import StudentScaffold from '../components/StudentScaffold';
import RecordList from '../components/RecordList';
import {
  LoadingView,
  ErrorState,
  EmptyState,
  useActionErrorAlert,
} from '../components/FeedbackViews';
import { StudentAssignmentsPresenter } from '../../presenters/StudentAssignmentsPresenter';
import { StudentModel } from '../../models';

export default function AssignmentsScreen({ route }) {
  const studentId = route.params?.studentId;
  const navigation = useNavigation();
  const [presenter] = useState(() => new StudentAssignmentsPresenter(StudentModel));
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

  return (
    <StudentScaffold
      eyebrow="Assignments"
      title="My assignments"
      subtitle="Open, submitted and graded work for this term."
    >
      {state.status === 'loading' ? <LoadingView label="Loading assignments…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry(studentId)} />
      ) : null}
      {state.status === 'content' && state.items.length === 0 ? (
        <EmptyState title="No assignments yet" hint="Your teachers will post assignments here." />
      ) : null}
      {state.status === 'content' && state.items.length > 0 ? (
        <RecordList
          items={state.items.map((a) => ({
            id: a.id,
            title: a.title,
            meta: `${a.subject} · ${a.dueAt ? `due ${a.dueAt}` : 'No due date'}${a.submission && a.submission.score != null ? ` · ${a.submission.score}/${a.maxScore}` : ''}`,
            status: a.status,
          }))}
          onPressItem={(row) =>
            navigation.navigate('AssignmentDetail', { studentId, assignmentId: row.id })
          }
          emptyText="No assignments yet."
        />
      ) : null}
    </StudentScaffold>
  );
}
