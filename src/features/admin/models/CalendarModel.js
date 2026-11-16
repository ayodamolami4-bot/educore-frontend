/** AD11 — School calendar data from the implemented Java routes. */
import { api } from '../api/client';

const itemsOf = (payload) =>
  Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];

function todayInLagos() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date()).map((item) => [item.type, item.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const minuteLabel = (value) => {
  const minute = Number(value);
  if (!Number.isFinite(minute) || minute < 0) return '';
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
};

export const CalendarModel = {
  async snapshot() {
    const [metadata, sessionPage] = await Promise.all([
      api.get('metadata'),
      api.get('academic-sessions'),
    ]);
    const sessions = itemsOf(sessionPage).map((session) => ({
      ...session,
      label: session.name,
      terms: [],
    }));
    const today = todayInLagos();
    const activeSession = sessions.find((item) => item.id === metadata.activeSessionId)
      ?? sessions.find((item) => item.startsOn <= today && item.endsOn >= today)
      ?? sessions[0]
      ?? null;

    const termPages = await Promise.all(
      sessions.map((session) => api.get('terms', null, { sessionId: session.id })),
    );
    const termsBySession = new Map();
    termPages.forEach((page, index) => {
      const terms = itemsOf(page).map((term) => ({
        ...term,
        label: `Term ${term.number}`,
      }));
      termsBySession.set(sessions[index].id, terms);
      sessions[index].terms = terms;
    });
    const terms = [...termsBySession.values()].flat();

    const [day, examPackages] = await Promise.all([
      api.get('schedule/day', null, { on: today }),
      Promise.all(terms.map(async (term) => {
        const [schedules, published] = await Promise.all([
          api.get('exam-schedules', null, { termId: term.id }),
          api.get('examinations', null, { termId: term.id }),
        ]);
        return {
          term,
          schedules: itemsOf(schedules),
          published: Boolean(published.published),
          events: itemsOf(published),
        };
      })),
    ]);

    const todaySchedule = itemsOf(day).map((item, index) => ({
      id: item.id ?? `${item.type ?? 'activity'}-${index}`,
      time: [minuteLabel(item.startMinute), minuteLabel(item.endMinute)].filter(Boolean).join('–'),
      subject: item.subjectName ?? item.title ?? item.type ?? 'School activity',
      detail: [
        item.classLabel,
        item.room,
        item.invigilatorName ? `Invigilator: ${item.invigilatorName}` : '',
      ].filter(Boolean).join(' · '),
    }));

    const examinations = examPackages.flatMap((item) => item.events.map((event) => ({
      id: event.id,
      date: event.onDate,
      title: event.subjectName ?? 'Examination',
      detail: [
        event.classLabel,
        [minuteLabel(event.startMinute), minuteLabel(event.endMinute)].filter(Boolean).join('–'),
        event.room,
      ].filter(Boolean).join(' · '),
      termLabel: item.term.label,
    }))).sort((a, b) => String(a.date).localeCompare(String(b.date)));

    return {
      activeSessionId: activeSession?.id ?? null,
      activeSession,
      sessions,
      terms,
      today,
      teachingDay: Boolean(day.teachingDay),
      calendarTitle: day.calendarTitle ?? '',
      todaySchedule,
      examPackages,
      examinations,
      timezone: day.timezone ?? 'Africa/Lagos',
    };
  },

  async sessionOptions() {
    const [metadata, payload] = await Promise.all([
      api.get('metadata'),
      api.get('academic-sessions'),
    ]);
    return {
      activeSessionId: metadata.activeSessionId ?? null,
      sessions: itemsOf(payload),
    };
  },

  sessions() {
    return api.get('academic-sessions');
  },

  createSession(body) {
    return api.post('academic-sessions', null, body);
  },

  terms(sessionId) {
    return api.get('terms', null, { sessionId });
  },

  createTerm(body) {
    return api.post('terms', null, body);
  },
};

export default CalendarModel;
