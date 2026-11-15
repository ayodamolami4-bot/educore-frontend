/**
 * Normalised API failure so presenters can show one consistent error shape.
 * Lives in its own module (no react-native imports) so Presenters are
 * importable in node tests; client.js re-exports it for the app.
 */
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details || null;
  }
}

export default ApiError;
