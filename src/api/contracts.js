// Shared API payload shapes. The Java backend enforces permissions and official rules.

/** @typedef {'PRINCIPAL' | 'SCHOOL_OFFICE' | 'ACCOUNTS' | 'TEACHER' | 'STUDENT' | 'PARENT'} Role */

/**
 * @template T
 * @typedef {Object} Page
 * @property {T[]} items
 * @property {string | null} nextCursor
 * @property {boolean} hasMore
 */

/**
 * @typedef {Object} Ack
 * @property {boolean} accepted
 * @property {string} message
 * @property {string} requestId
 */

/**
 * @typedef {Object} Problem
 * @property {string} [type]
 * @property {string} title
 * @property {number} status
 * @property {string} detail
 * @property {string} code
 * @property {string} [requestId]
 * @property {boolean} retryable
 * @property {{ field: string; code: string; message: string }[]} [errors]
 */

/**
 * @typedef {Object} Versioned
 * @property {string} id
 * @property {number} version
 */

/**
 * @typedef {Object} SessionTokens
 * @property {string} accessToken
 * @property {string} refreshToken
 * @property {'Bearer'} tokenType
 * @property {number} expiresIn
 * @property {string} refreshExpiresAt
 * @property {string} sessionId
 * @property {string} accountId
 * @property {number} contextCount
 * @property {string} contextPath
 */

/**
 * @typedef {Object} ContextPreference
 * @property {string} schoolId
 * @property {Role} role
 * @property {string} [childId]
 */

/**
 * @typedef {ContextPreference & Object} SchoolContext
 * @property {string} schoolName
 * @property {string} [childName]
 * @property {'AD01' | 'TE01' | 'ST01' | 'PA01'} homeScreenId
 * @property {{ actions: string[] }} capabilities
 */

/**
 * @typedef {Versioned & Object} Account
 * @property {string} loginId
 * @property {string} displayName
 * @property {string} [phone]
 * @property {string} [verifiedEmail]
 * @property {string} [pendingEmailMasked]
 * @property {ContextPreference} [lastContext]
 * @property {{ actions: string[] }} capabilities
 */

/**
 * @typedef {Object} PasswordFlow
 * @property {'ACTIVATE' | 'RESET_EMAIL' | 'RESET_SAVED_CODE'} mode
 * @property {string} flowToken
 * @property {string} expiresAt
 * @property {string} maskedAccount
 * @property {string} [schoolName]
 */

/**
 * @typedef {Object} PasswordSaved
 * @property {boolean} changed
 * @property {boolean} signInRequired
 * @property {boolean} recoveryCodeShownOnce
 * @property {string} [newRecoveryCode]
 */

/**
 * @typedef {Object} RecentAuth
 * @property {string} recentAuthToken
 * @property {string} expiresAt
 */

/**
 * @typedef {Object} PrivateRecoveryCode
 * @property {string} recoveryCode
 * @property {boolean} shownOnce
 * @property {boolean} signInRequired
 */

/**
 * @typedef {Object} NotificationPreferences
 * @property {boolean} pushEnabled
 * @property {boolean} emailOptionalEnabled
 * @property {boolean} mandatoryInApp
 * @property {NotificationCategory[]} categories
 */

/** @typedef {'SCHOOL' | 'LEARNING' | 'FEES' | 'MESSAGES' | 'CASES'} NotificationCategory */

/**
 * @typedef {Versioned & Object} NotificationItem
 * @property {string} schoolId
 * @property {NotificationCategory} category
 * @property {string} title
 * @property {string} safePreview
 * @property {string} createdAt
 * @property {string} [readAt]
 * @property {{ screenId: string; schoolId: string; childId?: string; resourceId?: string }} target
 */

/**
 * @typedef {Versioned & Object} SessionInfo
 * @property {string} deviceName
 * @property {string} createdAt
 * @property {string} lastUsedAt
 * @property {boolean} current
 */

/**
 * @typedef {Object} EmailChangeAccepted
 * @property {boolean} accepted
 * @property {string} requestId
 * @property {string} maskedDestination
 * @property {string} expiresAt
 */

/**
 * @typedef {Object} AccessHelp
 * @property {string} [schoolName]
 * @property {string} [schoolPhone]
 * @property {string} [schoolEmail]
 * @property {string} platformContact
 * @property {string[]} instructions
 * @property {boolean} assistedRecoveryAvailable
 */

/**
 * @typedef {Versioned & Object} PushDevice
 * @property {string} installationId
 * @property {'ANDROID' | 'IOS'} platform
 * @property {boolean} enabled
 */

/**
 * @typedef {Versioned & Object} PrivateFile
 * @property {string} filename
 * @property {string} mimeType
 * @property {number} sizeBytes
 * @property {string} purpose
 * @property {'PROCESSING' | 'READY' | 'REJECTED'} state
 * @property {string} [contentPath]
 * @property {string} [rejectionCode]
 */

export {};
