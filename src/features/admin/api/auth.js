/**
 * Token storage + session hooks for the EduCore admin app.
 *
 *The token comes from the Java API (or Supabase)
 * login endpoint; every request in client.js attaches it as a Bearer header.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'educore.auth.token';
const USER_KEY = 'educore.auth.user';

let onUnauthorized = null;

/** Register a callback (e.g. "reset navigation to Login") fired on any 401. */
export function setOnUnauthorized(fn) {
  onUnauthorized = fn;
}

export function fireUnauthorized() {
  if (onUnauthorized) onUnauthorized();
}

export async function saveSession({ token, user }) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getCurrentUser() {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}
