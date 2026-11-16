/**
 * AD11 — School calendar and daily times.
 * Session and term dates are editable through the implemented school APIs;
 * examination events and today's timetable are server-published projections.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import SelectSheet from '../components/SelectSheet';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { CalendarPresenter } from '../../presenters/CalendarPresenter';
import { CalendarModel } from '../../models';
import { colors, typography, spacing } from '../theme';

function dateInput(value, setter) {
  setter(value.replace(/[^\d-]/g, '').slice(0, 10));
}

export default function CalendarView({ navigation }) {
  const [presenter] = useState(() => new CalendarPresenter(CalendarModel));
  const [state, setState] = useState(presenter.initialState);
  const [sessionName, setSessionName] = useState('');
  const [sessionStartsOn, setSessionStartsOn] = useState('');
  const [sessionEndsOn, setSessionEndsOn] = useState('');
  const [termSessionId, setTermSessionId] = useState('');
  const [termNumber, setTermNumber] = useState('1');
  const [termStartsOn, setTermStartsOn] = useState('');
  const [termEndsOn, setTermEndsOn] = useState('');
  const [picker, setPicker] = useState(null);

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    return () => presenter.detach();
  }, [presenter, navigation]);

  useActionErrorAlert(state.errorText, 'Calendar update not saved');

  const cal = state.calendar ?? {};
  const selectedSession = state.sessions.find((item) => item.id === termSessionId) ?? null;

  useEffect(() => {
    if (termSessionId || !state.sessions.length) return undefined;
    let current = true;
    const activeSessionId = state.calendar?.activeSessionId ?? state.sessions[0].id;
    Promise.resolve().then(() => {
      if (current) setTermSessionId(activeSessionId);
    });
    return () => { current = false; };
  }, [state.sessions, state.calendar?.activeSessionId, termSessionId]);

  const createSession = async () => {
    const ok = await presenter.addSession({
      name: sessionName,
      startsOn: sessionStartsOn,
      endsOn: sessionEndsOn,
    });
    if (ok) {
      setSessionName('');
      setSessionStartsOn('');
      setSessionEndsOn('');
    }
  };

  const createTerm = async () => {
    const ok = await presenter.addTerm({
      sessionId: termSessionId,
      number: termNumber,
      startsOn: termStartsOn,
      endsOn: termEndsOn,
    });
    if (ok) {
      setTermStartsOn('');
      setTermEndsOn('');
      const sessionTerms = state.sessions.find((item) => item.id === termSessionId)?.terms ?? [];
      const used = new Set(sessionTerms.map((item) => String(item.number)));
      setTermNumber(['1', '2', '3'].find((item) => !used.has(item)) ?? '1');
    }
  };

  const sessionOptions = state.sessions.map((item) => ({
    value: item.id,
    label: `${item.name} · ${item.startsOn} to ${item.endsOn}`,
  }));

  return (
    <AdminScaffold
      eyebrow="Academics"
      title="School calendar and daily times"
      subtitle={cal.activeSession?.name
        ? `${cal.activeSession.name} · ${cal.activeSession.startsOn} to ${cal.activeSession.endsOn}`
        : 'Academic sessions, terms and published school activities'}
    >
      {state.status === 'loading' ? <LoadingView label="Loading sessions, terms and published school activities…" /> : null}
      {state.status === 'error' ? <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} /> : null}

      {state.status === 'content' ? (
        <>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}

          <Text style={styles.section}>Academic sessions</Text>
          <RecordList
            items={state.sessions.map((session) => ({
              id: session.id,
              title: session.name,
              meta: `${session.startsOn} → ${session.endsOn} · ${session.terms.length} terms`,
              status: session.id === cal.activeSessionId ? 'Selected by school' : '',
            }))}
            emptyText="No academic sessions have been configured."
          />

          <Text style={styles.formLabel}>Create an academic session</Text>
          <TextInput
            style={styles.input}
            placeholder="Session name — e.g. 2027/2028"
            placeholderTextColor={colors.muted}
            value={sessionName}
            onChangeText={setSessionName}
          />
          <TextInput
            style={styles.input}
            placeholder="Session starts — YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            value={sessionStartsOn}
            onChangeText={(value) => dateInput(value, setSessionStartsOn)}
            keyboardType="number-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Session ends — YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            value={sessionEndsOn}
            onChangeText={(value) => dateInput(value, setSessionEndsOn)}
            keyboardType="number-pad"
          />
          <View style={styles.actionWrap}>
            <SecondaryButton
              label={state.saving ? 'Saving…' : 'Create academic session'}
              disabled={state.saving || !sessionName.trim() || !sessionStartsOn || !sessionEndsOn}
              onPress={createSession}
            />
          </View>

          <Text style={styles.section}>Terms</Text>
          <RecordList
            items={state.terms.map((term) => {
              const session = state.sessions.find((item) => item.id === term.sessionId);
              return {
                id: term.id,
                title: `${session?.name ?? 'Academic session'} · Term ${term.number}`,
                meta: `${term.startsOn} → ${term.endsOn}`,
              };
            })}
            emptyText="No academic terms have been configured."
          />

          <Text style={styles.formLabel}>Add a term to a session</Text>
          <Text style={styles.pickerLabel}>Academic session *</Text>
          <Text
            style={styles.pickerValue}
            onPress={() => setPicker('session')}
          >
            {selectedSession?.name ?? 'Choose an academic session…'}
          </Text>
          <Text style={styles.pickerLabel}>Term number *</Text>
          <Text style={styles.pickerValue} onPress={() => setPicker('term')}>
            Term {termNumber}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Term starts — YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            value={termStartsOn}
            onChangeText={(value) => dateInput(value, setTermStartsOn)}
            keyboardType="number-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Term ends — YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            value={termEndsOn}
            onChangeText={(value) => dateInput(value, setTermEndsOn)}
            keyboardType="number-pad"
          />
          <View style={styles.actionWrap}>
            <PrimaryButton
              label={state.saving ? 'Saving…' : 'Add term'}
              disabled={state.saving || !termSessionId || !termStartsOn || !termEndsOn}
              onPress={createTerm}
            />
          </View>

          <Text style={styles.section}>Today at school</Text>
          <Text style={styles.hint}>
            {cal.today} · Africa/Lagos · {cal.teachingDay ? 'Teaching day' : cal.calendarTitle || 'No teaching day configured for this date'}
          </Text>
          <RecordList
            items={cal.todaySchedule.map((item) => ({
              id: item.id,
              title: `${item.time || 'Time not set'} · ${item.subject}`,
              meta: item.detail,
            }))}
            emptyText="No published lessons or examinations are scheduled for today."
          />

          <Text style={styles.section}>Published examination dates</Text>
          <RecordList
            items={cal.examinations.map((event) => ({
              id: event.id,
              title: `${event.date} · ${event.title}`,
              meta: `${event.termLabel}${event.detail ? ` · ${event.detail}` : ''}`,
            }))}
            emptyText="No published examination events are available."
          />

          <Text style={styles.section}>Examination schedule revisions</Text>
          <RecordList
            items={cal.examPackages.flatMap((pack) => pack.schedules.map((item) => ({
              id: item.id,
              title: `${pack.term.label} · Revision ${item.revision}`,
              meta: item.publishedAt ? `Published ${item.publishedAt}` : 'Draft schedule',
              status: item.state,
            })))}
            emptyText="No examination schedule revisions have been created."
          />

          <Text style={styles.hint}>
            Daily lessons and examination times are read from the published timetable. This screen only submits session and term dates through the current backend; it does not create unimplemented calendar exceptions or manually insert daily activities.
          </Text>
        </>
      ) : null}

      <SelectSheet
        visible={picker === 'session'}
        label="Select academic session"
        options={sessionOptions}
        value={termSessionId}
        onSelect={(value) => {
          setTermSessionId(value);
          const session = state.sessions.find((item) => item.id === value);
          const used = new Set((session?.terms ?? []).map((item) => String(item.number)));
          setTermNumber(['1', '2', '3'].find((item) => !used.has(item)) ?? '1');
        }}
        onClose={() => setPicker(null)}
      />
      <SelectSheet
        visible={picker === 'term'}
        label="Select term number"
        options={[1, 2, 3].map((value) => ({ value: String(value), label: `Term ${value}` }))}
        value={termNumber}
        onSelect={setTermNumber}
        onClose={() => setPicker(null)}
      />
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  formLabel: { ...typography.label, color: colors.muted, marginTop: spacing.md, marginBottom: spacing.xs },
  pickerLabel: { ...typography.label, color: colors.muted, marginTop: spacing.xs },
  pickerValue: {
    ...typography.body,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
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
