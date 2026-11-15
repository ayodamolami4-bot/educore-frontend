/**
 * AD28 — School announcements (View). Two parts: the notice list and the
 * composer. The composer demonstrates the safe-submission UI: inline errors,
 * disabled submit while saving, accepted confirmation after the backend
 * response — all driven by NoticesPresenter state.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import LabelledField from '../components/LabelledField';
import SelectSheet from '../components/SelectSheet';
import { LoadingView, EmptyState, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { PrimaryButton } from './AdminHomeView';
import { NoticesPresenter } from '../../presenters/NoticesPresenter';
import { NoticesModel } from '../../models';
import { colors, typography, spacing } from '../theme';

const AUDIENCES = [
  { label: 'Everyone', value: 'ALL' },
  { label: 'All teachers', value: 'ROLE_TEACHERS' },
  { label: 'All parents', value: 'ROLE_PARENTS' },
  { label: 'A class', value: 'CLASS' },
];

export default function NoticesView({ navigation }) {
  const [presenter] = useState(() => new NoticesPresenter(NoticesModel));
  const [state, setState] = useState(presenter.initialState);
  const [audienceSheetVisible, setAudienceSheetVisible] = useState(false);
  const [actionNotice, setActionNotice] = useState(null); // notice awaiting publish/archive
  const loadedOnce = useRef(false);

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    // Notice statuses can change after composer actions elsewhere, so re-fetch
    // on every focus after the first.
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
    AUDIENCES.find((a) => a.value === composer.audience)?.label || composer.audience;

  // Composer failures pop up instead of inline text.
  useActionErrorAlert(composer.errorText, 'Notice not sent');

  return (
    <AdminScaffold
      eyebrow="Messages"
      title="School announcements"
      subtitle="Publish notices families and staff will see."
    >
      {state.status === 'loading' ? <LoadingView /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry?.()} />
      ) : null}
      {state.status === 'empty' ? (
        <EmptyState title="No announcements yet" hint="Use the composer below to publish one." />
      ) : null}
      {state.status === 'content' ? (
        <RecordList
          items={state.notices.map((n) => ({
            id: n.id,
            title: n.title,
            meta: `${n.audienceLabel || n.audience || ''}${
              n.publishedAt ? ` · published ${n.publishedAt}` : ''
            }`,
            status: n.status,
            raw: n,
          }))}
          onPressItem={(row) => setActionNotice(row.raw)}
          emptyText="No announcements yet."
        />
      ) : null}
      {state.status === 'content' ? (
        <Text style={styles.hint}>Tap an announcement to publish or archive it.</Text>
      ) : null}

      <Text style={styles.section}>New announcement</Text>
      <LabelledField
        label="Title"
        value={composer.title}
        onChangeText={(t) => presenter.onComposerChange('title', t)}
        placeholder="e.g. Mid-term break"
        error={composer.validationErrors.title}
      />
      <LabelledField
        label="Message"
        value={composer.body}
        onChangeText={(t) => presenter.onComposerChange('body', t)}
        placeholder="What should everyone know?"
        error={composer.validationErrors.body}
        multiline
      />
      <LabelledField
        label="Audience"
        displayValue={audienceLabel}
        onPress={() => setAudienceSheetVisible(true)}
      />

      {composer.state === 'accepted' ? (
        <Text style={styles.accepted}>Notice accepted — it is on its way to the audience.</Text>
      ) : null}

      <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
        <PrimaryButton
          label={
            composer.state === 'saving'
              ? 'Saving…'
              : composer.state === 'accepted'
                ? 'Saved ✓'
                : 'Save announcement (as draft)'
          }
          onPress={() => presenter.submitNotice()}
          disabled={composer.state === 'saving'}
        />
      </View>

      <SelectSheet
        visible={audienceSheetVisible}
        label="Audience"
        options={AUDIENCES}
        value={composer.audience}
        onSelect={(v) => presenter.onComposerChange('audience', v)}
        onClose={() => setAudienceSheetVisible(false)}
      />
      <SelectSheet
        visible={Boolean(actionNotice)}
        label={actionNotice ? actionNotice.title : 'Announcement'}
        options={
          actionNotice && (actionNotice.status === 'Draft' || actionNotice.status === 'Archived')
            ? [
                { label: 'Publish now', value: 'publish' },
                { label: 'Archive', value: 'archive' },
              ]
            : [{ label: 'Archive', value: 'archive' }]
        }
        value={null}
        onSelect={(v) => {
          const notice = actionNotice;
          setActionNotice(null);
          if (v === 'publish') presenter.publishNotice(notice);
          if (v === 'archive') presenter.archiveNotice(notice);
        }}
        onClose={() => setActionNotice(null)}
      />
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  error: { ...typography.label, color: '#a33a2a', marginBottom: spacing.sm },
  accepted: { ...typography.label, color: colors.primary, marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.muted, marginTop: spacing.sm },
});
