import { localError } from '../api/errors';
export function required(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw localError(`Enter ${label}.`);
  return trimmed;
}
export function validEmail(value: string): string {
  const result = required(value, 'your email address');
  if (result.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))
    throw localError('Enter a valid email address.');
  return result;
}
export function passwordValue(value: string, label = 'your password'): string {
  if (!value) throw localError(`Enter ${label}.`);
  return value;
}
export function newPassword(value: string, confirmation: string): string {
  if (value.length < 15 || value.length > 128)
    throw localError('Choose a password with 15 to 128 characters. A memorable phrase works well.');
  if (value !== confirmation) throw localError('The two new passwords do not match.');
  return value;
}
export function normalisePhone(value: string): string {
  let phone = value.replace(/[\s()-]/g, '');
  if (/^0\d{10}$/.test(phone)) phone = '+234' + phone.slice(1);
  if (!/^\+[1-9]\d{7,14}$/.test(phone))
    throw localError('Enter a valid phone number, such as +2348031234567.');
  return phone;
}
