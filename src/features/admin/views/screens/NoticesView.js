/**
 * AD28 — School announcements. Draft creation, scoped delivery and
 * versioned publication/archive actions are backed by the communication API.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Pressable } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import LabelledField from '../components/LabelledField';
import SelectSheet from '../components/SelectSheet';
import {
  LoadingView,
  EmptyState,
  ErrorState,
  useActionErrorAlert,
} from '../components/FeedbackViews';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { NoticesPresenter } from '../../presenters/NoticesPresenter';
import { NoticesModel, AcademicStructureModel } from '../../models';
import { colors, typography, spacing } from '../theme';

const AUDIENCES = [
  { label: 'Everyone in the school', value: 'SCHOOL' },
  { label: 'One class', value: 'CLASS' },
  { label: 'One SSS department in a class', value: 'DEPARTMENT' },
];

const DEPARTMENTS = [
  { label: 'Science', value: 'SCIENCE' },
  { label: 'Arts', value: 'ARTS' },
  { label: 'Commercial', value: 'COMMERCIAL' },
];

export default function NoticesView({ navigation }) {
  const [presenter] = useState(() => new NoticesPresenter(NoticesModel, AcademicStructureModel));
  const [state, setState] = useState(presenter.initialState);
  const [audienceSheetVisible, setAudienceSheetVisible] = useState(false);
  const [classSheetVisible, setClassSheetVisible] = useState(false);
  const [departmentSheetVisible, setDepartmentSheetVisible] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [archiveDraft, setArchiveDraft] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');
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

  const { composer } = state;
  const audienceLabel =
    AUDIENCES.find((item) => item.value === composer.audience)?.label || composer.audience;
  const selectedClass = state.classes.find((item) => item.id === composer.classId);
  const isDepartmentAudience = composer.audience === 'DEPARTMENT';
  const needsClass = ['CLASS', 'DEPARTMENT'].includes(composer.audience);

  useActionErrorAlert(composer.errorText, 'Notice not sent');
  useActionErrorAlert(state.errorText, 'Notice action failed');

  return (
    <AdminScaffold
      eyebrow="Messages"
      title="School announcements"
      subtitle="Save a draft for the whole school, a class or a class department; publish after review."
    >
      {state.status === 'loading' ? <LoadingView /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}
      {state.status === 'empty' ? (
        <EmptyState title="No announcements yet" hint="Use the composer below to create a draft." />
      ) : null}
      {state.status === 'content' ? (
        <RecordList
          items={state.notices.map((notice) => ({
            id: notice.id,
            title: notice.title,
            meta: `${notice.audienceLabel || 'School audience'}${notice.publishedAt ? ` · published ${notice.publishedAt}` : ''}`,
            status: notice.status,
            raw: notice,
          }))}
          onPressItem={(row) => setActionNotice(row.raw)}
          emptyText="No announcements yet."
        />
      ) : null}
      {state.status === 'content' ? (
        <Text style={styles.hint}>Tap a draft to publish or archive it. Published notices can be archived.</Text>
      ) : null}

      <Text style={styles.section}>New announcement</Text>
      <LabelledField
        label="Title"
        value={composer.title}
        onChangeText={(value) => presenter.onComposerChange('title', value)}
        placeholder="e.g. Mid-term break"
        error={composer.validationErrors.title}
      />
      <LabelledField
        label="Message"
        value={composer.body}
        onChangeText={(value) => presenter.onComposerChange('body', value)}
        placeholder="What should the selected audience know?"
        error={composer.validationErrors.body}
        multiline
      />
      <LabelledField
        label="Audience"
        displayValue={audienceLabel}
        onPress={() => setAudienceSheetVisible(true)}
        error={composer.validationErrors.audience}
      />
      {needsClass ? (
        <LabelledField
          label="Class"
          placeholder="Choose a class"
          displayValue={selectedClass?.classLabel ?? ''}
          onPress={() => setClassSheetVisible(true)}
          error={composer.validationErrors.classId}
        />
      ) : null}
      {isDepartmentAudience ? (
        <LabelledField
          label="Department"
          placeholder="Choose Science, Arts or Commercial"
          displayValue={DEPARTMENTS.find((item) => item.value === composer.department)?.label ?? ''}
          onPress={() => setDepartmentSheetVisible(true)}
          error={composer.validationErrors.department}
        />
      ) : null}

      {composer.state === 'accepted' ? (
        <Text style={styles.accepted}>Draft saved. Publish it from the announcement list when ready.</Text>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton
          label={
            composer.state === 'saving'
              ? 'Saving…'
              : composer.state === 'accepted'
                ? 'Saved ✓'
                : 'Save announcement as draft'
          }
          onPress={() => presenter.submitNotice()}
          disabled={composer.state === 'saving'}
        />
      </View>

      <SelectSheet
        visible={audienceSheetVisible}
        label="Notice audience"
        options={AUDIENCES}
        value={composer.audience}
        onSelect={(value) => presenter.onComposerChange('audience', value)}
        onClose={() => setAudienceSheetVisible(false)}
      />
      <SelectSheet
        visible={classSheetVisible}
        label="Choose class"
        options={state.classes
          .filter((item) => !isDepartmentAudience || ['SSS1', 'SSS2', 'SSS3'].includes(item.level))
          .map((item) => ({ label: item.classLabel, value: item.id }))}
        value={composer.classId}
        onSelect={(value) => presenter.onComposerChange('classId', value)}
        onClose={() => setClassSheetVisible(false)}
      />
      <SelectSheet
        visible={departmentSheetVisible}
        label="Choose department"
        options={DEPARTMENTS}
        value={composer.department}
        onSelect={(value) => presenter.onComposerChange('department', value)}
        onClose={() => setDepartmentSheetVisible(false)}
      />
      <SelectSheet
        visible={Boolean(actionNotice)}
        label={actionNotice ? actionNotice.title : 'Announcement'}
        options={
          actionNotice?.status === 'Draft'
            ? [
                { label: 'Publish now', value: 'publish' },
                { label: 'Archive draft', value: 'archive' },
              ]
            : actionNotice?.status === 'Published'
              ? [{ label: 'Archive notice', value: 'archive' }]
              : []
        }
        value={null}
        onSelect={(value) => {
          const notice = actionNotice;
          setActionNotice(null);
          if (value === 'publish') presenter.publishNotice(notice);
          if (value === 'archive') {
            setArchiveDraft(notice);
            setArchiveReason('');
          }
        }}
        onClose={() => setActionNotice(null)}
      />

      <Modal
        visible={Boolean(archiveDraft)}
        transparent
        animationType="fade"
        onRequestClose={() => setArchiveDraft(null)}
      >
        <View style={styles.archiveBackdrop}>
          <Pressable style={styles.archiveBackdropTouch} onPress={() => setArchiveDraft(null)} />
          <View style={styles.archiveCard}>
            <Text style={styles.archiveTitle}>Archive announcement</Text>
            <Text style={styles.hint}>
              This action is recorded in the school audit history.
            </Text>
            <TextInput
              style={styles.archiveInput}
              multiline
              placeholder="Reason for archiving this notice (at least five characters)"
              placeholderTextColor={colors.muted}
              value={archiveReason}
              onChangeText={setArchiveReason}
            />
            <PrimaryButton
              label="Confirm archive"
              disabled={archiveReason.trim().length < 5}
              onPress={async () => {
                const notice = archiveDraft;
                setArchiveDraft(null);
                await presenter.archiveNotice(notice, archiveReason);
                setArchiveReason('');
              }}
            />
            <SecondaryButton
              label="Cancel"
              onPress={() => setArchiveDraft(null)}
            />
          </View>
        </View>
      </Modal>
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  accepted: { ...typography.label, color: colors.primary, marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.muted, marginTop: spacing.sm },
  actions: { marginTop: spacing.sm, gap: spacing.sm },
  archiveBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  archiveBackdropTouch: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  archiveCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  archiveTitle: { ...typography.sectionTitle },
  archiveInput: {
    ...typography.input,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 80,
  },
});
