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

function formatDateTime(input) {
  if (!input) return '';
  const date = new Date(input);
  if (!Number.isFinite(date.getTime())) return input;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  }).format(date);
}

function assignmentSubmissionLabel(state) {
  const labels = {
    NOT_STARTED: 'Not submitted',
    DRAFT: 'Draft saved · not submitted',
    SUBMITTED: 'Submitted · awaiting teacher review',
    GRADED: 'Graded',
    RETURNED: 'Returned for changes',
  };
  return (
    labels[state] || (state ? state.replaceAll('_', ' ').toLowerCase() : 'No submission recorded')
  );
}

function AssignmentRevisionRows({ records }) {
  if (!records.length) {
    return (
      <EmptyState
        title="No submission has been recorded."
        description="Submitted work will appear here after the student sends it to the school."
      />
    );
  }
  return records.map((revision, index) => {
    const snapshot = revision.snapshot ?? {};
    return (
      <View key={value(revision, 'revision') || String(index)} style={ui.gap}>
        <Text style={[ui.text, { fontWeight: '700' }]}>
          Submission revision {value(revision, 'revision') || String(index + 1)}
        </Text>
        {value(revision, 'submittedAt') ? (
          <Text style={ui.muted}>Submitted: {formatDateTime(value(revision, 'submittedAt'))}</Text>
        ) : null}
        {value(snapshot, 'responseText') ? (
          <Text style={ui.text}>{value(snapshot, 'responseText')}</Text>
        ) : null}
        {index < records.length - 1 ? <View style={ui.divider} /> : null}
      </View>
    );
  });
}

function AssignmentReviewRows({ records, maximumScore }) {
  if (!records.length) {
    return (
      <EmptyState
        title="No teacher feedback has been released yet."
        description="Released scores and comments will appear here after the teacher reviews submitted work."
      />
    );
  }
  return records.map((review, index) => {
    const action = value(review, 'action');
    const score = value(review, 'score');
    const feedback = value(review, 'feedback');
    return (
      <View key={String(index)} style={ui.gap}>
        <Text style={[ui.text, { fontWeight: '700' }]}>
          {action === 'GRADE'
            ? 'Graded'
            : action === 'RETURN'
              ? 'Returned for changes'
              : 'Teacher review'}
        </Text>
        {score !== '' ? (
          <Text style={ui.text}>
            Score: {score}
            {maximumScore ? '/' + maximumScore : ''}
          </Text>
        ) : null}
        {feedback ? <Text style={ui.text}>{feedback}</Text> : null}
        {value(review, 'createdAt') ? (
          <Text style={ui.muted}>{formatDateTime(value(review, 'createdAt'))}</Text>
        ) : null}
        {index < records.length - 1 ? <View style={ui.divider} /> : null}
      </View>
    );
  });
}

