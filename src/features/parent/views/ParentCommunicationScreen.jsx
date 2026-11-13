import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, EmptyState, Field, Notice, Select, ui } from '../../../components/Controls.jsx';
import { Screen } from '../../../components/Screen.jsx';

const TITLES = {
  PA13: 'Messages',
  PA14: 'Private conversation',
  PA15: 'School notices',
  PA16: 'My complaints',
  PA17: 'Submit a complaint',
  PA18: 'Complaint and resolution',
  PA19: 'Profile and relationships',
};

function rows(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of ['items', 'messages', 'entries', 'history', 'notices', 'complaints', 'contacts']) {
    if (Array.isArray(value[key])) return value[key];
  }
  return [];
}
function textOf(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'string' || typeof value === 'number') return String(value);
  }
  return '';
}

export function ParentCommunicationScreen({ screenId, context, model, navigation, route }) {
  const id = route.params?.threadId ?? route.params?.complaintId ?? route.params?.noticeId ?? '';
  const [state, setState] = useState({ busy: false, error: '', data: null });
  const [contact, setContact] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [action, setAction] = useState('ACCEPT');

  const load = useCallback(async () => {
    switch (screenId) {
      case 'PA13': return model.communicationOverview();
      case 'PA14': return id ? model.threadDetail(id) : null;
      case 'PA15': return id ? model.noticeDetail(id) : model.notices();
      case 'PA16': return model.complaints();
      case 'PA17': return model.complaintMetadata();
      case 'PA18': return id ? model.complaintDetail(id) : null;
      case 'PA19': return model.parentProfile();
      default: return null;
    }
  }, [id, model, screenId]);

  useFocusEffect(useCallback(() => {
    let active = true;
    setState({ busy: true, error: '', data: null });
    load().then((data) => {
      if (active) setState({ busy: false, error: '', data });
    }).catch((error) => {
      if (active) setState({ busy: false, error: error?.message || 'This school information could not be loaded.', data: null });
    });
    return () => { active = false; };
  }, [load]));

  async function run(operation, success) {
    setState((current) => ({ ...current, busy: true, error: '' }));
    try {
      const result = await operation();
      if (success) success(result);
      const data = await load();
      setState({ busy: false, error: '', data });
    } catch (error) {
      setState((current) => ({ ...current, busy: false, error: error?.message || 'The request could not be completed.' }));
    }
  }

  const childLabel = [context.childName, context.schoolName].filter(Boolean).join(' · ');
  const back = () => navigation.goBack();
  const data = state.data;
  const thread = data?.thread?.thread ?? data?.thread ?? data ?? {};
  const complaint = data?.complaint?.complaint ?? data?.complaint ?? {};
  const profile = data?.profile?.account ?? data?.profile ?? {};
  const contacts = rows(data?.contacts);
  const categories = rows(data?.categories ?? data?.metadata?.complaintCategories ?? data?.complaintCategories);
  const categoryOptions = categories.map((item) => ({
    value: textOf(item, 'code', 'value', 'id'),
    label: textOf(item, 'label', 'name', 'title', 'code'),
  })).filter((item) => item.value && item.label);
  const contactOptions = [...new Map(contacts.filter((item) => ['CLASS_TEACHER', 'OFFICE'].includes(item.target))
    .map((item) => [item.target, { value: item.target, label: item.displayName || (item.target === 'OFFICE' ? 'School office' : 'Class teacher') }])).values()];

  return (
    <Screen title={TITLES[screenId]} subtitle={childLabel} code={screenId} back={back}>
      <Notice text={state.error} tone="error" />
      {state.busy && <ActivityIndicator accessibilityLabel={'Loading ' + TITLES[screenId]} />}
      {screenId === 'PA13' && data ? (
        <>
          <Card title="Start a private conversation">
            {contactOptions.length ? (
              <>
                <Select label="Send to" value={contact} options={contactOptions} onChange={setContact} />
                <Field label="Subject" value={subject} onChangeText={setSubject} maxLength={120} />
                <Field label="First message" value={body} onChangeText={setBody} multiline numberOfLines={4} />
                <Button title="Start conversation" loading={state.busy} disabled={!contact || !subject.trim() || !body.trim()} onPress={() => {
                  const selected = contacts.find((item) => item.target === contact);
                  void run(() => model.startConversation(selected, subject, body), (result) => {
                    const created = result?.thread ?? result;
                    if (created?.id) navigation.navigate('PA14', { threadId: created.id });
                    setSubject(''); setBody('');
                  });
                }} />
              </>
            ) : <EmptyState title="No approved contacts returned" description="Messages can only go to the child's class teacher or the school office." />}
          </Card>
          <Card title="Private conversations">
            {rows(data.threads).length ? rows(data.threads).map((item, index) => (
              <View key={textOf(item, 'id') || String(index)} style={ui.gap}>
                <Text style={ui.text}>{textOf(item, 'subject', 'title') || 'Conversation'}</Text>
                <Text style={ui.muted}>{textOf(item, 'target', 'status', 'updatedAt')}</Text>
                <Button title="Open conversation" variant="secondary" onPress={() => navigation.navigate('PA14', { threadId: textOf(item, 'id', 'threadId') })} />
                <View style={ui.divider} />
              </View>
            )) : <EmptyState title="No conversations yet" />}
          </Card>
        </>
      ) : null}

      {screenId === 'PA14' && data ? (
        <>
          <Card title={textOf(thread, 'subject', 'title') || 'Conversation'} subtitle={textOf(thread, 'status', 'target')}>
            {rows(thread.messages ?? data.messages).map((item, index) => (
              <View key={textOf(item, 'id') || String(index)} style={ui.gap}>
                <Text style={ui.text}>{textOf(item, 'senderName', 'authorName', 'senderRole') || 'Participant'}</Text>
                <Text style={ui.text}>{textOf(item, 'body', 'message')}</Text>
                <Text style={ui.muted}>{textOf(item, 'createdAt', 'sentAt')}</Text>
                <View style={ui.divider} />
              </View>
            ))}
            {textOf(thread, 'status') !== 'CLOSED' ? (
              <>
                <Field label="Your message" value={body} onChangeText={setBody} multiline numberOfLines={4} />
                <Button title="Send message" loading={state.busy} disabled={!body.trim()} onPress={() => void run(() => model.sendConversationMessage(thread, body), () => setBody(''))} />
                <Field label="Reason for closing" value={reason} onChangeText={setReason} />
                <Button title="Close conversation" variant="secondary" loading={state.busy} disabled={!reason.trim()} onPress={() => void run(() => model.closeConversation(thread, reason), () => setReason(''))} />
              </>
            ) : <Notice text="This conversation is closed. Start a new conversation if you need further help." />}
          </Card>
        </>
      ) : null}

      {screenId === 'PA15' && data ? (
        <Card title={id ? textOf(data.notice ?? data, 'title') : 'Published school notices'}>
          {id ? (
            <Text style={ui.text}>{textOf(data.notice ?? data, 'body', 'content')}</Text>
          ) : rows(data).length ? rows(data).map((item, index) => (
            <View key={textOf(item, 'id') || String(index)} style={ui.gap}>
              <Text style={ui.text}>{textOf(item, 'title') || 'School notice'}</Text>
              <Text style={ui.muted}>{textOf(item, 'publishedAt', 'createdAt')}</Text>
              <Text style={ui.text}>{textOf(item, 'body', 'safePreview')}</Text>
              <View style={ui.divider} />
            </View>
          )) : <EmptyState title="No published notices" />}
        </Card>
      ) : null}

      {screenId === 'PA16' && data ? (
        <>
          <Button title="Submit a new complaint" onPress={() => navigation.navigate('PA17')} />
          <Card title="Your child-linked cases">
            {rows(data).length ? rows(data).map((item, index) => (
              <View key={textOf(item, 'id', 'caseId') || String(index)} style={ui.gap}>
                <Text style={ui.text}>{textOf(item, 'subject', 'title') || 'Complaint'}</Text>
                <Text style={ui.muted}>{textOf(item, 'state', 'status', 'category')}</Text>
                <Button title="View case and resolution" variant="secondary" onPress={() => navigation.navigate('PA18', { complaintId: textOf(item, 'id', 'caseId') })} />
                <View style={ui.divider} />
              </View>
            )) : <EmptyState title="No complaints submitted" />}
          </Card>
        </>
      ) : null}

      {screenId === 'PA17' && data ? (
        <Card title="Tell the school what happened">
          {categoryOptions.length ? (
            <>
              <Select label="Complaint category" value={category} options={categoryOptions} onChange={setCategory} />
              <Field label="Subject" value={subject} onChangeText={setSubject} maxLength={120} />
              <Field label="Description" value={body} onChangeText={setBody} multiline numberOfLines={5} />
              <Notice text="Your complaint is linked to the currently selected child. Do not include passwords, bank details or unrelated children's information." />
              <Button title="Submit complaint" loading={state.busy} disabled={!category || !subject.trim() || !body.trim()} onPress={() => void run(() => model.submitComplaint(category, subject, body), () => { setCategory(''); setSubject(''); setBody(''); navigation.navigate('PA16'); })} />
            </>
          ) : <EmptyState title="Complaint categories unavailable" description="The school has not returned the allowed categories. You cannot submit an uncategorised complaint." />}
        </Card>
      ) : null}

      {screenId === 'PA18' && data ? (
        <>
          <Card title={textOf(complaint, 'subject', 'title') || 'Complaint'} subtitle={[textOf(complaint, 'state', 'status'), textOf(complaint, 'category')].filter(Boolean).join(' · ')}>
            <Text style={ui.text}>{textOf(complaint, 'body', 'description')}</Text>
            <Text style={ui.muted}>Created: {textOf(complaint, 'createdAt')}</Text>
            <RecordHistory records={rows(data.history)} />
          </Card>
          {textOf(complaint, 'state', 'status') === 'RESOLVED' ? (
            <Card title="Respond to the resolution">
              <Select label="Your response" value={action} options={[{ value: 'ACCEPT', label: 'Accept resolution' }, { value: 'REQUEST_REVIEW', label: 'Request a review' }]} onChange={setAction} />
              <Field label="Reason (required)" value={reason} onChangeText={setReason} multiline numberOfLines={3} />
              <Button title={action === 'ACCEPT' ? 'Accept resolution' : 'Request review'} loading={state.busy} disabled={!reason.trim()} onPress={() => void run(() => model.respondToResolution(complaint, action, reason), () => setReason(''))} />
            </Card>
          ) : null}
          {!['CLOSED', 'RESOLVED'].includes(textOf(complaint, 'state', 'status')) ? (
            <Card title="Reply to the school">
              <Field label="Your reply" value={body} onChangeText={setBody} multiline numberOfLines={4} />
              <Button title="Send reply" loading={state.busy} disabled={!body.trim()} onPress={() => void run(() => model.replyToComplaint(complaint, body), () => setBody(''))} />
            </Card>
          ) : null}
        </>
      ) : null}

      {screenId === 'PA19' && data ? (
        <>
          <Card title="Your account">
            <Text style={ui.text}>{textOf(profile, 'displayName', 'name') || 'Parent account'}</Text>
            <Text style={ui.text}>Login ID: {textOf(profile, 'loginId')}</Text>
            <Text style={ui.text}>Email: {textOf(profile, 'verifiedEmail', 'email') || 'No verified email'}</Text>
            <Text style={ui.text}>Phone: {textOf(profile, 'phone') || 'Not provided'}</Text>
          </Card>
          <Card title="School-managed child relationships">
            {rows(data.contexts).map((item, index) => (
              <View key={item.schoolId + ':' + item.childId + ':' + index} style={ui.gap}>
                <Text style={ui.text}>{item.childName || 'Linked child'}</Text>
                <Text style={ui.muted}>{item.schoolName}</Text>
              </View>
            ))}
            <Notice text="Schools manage guardian relationships and payer permissions. Editing your personal account does not change a child's school record or grant fee access." />
          </Card>
        </>
      ) : null}

      {!state.busy && !state.error && data === null && ['PA14', 'PA18'].includes(screenId) ? (
        <EmptyState title="Select a record first" description="Return to the relevant list and open a specific item." />
      ) : null}
    </Screen>
  );
}

function RecordHistory({ records }) {
  if (!records.length) return <EmptyState title="No additional case history" />;
  return records.map((item, index) => (
    <View key={textOf(item, 'id') || String(index)} style={ui.gap}>
      <Text style={ui.text}>{textOf(item, 'action', 'state', 'title') || 'Case update'}</Text>
      <Text style={ui.muted}>{textOf(item, 'body', 'reason', 'createdAt')}</Text>
    </View>
  ));
}
