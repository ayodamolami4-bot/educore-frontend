import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { createServices, type Services } from './src/core/services';
import { ServicesProvider } from './src/core/ServicesContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme/tokens';

function Starting({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <View style={styles.start}>
      {!error && <ActivityIndicator color={colors.primary} size="large" />}
      <Text style={styles.title}>EduCore</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}
class AppBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Starting
        error
        message="The app could not open this screen. Restart EduCore and try again. Your school records remain on the server."
      />
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const [services, setServices] = useState<Services | null>(null),
    [error, setError] = useState('');
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);
  useEffect(() => {
    let mounted = true;
    void createServices()
      .then(async (value) => {
        await value.session.boot();
        if (mounted) setServices(value);
      })
      .catch(() => {
        if (mounted)
          setError('Setup could not be completed. Check your app configuration and restart.');
      });
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppBoundary>
        {error || fontError ? (
          <Starting
            error
            message={error || 'App fonts could not be loaded. Restart and try again.'}
          />
        ) : !services || !fontsLoaded ? (
          <Starting message="Opening your school workspace…" />
        ) : (
          <ServicesProvider services={services}>
            <RootNavigator />
          </ServicesProvider>
        )}
      </AppBoundary>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  start: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    padding: 30,
  },
  title: { fontSize: 32, fontWeight: '800', color: colors.ink },
  message: {
    maxWidth: 400,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 24,
    color: colors.muted,
  },
});
