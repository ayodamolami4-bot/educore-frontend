/**
 * AD10 — School metadata and administrator access.
 * Profile data is displayed from the backend; administrator actions use the
 * staff and activation endpoints rather than unsupported profile settings.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Alert, Switch, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import SelectSheet from '../components/SelectSheet';
import { PrimaryButton } from './AdminHomeView';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import LabelledField from '../components/LabelledField';
import { SettingsPresenter } from '../../presenters/SettingsPresenter';
import { SchoolSettingsModel } from '../../models';
import { getActiveContext } from '../../api/client';
import { colors, typography, spacing } from '../theme';

const ADMIN_ROLES = [
  { label: 'Principal', value: 'PRINCIPAL' },
  { label: 'School Office', value: 'SCHOOL_OFFICE' },
  { label: 'Accounts', value: 'ACCOUNTS' },
];

const roleLabel = (role) => ({
  PRINCIPAL: 'Principal',
  SCHOOL_OFFICE: 'School Office',
  ACCOUNTS: 'Accounts',
}[String(role ?? '').toUpperCase()] ?? String(role ?? 'Staff'));

const sessionLabel = (session) => {
  if (!session) return 'No active academic session selected';
  const dates = [session.startsOn, session.endsOn].filter(Boolean).join(' – ');
  return [session.name, dates].filter(Boolean).join(' · ');
};

export default function AdminSettingsView({ navigation }) {
  const [presenter] = useState(() => new SettingsPresenter(SchoolSettingsModel));
  const [state, setState] = useState(presenter.initialState);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [wednesdayPtEnabled, setWednesdayPtEnabled] = useState(false);
  const [settingsReason, setSettingsReason] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('');
  const [roleSheet, setRoleSheet] = useState(false);
  const [memberRole, setMemberRole] = useState(null);
  const [roleEditSheet, setRoleEditSheet] = useState(false);
  const canManageAdministrators = String(getActiveContext().role ?? '').toUpperCase() === 'PRINCIPAL';

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    return () => presenter.detach();
  }, [presenter, navigation]);

  useEffect(() => {
    if (!state.settings) return;
    setAddress(state.settings.address ?? '');
    setPhone(state.settings.phone ?? '');
    setEmail(state.settings.email ?? '');
    setWednesdayPtEnabled(Boolean(state.settings.wednesdayPtEnabled));
  }, [state.settings]);

  useActionErrorAlert(state.errorText);

  const onMemberPress = (membership) => {
    if (!canManageAdministrators) {
      Alert.alert(
        membership.fullName,
        `${roleLabel(membership.role)} · ${membership.staffNumber ?? 'No staff number'} · ${membership.accessStatus}`,
      );
      return;
    }

    const actions = [{ text: 'Cancel', style: 'cancel' }];
    if (membership.accessStatus === 'PROVISIONED' && membership.active) {
      actions.push({
        text: 'Issue activation slip',
        onPress: async () => {
          const slip = await presenter.issueActivationSlip(membership.id);
          if (slip) {
            Alert.alert(
              'Private activation slip',
              `Login ID: ${slip.loginId}\nActivation code: ${slip.activationCode}\nExpires: ${slip.expiresAt}\n\nHand this code directly to the staff member. It is a one-time code and is not emailed by this workflow.`,
            );
          }
        },
      });
    }
    actions.push(
      {
        text: membership.active ? 'Suspend access' : 'Reactivate access',
        style: membership.active ? 'destructive' : 'default',
        onPress: () =>
          presenter.changeMembership(
            membership.id,
            { active: !membership.active },
            membership.active
              ? `Suspended access for ${membership.fullName}.`
              : `Reactivated access for ${membership.fullName}.`,
          ),
      },
      {
        text: 'Change role',
        onPress: () => {
          setMemberRole(membership);
          setRoleEditSheet(true);
        },
      },
    );
    Alert.alert(
      membership.fullName,
      `${roleLabel(membership.role)} · ${membership.staffNumber ?? 'No staff number'} · ${membership.accessStatus}`,
      actions,
    );
  };

  const schoolDay = state.settings?.schoolDay ?? {};
  const schoolDayLabel = [
    schoolDay.start && schoolDay.end ? `School day ${schoolDay.start}–${schoolDay.end}` : '',
    schoolDay.breakStart && schoolDay.breakEnd ? `Break ${schoolDay.breakStart}–${schoolDay.breakEnd}` : '',
  ].filter(Boolean).join(' · ');

  return (
    <AdminScaffold
      eyebrow="School administration"
      title="School profile and staff access"
      subtitle="Official school details are read from the backend. Principal-only actions manage administrator access."
    >
      {state.status === 'loading' ? <LoadingView label="Loading school metadata and staff access…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' ? (
        <View>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}

          <Text style={styles.section}>School information</Text>
          <View style={styles.infoCard}>
            <Text style={styles.schoolName}>{state.settings?.schoolName ?? 'School workspace'}</Text>
            <Text style={styles.infoLine}>Active session: {sessionLabel(state.settings?.activeSession)}</Text>
            <Text style={styles.infoLine}>Time zone: {state.settings?.timezone ?? 'Not configured'}</Text>
            <Text style={styles.infoLine}>Currency: {state.settings?.currency ?? 'Not configured'}</Text>
            {schoolDayLabel ? <Text style={styles.infoLine}>{schoolDayLabel}</Text> : null}
            <Text style={styles.infoHint}>
              The school name and academic session are established during school setup. The fields below update supported school contact and timetable settings.
            </Text>
          </View>

          <Text style={styles.section}>School contact and timetable settings</Text>
          <LabelledField
            label="School address"
            value={address}
            displayValue={address || 'No address recorded'}
            onChangeText={canManageAdministrators ? setAddress : undefined}
          />
          <LabelledField
            label="Contact phone"
            value={phone}
            displayValue={phone || 'No phone recorded'}
            onChangeText={canManageAdministrators ? setPhone : undefined}
            keyboardType="phone-pad"
          />
          <LabelledField
            label="Contact email"
            value={email}
            displayValue={email || 'No email recorded'}
            onChangeText={canManageAdministrators ? setEmail : undefined}
            keyboardType="email-address"
          />
          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.switchTitle}>Wednesday PE period</Text>
              <Text style={styles.infoHint}>Changing this setting may require a timetable review.</Text>
            </View>
            <Switch
              value={wednesdayPtEnabled}
              onValueChange={setWednesdayPtEnabled}
              disabled={!canManageAdministrators || state.saving}
            />
          </View>
          {canManageAdministrators ? (
            <>
              <LabelledField
                label="Reason for settings change"
                placeholder="Record why these school settings are changing"
                value={settingsReason}
                onChangeText={setSettingsReason}
              />
              <View style={styles.actionsWrap}>
                <PrimaryButton
                  label={state.saving ? 'Saving settings…' : 'Save school settings'}
                  disabled={state.saving || settingsReason.trim().length < 5}
                  onPress={async () => {
                    const saved = await presenter.saveSettings({
                      address,
                      phone,
                      email,
                      wednesdayPtEnabled,
                      reason: settingsReason,
                    });
                    if (saved) {
                      setSettingsReason('');
                      presenter.load();
                    }
                  }}
                />
              </View>
            </>
          ) : (
            <Text style={styles.infoHint}>Only the Principal can change school settings.</Text>
          )}

          <Text style={styles.section}>Administrator access</Text>
          <Text style={styles.body}>
            The directory shows school administrator accounts only. Subject teachers remain in the Teacher directory.
          </Text>
          <RecordList
            items={state.memberships.map((membership) => ({
              id: membership.id,
              title: membership.fullName,
              meta: `${roleLabel(membership.role)} · Staff no. ${membership.staffNumber ?? 'pending'} · Account: ${membership.accessStatus}`,
              status: membership.active ? 'Active' : 'Suspended',
              raw: membership,
            }))}
            onPressItem={(row) => onMemberPress(row.raw)}
            emptyText="No administrator records are available."
          />

          {canManageAdministrators ? (
            <>
              <Text style={styles.section}>Register an administrator</Text>
              <Text style={styles.body}>
                Registration creates the staff record and starts account provisioning. Once provisioning completes, select the record to issue a one-time activation slip for private handover.
              </Text>
              <LabelledField
                label="Full name"
                placeholder="Full name"
                value={newAdminName}
                onChangeText={setNewAdminName}
              />
              <LabelledField
                label="Phone number"
                placeholder="Phone number"
                value={newAdminPhone}
                onChangeText={setNewAdminPhone}
                keyboardType="phone-pad"
              />
              <LabelledField
                label="Email (optional)"
                placeholder="Email address"
                value={newAdminEmail}
                onChangeText={setNewAdminEmail}
                keyboardType="email-address"
              />
              <LabelledField
                label="School role"
                placeholder="Choose Principal, School Office or Accounts"
                displayValue={roleLabel(newAdminRole)}
                onPress={() => setRoleSheet(true)}
              />
              <View style={styles.actionsWrap}>
                <PrimaryButton
                  label={state.saving ? 'Registering…' : 'Register administrator'}
                  disabled={
                    state.saving ||
                    !newAdminName.trim() ||
                    !newAdminPhone.trim() ||
                    !newAdminRole
                  }
                  onPress={async () => {
                    const ok = await presenter.addMembership({
                      fullName: newAdminName,
                      phone: newAdminPhone,
                      email: newAdminEmail,
                      role: newAdminRole,
                    });
                    if (ok) {
                      setNewAdminName('');
                      setNewAdminPhone('');
                      setNewAdminEmail('');
                      setNewAdminRole('');
                    }
                  }}
                />
              </View>
            </>
          ) : (
            <Text style={styles.notice}>Administrator registration, role changes and access suspension are restricted to the Principal account.</Text>
          )}
        </View>
      ) : null}

      <SelectSheet
        visible={roleSheet}
        label="Choose school staff role"
        options={ADMIN_ROLES}
        value={newAdminRole}
        onSelect={(value) => {
          setNewAdminRole(value);
          setRoleSheet(false);
        }}
        onClose={() => setRoleSheet(false)}
      />
      <SelectSheet
        visible={roleEditSheet}
        label={`${memberRole ? memberRole.fullName : 'Administrator'} — new role`}
        options={ADMIN_ROLES}
        value={memberRole?.role ?? ''}
        onSelect={(value) => {
          setRoleEditSheet(false);
          if (memberRole) {
            presenter.changeMembership(
              memberRole.id,
              { role: value },
              `Changed ${memberRole.fullName} to ${roleLabel(value)}.`,
            );
          }
          setMemberRole(null);
        }}
        onClose={() => setRoleEditSheet(false)}
      />
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  notice: { ...typography.body, color: colors.primary, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.muted, marginBottom: spacing.sm },
  infoCard: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
  },
  schoolName: { ...typography.body, color: colors.text, fontWeight: '700', marginBottom: spacing.sm },
  infoLine: { ...typography.body, marginBottom: spacing.xs },
  infoHint: { ...typography.label, color: colors.muted, marginTop: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  switchCopy: { flex: 1, paddingRight: spacing.md },
  switchTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  actionsWrap: { marginTop: spacing.md },
});