function ReportSubjectRows({ records, policy }) {
  if (!records.length) return <EmptyState title="The published report has no subject rows." />;
  const totalMaximum =
    Number(policy?.ca1Maximum ?? 0) +
    Number(policy?.ca2Maximum ?? 0) +
    Number(policy?.examMaximum ?? 0);

  return records.map((subject, index) => {
    const assessments = [
      { label: 'CA 1', score: value(subject, 'ca1'), maximum: policy?.ca1Maximum },
      { label: 'CA 2', score: value(subject, 'ca2'), maximum: policy?.ca2Maximum },
      { label: 'Exam', score: value(subject, 'exam'), maximum: policy?.examMaximum },
    ].filter((item) => item.score !== '');

    const total = value(subject, 'total');
    const grade = value(subject, 'grade');
    return (
      <View key={value(subject, 'subjectId', 'code', 'name') || String(index)} style={ui.gap}>
        <Text style={[ui.text, { fontWeight: '700' }]}>
          {value(subject, 'name', 'subjectName') || 'Subject'}
        </Text>
        {assessments.length ? (
          <Text style={ui.muted}>
            {assessments
              .map(
                ({ label, score, maximum }) =>
                  label + ': ' + score + (maximum ? '/' + maximum : ''),
              )
              .join(' · ')}
          </Text>
        ) : null}
        <Text style={ui.text}>
          Total: {total || 'Not released'}
          {total && totalMaximum > 0 ? '/' + totalMaximum : ''} · Grade: {grade || 'Not released'}
        </Text>
        {value(subject, 'note') ? <Text style={ui.muted}>{value(subject, 'note')}</Text> : null}
        {index < records.length - 1 ? <View style={ui.divider} /> : null}
      </View>
    );
  });
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
      value(record, 'title', 'name', 'subjectName', 'description', 'label') ||
      (value(record, 'status') ? 'Attendance · ' + value(record, 'status') : 'School record');
    const detail = [
      value(record, 'onDate', 'date', 'on', 'startsOn', 'publishedAt', 'createdAt'),
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
  const { assignmentId, reportId, materialId, documentId } = route.params ?? {};
  const recordId = assignmentId ?? reportId ?? materialId ?? documentId ?? '';
  const load = useCallback(async () => {
    switch (screenId) {
      case 'PA03':
        return documentId ? model.documentDetail(documentId) : model.studentOverview();
      case 'PA04':
        return model.calendarWorkspace();
      case 'PA05':
        return materialId ? model.materialDetail(materialId) : model.learningWorkspace();
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
 }, [documentId, materialId, model, recordId, screenId]);

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
  const report = data?.report?.report ?? data?.report ?? data ?? {};
  const assignment = data?.assignment?.assignment ?? data?.assignment ?? {};
  const document = data?.document?.document ?? data?.document ?? {};
  const material = data?.material?.material ?? data?.material ?? {};

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

      {screenId === 'PA03' && data && documentId ? (
        <Card title={value(document, 'title', 'name') || 'Verified school document'}>
          <Text style={ui.text}>Document type: {value(document, 'kind', 'type')}</Text>
          <Text style={ui.text}>Issued: {value(document, 'issuedOn', 'issueDate')}</Text>
          <Text style={ui.text}>Issuer: {value(document, 'issuer')}</Text>
          <RecordRows
            records={list(data.history)}
            empty="No additional published document revisions are available."
          />
        </Card>
      ) : null}

      {screenId === 'PA03' && data && !documentId ? (
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
              onOpen={(item) =>
                navigation.navigate('PA03', { documentId: value(item, 'id', 'documentId') })
              }
              actionLabel="View document history"
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

      {screenId === 'PA05' && data && materialId ? (
        <Card title={value(material, 'title', 'name') || 'Published learning material'}>
          <Text style={ui.text}>{value(material, 'body', 'description')}</Text>
          <Text style={ui.muted}>Subject: {value(material, 'subjectName')}</Text>
          <RecordRows
            records={list(data.history)}
            empty="No additional published material revisions are available."
          />
        </Card>
      ) : null}

      {screenId === 'PA05' && data && !materialId ? (
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
              onOpen={(item) =>
                navigation.navigate('PA05', { materialId: value(item, 'id', 'materialId') })
              }
              actionLabel="Read material and revisions"
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
              {value(assignment, 'instructions', 'body', 'description') ||
                'The school has not provided assignment instructions.'}
            </Text>
            <Text style={ui.muted}>
              Due: {formatDateTime(value(assignment, 'dueAt', 'dueOn')) || 'Not specified'}
            </Text>
            <Text style={ui.muted}>
              Maximum score: {value(assignment, 'maximumScore') || 'Not specified'}
            </Text>
            <Text style={ui.muted}>
              Submission mode: {value(assignment, 'submissionMode') || 'Not specified'}
            </Text>
            {assignment.submission ? (
              <Text style={ui.text}>
                Submission status:{' '}
                {assignmentSubmissionLabel(value(assignment.submission, 'state'))}
              </Text>
            ) : null}
          </Card>
          <Card title="Submission history">
            <AssignmentRevisionRows records={list(data.history?.revisions)} />
          </Card>
          <Card title="Teacher feedback">
            <AssignmentReviewRows
              records={list(data.history?.reviews)}
              maximumScore={value(assignment, 'maximumScore')}
            />
          </Card>
          <Notice text="Parents can read submitted work and released feedback. Students submit their own work; parents cannot submit or grade it." />
        </>
      ) : null}

      {screenId === 'PA07' && data ? (
        <>
          <Card title="Attendance record" subtitle="Recent 30-day view · Africa/Lagos">
            <RecordRows
              records={list(data.attendance)}
              empty="No submitted attendance registers were returned for this period."
            />
          </Card>
          <Card title="Official attendance corrections">
            {data.correctionHistoryAvailable ? (
              <RecordRows
                records={(data.corrections ?? []).flatMap(({ registerId, history }) =>
                  list(history).map((item) => ({ ...item, registerId })),
                )}
                empty="No approved attendance corrections were returned for this period."
              />
            ) : (
              <EmptyState
                title="Official correction history is not available in this workspace yet."
                description="Attendance records are available. Approved corrections will appear here once the school correction-history service is connected."
              />
            )}
          </Card>
          <Button
            title="Contact the school about attendance"
            variant="secondary"
            onPress={() => navigation.navigate('PA13')}
          />
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
            <Text style={ui.text}>
              Term:{' '}
              {value(report, 'termName', 'term') ||
                (report.termNumber ? 'Term ' + report.termNumber : '')}
            </Text>
            <Text style={ui.text}>
              Published: {formatDateTime(value(report, 'publishedAt', 'issuedAt'))}
            </Text>
            {value(report, 'class') ? (
              <Text style={ui.text}>Class: {value(report, 'class')}</Text>
            ) : null}
          </Card>

          <Card title="Subject results">
            <ReportSubjectRows
              records={list(report.subjects ?? report.results)}
              policy={report.policy}
            />
          </Card>

          {value(report, 'average') ? (
            <Card title="Overall performance">
              <Text style={ui.text}>
                Average: {value(report, 'average')}
                {report.policy?.ca1Maximum != null &&
                report.policy?.ca2Maximum != null &&
                report.policy?.examMaximum != null
                  ? '/' +
                    (Number(report.policy.ca1Maximum) +
                      Number(report.policy.ca2Maximum) +
                      Number(report.policy.examMaximum))
                  : ''}
              </Text>
            </Card>
          ) : null}

          {report.attendance ? (
            <Card title="Attendance summary">
              <Text style={ui.text}>
                Present: {value(report.attendance, 'present') || '0'} · Absent:{' '}
                {value(report.attendance, 'absent') || '0'} · Late:{' '}
                {value(report.attendance, 'late') || '0'} · Excused:{' '}
                {value(report.attendance, 'excused') || '0'}
              </Text>
              {!report.attendance.coverageComplete ? (
                <Notice
                  tone="warning"
                  text={
                    'Attendance coverage is incomplete: ' +
                    (value(report.attendance, 'submittedRegisters') || '0') +
                    ' of ' +
                    (value(report.attendance, 'expectedRegisters') || 'unknown') +
                    ' expected registers have been submitted. These figures reflect submitted registers only.'
                  }
                />
              ) : null}
            </Card>
          ) : null}

          {value(report, 'classTeacherRemark') || value(report, 'principalRemark') ? (
            <Card title="School remarks">
              {value(report, 'classTeacherRemark') ? (
                <View style={ui.gap}>
                  <Text style={[ui.text, { fontWeight: '700' }]}>Class teacher</Text>
                  <Text style={ui.text}>{value(report, 'classTeacherRemark')}</Text>
                </View>
              ) : null}
              {value(report, 'principalRemark') ? (
                <View style={ui.gap}>
                  <Text style={[ui.text, { fontWeight: '700' }]}>Principal</Text>
                  <Text style={ui.text}>{value(report, 'principalRemark')}</Text>
                </View>
              ) : null}
            </Card>
          ) : null}

          {!config.demo ? (
            <PdfButton
              title="Download official report PDF"
              filename={'report-' + (recordId || 'card') + '.pdf'}
              getDocument={() => model.reportPdf(recordId)}
            />
          ) : (
            <Notice text="Official report PDF downloads require the connected Java backend." />
          )}
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
