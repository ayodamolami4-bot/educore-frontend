/**
 * AD01 — Compose the school-office dashboard from real, role-scoped services.
 * The Java backend remains the source of truth for every count and decision.
 */
import { api, getActiveContext, getActiveServices } from '../api/client';

const todayInLagos = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Lagos',
}).format(new Date());

const minuteLabel = (value) => {
  const minute = Number(value);
  if (!Number.isFinite(minute) || minute < 0) return '';
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
};

export const DashboardModel = {
  async load() {
    const context = getActiveContext();
    const services = getActiveServices();
    const today = todayInLagos();
    const [data, account] = await Promise.all([
      api.get('dashboard'),
      services.client.request('/me').catch(() => ({})),
    ]);

    if (context.role === 'ACCOUNTS') {
      const finance = await api.get('reconciliation/overview');
      const attention = [];
      if (Number(finance.overdueInvoices ?? 0) > 0) {
        attention.push({
          id: 'overdue-invoices',
          title: 'Overdue invoices',
          detail: 'Invoices still have an outstanding balance after their due date.',
          countLabel: String(finance.overdueInvoices),
          type: 'payment',
        });
      }
      return {
        role: context.role,
        schoolName: context.schoolName ?? '',
        staffName: account.displayName ?? '',
        dateLabel: today,
        attendance: null,
        schoolSummary: null,
        financeSummary: {
          invoiceCount: finance.invoiceCount ?? 0,
          chargedMinor: finance.chargedMinor ?? 0,
          netPaidMinor: finance.netPaidMinor ?? 0,
          outstandingMinor: finance.outstandingMinor ?? 0,
          overdueInvoices: finance.overdueInvoices ?? 0,
        },
        attention,
        todaySchedule: [],
      };
    }

    const [attendance, schedule] = await Promise.all([
      api.get('attendance/overview', null, { on: today }),
      api.get('schedule/day', null, { on: today }),
    ]);
    const registers = Array.isArray(attendance.registers) ? attendance.registers : [];
    const todayItems = Array.isArray(schedule.items) ? schedule.items : [];
    const attention = [];

    if (Number(data.assessmentCyclesAwaitingPublication ?? 0) > 0) {
      attention.push({
        id: 'assessment-cycles',
        title: 'Assessment cycles awaiting publication',
        detail: 'Review the submitted mark sheets and report package.',
        countLabel: String(data.assessmentCyclesAwaitingPublication),
        type: 'results',
      });
    }
    if (Number(data.importsAwaitingReview ?? 0) > 0) {
      attention.push({
        id: 'imports',
        title: 'School imports awaiting review',
        detail: 'Review the import preview and row-level validation before confirming.',
        countLabel: String(data.importsAwaitingReview),
        type: 'imports',
      });
    }

    return {
      role: context.role,
      schoolName: context.schoolName ?? '',
      staffName: account.displayName ?? '',
      dateLabel: data.asOf ?? today,
      schoolSummary: {
        activeStudents: data.activeStudentCount ?? 0,
        activeTeachers: data.teacherCount ?? 0,
      },
      financeSummary: null,
      attendance: {
        registersSubmitted: attendance.submittedRegisters ?? 0,
        registersExpected: attendance.expectedRegisters ?? 0,
        missingRegisters: attendance.missingRegisters ?? 0,
        absentStudents: registers.reduce((total, item) => total + Number(item.absent ?? 0), 0),
        lateArrivals: registers.reduce((total, item) => total + Number(item.late ?? 0), 0),
      },
      attention,
      todaySchedule: todayItems.map((item) => ({
        id: item.id,
        time: item.time ?? (
          minuteLabel(item.startMinute) && minuteLabel(item.endMinute)
            ? `${minuteLabel(item.startMinute)}–${minuteLabel(item.endMinute)}`
            : ''
        ),
        subject: item.subjectName ?? item.title ?? item.type ?? 'School activity',
        detail: [item.classLabel, item.room, item.description].filter(Boolean).join(' · '),
      })),
    };
  },
};

export default DashboardModel;
