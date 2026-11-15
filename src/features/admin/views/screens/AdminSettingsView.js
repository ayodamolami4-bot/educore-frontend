/**
 * AD10 — School settings and admin access (View). School details on top
 * (name, address, contacts, session and term), the admin memberships under
 * them: tap an admin to change their role or suspend/reactivate access.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import SelectSheet from '../components/SelectSheet';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import LabelledField from '../components/LabelledField';
import { PrimaryButton } from './AdminHomeView';
import { SettingsPresenter } from '../../presenters/SettingsPresenter';
import { SchoolSettingsModel } from '../../models';
import { colors, typography, spacing } from '../theme';

const ADMIN_ROLES = ['Principal', 'Vice Principal', 'Admin', 'Bursar', 'Exams Officer'];
const TERMS = ['First Term', 'Second Term', 'Third Term'];

export default function AdminSettingsView({ navigation }) {
  const [presenter] = useState(() => new SettingsPresenter(SchoolSettingsModel));
  const [state, setState] = useState(presenter.initialState);
  const [schoolName, setSchoolName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [termLabel, setTermLabel] = useState('');
  const [nextTermBegins, setNextTermBegins] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('');
  const [termSheet, setTermSheet] = useState(false);
  const [roleSheet, setRoleSheet] = useState(false); // for the new admin
  const [memberRole, setMemberRole] = useState(null); // { id } being re-roled
  const [roleEditSheet, setRoleEditSheet] = useState(false);
  const prefilled = useRef(false);
  // The session is never typed: this year to next year, from the device date
  // (2078 while it is 2078). It spans a full 12-month calendar cycle.
  const now = new Date();
  const sessionLabel = `${now.getFullYear()}-${now.getFullYear() + 1}`;

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    return () => presenter.detach();
  }, [presenter, navigation]);

  // Prefill the school-details fields once the settings arrive.
  useEffect(() => {
    if (!prefilled.current && state.settings) {
      prefilled.current = true;
      setSchoolName(state.settings.schoolName || '');
      setAddress(state.settings.address || '');
      setPhone(state.settings.phone || '');
      setEmail(state.settings.email || '');
      setTermLabel(state.settings.termLabel || '');
      setNextTermBegins(state.settings.nextTermBegins || '');
    }
  }, [state.settings]);

  useActionErrorAlert(state.errorText);

  const onMemberPress = (membership) => {
    Alert.alert(membership.fullName, `${membership.email} · ${membership.role}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: membership.status === 'Active' ? 'Suspend access' : 'Reactivate access',
        style: membership.status === 'Active' ? 'destructive' : 'default',
        onPress: () =>
          presenter.changeMembership(
            membership.id,
            { status: membership.status === 'Active' ? 'Suspended' : 'Active' },
            membership.status === 'Active'
              ? `${membership.fullName}'s admin access is suspended.`
              : `${membership.fullName} can sign in again.`,
          ),
      },
      {
        text: 'Change role',
        onPress: () => {
          setMemberRole(membership);
          setRoleEditSheet(true);
        },
      },
    ]);
  };

  return (
    <AdminScaffold
      eyebrow="Settings"
      title="School settings and admin access"
      subtitle="The school profile, and who can sign in to this app."
    >
      {state.status === 'loading' ? <LoadingView label="Loading the settings…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' ? (
        <View>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}

          <Text style={styles.section}>School details</Text>
          <LabelledField label="School name" value={schoolName} onChangeText={setSchoolName} />
          <LabelledField label="Address" value={address} onChangeText={setAddress} />
          <LabelledField label="Phone" value={phone} onChangeText={setPhone} />
          <LabelledField label="Email" value={email} onChangeText={setEmail} />
          <LabelledField
            label="Session (automatic — this year to next year)"
            displayValue={sessionLabel}
          />
          <LabelledField
            label="Current term"
            displayValue={termLabel}
            placeholder="Tap to pick First, Second or Third Term"
            onPress={() => setTermSheet(true)}
          />
          <LabelledField
            label="Next term begins"
            value={nextTermBegins}
            onChangeText={setNextTermBegins}
            placeholder="e.g. 2027-01-11"
          />
          <View style={styles.actionsWrap}>
            <PrimaryButton
              label={state.saving ? 'Saving…' : 'Save school settings'}
              disabled={state.saving}
              onPress={async () => {
                const ok = await presenter.saveSettings({
                  schoolName,
                  address,
                  phone,
                  email,
                  sessionLabel,
                  termLabel,
                  nextTermBegins,
                });
                if (ok) presenter.load();
              }}
            />
          </View>

          <Text style={styles.section}>Admin access</Text>
          <RecordList
            items={state.memberships.map((m) => ({
              id: m.id,
              title: m.fullName,
              meta: `${m.email} · ${m.role} · last sign-in: ${m.lastLogin}`,
              status: m.status,
              raw: m,
            }))}
            onPressItem={(row) => onMemberPress(row.raw)}
            emptyText="No admin accounts yet — add the first one below."
          />

          <Text style={styles.section}>Add an admin</Text>
          <LabelledField
            label="Full name"
            placeholder="e.g. Mrs. Bisi Adeoye"
            value={newAdminName}
            onChangeText={setNewAdminName}
          />
          <LabelledField
            label="Email"
            placeholder="e.g. bisi.adeoye@greenfield.edu.ng — the invitation goes here"
            value={newAdminEmail}
            onChangeText={setNewAdminEmail}
          />
          <LabelledField
            label="Role"
            placeholder="Tap to pick — e.g. Bursar"
            displayValue={newAdminRole}
            onPress={() => setRoleSheet(true)}
          />
          <View style={styles.actionsWrap}>
            <PrimaryButton
              label={state.saving ? 'Saving…' : 'Add admin and invite'}
              disabled={state.saving}
              onPress={async () => {
                const ok = await presenter.addMembership({
                  fullName: newAdminName,
                  email: newAdminEmail,
                  role: newAdminRole,
                });
                if (ok) {
                  setNewAdminName('');
                  setNewAdminEmail('');
                  setNewAdminRole('');
                }
              }}
            />
          </View>
        </View>
      ) : null}

      <SelectSheet
        visible={roleSheet}
        label="Admin role — pick one"
        options={ADMIN_ROLES.map((r) => ({ label: r, value: r }))}
        onSelect={(value) => {
          setNewAdminRole(value);
          setRoleSheet(false);
        }}
        onClose={() => setRoleSheet(false)}
      />
      <SelectSheet
        visible={termSheet}
        label="Current term — pick one"
        options={TERMS.map((t) => ({ label: t, value: t }))}
        onSelect={(value) => {
          setTermLabel(value);
          setTermSheet(false);
        }}
        onClose={() => setTermSheet(false)}
      />
      <SelectSheet
        visible={roleEditSheet}
        label={`${memberRole ? memberRole.fullName : 'Admin'} — new role`}
        options={ADMIN_ROLES.map((r) => ({ label: r, value: r }))}
        onSelect={(value) => {
          setRoleEditSheet(false);
          if (memberRole) {
            presenter.changeMembership(
              memberRole.id,
              { role: value },
              `${memberRole.fullName} is now ${value}.`,
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
  notice: { ...typography.body, color: colors.primary, marginBottom: spacing.sm },
  actionsWrap: { marginTop: spacing.md },
  section: { ...typography.sectionTitle, marginTop: spacing.md, marginBottom: spacing.sm },
});
