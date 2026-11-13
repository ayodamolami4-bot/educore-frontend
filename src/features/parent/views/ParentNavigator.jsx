import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useServices } from '../../../core/ServicesContext.jsx';
import { createParentApi } from '../api/parentApi.js';
import { ParentModel } from '../models/ParentModel.js';
import { ChildrenScreen } from './ChildrenScreen.jsx';
import { FeesScreen } from './FeesScreen.jsx';
import { InvoiceScreen } from './InvoiceScreen.jsx';
import { ParentHomeScreen } from './ParentHomeScreen.jsx';
import { ParentAcademicScreen } from './ParentAcademicScreen.jsx';
import { ParentCommunicationScreen } from './ParentCommunicationScreen.jsx';
import { PaymentScreen } from './PaymentScreen.jsx';

const Stack = createNativeStackNavigator();

export function ParentNavigator({ context, openShared, target }) {
  const { client, shared, uuid, config } = useServices();
  const model = useMemo(
    () => new ParentModel(createParentApi(client, context), shared, context, uuid, config.demo),
    [client, context, shared, uuid, config.demo],
  );
  const paymentId = target?.screenId === 'PA12' ? target.resourceId : undefined;
  return (
    <Stack.Navigator
      key={paymentId ?? 'parent'}
      initialRouteName={paymentId ? 'PA12' : 'PA01'}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="PA01">
        {(props) => (
          <ParentHomeScreen {...props} context={context} model={model} openShared={openShared} />
        )}
      </Stack.Screen>
      <Stack.Screen name="PA02">
        {(props) => <ChildrenScreen {...props} context={context} model={model} />}
      </Stack.Screen>
      <Stack.Screen name="PA03">
        {(props) => (
          <ParentAcademicScreen {...props} screenId="PA03" context={context} model={model} />
        )}
      </Stack.Screen>
      <Stack.Screen name="PA04">
        {(props) => (
          <ParentAcademicScreen {...props} screenId="PA04" context={context} model={model} />
        )}
      </Stack.Screen>
      <Stack.Screen name="PA05">
        {(props) => (
          <ParentAcademicScreen {...props} screenId="PA05" context={context} model={model} />
        )}
      </Stack.Screen>
      <Stack.Screen name="PA06">
        {(props) => (
          <ParentAcademicScreen {...props} screenId="PA06" context={context} model={model} />
        )}
      </Stack.Screen>
      <Stack.Screen name="PA07">
        {(props) => (
          <ParentAcademicScreen {...props} screenId="PA07" context={context} model={model} />
        )}
      </Stack.Screen>
      <Stack.Screen name="PA08">
        {(props) => (
          <ParentAcademicScreen {...props} screenId="PA08" context={context} model={model} />
        )}
      </Stack.Screen>
      <Stack.Screen name="PA09">
        {(props) => (
          <ParentAcademicScreen {...props} screenId="PA09" context={context} model={model} />
        )}
      </Stack.Screen>
      <Stack.Screen name="PA13">
        {(props) => (
          <ParentCommunicationScreen {...props} screenId="PA13" context={context} model={model} />
        )}
      </Stack.Screen>
      <Stack.Screen name="PA14">
        {(props) => (
          <ParentCommunicationScreen {...props} screenId="PA14" context={context} model={model} />
        )}
      </Stack.Screen>
      <Stack.Screen name="PA15">
        {(props) => (
          <ParentCommunicationScreen {...props} screenId="PA15" context={context} model={model} />
        )}
      </Stack.Screen>
      <Stack.Screen name="PA16">
        {(props) => (
          <ParentCommunicationScreen {...props} screenId="PA16" context={context} model={model} />
        )}
      </Stack.Screen>
      <Stack.Screen name="PA17">
        {(props) => (
          <ParentCommunicationScreen {...props} screenId="PA17" context={context} model={model} />
        )}
      </Stack.Screen>
      <Stack.Screen name="PA18">
        {(props) => (
          <ParentCommunicationScreen {...props} screenId="PA18" context={context} model={model} />
        )}
      </Stack.Screen>
      <Stack.Screen name="PA19">
        {(props) => (
          <ParentCommunicationScreen {...props} screenId="PA19" context={context} model={model} />
        )}
      </Stack.Screen>
      <Stack.Screen name="PA10">
        {(props) => <FeesScreen {...props} context={context} model={model} />}
      </Stack.Screen>
      <Stack.Screen name="PA11">
        {(props) => <InvoiceScreen {...props} context={context} model={model} />}
      </Stack.Screen>
      <Stack.Screen name="PA12" initialParams={paymentId ? { paymentId } : undefined}>
        {(props) => <PaymentScreen {...props} context={context} model={model} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
