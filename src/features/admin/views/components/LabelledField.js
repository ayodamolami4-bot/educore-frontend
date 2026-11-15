/**
 * LabelledField — a labelled input row (LabelledField in the design system).
 * Pass `onPress` + `displayValue` for a field that opens a SelectSheet,
 * `value` + `onChangeText` for typed input, or ONLY `displayValue` (no
 * onPress, no onChangeText) for a read-only field — the staff number and
 * the automatic session render as plain text that cannot be edited,
 * autofilled or typed into.
 */
import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors, typography, spacing, touchTarget } from '../theme';

export default function LabelledField({
  label,
  value,
  onChangeText,
  displayValue,
  onPress,
  placeholder,
  error,
  multiline = false,
  numberOfLines = 1,
  keyboardType,
  autoCapitalize,
  textContentType,
  autoComplete,
}) {
  const isPressable = Boolean(onPress);
  const isReadOnly = !isPressable && !onChangeText && Boolean(displayValue);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {isPressable ? (
        <Pressable onPress={onPress} style={styles.box}>
          <Text style={[styles.value, !displayValue && styles.placeholder]}>
            {displayValue || placeholder || 'Select…'}
          </Text>
          <Text style={styles.chevron}>⌄</Text>
        </Pressable>
      ) : isReadOnly ? (
        <View style={[styles.box, styles.readOnlyBox]}>
          <Text style={[styles.value, styles.readOnlyText]}>{displayValue}</Text>
        </View>
      ) : (
        <TextInput
          style={[styles.box, styles.input, multiline && { minHeight: 88 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          textContentType={textContentType}
          autoComplete={autoComplete}
          autoCorrect={false}
        />
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  readOnlyBox: { backgroundColor: colors.positive },
  readOnlyText: { color: colors.text, paddingVertical: 12 },
  label: { ...typography.label, marginBottom: spacing.xs },
  box: {
    ...touchTarget,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { textAlignVertical: 'center', paddingTop: 0, paddingBottom: 0, flex: 1 },
  value: { ...typography.input, flex: 1, paddingVertical: 12 },
  placeholder: { color: colors.muted },
  chevron: { color: colors.muted, fontSize: 16 },
  error: { ...typography.label, color: '#a33a2a', marginTop: spacing.xs },
});
