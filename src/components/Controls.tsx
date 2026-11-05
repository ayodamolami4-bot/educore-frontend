import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius } from '../theme/tokens';

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary'
          ? styles.primary
          : variant === 'danger'
            ? styles.danger
            : variant === 'secondary'
              ? styles.secondary
              : styles.quiet,
        (disabled || loading) && { opacity: 0.55 },
        pressed && { opacity: 0.78 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={variant === 'primary' ? colors.white : colors.primary}
        />
      ) : null}
      <Text
        style={[
          styles.buttonText,
          variant === 'primary' && { color: colors.white },
          variant === 'danger' && { color: colors.danger },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  hint,
  error,
  password = false,
  ...props
}: TextInputProps & { label: string; hint?: string; error?: string; password?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? { borderColor: colors.danger } : null]}>
        <TextInput
          {...props}
          accessibilityLabel={label}
          placeholderTextColor="#81969F"
          secureTextEntry={password && !visible}
          autoCapitalize={props.autoCapitalize ?? 'none'}
          style={[styles.input, props.style]}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            onPress={() => setVisible(!visible)}
            style={styles.eye}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.muted}
            />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choose an option',
  disabled = false,
}: {
  label: string;
  value?: string;
  options: { value: string; label: string; description?: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          label + ': ' + (options.find((o) => o.value === value)?.label ?? placeholder)
        }
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.select, disabled && { opacity: 0.5 }]}
      >
        <Text style={[styles.selectText, !value && { color: colors.muted }]}>
          {options.find((o) => o.value === value)?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.scrim}>
          <View accessibilityViewIsModal style={styles.modal}>
            <View style={styles.modalTitle}>
              <Text style={styles.cardTitle}>{label}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close choices"
                onPress={() => setOpen(false)}
                style={styles.eye}
              >
                <Ionicons name="close" size={24} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {options.map((option) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: option.value === value }}
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={styles.option}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{option.label}</Text>
                    {option.description && <Text style={styles.hint}>{option.description}</Text>}
                  </View>
                  {option.value === value && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
export function Notice({
  text,
  tone = 'info',
}: {
  text?: string;
  tone?: 'info' | 'error' | 'success' | 'warning';
}) {
  if (!text) return null;
  const danger = tone === 'error',
    warning = tone === 'warning';
  return (
    <View
      accessibilityRole={danger ? 'alert' : undefined}
      style={[
        styles.notice,
        {
          backgroundColor: danger
            ? colors.dangerSoft
            : warning
              ? colors.amberSoft
              : colors.primarySoft,
        },
      ]}
    >
      <Ionicons
        name={
          danger
            ? 'alert-circle-outline'
            : tone === 'success'
              ? 'checkmark-circle-outline'
              : 'information-circle-outline'
        }
        size={20}
        color={danger ? colors.danger : colors.primary}
      />
      <Text style={[styles.noticeText, danger && { color: colors.danger }]}>{text}</Text>
    </View>
  );
}
export function Card({
  title,
  subtitle,
  children,
}: React.PropsWithChildren<{ title?: string; subtitle?: string }>) {
  return (
    <View style={styles.card}>
      {title && <Text style={styles.cardTitle}>{title}</Text>}
      {subtitle && <Text style={styles.hint}>{subtitle}</Text>}
      {children}
    </View>
  );
}
export function ToggleRow({
  title,
  description,
  value,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.hint}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: '#CBD8DD', true: '#9CD8D4' }}
        thumbColor={value ? colors.primary : colors.white}
      />
    </View>
  );
}
export function EmptyState({
  title,
  description,
  icon = 'file-tray-outline',
}: {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={[styles.hint, { textAlign: 'center' }]}>{description}</Text>
    </View>
  );
}
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected && { backgroundColor: colors.primary, borderColor: colors.primary },
      ]}
    >
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}
export const ui = StyleSheet.create({
  text: { color: colors.text, fontSize: 14, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  title: { color: colors.ink, fontSize: 21, fontWeight: '700' },
  gap: { gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
});
const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radius.sm,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primary: { backgroundColor: colors.primary },
  danger: { backgroundColor: colors.dangerSoft },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  quiet: { backgroundColor: 'transparent' },
  buttonText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    minHeight: 50,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.ink,
    fontSize: 15,
    paddingHorizontal: 13,
    paddingVertical: 13,
  },
  eye: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 50,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 13,
  },
  selectText: { flex: 1, color: colors.ink, fontSize: 14 },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(14,35,45,0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    width: '100%',
    maxWidth: 480,
    padding: 20,
  },
  modalTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    borderRadius: radius.sm,
  },
  noticeText: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 20 },
  card: {
    padding: 20,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '700', lineHeight: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  rowTitle: { color: colors.ink, fontSize: 14, fontWeight: '600', lineHeight: 22 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 36, paddingHorizontal: 20 },
  emptyIcon: { padding: 16, borderRadius: 40, backgroundColor: colors.primarySoft },
  chip: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
});
