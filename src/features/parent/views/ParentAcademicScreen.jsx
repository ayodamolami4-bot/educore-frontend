import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, EmptyState, Notice, ui } from '../../../components/Controls.jsx';
import { Screen } from '../../../components/Screen.jsx';
import { useServices } from '../../../core/ServicesContext.jsx';
import { PdfButton } from './PdfButton.jsx';

const TITLES = {
  PA03: 'Child overview',
  PA04: 'Timetable and calendar',
  PA05: 'Learning and class materials',
  PA06: 'Assignment and feedback',
  PA07: 'Attendance',
  PA08: 'Academic results',
  PA09: 'Report card',
};

function list(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of [
    'items',
    'entries',
    'records',
    'reports',
    'materials',
    'assignments',
    'events',
    'lessons',
    'results',
    'documents',
    'history',
  ]) {
    if (Array.isArray(value[key])) return value[key];
  }
  return [];
}

function value(record, ...keys) {
  for (const key of keys) {
    const item = record?.[key];
    if (typeof item === 'string' || typeof item === 'number') return String(item);
  }
  return '';
}

function DateRange() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const today = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const end = today.year + '-' + today.month + '-' + today.day;
  const startDate = new Date(Date.now() - 29 * 86400000);
  const startParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(startDate);
  const start = Object.fromEntries(startParts.map((part) => [part.type, part.value]));
  return { from: start.year + '-' + start.month + '-' + start.day, to: end };
}

function RecordRows({ records, empty, onOpen, actionLabel = 'Open details' }) {
  if (!records.length) return <EmptyState title={empty} />;
  return records.map((record, index) => {
    const title =
      value(record, 'title', 'name', 'subjectName', 'description', 'label') || 'School record';
    const detail = [
      value(record, 'date', 'on', 'startsOn', 'publishedAt', 'createdAt'),
      value(record, 'status', 'state', 'type', 'subjectName'),
      value(record, 'teacherName', 'className', 'termName'),
    ]
      .filter(Boolean)
      .join(' · ');
    return (
      <View key={value(record, 'id', 'reportId', 'assignmentId') || String(index)} style={ui.gap}>
        <Text style={ui.text}>{title}</Text>
        {detail ? <Text style={ui.muted}>{detail}</Text> : null}
        {value(record, 'body', 'safePreview', 'feedback', 'remarks') ? (
          <Text style={ui.muted}>
            {value(record, 'body', 'safePreview', 'feedback', 'remarks')}
          </Text>
        ) : null}
        {onOpen ? (
          <Button title={actionLabel} variant="secondary" onPress={() => onOpen(record)} />
        ) : null}
        <View style={ui.divider} />
      </View>
    );
  });
}

