/**
 * AD29 — School messages for Principal and School Office.
 * A conversation is tied to one student, a linked guardian and an
 * authorised destination selected by the backend.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import SelectSheet from '../components/SelectSheet';
import {
  LoadingView,
  EmptyState,
  ErrorState,
  Notice,
} from '../components/FeedbackViews';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { MessageInboxPresenter } from '../../presenters/MessageInboxPresenter';
import { MessagesModel, StudentModel } from '../../models';
import { getActiveContext } from '../../api/client';
import { colors, typography, spacing } from '../theme';

export default function MessageInboxView({ navigation }) {
  const [presenter] = useState(() =>
    new MessageInboxPresenter(MessagesModel, StudentModel, getActiveContext())
  );
  const [state, setState] = useState(presenter.initialState);
  const [composerOpen, setComposerOpen] = useState(false);
  const [studentSheet, setStudentSheet] = useState(false);
  const [guardianSheet, setGuardianSheet] = useState(false);
  const [targetSheet, setTargetSheet] = useState(false);
  const [subject, setSubject] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const loadedOnce = useRef(false);

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current) presenter.load();
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation]);

  const openComposer = async () => {
    await presenter.loadRecipients(() => setComposerOpen(true));
  };

  const chooseStudent = async (studentId) => {
    setStudentSheet(false);
    const ready = await presenter.loadPeople(studentId);
    if (ready) setGuardianSheet(true);
  };

  const chooseGuardian = (guardianId) => {
    presenter.selectGuardian(guardianId);
    setGuardianSheet(false);
    if (state.targets.length > 1) setTargetSheet(true);
  };

  const startConversation = async () => {
    const started = await presenter.onStartConversation({
      subject,
      body: firstMessage,
    });
    if (started) {
      setSubject('');
      setFirstMessage('');
      setComposerOpen(false);
    }
  };

  const selectedStudent = state.students.find((item) => item.id === state.selectedStudentId);
  const selectedGuardian = state.guardians.find((item) => item.id === state.selectedGuardianId);
  const selectedTarget = state.targets.find((item) => item.value === state.selectedTarget);

  return (
    <AdminScaffold
      eyebrow="Messages"
      title="School messages"
      subtitle="Private conversations linked to an enrolled student and an authorised guardian."
    >
      {state.status === 'loading' ? <LoadingView label="Loading school conversations…" /> : null}
      {state.status === 'empty' ? (
        <EmptyState title="No conversations yet" hint="New conversations opened by the school will appear here." />
      ) : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}
      {state.errorText && state.status !== 'error' ? <Notice text={state.errorText} tone="error" /> : null}
      {state.notice ? <Notice text={state.notice} /> : null}

      {state.status === 'content' ? (
        <RecordList
          items={state.conversations.map((conversation) => ({
            id: conversation.id,
            title: conversation.title,
            meta: [
              conversation.participantLabel,
              conversation.studentLabel,
              conversation.stateLabel,
            ].filter(Boolean).join(' · '),
            status: conversation.state === 'OPEN' ? 'Open' : conversation.stateLabel,
            raw: conversation,
          }))}
          onPressItem={(row) => presenter.onOpenConversation(row.raw)}
          emptyText="No conversations yet."
        />
      ) : null}

      <View style={{ marginTop: spacing.md }}>
        <PrimaryButton
          label={composerOpen ? 'Conversation composer open' : 'New conversation'}
          onPress={openComposer}
          disabled={state.starting || !['PRINCIPAL', 'SCHOOL_OFFICE'].includes(getActiveContext().role)}
        />
      </View>

      {composerOpen ? (
        <View style={styles.composer}>
          <Text style={styles.composerTitle}>Start a school conversation</Text>

          <SecondaryButton
            label={selectedStudent
              ? selectedStudent.name + (selectedStudent.classLabel ? ' · ' + selectedStudent.classLabel : '')
              : 'Choose student'}
            onPress={() => setStudentSheet(true)}
            disabled={state.starting}
          />

          {state.contacts ? (
            <>
              <SecondaryButton
                label={selectedGuardian?.label ?? 'Choose linked guardian'}
                onPress={() => setGuardianSheet(true)}
                disabled={!state.guardians.length || state.starting}
              />
              <SecondaryButton
                label={selectedTarget?.label ?? 'Choose destination'}
                onPress={() => setTargetSheet(true)}
                disabled={state.targets.length < 2 || state.starting}
              />
              {!state.guardians.length ? (
                <Notice text="A conversation cannot start until the student has a linked guardian with learning access." tone="warning" />
              ) : null}
            </>
          ) : selectedStudent ? (
            <Notice text="Checking the student's linked guardian permissions…" />
          ) : (
            <Notice text="Choose a student to load only the guardians with active learning access." />
          )}

          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="Conversation subject"
            placeholderTextColor={colors.muted}
            maxLength={160}
            editable={!state.starting}
          />
          <TextInput
            style={[styles.input, styles.messageInput]}
            multiline
            value={firstMessage}
            onChangeText={setFirstMessage}
            placeholder="Write the first message"
            placeholderTextColor={colors.muted}
            maxLength={8000}
            editable={!state.starting}
          />
          <PrimaryButton
            label={state.starting ? 'Starting conversation…' : 'Start conversation'}
            onPress={startConversation}
            disabled={
              state.starting ||
              !selectedStudent ||
              !selectedGuardian ||
              !selectedTarget ||
              subject.trim().length < 3 ||
              firstMessage.trim().length < 2
            }
          />
          <SecondaryButton
            label="Cancel"
            onPress={() => setComposerOpen(false)}
            disabled={state.starting}
          />
        </View>
      ) : null}

      <SelectSheet
        visible={studentSheet}
        label="Choose a student"
        options={state.students.map((student) => ({
          value: student.id,
          label: student.name + (student.classLabel ? ' · ' + student.classLabel : ''),
        }))}
        value={state.selectedStudentId}
        onSelect={chooseStudent}
        onClose={() => setStudentSheet(false)}
      />
      <SelectSheet
        visible={guardianSheet}
        label="Choose a linked guardian with learning access"
        options={state.guardians.map((guardian) => ({
          value: guardian.id,
          label: guardian.label,
        }))}
        value={state.selectedGuardianId}
        onSelect={chooseGuardian}
        onClose={() => setGuardianSheet(false)}
      />
      <SelectSheet
        visible={targetSheet}
        label="Choose conversation destination"
        options={state.targets}
        value={state.selectedTarget}
        onSelect={(value) => presenter.selectTarget(value)}
        onClose={() => setTargetSheet(false)}
      />
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  composer: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt ?? colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  composerTitle: { ...typography.sectionTitle },
  input: {
    ...typography.input,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 46,
    marginTop: spacing.xs,
  },
  messageInput: { minHeight: 100, textAlignVertical: 'top' },
});
