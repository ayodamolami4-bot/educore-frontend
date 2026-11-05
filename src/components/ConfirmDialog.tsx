import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button, ui } from './Controls';
import { colors } from '../theme/tokens';
export function ConfirmDialog({
  visible,
  title,
  description,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text style={ui.title}>{title}</Text>
          <Text style={ui.text}>{description}</Text>
          <Button title="Confirm" onPress={onConfirm} />
          <Button title="Cancel" variant="secondary" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(14,35,45,0.46)',
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    padding: 24,
    backgroundColor: colors.white,
    gap: 18,
  },
});
