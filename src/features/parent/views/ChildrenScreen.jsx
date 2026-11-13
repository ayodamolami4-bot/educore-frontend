import React, { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, EmptyState, Notice, Select, ui } from '../../../components/Controls.jsx';
import { Screen } from '../../../components/Screen.jsx';
import { useServices } from '../../../core/ServicesContext.jsx';
import { usePresenter } from '../../../core/usePresenter.js';
import { sameContext } from '../../../core/SessionStore.js';
import { ParentPresenter } from '../presenters/ParentPresenter.js';

export function ChildrenScreen({ context, model, navigation }) {
  const { session } = useServices();
  const state = usePresenter(session);
  const [school, setSchool] = useState('');
  const presenter = useMemo(() => new ParentPresenter(model, session), [model, session]);
  const action = usePresenter(presenter);
  const children = state.contexts.filter((child) => child.role === 'PARENT' && child.childId);
  const schools = [
    ...new Map(
      children.map((child) => [child.schoolId, { value: child.schoolId, label: child.schoolName }]),
    ).values(),
  ];
  const visible = children.filter((child) => !school || child.schoolId === school);

  return (
    <Screen
      title="My children"
      subtitle="Children linked to your guardian account"
      code="PA02"
      back={() => navigation.goBack()}
    >
      <Select
        label="School"
        value={school}
        options={[{ value: '', label: 'All my schools' }, ...schools]}
        onChange={setSchool}
      />
      <Notice text={action.error} tone="error" />
      {!visible.length && (
        <EmptyState
          title="No linked children"
          description="Ask the school office to review your guardian link."
          icon="people-outline"
        />
      )}
      {visible.map((child) => {
        const selected = sameContext(context, child);
        return (
          <Card
            key={child.schoolId + ':' + child.childId}
            title={child.childName ?? 'Linked child'}
            subtitle={child.schoolName}
          >
            {selected ? (
              <Text style={ui.muted}>Current child</Text>
            ) : (
              <Button
                title={'Open ' + (child.childName ?? 'child')}
                loading={action.busy}
                onPress={() => void presenter.chooseChild(child)}
              />
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