export function ParentAcademicScreen({ screenId, context, model, navigation, route }) {
  const { config } = useServices();
  const [state, setState] = useState({ busy: false, error: '', data: null });
  const recordId = route.params?.assignmentId ?? route.params?.reportId ?? '';
  const load = useCallback(async () => {
    switch (screenId) {
      case 'PA03':
        return model.studentOverview();
      case 'PA04':
        return model.calendarWorkspace();
      case 'PA05':
        return model.learningWorkspace();
      case 'PA06':
        return recordId ? model.assignmentDetail(recordId) : null;
      case 'PA07': {
        const range = DateRange();
        return model.attendanceRecords(range.from, range.to);
      }
      case 'PA08':
        return model.reportList();
      case 'PA09':
        return recordId ? model.reportDetail(recordId) : null;
      default:
        return null;
    }
  }, [model, screenId, recordId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setState({ busy: true, error: '', data: null });
      Promise.resolve(load())
        .then((data) => {
          if (active) setState({ busy: false, error: '', data });
        })
        .catch((error) => {
          if (active)
            setState({
              busy: false,
              error: error?.message || 'School records could not be loaded.',
              data: null,
            });
        });
      return () => {
        active = false;
      };
    }, [load]),
  );

  const childLabel = [context.childName, context.schoolName].filter(Boolean).join(' · ');
  const back = () => navigation.goBack();
  const data = state.data;
  const student = data?.student?.student ?? data?.student ?? {};
  const report = data?.report?.report ?? data?.report ?? {};
  const assignment = data?.assignment?.assignment ?? data?.assignment ?? {};

  return (
    <Screen title={TITLES[screenId]} subtitle={childLabel} code={screenId} back={back}>
      <Notice text={state.error} tone="error" />
      {state.busy && <ActivityIndicator accessibilityLabel={'Loading ' + TITLES[screenId]} />}
      {state.error ? (
        <Button
          title="Try again"
          variant="secondary"
          onPress={() => {
            setState({ busy: true, error: '', data: null });
            load()
              .then((result) => setState({ busy: false, error: '', data: result }))
              .catch((error) =>
                setState({
                  busy: false,
                  error: error?.message || 'Could not load records.',
                  data: null,
                }),
              );
          }}
        />
      ) : null}

      {screenId === 'PA03' && data ? (
        <>
          <Card
            title={
              value(student, 'fullName', 'displayName', 'name') ||
              context.childName ||
              'Selected child'
            }
          >
            <Text style={ui.text}>
              Admission number: {value(student, 'admissionNumber') || 'Not provided'}
            </Text>
            <Text style={ui.text}>
              Class: {value(student, 'className', 'currentClassName') || 'See current placement'}
            </Text>
            <Text style={ui.text}>
              Status: {value(student, 'status') || 'Active school record'}
            </Text>
            <Button
              title="View timetable and calendar"
              variant="secondary"
              onPress={() => navigation.navigate('PA04')}
            />
            <Button
              title="View attendance"
              variant="secondary"
              onPress={() => navigation.navigate('PA07')}
            />
            <Button title="View academic results" onPress={() => navigation.navigate('PA08')} />
          </Card>
          <Card title="Academic history">
            <RecordRows
              records={list(data.history)}
              empty="No published academic history is available."
            />
          </Card>
          <Card title="External examination results">
            <RecordRows
              records={list(data.externalResults)}
              empty="No verified external results are available."
            />
          </Card>
          <Card title="Verified school documents">
            <RecordRows
              records={list(data.documents)}
              empty="No family-visible verified documents are available."
            />
          </Card>
        </>
      ) : null}

      {screenId === 'PA04' && data ? (
        <>
          <Card title="Published timetable">
            <RecordRows
              records={list(data.timetable)}
              empty="No timetable entries are available for this child."
            />
          </Card>
          <Card title="School calendar">
            <RecordRows records={list(data.calendar)} empty="No calendar events are available." />
          </Card>
          <Card title="Examinations">
            <RecordRows
              records={list(data.examinations)}
              empty="No examination dates are published for the available terms."
            />
          </Card>
        </>
      ) : null}

      {screenId === 'PA05' && data ? (
        <>
          <Card title="Current class">
            <RecordRows
              records={list(data.classes)}
              empty="No current class placement is available."
            />
          </Card>
          <Card title="Published learning materials">
            <RecordRows
              records={list(data.materials)}
              empty="No published materials are available."
            />
          </Card>
          <Card title="Published assignments">
            <RecordRows
              records={list(data.assignments)}
              empty="No assignments are available."
              onOpen={(item) =>
                navigation.navigate('PA06', { assignmentId: value(item, 'id', 'assignmentId') })
              }
              actionLabel="View assignment and feedback"
            />
          </Card>
        </>
      ) : null}

      {screenId === 'PA06' && data ? (
        <>
          <Card title={value(assignment, 'title', 'name') || 'Assignment'}>
            <Text style={ui.text}>
              {value(assignment, 'body', 'description') || 'Published assignment details'}
            </Text>
            <Text style={ui.muted}>
              Due: {value(assignment, 'dueOn', 'dueAt') || 'Not specified'}
            </Text>
            <Text style={ui.muted}>
              Submission mode: {value(assignment, 'submissionMode') || 'See assignment details'}
            </Text>
          </Card>
          <Card title="Accepted submission and teacher feedback">
            <RecordRows
              records={list(data.history)}
              empty="No accepted submission or released feedback is available yet."
            />
          </Card>
          <Notice text="Parents can read accepted work and released feedback. Students submit their own work; parents cannot submit or grade it." />
        </>
      ) : null}

      {screenId === 'PA07' && data ? (
        <>
          <Card title="Attendance record" subtitle="Recent 30-day view · Africa/Lagos">
            <RecordRows
              records={list(data)}
              empty="No submitted attendance registers were returned for this period."
            />
          </Card>
          <Notice text="Unsubmitted registers are not counted as absences. Official corrections are shown only after school review." />
        </>
      ) : null}

      {screenId === 'PA08' && data ? (
        <Card title="Published report cards">
          <RecordRows
            records={list(data)}
            empty="No published report cards are available yet."
            onOpen={(item) =>
              navigation.navigate('PA09', { reportId: value(item, 'id', 'reportId') })
            }
            actionLabel="Open report card"
          />
        </Card>
      ) : null}

      {screenId === 'PA09' && data ? (
        <>
          <Card
            title={value(report, 'title', 'termName', 'sessionName') || 'Published report card'}
          >
            <Text style={ui.text}>Session: {value(report, 'sessionName', 'session')}</Text>
            <Text style={ui.text}>Term: {value(report, 'termName', 'term')}</Text>
            <Text style={ui.text}>Published: {value(report, 'publishedAt', 'issuedAt')}</Text>
            <RecordRows
              records={list(report.subjects ?? report.results)}
              empty="The published report has no subject rows."
            />
            {!config.demo ? (
              <PdfButton
                title="Download official report PDF"
                filename={'report-' + (recordId || 'card') + '.pdf'}
                getDocument={() => model.reportPdf(recordId)}
              />
            ) : (
              <Notice text="Official report PDF downloads require the connected Java backend." />
            )}
          </Card>
          <Notice text="This is a published school record. Only the server-issued report revision is authoritative." />
        </>
      ) : null}

      {!state.busy && !state.error && data === null && ['PA06', 'PA09'].includes(screenId) ? (
        <EmptyState
          title="Choose a record first"
          description="Return to the previous list and open a specific record."
        />
      ) : null}
    </Screen>
  );
}
