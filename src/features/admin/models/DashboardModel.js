/**
 * AD01 — Admin home. Loads today's attendance totals, work that needs
 * attention, and today's timetable events. The Java API decides which
 * sections the signed-in admin (e.g. Accounts) is allowed to see.
 */
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';

export const DashboardModel = {
  async load() {
    const data = await api.get(endpoints.dashboard);
    return {
      schoolName: data.schoolName || 'Greenfield Secondary',
      sessionLabel: data.sessionLabel || '',
      termLabel: data.termLabel || '',
      staffName: data.staffName || '',
      attendance: {
        registersSubmitted: data.registersSubmitted ?? 0,
        registersExpected: data.registersExpected ?? 0,
        missingRegisters: data.missingRegisters ?? 0,
        absentStudents: data.absentStudents ?? 0,
        lateArrivals: data.lateArrivals ?? 0,
      },
      attention: data.attention || [],
      todaySchedule: data.todaySchedule || [],
    };
  },
};

export default DashboardModel;
