/**
 * AD01 — Admin home (View).
 * MVP rule: this component only renders state and forwards taps to the
 * Presenter. All data comes from DashboardPresenter / DashboardModel.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import SummaryCard from '../components/SummaryCard';
import RecordList from '../components/RecordList';
import { LoadingView, ErrorState } from '../components/FeedbackViews';
import { DashboardPresenter } from '../../presenters/DashboardPresenter';
import { DashboardModel } from '../../models';
import { colors, typography, spacing, touchTarget } from '../theme';

export default function AdminHomeView({ navigation }) {
  const [presenter] = useState(() => new DashboardPresenter(DashboardModel));
  const [state, setState] = useState(presenter.initialState);

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    // Returning to home (e.g. after correcting a register) re-reads the
    // totals so they never lag the attendance screens.
    const unsubscribe = navigation.addListener('focus', () => {
      presenter.refresh();
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation]);

  const a = state.attendance || {};

  return (
    <AdminScaffold
      eyebrow="Home"
      title="Admin home"
      subtitle="A clear view of today."
      insetBottom={false}
      actions={
        <>
          <PrimaryButton label="Enrol student" onPress={() => presenter.onEnrolStudent()} />
          <SecondaryButton
            label="View school calendar"
            onPress={() => presenter.onViewCalendar()}
          />
        </>
      }
    >
      <Text style={styles.greeting}>Good morning, {state.staffName || 'Admin'}</Text>
      <Text style={styles.date}>{state.dateLabel}</Text>

      {state.status === 'loading' ? <LoadingView label="Loading today…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' ? (
        <>
          <Text style={styles.section}>Attendance</Text>
          {/* flexBasis caps the row at three tiles — four cards wrap to a
              second row instead of squeezing into one. */}
          <View style={styles.grid}>
            <SummaryCard
              value={`${a.registersSubmitted ?? 0} / ${a.registersExpected ?? 0}`}
              label="Registers submitted"
              icon="checkmark-circle-outline"
              style={styles.card}
              onPress={() => presenter.onViewAttendance()}
            />
            <SummaryCard
              value={a.missingRegisters ?? 0}
              label="Missing register"
              icon="alert-circle-outline"
              style={styles.card}
              onPress={() => presenter.onViewAttendance()}
            />
            <SummaryCard
              value={a.absentStudents ?? 0}
              label="Absent students"
              icon="person-remove-outline"
              style={styles.card}
              onPress={() => presenter.onViewAttendance()}
            />
            <SummaryCard
              value={a.lateArrivals ?? 0}
              label="Late arrivals"
              icon="time-outline"
              style={styles.card}
              onPress={() => presenter.onViewAttendance()}
            />
          </View>
          <Text style={styles.hint}>Attendance totals use submitted registers only.</Text>

          <Text style={styles.section}>Needs your attention</Text>
          <RecordList
            items={state.attention.map((item) => ({
              id: item.id,
              title: item.title,
              meta: item.detail,
              status: item.countLabel,
              // The type decides WHICH page opens (results, fees, complaints)
              // — it must survive the mapping or every card falls back to
              // the attendance overview.
              type: item.type,
            }))}
            onPressItem={(item) => presenter.onOpenAttention(item)}
            emptyText="Nothing is waiting on you."
          />

          <Text style={styles.section}>Today at school</Text>
          {/* Tapping a slot opens the school calendar (AD11). */}
          <RecordList
            items={state.todaySchedule.map((slot) => ({
              id: slot.id,
              title: `${slot.time} · ${slot.subject}`,
              meta: slot.detail,
            }))}
            onPressItem={() => presenter.onOpenSchedule()}
            emptyText="No published activities for today."
          />
        </>
      ) : null}
    </AdminScaffold>
  );
}

export function PrimaryButton({ label, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primary,
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondary,
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  greeting: { ...typography.sectionTitle, marginTop: spacing.sm },
  date: { ...typography.label, marginBottom: spacing.md },
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { flexGrow: 0, flexBasis: '31%' },
  hint: { ...typography.label, marginTop: spacing.sm },
  primary: {
    ...touchTarget,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.onPrimary, fontWeight: '700', fontSize: 14 },
  secondary: {
    ...touchTarget,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});
