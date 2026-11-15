/**
 * AD16 — Attendance and absence follow-up (View). Totals on top, the
 * register list under them; taps on the totals jump around this same screen.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import SummaryCard from '../components/SummaryCard';
import RecordList from '../components/RecordList';
import { LoadingView, ErrorState } from '../components/FeedbackViews';
import { AttendanceOverviewPresenter } from '../../presenters/AttendanceOverviewPresenter';
import { AttendanceModel } from '../../models';
import { typography, spacing } from '../theme';

export default function AttendanceOverviewView({ navigation }) {
  const [presenter] = useState(() => new AttendanceOverviewPresenter(AttendanceModel));
  const [state, setState] = useState(presenter.initialState);

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    // Registers get corrected elsewhere (AD17), so the totals re-read on
    // every focus — the home screen and this list always agree.
    const unsubscribe = navigation.addListener('focus', () => {
      presenter.load({ showLoading: false });
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation]);

  const o = state.overview || {};

  return (
    <AdminScaffold
      eyebrow="Academics"
      title="Attendance and absence follow-up"
      subtitle="Today's registers across the school."
    >
      {state.status === 'loading' ? <LoadingView label="Loading registers…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' ? (
        <>
          <View style={styles.grid}>
            <SummaryCard
              value={`${o.registersSubmitted ?? 0} / ${o.registersExpected ?? 0}`}
              label="Submitted"
              icon="checkmark-circle-outline"
              style={styles.card}
            />
            <SummaryCard
              value={o.missingRegisters ?? 0}
              label="Missing"
              icon="alert-circle-outline"
              style={styles.card}
            />
            <SummaryCard
              value={o.absentStudents ?? 0}
              label="Absent"
              icon="person-remove-outline"
              style={styles.card}
            />
            <SummaryCard
              value={o.lateArrivals ?? 0}
              label="Late arrivals"
              icon="time-outline"
              style={styles.card}
            />
          </View>
          <Text style={styles.hint}>
            Totals use submitted registers only. {(o.correctionRequests ?? 0) > 0
              ? `${o.correctionRequests} register corrections are waiting for your decision.`
              : 'No register corrections are waiting.'}
          </Text>

          <Text style={styles.section}>Today&apos;s registers</Text>
          <RecordList
            items={state.registers.map((r) => ({
              id: r.id,
              title: `${r.classLabel} · ${r.subject}`,
              meta: `${r.teacher} · ${r.time}${
                r.absentCount ? ` · ${r.absentCount} absent` : ''
              }${r.lateCount ? ` · ${r.lateCount} late` : ''}`,
              status: r.status,
              raw: r,
            }))}
            onPressItem={(row) =>
              navigation.navigate('RegisterReview', { classId: row.raw.classLabel })
            }
            emptyText="No registers were scheduled for today."
          />
        </>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { flexGrow: 0, flexBasis: '31%' },
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  hint: { ...typography.label, marginTop: spacing.sm },
});
