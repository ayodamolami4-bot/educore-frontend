import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Screen } from '../../../components/Screen';
import { Button, Card, EmptyState, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

const BROADSHEET = 'PUBLISHED_BROADSHEET';
const SUBJECT_MARKS = 'SUBJECT_MARKS';

export function TE15ReportsScreen() {
  const navigation = useNavigation();
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [kind, setKind] = useState('');
  const kindRef = useRef(kind);
  kindRef.current = kind;
  const [cycleId, setCycleId] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [format, setFormat] = useState('PDF');
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadReports = useCallback(async (isActive = () => true) => {
    setError('');
    try {
      const value = await model.reports(context.schoolId);
      if (!isActive()) return;
      setData(value);
      const nextKind = value.types.includes(kindRef.current) ? kindRef.current : value.types[0] ?? '';
      setKind(nextKind);
      const choices = nextKind === BROADSHEET ? value.classReports : value.packages;
      const first = choices?.[0];
      setCycleId(first?.cycleId ?? '');
      setAssignmentId(first?.assignmentId ?? '');
      setReport(null);
    } catch (reason) {
      if (isActive()) setError(reason?.message ?? 'Could not load the reports available to this teacher.');
    }
  }, [model, context.schoolId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => loadReports(() => active));
    return () => { active = false; };
  }, [loadReports]);

  const cycleOptions = useMemo(() => {
    const sourceItems = kind === BROADSHEET
      ? (data?.classReports ?? [])
      : (data?.packages ?? []);
    const byCycle = new Map();
    for (const item of sourceItems) {
      if (!item.cycleId || byCycle.has(item.cycleId)) continue;
      const label = item.label?.split(' · ')[0] || 'Assigned assessment cycle';
      byCycle.set(item.cycleId, { value: item.cycleId, label });
    }
    return [...byCycle.values()];
  }, [kind, data]);

  const assignmentOptions = useMemo(() => (
    (data?.packages ?? [])
      .filter((item) => item.cycleId === cycleId)
      .map((item) => ({
        value: item.assignmentId,
        label: item.label,
      }))
  ), [data, cycleId]);

  const chooseKind = (value) => {
    setKind(value);
    setReport(null);
    const choices = value === BROADSHEET ? (data?.classReports ?? []) : (data?.packages ?? []);
    setCycleId(choices[0]?.cycleId ?? '');
    setAssignmentId(choices[0]?.assignmentId ?? '');
  };

  const filters = () => {
    if (!cycleId) throw new Error('No permitted assessment cycle is available for this report.');
    if (kind === SUBJECT_MARKS) {
      if (!assignmentId) throw new Error('Choose one of your assigned subject sheets.');
      return { cycleId, assignmentId };
    }
    if (kind === BROADSHEET) return { cycleId };
    throw new Error('This report type is not available to the Teacher role.');
  };

  const preview = async () => {
    if (busy) return;
    setError('');
    setNotice('');
    setBusy('preview');
    try {
      const result = await model.runReport(context.schoolId, kind, filters());
      setReport(result);
      setNotice('Report preview loaded from the school records.');
    } catch (reason) {
      setError(reason?.message ?? 'Could not build this report.');
    } finally {
      setBusy('');
    }
  };

  const exportFile = async () => {
    if (busy) return;
    setError('');
    setNotice('');
    setBusy('export');
    try {
      const chosenFilters = filters();
      const blob = await model.exportReport(context.schoolId, kind, chosenFilters, format);
      const extension = format.toLowerCase();
      const file = new File(
        Paths.document,
        kind.toLowerCase() + '-' + Date.now() + '.' + extension
      );
      file.create();
      await file.write(new Uint8Array(await blob.arrayBuffer()));

      if (format === 'PDF' && await File.canPreview(file)) {
        await file.preview({ title: report?.title ?? 'EduCore teaching report' });
        setNotice('PDF report generated and opened.');
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          dialogTitle: 'Share EduCore teaching report',
          mimeType: format === 'PDF' ? 'application/pdf' : 'text/csv',
        });
        setNotice('Report generated and ready to share.');
      } else {
        setNotice('Report saved to ' + file.uri);
      }
    } catch (reason) {
      setError(reason?.message ?? 'Could not export this report.');
    } finally {
      setBusy('');
    }
  };

  const hasReportChoices = cycleOptions.length > 0;
  const isSubjectReport = kind === SUBJECT_MARKS;

  return (
    <Screen title="Teaching reports" subtitle="Only reports within your current subject or class-teacher permissions." code="TE15">
      {error ? <Notice text={error} tone="error" /> : null}
      {notice ? <Notice text={notice} tone="success" /> : null}
      {!data && !error ? <Notice text="Loading your permitted report catalogue…" /> : null}

      {data ? (
        <>
          <Select
            label="Report type"
            value={kind}
            onChange={chooseKind}
            options={data.types.map((item) => ({
              value: item,
              label: item === BROADSHEET ? 'Published class broadsheet' : 'Assigned subject marks',
            }))}
            placeholder="Choose a report"
            disabled={busy !== ''}
          />

          {hasReportChoices ? (
            <Select
              label="Assessment cycle / class"
              value={cycleId}
              onChange={(value) => {
                setCycleId(value);
                setAssignmentId((data.packages.find((item) => item.cycleId === value)?.assignmentId) ?? '');
                setReport(null);
              }}
              options={cycleOptions}
              disabled={busy !== ''}
            />
          ) : (
            <EmptyState
              title="No report scope available"
              description={isSubjectReport
                ? 'There are no assigned subject mark sheets available for this teacher.'
                : 'A published class broadsheet is available only for a current class-teacher duty with a report cycle.'}
            />
          )}

          {isSubjectReport && hasReportChoices ? (
            <Select
              label="Assigned subject sheet"
              value={assignmentId}
              onChange={(value) => { setAssignmentId(value); setReport(null); }}
              options={assignmentOptions}
              placeholder="Choose your subject assignment"
              disabled={busy !== ''}
            />
          ) : null}

          <Card title="Report scope">
            <Text style={ui.muted}>
              {kind === BROADSHEET
                ? 'Published report snapshots only. Class ranking is not produced.'
                : 'The selected teacher-assigned subject sheet. Working marks are not a published family report.'}
            </Text>
            <Text style={ui.muted}>Maximum report size: {data.catalogue?.maximumRows ?? 1000} rows</Text>
          </Card>

          <Select
            label="Export format"
            value={format}
            onChange={setFormat}
            options={(data.formats ?? ['PDF', 'CSV']).filter((item) => item !== 'JSON').map((item) => ({
              value: item,
              label: item,
            }))}
            disabled={busy !== ''}
          />

          <Button
            title="Preview report"
            onPress={preview}
            loading={busy === 'preview'}
            disabled={!hasReportChoices || (isSubjectReport && !assignmentId) || busy !== ''}
          />
          <Button
            title="Export report"
            variant="secondary"
            onPress={exportFile}
            loading={busy === 'export'}
            disabled={!hasReportChoices || (isSubjectReport && !assignmentId) || busy !== ''}
          />
          <Button
            title="Refresh report options"
            variant="secondary"
            onPress={() => loadReports()}
            disabled={busy !== ''}
          />
        </>
      ) : null}

      {report ? (
        <Card title={report.title ?? 'Report preview'} subtitle={report.generatedAt ? 'Generated ' + report.generatedAt : ''}>
          <Text style={ui.muted}>{report.rowCount ?? report.rows?.length ?? 0} rows · {report.state ?? 'READY'}</Text>
          {(report.notes ?? []).map((item, index) => (
            <Text key={'note-' + index} style={ui.muted}>{item}</Text>
          ))}
          {(report.rows ?? []).map((row, index) => (
            <View key={'row-' + index} style={{ paddingVertical: 8 }}>
              <Text style={[ui.text, { fontWeight: '700' }]}>Record {index + 1}</Text>
              {(report.columns ?? []).map((column) => (
                <Text key={column} style={ui.muted}>
                  {column}: {row[column] == null ? '—' : String(row[column])}
                </Text>
              ))}
            </View>
          ))}
          {report.rows?.length === 0 ? (
            <EmptyState title="No rows in this report" description="The selected scope has no records to display." />
          ) : null}
        </Card>
      ) : null}

      <Notice text="The Teacher catalogue excludes school-wide enrolment, finance, attendance and administration exports. Those reports belong to Principal / School Office permissions." />
      <BottomNav navigation={navigation} current="TE15" />
    </Screen>
  );
}