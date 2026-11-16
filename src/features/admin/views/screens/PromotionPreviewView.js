/**
 * AD26 — Prepare and review class promotion outcomes using official reports.
 * Each student's reviewed decision is saved separately with its row version.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, StyleSheet, Alert } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import SelectSheet from '../components/SelectSheet';
import StatusBadge from '../components/StatusBadge';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import LabelledField from '../components/LabelledField';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { PromotionPreviewPresenter } from '../../presenters/PromotionPreviewPresenter';
import { PromotionModel, AcademicStructureModel, CalendarModel } from '../../models';
import { colors, typography, spacing } from '../theme';

const DEPARTMENTS = [
  { label: 'Science', value: 'SCIENCE' },
  { label: 'Arts', value: 'ARTS' },
  { label: 'Commercial', value: 'COMMERCIAL' },
];

const nextLevel = (level) => ({
  JSS1: 'JSS2',
  JSS2: 'JSS3',
  JSS3: 'SSS1',
  SSS1: 'SSS2',
  SSS2: 'SSS3',
}[level] ?? '');

export default function PromotionPreviewView({ navigation }) {
  const [presenter] = useState(
    () => new PromotionPreviewPresenter(PromotionModel, AcademicStructureModel, CalendarModel),
  );
  const [state, setState] = useState(presenter.initialState);
  const [sourceSessionId, setSourceSessionId] = useState('');
  const [targetSessionId, setTargetSessionId] = useState('');
  const [sourceClassId, setSourceClassId] = useState('');
  const [sourceSessionSheet, setSourceSessionSheet] = useState(false);
  const [targetSessionSheet, setTargetSessionSheet] = useState(false);
  const [sourceClassSheet, setSourceClassSheet] = useState(false);
  const [targetClassSheet, setTargetClassSheet] = useState(false);
  const [departmentSheet, setDepartmentSheet] = useState(false);
  const [detailsRow, setDetailsRow] = useState(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [department, setDepartment] = useState('');

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    return () => presenter.detach();
  }, [presenter, navigation]);

  useActionErrorAlert(state.errorText);

  const preview = state.preview;
  const sourceSession = state.sessions.find((session) => session.id === sourceSessionId);
  const sourceClass = state.classOptions.find((item) => item.id === sourceClassId);
  const sourceClasses = state.classOptions.filter((item) => item.sessionId === sourceSessionId);
  const validTargetSessions = state.sessions.filter((session) =>
    sourceSession && session.startsOn > sourceSession.endsOn
  );
  const requiredTargetSession = sourceClass?.level !== 'SSS3';
  const expectedPromotionLevel = nextLevel(preview?.sourceLevel);
  const targetClassOptions = (preview?.targetClasses ?? []).filter((item) =>
    [preview?.sourceLevel, expectedPromotionLevel].includes(item.level)
  );
  const selectedTargetClass = targetClassOptions.find((item) => item.id === targetClassId);
  const graduating = preview?.sourceLevel === 'SSS3';
  const completion = preview?.sourceLevel === 'JSS3';

  const onRowPress = (row) => {
    setDetailsRow(row);
    setDecisionReason(row.decisionReason ?? '');
    setEvidenceReference(row.evidenceReference ?? '');
    setTargetClassId(row.targetClassId ?? '');
    setDepartment(row.department ?? '');
  };

  const selectOutcome = (decisionCode) => {
    if (!detailsRow || !preview) return;
    const reason = decisionReason.trim();
    if (reason.length < (decisionCode === 'PROMOTE' && detailsRow.recommendationCode !== 'PROMOTE' ||
      decisionCode === 'JSS_COMPLETE' && detailsRow.recommendationCode !== 'PROMOTE' ||
      decisionCode === 'GRADUATE' && detailsRow.recommendationCode !== 'PROMOTE' ? 10 : 5)) {
      Alert.alert('Reason required', 'Enter a reason of at least five characters. Documented exceptions require at least ten.');
      return;
    }

    let chosenClassId = null;
    let chosenDepartment = null;
    if (decisionCode !== 'GRADUATE') {
      const target = targetClassOptions.find((item) => item.id === targetClassId);
      const expectedLevel = decisionCode === 'REPEAT'
        ? preview.sourceLevel
        : decisionCode === 'JSS_COMPLETE' ? 'SSS1' : expectedPromotionLevel;
      if (!target || target.level !== expectedLevel) {
        Alert.alert('Target class required', `Choose a class in the ${expectedLevel} level for this outcome.`);
        return;
      }
      chosenClassId = target.id;
      if (String(target.level).startsWith('SSS')) {
        if (!department) {
          Alert.alert('Department required', 'Choose Science, Arts or Commercial for an SSS placement.');
          return;
        }
        chosenDepartment = department;
      }
    }

    const overridesRecommendation =
      detailsRow.recommendationCode !== 'PROMOTE' &&
      ['PROMOTE', 'JSS_COMPLETE', 'GRADUATE'].includes(decisionCode);
    if (overridesRecommendation && evidenceReference.trim().length < 5) {
      Alert.alert('Evidence required', 'Record a document or evidence reference for an exception to the system recommendation.');
      return;
    }

    presenter.setDecision(detailsRow.studentId, decisionCode, {
      reason,
      targetClassId: chosenClassId,
      department: chosenDepartment,
      evidenceReference,
    });
    setDetailsRow(null);
  };

  return (
    <AdminScaffold
      eyebrow="Records"
      title={preview ? `Preview — ${preview.classLabel}` : 'Preview promotion or completion'}
      subtitle={
        preview
          ? `${preview.classLabel} · ${preview.sessionLabel} · ${preview.status} · promote ${preview.summary.promote} · repeat ${preview.summary.repeat} · graduate ${preview.summary.graduate} · review ${preview.summary.review}`
          : 'Review the official annual evidence before recording each student’s outcome.'
      }
      onBack={preview ? () => presenter.closePreview() : undefined}
    >
      {state.status === 'loading' ? <LoadingView label="Loading sessions, classes and promotion previews…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' && !preview ? (
        <View>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
          <Text style={styles.section}>Build a promotion preview</Text>
          <LabelledField
            label="Source academic session"
            placeholder="Choose the session being completed"
            displayValue={state.sessions.find((item) => item.id === sourceSessionId)?.name ?? ''}
            onPress={() => setSourceSessionSheet(true)}
          />
          <LabelledField
            label="Target academic session"
            placeholder={sourceClass?.level === 'SSS3' ? 'Not required for SSS3 graduates' : 'Choose the next session'}
            displayValue={state.sessions.find((item) => item.id === targetSessionId)?.name ?? ''}
            onPress={() => setTargetSessionSheet(true)}
          />
          <LabelledField
            label="Source class"
            placeholder={sourceSessionId ? 'Choose a class in the source session' : 'Choose the source session first'}
            displayValue={sourceClass?.classLabel ?? ''}
            onPress={() => {
              if (!sourceSessionId) {
                Alert.alert('Source session required', 'Choose the academic session first.');
                return;
              }
              setSourceClassSheet(true);
            }}
          />
          <View style={styles.actionsWrap}>
            <PrimaryButton
              label={state.saving ? 'Computing…' : 'Compute the preview'}
              disabled={
                state.saving ||
                !sourceSessionId ||
                !sourceClassId ||
                (requiredTargetSession && !targetSessionId)
              }
              onPress={async () => {
                await presenter.buildPreview({
                  sourceSessionId,
                  targetSessionId: targetSessionId || null,
                  sourceClassId,
                });
                setSourceSessionId('');
                setTargetSessionId('');
                setSourceClassId('');
              }}
            />
          </View>

          <Text style={styles.section}>Existing previews</Text>
          <RecordList
            items={state.previews.map((item) => ({
              id: item.id,
              title: `${item.classLabel} · ${item.sessionLabel}`,
              meta: `Promote ${item.summary.promote} · repeat ${item.summary.repeat} · graduate ${item.summary.graduate} · review ${item.summary.review}`,
              status: item.status,
              raw: item,
            }))}
            onPressItem={(row) => presenter.open(row.raw.id)}
            emptyText="No previews yet — choose a completed session and class above."
          />
        </View>
      ) : null}

      {state.status === 'content' && preview ? (
        <View>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
          <View style={styles.badgeRow}>
            <StatusBadge
              label={preview.status}
              tone={preview.status === 'Confirmed' ? 'positive' : 'info'}
            />
            <Text style={styles.badgeMeta}>
              Promote {preview.summary.promote} · repeat {preview.summary.repeat} · graduate{' '}
              {preview.summary.graduate} · review {preview.summary.review}
            </Text>
          </View>

          <RecordList
            items={preview.rows.map((row) => ({
              id: String(row.studentId),
              title: row.fullName,
              meta: [
                row.average != null ? `Annual mean ${row.average}%` : 'Annual mean unavailable',
                row.targetClassLabel || '',
                row.recommendationCode ? `System recommendation: ${row.recommendationCode}` : '',
              ].filter(Boolean).join(' · '),
              status: row.decision,
              static: true,
              raw: row,
            }))}
            onPressItem={(row) => {
              if (preview.status !== 'Confirmed') onRowPress(row.raw);
            }}
            emptyText="No students in this preview."
          />

          {preview.status === 'Confirmed' ? (
            <Text style={styles.hint}>This preview is confirmed — student outcomes are frozen.</Text>
          ) : (
            <Text style={styles.hint}>
              Every student must have a reviewed outcome, target class where required, and an audit reason. Exception outcomes also need evidence. The Principal confirms the whole batch only after reviewing all rows.
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
              <SecondaryButton
                label="Back to all previews"
                onPress={() => presenter.closePreview()}
              />
            </View>
          </View>
        </View>
      ) : null}

      <SelectSheet
        visible={sourceSessionSheet}
        label="Source academic session"
        options={state.sessions.map((session) => ({
          label: `${session.name} · ${session.startsOn} – ${session.endsOn}`,
          value: session.id,
        }))}
        value={sourceSessionId}
        onSelect={(value) => {
          setSourceSessionId(value);
          setSourceClassId('');
          setTargetSessionId('');
          setSourceSessionSheet(false);
        }}
        onClose={() => setSourceSessionSheet(false)}
      />
      <SelectSheet
        visible={targetSessionSheet}
        label="Target academic session"
        options={validTargetSessions.map((session) => ({
          label: `${session.name} · ${session.startsOn} – ${session.endsOn}`,
          value: session.id,
        }))}
        value={targetSessionId}
        onSelect={(value) => {
          setTargetSessionId(value);
          setSourceClassId(sourceClassId);
          setTargetSessionSheet(false);
        }}
        onClose={() => setTargetSessionSheet(false)}
      />
      <SelectSheet
        visible={sourceClassSheet}
        label="Source class"
        options={sourceClasses.map((item) => ({ label: item.classLabel, value: item.id }))}
        value={sourceClassId}
        onSelect={(value) => {
          setSourceClassId(value);
          const selected = state.classOptions.find((item) => item.id === value);
          if (selected?.level === 'SSS3') setTargetSessionId('');
          setSourceClassSheet(false);
        }}
        onClose={() => setSourceClassSheet(false)}
      />

      <Modal
        visible={Boolean(detailsRow)}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsRow(null)}
      >
        <View style={styles.detailsBackdrop}>
          <Pressable style={styles.detailsBackdropTouch} onPress={() => setDetailsRow(null)} />
          <View style={styles.detailsCard}>
            <Text style={styles.detailsName}>{detailsRow ? detailsRow.fullName : ''}</Text>
            <Text style={styles.detailsMeta}>
              {preview ? `${preview.classLabel} · ${preview.sessionLabel}` : ''}
            </Text>
            <Text style={styles.detailsLine}>
              Annual mean: {detailsRow?.average != null ? `${detailsRow.average}%` : 'Not available'}
            </Text>
            <Text style={styles.detailsLine}>
              Published-report recommendation: {detailsRow?.recommendationCode ?? 'Review'}
            </Text>
            {(detailsRow?.recommendationReasons ?? []).map((reason, index) => (
              <Text key={index} style={styles.detailsMeta}>{reason}</Text>
            ))}
            <Text style={styles.detailsLine}>Recorded outcome: {detailsRow?.decision ?? 'Needs decision'}</Text>

            {preview && preview.status !== 'Confirmed' ? (
              <>
                {!graduating ? (
                  <>
                    <LabelledField
                      label="Target class"
                      placeholder="Choose the class for this outcome"
                      displayValue={targetClassOptions.find((item) => item.id === targetClassId)?.classLabel ?? ''}
                      onPress={() => setTargetClassSheet(true)}
                    />
                    {selectedTargetClass?.level?.startsWith('SSS') ? (
                      <LabelledField
                        label="Department"
                        placeholder="Choose Science, Arts or Commercial"
                        displayValue={DEPARTMENTS.find((item) => item.value === department)?.label ?? ''}
                        onPress={() => setDepartmentSheet(true)}
                      />
                    ) : null}
                  </>
                ) : null}
                <TextInput
                  style={styles.textInput}
                  multiline
                  placeholder="Reason for this student's decision (minimum five characters)"
                  placeholderTextColor={colors.muted}
                  value={decisionReason}
                  onChangeText={setDecisionReason}
                />
                {detailsRow?.recommendationCode !== 'PROMOTE' ? (
                  <TextInput
                    style={styles.textInput}
                    placeholder="Evidence reference for an exception (when overriding the recommendation)"
                    placeholderTextColor={colors.muted}
                    value={evidenceReference}
                    onChangeText={setEvidenceReference}
                  />
                ) : null}
                <View style={styles.detailsActions}>
                  <Pressable
                    style={[styles.detailsButton, styles.detailsSecondary]}
                    onPress={() => selectOutcome('REPEAT')}
                  >
                    <Text style={styles.detailsButtonText}>
                      Repeat · remain in {preview?.sourceLevel}
                    </Text>
                  </Pressable>
                  {!graduating ? (
                    <Pressable
                      style={styles.detailsButton}
                      onPress={() => selectOutcome(completion ? 'JSS_COMPLETE' : 'PROMOTE')}
                    >
                      <Text style={[styles.detailsButtonText, { color: '#fff' }]}>
                        {completion ? 'Complete JSS · choose SSS1 pathway' : 'Promote · next level'}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.detailsButton}
                      onPress={() => selectOutcome('GRADUATE')}
                    >
                      <Text style={[styles.detailsButtonText, { color: '#fff' }]}>
                        Graduate · complete SSS
                      </Text>
                    </Pressable>
                  )}
                  <Pressable style={styles.detailsClose} onPress={() => setDetailsRow(null)}>
                    <Text style={styles.detailsCloseText}>Close</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Pressable style={styles.detailsClose} onPress={() => setDetailsRow(null)}>
                <Text style={styles.detailsCloseText}>Close</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      <SelectSheet
        visible={targetClassSheet}
        label="Target class"
        options={targetClassOptions.map((item) => ({
          label: item.classLabel,
          value: item.id,
        }))}
        value={targetClassId}
        onSelect={(value) => {
          setTargetClassId(value);
          const target = targetClassOptions.find((item) => item.id === value);
          if (!target?.level?.startsWith('SSS')) setDepartment('');
          setTargetClassSheet(false);
        }}
        onClose={() => setTargetClassSheet(false)}
      />
      <SelectSheet
        visible={departmentSheet}
        label="Target SSS department"
        options={DEPARTMENTS}
        value={department}
        onSelect={(value) => {
          setDepartment(value);
          setDepartmentSheet(false);
        }}
        onClose={() => setDepartmentSheet(false)}
      />
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  detailsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  detailsBackdropTouch: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: spacing.md,
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
  },
  detailsName: { ...typography.title, marginBottom: 2 },
  detailsMeta: { ...typography.label, color: colors.muted, marginBottom: spacing.sm },
  detailsLine: { ...typography.body, marginBottom: spacing.xs },
  detailsActions: { marginTop: spacing.md, gap: spacing.sm },
  detailsButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  detailsSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  detailsButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  detailsClose: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  detailsCloseText: { ...typography.label, color: colors.muted },
  textInput: {
    ...typography.input,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    marginTop: spacing.sm,
  },
  notice: { ...typography.body, color: colors.primary, marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.muted, marginTop: spacing.sm },
  section: { ...typography.sectionTitle, marginTop: spacing.md, marginBottom: spacing.sm },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  badgeMeta: { ...typography.label, color: colors.muted, flex: 1 },
  actionsWrap: { marginTop: spacing.md },
  secondaryWrap: { marginTop: spacing.xs },
});
