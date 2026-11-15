/**
 * AD11 — School calendar and daily times (View). Term window, key dates,
 * sessions and today's schedule — and the office can ADD to all three:
 * a key date, an activity for today, and the next session (planned ahead;
 * the CURRENT session stays automatic and uneditable).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { CalendarPresenter } from '../../presenters/CalendarPresenter';
import { CalendarModel } from '../../models';
import { calendarDateError } from '../../utils/validators';
import { timeError } from '../../api/validation';
import { colors, typography, spacing } from '../theme';

export default function CalendarView({ navigation }) {
  const [presenter] = useState(() => new CalendarPresenter(CalendarModel));
  const [state, setState] = useState(presenter.initialState);
  const [keyDate, setKeyDate] = useState('');
  const [keyTitle, setKeyTitle] = useState('');
  const [keyDetail, setKeyDetail] = useState('');
  const [todayTime, setTodayTime] = useState('');
  const [todayTitle, setTodayTitle] = useState('');
  const [todayDetail, setTodayDetail] = useState('');

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    return () => presenter.detach();
  }, [presenter, navigation]);

  useActionErrorAlert(state.errorText);

  const cal = state.calendar || {};

  const onAddKeyDate = async () => {
    const ok = await presenter.addKeyDate({
      date: keyDate.trim(),
      title: keyTitle.trim(),
      detail: keyDetail.trim(),
    });
    if (ok) {
      setKeyDate('');
      setKeyTitle('');
      setKeyDetail('');
    }
  };

  const onAddTodayItem = async () => {
    const ok = await presenter.addTodayItem({
      time: todayTime.trim(),
      subject: todayTitle.trim(),
      detail: todayDetail.trim(),
    });
    if (ok) {
      setTodayTime('');
      setTodayTitle('');
      setTodayDetail('');
    }
  };

  const newestSession = state.sessions.reduce(
    (max, s) => Math.max(max, Number(String(s.label).split('/')[0]) || 0),
    0,
  );

  return (
    <AdminScaffold
      eyebrow="Academics"
      title="School calendar and daily times"
      subtitle={cal.sessionLabel ? `${cal.sessionLabel} · ${cal.termLabel || ''}` : undefined}
    >
      {state.status === 'loading' ? <LoadingView label="Loading the calendar…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' ? (
        <>
          <Text style={styles.termLine}>
            {cal.termLabel}: {cal.termStart} → {cal.termEnd} · Next term begins {cal.nextTermStart}
          </Text>

          <Text style={styles.section}>Key dates</Text>
          <RecordList
            items={(cal.keyDates || []).map((d) => ({
              id: d.id,
              title: `${d.date} · ${d.title}`,
              meta: d.detail,
            }))}
            emptyText="No key dates on the calendar yet."
          />
          <Text style={styles.formLabel}>Add a key date</Text>
          <TextInput
            style={styles.input}
            placeholder="Date — e.g. 2026-12-18"
            placeholderTextColor={colors.muted}
            value={keyDate}
            onChangeText={(t) => setKeyDate(t.replace(/[^\d-]/g, '').slice(0, 10))}
            autoCapitalize="none"
            keyboardType="number-pad"
          />
          {keyDate.trim() && calendarDateError(keyDate) ? (
            <Text style={styles.fieldError}>{calendarDateError(keyDate)}</Text>
          ) : null}
          <TextInput
            style={styles.input}
            placeholder="Title — e.g. Science fair"
            placeholderTextColor={colors.muted}
            value={keyTitle}
            onChangeText={setKeyTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Detail (optional) — e.g. Main hall, 10 am"
            placeholderTextColor={colors.muted}
            value={keyDetail}
            onChangeText={setKeyDetail}
          />
          <View style={styles.actionWrap}>
            <PrimaryButton
              label={state.saving ? 'Saving…' : 'Add the key date'}
              disabled={state.saving || !keyDate.trim() || !keyTitle.trim()}
              onPress={onAddKeyDate}
            />
          </View>

          <Text style={styles.section}>Sessions</Text>
          <RecordList
            items={state.sessions.map((s) => ({
              id: s.id,
              title: s.label,
              meta: s.terms,
              status: s.status,
            }))}
            emptyText="No sessions configured."
          />
          <Text style={styles.hint}>
            The current session follows the date automatically. Plan the next one here:
          </Text>
          <View style={styles.actionWrap}>
            <SecondaryButton
              label={
                state.saving || !newestSession
                  ? 'Working…'
                  : `Add ${newestSession + 1}/${newestSession + 2} as planned`
              }
              disabled={state.saving || !newestSession}
              onPress={() => presenter.addNextSession()}
            />
          </View>

          <Text style={styles.section}>Today at school</Text>
          <RecordList
            items={(cal.todaySchedule || []).map((slot) => ({
              id: slot.id,
              title: `${slot.time} · ${slot.subject}`,
              meta: slot.detail,
            }))}
            emptyText="No published activities for today."
          />
          <Text style={styles.formLabel}>Add to today</Text>
          {/* Same 24-hour HH:MM entry as the timetable. The number pad has no
              colon key, so typing 0915 turns into 09:15 automatically. */}
          <TextInput
            style={styles.input}
            placeholder="Time — 24-hour clock, e.g. 09:15 (or type 0915)"
            placeholderTextColor={colors.muted}
            value={todayTime}
            onChangeText={(t) => {
              const digits = t.replace(/\D/g, '').slice(0, 4);
              setTodayTime(digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits);
            }}
            keyboardType="number-pad"
          />
          {todayTime.trim() && timeError(todayTime) ? (
            <Text style={styles.fieldError}>{timeError(todayTime)}</Text>
          ) : null}
          <TextInput
            style={styles.input}
            placeholder="Activity — e.g. Staff briefing"
            placeholderTextColor={colors.muted}
            value={todayTitle}
            onChangeText={setTodayTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Place (optional) — e.g. Staff room"
            placeholderTextColor={colors.muted}
            value={todayDetail}
            onChangeText={setTodayDetail}
          />
          <View style={styles.actionWrap}>
            <PrimaryButton
              label={state.saving ? 'Saving…' : 'Add to today'}
              disabled={state.saving || !todayTime.trim() || !todayTitle.trim()}
              onPress={onAddTodayItem}
            />
          </View>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
        </>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  termLine: { ...typography.body, color: typography.body.color },
  formLabel: { ...typography.label, color: colors.muted, marginTop: spacing.md, marginBottom: spacing.xs },
  fieldError: { ...typography.label, color: '#a33a2a', marginBottom: spacing.xs },
  input: {
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
  actionWrap: { marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.muted, marginTop: spacing.sm },
  notice: { ...typography.body, color: colors.primary, marginTop: spacing.md },
});
