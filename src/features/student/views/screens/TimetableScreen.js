/**
 * ST04 — Timetable / calendar. Shows the student's weekly timetable (5 days
 * × 6 periods) and the school calendar's key dates below it.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import StudentScaffold from '../components/StudentScaffold';
import { LoadingView, ErrorState, EmptyState, useActionErrorAlert } from '../components/FeedbackViews';
import { StudentTimetablePresenter } from '../../presenters/StudentReadPresenters';
import { StudentModel } from '../../models';
import { colors, typography, spacing } from '../theme';

export default function TimetableScreen({ route }) {
  const studentId = route.params?.studentId;
  const navigation = useNavigation();
  const [presenter] = useState(() => new StudentTimetablePresenter(StudentModel));
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

  const tt = state.timetable;
  const cal = state.calendar;

  return (
    <StudentScaffold
      bannerTop={tt ? tt.classLabel : 'Timetable'}
      bannerBottom={tt ? (tt.termLabel ? `${tt.termLabel} · weekly` : 'Weekly timetable') : ''}
      eyebrow="Timetable"
      title="My week"
      subtitle={tt ? [tt.classLabel, tt.termLabel].filter(Boolean).join(' · ') : ''}
    >
      {state.status === 'loading' ? <LoadingView label="Loading your timetable…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry(studentId)} />
      ) : null}
      {state.status === 'content' && tt ? (
        <View>
          {tt.days?.length ? (
            tt.days.map((day) => (
              <View key={day.day} style={styles.dayBlock}>
                <Text style={styles.dayTitle}>{day.day}</Text>
                {day.periods.map((p) => (
                  <View key={p.period} style={styles.periodRow}>
                    <Text style={styles.periodTime}>{p.time}</Text>
                    <Text style={styles.periodSubject}>{p.subject}</Text>
                  </View>
                ))}
              </View>
            ))
          ) : (
            <EmptyState
              title={tt.published ? 'No lessons scheduled' : 'No timetable published'}
              hint={
                tt.published
                  ? 'There are no lessons in your current timetable.'
                  : 'Your weekly lessons will appear here after the school publishes its timetable.'
              }
            />
          )}

          {tt.todayEvents?.length ? (
            <View style={styles.calendarBlock}>
              <Text style={styles.section}>Today · {tt.today}</Text>
              {tt.todayEvents.map((event) => (
                <View key={event.id} style={styles.dateRow}>
                  <Text style={styles.dateDay}>{event.time || event.type}</Text>
                  <View style={styles.dateMain}>
                    <Text style={styles.dateTitle}>{event.title}</Text>
                    {event.detail ? <Text style={styles.dateDetail}>{event.detail}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {cal ? (
            <View style={styles.calendarBlock}>
              <Text style={styles.section}>School calendar</Text>
              <Text style={styles.calendarMeta}>
                {cal.termLabel} · {cal.termStart} to {cal.termEnd}
              </Text>
              <Text style={styles.calendarMeta}>Next term starts {cal.nextTermStart}</Text>
              {cal.keyDates && cal.keyDates.length > 0 ? (
                <View style={styles.dates}>
                  {cal.keyDates.map((d) => (
                    <View key={d.id} style={styles.dateRow}>
                      <Text style={styles.dateDay}>{d.date}</Text>
                      <View style={styles.dateMain}>
                        <Text style={styles.dateTitle}>{d.title}</Text>
                        <Text style={styles.dateDetail}>{d.detail}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </StudentScaffold>
  );
}

const styles = StyleSheet.create({
  dayBlock: { marginBottom: spacing.md },
  dayTitle: { ...typography.sectionTitle, marginBottom: spacing.xs },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  periodTime: { ...typography.label, width: 130, color: colors.muted },
  periodSubject: { ...typography.body, flex: 1 },
  calendarBlock: { marginTop: spacing.lg },
  section: { ...typography.sectionTitle, marginBottom: spacing.xs },
  calendarMeta: { ...typography.label, marginTop: 2 },
  dates: { marginTop: spacing.sm },
  dateRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  dateDay: { ...typography.label, width: 90, color: colors.primary, fontWeight: '700' },
  dateMain: { flex: 1 },
  dateTitle: { ...typography.body, fontWeight: '600' },
  dateDetail: { ...typography.label, marginTop: 2 },
});
