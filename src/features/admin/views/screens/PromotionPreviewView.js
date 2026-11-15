/**
 * AD26 — Preview promotion or completion (View). Build a preview per class,
 * review the computed rows, flip any decision, save. Validation and the
 * final confirm live in AD27.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import SelectSheet from '../components/SelectSheet';
import StatusBadge from '../components/StatusBadge';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import LabelledField from '../components/LabelledField';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { PromotionPreviewPresenter } from '../../presenters/PromotionPreviewPresenter';
import { PromotionModel, AcademicStructureModel } from '../../models';
import { destinationLabel } from '../../utils/validators';
import { colors, typography, spacing } from '../theme';

export default function PromotionPreviewView({ navigation }) {
  const [presenter] = useState(() => new PromotionPreviewPresenter(PromotionModel, AcademicStructureModel));
  const [state, setState] = useState(presenter.initialState);
  const [classLabel, setClassLabel] = useState('');
  const [classSheet, setClassSheet] = useState(false);

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    return () => presenter.detach();
  }, [presenter, navigation]);

  useActionErrorAlert(state.errorText);

  const preview = state.preview;
  const graduating = preview ? preview.classLabel.startsWith('SSS3') : false;

  // Tapping a student card opens a FULL-DETAILS popup: who they are, their
  // average, the decision they carry now, where that decision sends them —
  // and the decision buttons live inside the popup too.
  const [detailsRow, setDetailsRow] = useState(null);

  const onRowPress = (row) => {
    setDetailsRow(row);
  };

  return (
    <AdminScaffold
      eyebrow="Records"
      title={preview ? `Preview — ${preview.classLabel}` : 'Preview promotion or completion'}
      subtitle={
        preview
          ? `${preview.classLabel} · ${preview.status} · promote ${preview.summary.promote} · repeat ${preview.summary.repeat} · graduate ${preview.summary.graduate}`
          : 'Who would move up, repeat, or graduate — before anything is final.'
      }
      onBack={preview ? () => presenter.closePreview() : undefined}
    >
      {state.status === 'loading' ? <LoadingView label="Loading the previews…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' && !preview ? (
        <View>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}

          <Text style={styles.section}>Build a preview</Text>
          <LabelledField
            label="Class"
            placeholder="Tap to pick the class to preview"
            displayValue={classLabel}
            onPress={() => setClassSheet(true)}
          />
          <View style={styles.actionsWrap}>
            <PrimaryButton
              label={state.saving ? 'Computing…' : 'Compute the preview'}
              disabled={state.saving || !classLabel}
              onPress={async () => {
                await presenter.buildPreview(classLabel);
                setClassLabel('');
              }}
            />
          </View>

          <Text style={styles.section}>Existing previews</Text>
          <RecordList
            items={state.previews.map((p) => ({
              id: p.id,
              title: `${p.classLabel} · ${p.sessionLabel}`,
              meta: `Promote ${p.summary.promote} · repeat ${p.summary.repeat} · graduate ${p.summary.graduate} · computed ${p.computedAt}`,
              status: p.status,
              raw: p,
            }))}
            onPressItem={(row) => presenter.open(row.raw.id)}
            emptyText="No previews yet — build the first one above."
          />
        </View>
      ) : null}

      {state.status === 'content' && preview ? (
        <View>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
          <View style={styles.badgeRow}>
            <StatusBadge label={preview.status} tone={preview.status === 'Confirmed' ? 'positive' : 'info'} />
            <Text style={styles.badgeMeta}>
              Promote {preview.summary.promote} · repeat {preview.summary.repeat} · graduate{' '}
              {preview.summary.graduate}
            </Text>
          </View>

          <RecordList
            items={preview.rows.map((r) => ({
              id: String(r.studentId),
              title: r.fullName,
              meta: `Average ${r.average}% — ${destinationLabel(preview.classLabel, r.decision)}`,
              status: r.decision,
              // The tap opens the decision picker; the card is not a link to
              // another page, so no arrow.
              static: true,
              raw: r,
            }))}
            onPressItem={(row) => {
              if (preview.status !== 'Confirmed') onRowPress(row.raw);
            }}
            emptyText="No students in this preview."
          />
          {preview.status === 'Confirmed' ? (
            <Text style={styles.hint}>This preview is confirmed — decisions are frozen.</Text>
          ) : (
            <Text style={styles.hint}>
              Tap a student to see their full details and change their
              decision, then Save decisions. Students only move when this
              preview is confirmed in &quot;Approve promotion and graduation&quot;
              — JSS1 becomes JSS2, JSS3 becomes SSS1, and SSS3 graduates.
            </Text>
          )}

          <View style={styles.actionsWrap}>
            {preview.status !== 'Confirmed' ? (
              <PrimaryButton
                label={state.saving ? 'Saving…' : 'Save decisions'}
                disabled={state.saving}
                onPress={() => presenter.saveDecisions()}
              />
            ) : null}
            <View style={styles.secondaryWrap}>
              <SecondaryButton label="Back to all previews" onPress={() => presenter.closePreview()} />
            </View>
          </View>
        </View>
      ) : null}

      <SelectSheet
        visible={classSheet}
        label="Class to preview"
        options={state.classOptions.map((c) => ({ label: c.classLabel, value: c.classLabel }))}
        onSelect={(value) => {
          setClassLabel(value);
          setClassSheet(false);
        }}
        onClose={() => setClassSheet(false)}
      />

      {/* Full-details popup for one student in the preview. */}
      <Modal visible={Boolean(detailsRow)} transparent animationType="fade" onRequestClose={() => setDetailsRow(null)}>
        <View style={styles.detailsBackdrop}>
          <Pressable style={styles.detailsBackdropTouch} onPress={() => setDetailsRow(null)} />
          <View style={styles.detailsCard}>
            <Text style={styles.detailsName}>{detailsRow ? detailsRow.fullName : ''}</Text>
            <Text style={styles.detailsMeta}>
              {preview ? `${preview.classLabel} · ${preview.sessionLabel}` : ''}
            </Text>
            <Text style={styles.detailsLine}>
              Average: {detailsRow ? `${detailsRow.average}%` : '—'}
            </Text>
            <Text style={styles.detailsLine}>
              Decision now: {detailsRow ? detailsRow.decision : '—'}
            </Text>
            <Text style={styles.detailsLine}>
              {detailsRow && preview ? destinationLabel(preview.classLabel, detailsRow.decision) : ''}
            </Text>
            {preview && preview.status !== 'Confirmed' ? (
              <View style={styles.detailsActions}>
                <Pressable
                  style={[styles.detailsButton, styles.detailsSecondary]}
                  onPress={() => {
                    presenter.setDecision(detailsRow.studentId, 'Repeat');
                    setDetailsRow(null);
                  }}
                >
                  <Text style={styles.detailsButtonText}>
                    Repeat · stays in {preview ? preview.classLabel : ''}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.detailsButton}
                  onPress={() => {
                    presenter.setDecision(detailsRow.studentId, graduating ? 'Graduate' : 'Promote');
                    setDetailsRow(null);
                  }}
                >
                  <Text style={[styles.detailsButtonText, { color: '#fff' }]}>
                    {graduating
                      ? 'Graduate · leaves with their result slip'
                      : 'Promote · moves to the next class'}
                  </Text>
                </Pressable>
                <Pressable style={styles.detailsClose} onPress={() => setDetailsRow(null)}>
                  <Text style={styles.detailsCloseText}>Close</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.detailsClose} onPress={() => setDetailsRow(null)}>
                <Text style={styles.detailsCloseText}>Close</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  detailsBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  detailsBackdropTouch: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  detailsCard: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 2, borderColor: colors.primary, padding: spacing.md, width: '100%', maxWidth: 480 },
  detailsName: { ...typography.title, marginBottom: 2 },
  detailsMeta: { ...typography.label, color: colors.muted, marginBottom: spacing.sm },
  detailsLine: { ...typography.body, marginBottom: 2 },
  detailsActions: { marginTop: spacing.md, gap: spacing.sm },
  detailsButton: { minHeight: 44, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  detailsSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  detailsButtonText: { ...typography.body, fontWeight: '700', color: colors.text, textAlign: 'center' },
  detailsClose: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  detailsCloseText: { ...typography.label, color: colors.muted },
  notice: { ...typography.body, color: colors.primary, marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.muted, marginTop: spacing.sm },
  section: { ...typography.sectionTitle, marginTop: spacing.md, marginBottom: spacing.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  badgeMeta: { ...typography.label, color: colors.muted, flex: 1 },
  actionsWrap: { marginTop: spacing.md },
  secondaryWrap: { marginTop: spacing.xs },
});
