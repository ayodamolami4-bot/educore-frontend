import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen } from '../../../components/Screen';
import {
  Button,
  Card,
  EmptyState,
  Notice,
  Select,
  ToggleRow,
  ui,
} from '../../../components/Controls';
import { useServices } from '../../../core/ServicesContext';
import { usePresenter } from '../../../core/usePresenter';
import { NotificationsPresenter } from '../presenters/NotificationsPresenter';
import { dateTime } from '../../../utils/format';
import { errorMessage } from '../../../api/errors';
import { colors } from '../../../theme/tokens';
const categories = [
  { value: 'ALL', label: 'All categories' },
  { value: 'SCHOOL', label: 'School notices' },
  { value: 'LEARNING', label: 'Learning and results' },
  { value: 'FEES', label: 'Fees' },
  { value: 'MESSAGES', label: 'Messages' },
  { value: 'CASES', label: 'Complaints' },
];
export function NotificationsScreen({ navigation }) {
  const services = useServices(),
    session = usePresenter(services.session),
    [openError, setOpenError] = useState('');
  const presenter = useMemo(
    () => new NotificationsPresenter(services.shared, session.context?.schoolId ?? ''),
    [services, session.context?.schoolId],
  );
  const state = usePresenter(presenter);
  useEffect(() => {
    void presenter.load();
  }, [presenter]);
  return (
    <Screen
      title="Notifications"
      subtitle={session.context?.schoolName}
      code="SH06"
      back={() => navigation.goBack()}
      actions={<Ionicons name="notifications-outline" size={27} color={colors.primary} />}
    >
      <Notice text={state.error || openError} tone="error" />
      <Card>
        <Select
          label="Notification category"
          value={state.category ?? 'ALL'}
          options={categories}
          onChange={(v) => {
            void presenter.filter(v === 'ALL' ? undefined : v, state.unread);
          }}
        />
        <ToggleRow
          title="Unread only"
          description="Show notifications you have not marked as read."
          value={state.unread}
          onChange={(v) => {
            void presenter.filter(state.category, v);
          }}
        />
        <Button
          title="Refresh notifications"
          variant="secondary"
          loading={state.loading}
          onPress={() => {
            void presenter.load();
          }}
        />
      </Card>
      {state.loading && !state.items.length ? (
        <ActivityIndicator color={colors.primary} />
      ) : !state.items.length && !state.error ? (
        <Card>
          <EmptyState
            title="You're all caught up"
            description="Updates for this school will appear here. Push can be off while in-app notifications remain available."
            icon="notifications-outline"
          />
        </Card>
      ) : (
        state.items.map((item) => (
          <Card key={item.id}>
            <View style={ui.row}>
              <View
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: item.readAt ? colors.border : colors.primary,
                }}
              />
              <Text style={[ui.title, { flex: 1, fontSize: 16 }]}>{item.title}</Text>
            </View>
            <Text style={ui.text}>{item.safePreview}</Text>
            <Text style={ui.muted}>
              {dateTime(item.createdAt)} · {item.readAt ? 'Read' : 'Unread'}
            </Text>
            <Button
              title="Open update"
              variant="secondary"
              onPress={() => {
                void (async () => {
                  try {
                    setOpenError('');
                    await presenter.markRead(item);
                    await services.session.openNotificationTarget(item.target);
                  } catch (error) {
                    setOpenError(errorMessage(error));
                  }
                })();
              }}
            />
            {!item.readAt && (
              <Button
                title="Mark as read"
                variant="quiet"
                onPress={() => {
                  void presenter.markRead(item);
                }}
              />
            )}
          </Card>
        ))
      )}
      {state.more && (
        <Button
          title="Load more notifications"
          loading={state.loading}
          onPress={() => {
            void presenter.load(true);
          }}
        />
      )}
      <Button
        title="Notification preferences"
        variant="quiet"
        onPress={() => navigation.navigate('Settings')}
      />
    </Screen>
  );
}
