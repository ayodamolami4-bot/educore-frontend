/**
 * AD29 — School messages (View): the notifications inbox. One row per
 * conversation with its unread badge; opening a thread goes to AD30.
 *
 * "New message" opens in three steps:
 *   1. WHO — All guardians / All teachers / the individual picker / any
 *      class from the live class list.
 *   2a. A class → Teachers, Guardians, or BOTH (the whole group in one tap).
 *   2b. Individuals → tick 1+ teachers and guardians, or "Send to all".
 */
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import SelectSheet from '../components/SelectSheet';
import { LoadingView, EmptyState, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { PrimaryButton } from './AdminHomeView';
import { MessageInboxPresenter } from '../../presenters/MessageInboxPresenter';
import { MessagesModel } from '../../models';
import { spacing } from '../theme';

export default function MessageInboxView({ navigation }) {
  const [presenter] = useState(() => new MessageInboxPresenter(MessagesModel));
  const [state, setState] = useState(presenter.initialState);
  const [groupSheet, setGroupSheet] = useState(false);
  const [classSheet, setClassSheet] = useState(false);
  const [individualsSheet, setIndividualsSheet] = useState(false);
  const [pickedRecipients, setPickedRecipients] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null); // step-1 value driving the open sheet
  const loadedOnce = useRef(false);

  // Conversation-start refusals (empty selection, server guard) pop up —
  // they used to fail invisibly.
  useActionErrorAlert(state.errorText, 'New message');

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    // Unread badges change when threads are opened elsewhere, so re-fetch on
    // every focus after the first.
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current) presenter.load();
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation]);

  const labelOf = (value) => {
    const hit = state.recipients.find((r) => r.value === value);
    return hit ? hit.label : value;
  };

  // Step 1 → route each audience to its own second step.
  const onPickGroup = (value) => {
    setGroupSheet(false);
    setCurrentGroup(value);
    if (value.startsWith('class:')) {
      presenter.loadPeople(value, () => setClassSheet(true));
    } else {
      setPickedRecipients([]);
      presenter.loadPeople(value, () => setIndividualsSheet(true));
    }
  };

  // Individuals sheet: "Done" sends to the ticked people, "Send to all" to
  // everyone the sheet shows.
  const sendIndividuals = (sendAll) => {
    const values = state.people.map((p) => p.value);
    const allTitle =
      currentGroup === 'group:all-teachers'
        ? 'All teachers'
        : currentGroup === 'group:all-guardians'
          ? 'All guardians'
          : 'All teachers & guardians';
    setIndividualsSheet(false);
    presenter.startForSelection(pickedRecipients, values, allTitle);
  };

  return (
    <AdminScaffold
      eyebrow="Messages"
      title="School messages"
      subtitle="Guardian and staff conversations, newest first."
    >
      {state.status === 'loading' ? <LoadingView label="Loading messages…" /> : null}
      {state.status === 'empty' ? (
        <EmptyState title="No conversations yet" hint="Messages you send or receive land here." />
      ) : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}
      {state.status === 'content' ? (
        <RecordList
          items={state.conversations.map((c) => ({
            id: c.id,
            title: c.title,
            meta: `${c.participantLabel} · ${c.lastMessage} · ${c.lastAt}`,
            status: c.unread > 0 ? 'New' : null,
            raw: c,
          }))}
          onPressItem={(row) => presenter.onOpenConversation(row.raw)}
          emptyText="No conversations yet."
        />
      ) : null}

      <View style={{ marginTop: spacing.md }}>
        <PrimaryButton
          label={state.starting ? 'Creating…' : 'New message'}
          onPress={() => presenter.loadRecipients(() => setGroupSheet(true))}
          disabled={state.starting}
        />
      </View>

      {/* Step 1 — the audience. */}
      <SelectSheet
        visible={groupSheet}
        label="Message who?"
        options={state.recipients.map((r) => ({ label: r.label, value: r.value }))}
        value={null}
        onSelect={onPickGroup}
        onClose={() => setGroupSheet(false)}
      />

      {/* Step 2a — one class: its teachers, its guardians, or both. */}
      <SelectSheet
        visible={classSheet}
        label={currentGroup ? `Message which group in ${labelOf(currentGroup)}` : 'Message which group?'}
        options={state.people.map((p) => ({ label: p.label, value: p.value }))}
        value={null}
        onSelect={(v) => {
          const hit = state.people.find((p) => p.value === v);
          setClassSheet(false);
          presenter.onStartConversation(v, hit ? hit.label : v);
        }}
        onClose={() => setClassSheet(false)}
      />

      {/* Step 2b — individuals: tick 1+ people, or Send to all. */}
      <SelectSheet
        visible={individualsSheet}
        label="Tick the people to message — or send to all"
        options={state.people.map((p) => ({ label: p.label, value: p.value }))}
        multiple
        selectedValues={pickedRecipients}
        onToggle={(value) =>
          setPickedRecipients((prev) =>
            prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value],
          )
        }
        extraAction={
          state.people.length
            ? { label: `Send to all (${state.people.length})`, onPress: () => sendIndividuals(true) }
            : null
        }
        onDone={() => sendIndividuals(false)}
        onClose={() => setIndividualsSheet(false)}
      />
    </AdminScaffold>
  );
}
