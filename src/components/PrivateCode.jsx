import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button, Notice } from './Controls';
import { colors } from '../theme/tokens';
export function PrivateCode({ value, onDone }) {
  const [visible, setVisible] = useState(
      AppState.currentState === 'active' || AppState.currentState === null,
    ),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setVisible(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Save your private recovery code</Text>
      <Text style={styles.text}>
        Keep it somewhere only you can access. It is different from the school activation code and
        will not be shown again after you leave this screen.
      </Text>
      <Text selectable={visible} accessibilityLabel="Private recovery code" style={styles.code}>
        {visible ? value : 'Hidden while the app is inactive'}
      </Text>
      <Notice
        text="Do not send this code to school staff or put it in a complaint or message."
        tone="warning"
      />
      <Button
        title={copied ? 'Copied — store it privately' : 'Copy recovery code'}
        variant="secondary"
        onPress={() => {
          void Clipboard.setStringAsync(value).then(() => setCopied(true));
        }}
      />
      <Button title="I have saved my code" onPress={onDone} />
    </View>
  );
}
const styles = StyleSheet.create({
  box: {
    padding: 18,
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#B4DDDA',
  },
  title: { color: colors.ink, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  text: { color: colors.text, fontSize: 13, lineHeight: 21 },
  code: {
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 10,
    color: colors.ink,
    fontSize: 15,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
