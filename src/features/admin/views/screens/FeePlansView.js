/**
 * AD21 — Set fees and issue bills (View). The plan list with issue actions,
 * plus the "new fee plan" form. Issuing is confirmed in a dialog.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { digitsOnly } from '../../utils/validators';
import LabelledField from '../components/LabelledField';
import SelectSheet from '../components/SelectSheet';
import { SecondaryButton } from './AdminHomeView';
import { FeePlansPresenter } from '../../presenters/FeePlansPresenter';
import { FeePlanModel } from '../../models';
import useClassOptions from '../components/useClassOptions';
import { colors, typography, spacing } from '../theme';

export default function FeePlansView({ navigation }) {
  const [presenter] = useState(() => new FeePlansPresenter(FeePlanModel));
  const [state, setState] = useState(presenter.initialState);
  const loadedOnce = useRef(false);
  // Live class list — a class created in AD12 can be billed right away.
  const CLASSES = useClassOptions();
  // New-plan form fields (view-owned; the presenter only receives values).
  // Classes come from a multi-select sheet, not free text — no more typos.
  const [pickedClasses, setPickedClasses] = useState([]);
  const [classSheet, setClassSheet] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');

  const toggleClass = (value) => {
    setPickedClasses((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
  };

  // Issuing is confirmed twice, like the other money actions.
  const confirmIssue = (plan) => {
    if (plan.status === 'Issued') {
      Alert.alert(
        'Bills already out',
        `${plan.classLabel} already has the "${plan.title}" bills — they went to ${
          plan.issuedCount ?? plan.studentsCount ?? 'the'
        } student${plan.issuedCount === 1 ? '' : 's'} in that class when the plan was issued. ` +
          'Open Student invoices to see them and record payments. Issuing again would bill everyone twice.',
      );
      return;
    }
    Alert.alert(
      'Issue bills?',
      `${plan.classLabel} — ${plan.title} (${plan.amountLabel}) creates one bill for each ACTIVE student in ${plan.classLabel}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Issue bills', onPress: () => presenter.issuePlan(plan) },
      ],
    );
  };

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current) presenter.load({ showLoading: false });
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation]);

  const rows = state.plans.map((p) => ({
    id: p.id,
    title: `${p.classLabel} · ${p.title}`,
    meta: `${p.amountLabel} · due ${p.dueDate} · ${
      p.status === 'Issued' ? `bills issued to ${p.issuedCount} students` : 'draft — not issued yet'
    }`,
    status: p.status,
    raw: p,
  }));

  // Action errors (duplicate plan refused, empty amount, issue guards) pop up.
  useActionErrorAlert(state.errorText);

  return (
    <AdminScaffold
      eyebrow="Fees"
      title="Set fees and issue bills"
      subtitle="One plan per fee per class — issuing bills every active student in the class"
    >
      {state.status === 'loading' ? <LoadingView label="Loading the fee plans…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' ? (
        <View>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}

          <Text style={styles.section}>Fee plans</Text>
          <RecordList
            items={rows}
            onPressItem={(row) => confirmIssue(row.raw)}
            emptyText="No fee plans yet — create the first one below."
          />

          <Text style={styles.section}>New fee plan</Text>
          <LabelledField
            label="Classes"
            placeholder="Pick one or more classes"
            displayValue={
              pickedClasses.length
                ? pickedClasses.length === 1
                  ? pickedClasses[0]
                  : `${pickedClasses.length} classes selected`
                : ''
            }
            onPress={() => setClassSheet(true)}
          />
          <LabelledField
            label="Plan name"
            placeholder="e.g. First Term tuition"
            value={formTitle}
            onChangeText={setFormTitle}
          />
          <LabelledField
            label="Amount (₦)"
            placeholder="e.g. 20000"
            value={formAmount}
            onChangeText={(t) => setFormAmount(digitsOnly(t))}
            keyboardType="number-pad"
          />
          <SecondaryButton
            label={state.savingPlan ? 'Saving…' : 'Create draft plan'}
            disabled={state.savingPlan}
            onPress={() =>
              presenter.createPlan({
                classes: pickedClasses,
                title: formTitle,
                amount: Number(formAmount),
              })
            }
          />
          <Text style={styles.hint}>
            One draft plan is created per selected class. Issuing a plan creates one bill per
            ACTIVE student in that class — it never bills withdrawn or graduated students, and
            never bills a class twice.
          </Text>

          <SelectSheet
            visible={classSheet}
            label="Classes to bill — tap to tick, then Done"
            options={CLASSES}
            multiple
            selectedValues={pickedClasses}
            onToggle={toggleClass}
            onClose={() => setClassSheet(false)}
          />
        </View>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  notice: { ...typography.body, color: colors.primary, marginBottom: spacing.sm },
  error: { ...typography.label, color: '#a33a2a', marginBottom: spacing.sm },
  section: { ...typography.sectionTitle, marginTop: spacing.md, marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.muted, marginTop: spacing.sm },
});
