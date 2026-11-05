/** Shared wire types. Java remains responsible for permissions and official rules. */
export type Role = 'PRINCIPAL' | 'SCHOOL_OFFICE' | 'ACCOUNTS' | 'TEACHER' | 'STUDENT' | 'PARENT';
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
export interface Ack {
  accepted: boolean;
  message: string;
  requestId: string;
}
export interface Problem {
  type?: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  requestId?: string;
  retryable: boolean;
  errors?: { field: string; code: string; message: string }[];
}
export interface Versioned {
  id: string;
  version: number;
}
export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresAt: string;
  sessionId: string;
  accountId: string;
  contextCount: number;
  contextPath: string;
}
export interface ContextPreference {
  schoolId: string;
  role: Role;
  childId?: string;
}
export interface SchoolContext extends ContextPreference {
  schoolName: string;
  childName?: string;
  homeScreenId: 'AD01' | 'TE01' | 'ST01' | 'PA01';
  capabilities: { actions: string[] };
}
export interface Account extends Versioned {
  loginId: string;
  displayName: string;
  phone?: string;
  verifiedEmail?: string;
  pendingEmailMasked?: string;
  lastContext?: ContextPreference;
  capabilities: { actions: string[] };
}
export interface PasswordFlow {
  mode: 'ACTIVATE' | 'RESET_EMAIL' | 'RESET_SAVED_CODE';
  flowToken: string;
  expiresAt: string;
  maskedAccount: string;
  schoolName?: string;
}
export interface PasswordSaved {
  changed: boolean;
  signInRequired: boolean;
  recoveryCodeShownOnce: boolean;
  newRecoveryCode?: string;
}
export interface RecentAuth {
  recentAuthToken: string;
  expiresAt: string;
}
export interface PrivateRecoveryCode {
  recoveryCode: string;
  shownOnce: boolean;
  signInRequired: boolean;
}
export interface NotificationPreferences {
  pushEnabled: boolean;
  emailOptionalEnabled: boolean;
  mandatoryInApp: boolean;
  categories: NotificationCategory[];
}
export type NotificationCategory = 'SCHOOL' | 'LEARNING' | 'FEES' | 'MESSAGES' | 'CASES';
export interface NotificationItem extends Versioned {
  schoolId: string;
  category: NotificationCategory;
  title: string;
  safePreview: string;
  createdAt: string;
  readAt?: string;
  target: { screenId: string; schoolId: string; childId?: string; resourceId?: string };
}
export interface SessionInfo extends Versioned {
  deviceName: string;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}
export interface EmailChangeAccepted {
  accepted: boolean;
  requestId: string;
  maskedDestination: string;
  expiresAt: string;
}
export interface AccessHelp {
  schoolName?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  platformContact: string;
  instructions: string[];
  assistedRecoveryAvailable: boolean;
}
export interface PushDevice extends Versioned {
  installationId: string;
  platform: 'ANDROID' | 'IOS';
  enabled: boolean;
}
export interface PrivateFile extends Versioned {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  purpose: string;
  state: 'PROCESSING' | 'READY' | 'REJECTED';
  contentPath?: string;
  rejectionCode?: string;
}
