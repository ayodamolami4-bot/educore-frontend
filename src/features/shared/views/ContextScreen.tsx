import React, { useMemo } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../../components/Screen';
import { Button, Card, EmptyState, Notice, Select, ui } from '../../../components/Controls';
import { useServices } from '../../../core/ServicesContext';
import { usePresenter } from '../../../core/usePresenter';
import { ContextPresenter } from '../presenters/ContextPresenter';
import { roleLabel } from '../../../utils/format';
import type { SharedScreenProps } from '../../../navigation/types';
export function ContextScreen({ navigation }: SharedScreenProps<'ChooseContext'>) {
  const services = useServices(),
    session = usePresenter(services.session);
  const presenter = useMemo(() => new ContextPresenter(services.session), [services]);
  const state = usePresenter(presenter),
    selected = state.selected;
  const schools = [
    ...new Map(
      session.contexts.map((c) => [c.schoolId, { value: c.schoolId, label: c.schoolName }]),
    ).values(),
  ];
  const schoolRoles = session.contexts.filter((c) => c.schoolId === selected?.schoolId);
  const roles = [
    ...new Map(
      schoolRoles.map((c) => [c.role, { value: c.role, label: roleLabel(c.role) }]),
    ).values(),
  ];
  const children = schoolRoles.filter((c) => c.role === 'PARENT' && c.childId);
  return (
    <Screen
      title="Choose your workspace"
      subtitle="Only school-approved access appears here."
      code="SH05"
      back={session.context ? () => navigation.goBack() : undefined}
    >
      <Notice text={state.error} tone="error" />
      <Card title={`Hello, ${session.account?.displayName ?? 'there'}`}>
        {session.contexts.length ? (
          <>
            <Select
              label="School"
              value={selected?.schoolId}
              options={schools}
              onChange={(id) => presenter.choose(session.contexts.find((c) => c.schoolId === id)!)}
            />
            <Select
              label="Available role"
              value={selected?.role}
              options={roles}
              disabled={!selected?.schoolId}
              onChange={(role) => presenter.choose(schoolRoles.find((c) => c.role === role)!)}
            />
            {selected?.role === 'PARENT' && children.length > 0 && (
              <Select
                label="Child"
                value={selected.childId}
                options={children.map((c) => ({
                  value: c.childId!,
                  label: c.childName ?? 'Linked child',
                }))}
                onChange={(id) => presenter.choose(children.find((c) => c.childId === id)!)}
              />
            )}
            <Button
              title="Continue to workspace"
              loading={state.busy}
              disabled={!selected}
              onPress={() => {
                void presenter.continue();
              }}
            />
          </>
        ) : (
          <EmptyState
            title="No school access available"
            description="Ask the school office to check your account membership or child relationship."
            icon="school-outline"
          />
        )}
        <Text style={ui.muted}>
          Changing this choice does not grant a new role or child relationship.
        </Text>
      </Card>
      <Button
        title="Reload my access choices"
        variant="secondary"
        onPress={() => {
          void presenter.refresh();
        }}
      />
      <Button
        title="Get access help"
        variant="quiet"
        onPress={() => navigation.navigate('AccessHelp')}
      />
      <Button
        title="Sign out"
        variant="quiet"
        onPress={() => {
          void services.session.signOut();
        }}
      />
    </Screen>
  );
}
