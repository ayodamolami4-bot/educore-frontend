export function roleLabel(role) {
  return {
    PRINCIPAL: 'Principal',
    SCHOOL_OFFICE: 'School Office',
    ACCOUNTS: 'Accounts',
    TEACHER: 'Teacher',
    STUDENT: 'Student',
    PARENT: 'Parent / Guardian',
  }[role];
}
export function dateTime(value) {
  return (
    new Intl.DateTimeFormat('en-NG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Lagos',
    }).format(new Date(value)) + ' WAT'
  );
}
export function naira(kobo) {
  if (!Number.isSafeInteger(kobo)) throw new Error('Money must be integer kobo');
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(kobo / 100);
}
