export class ApiError extends Error {
  problem;
  constructor(problem) {
    super(problem.detail || problem.title);
    this.problem = problem;
    this.name = 'ApiError';
  }
  get code() {
    return this.problem.code;
  }
}
export function errorMessage(error) {
  if (error instanceof ApiError) {
    if (error.code === 'STALE_SCOPE' || error.code === 'REQUEST_ABORTED')
      return 'The screen changed. Please load this information again.';
    if (error.problem.status === 412)
      return 'This record changed elsewhere. Reload it and review your changes before saving.';
    if (error.problem.status === 429) return 'Too many attempts. Please wait before trying again.';
    return error.message;
  }
  return 'We could not complete this request. Your entered information is still here. Please try again.';
}
export function localError(detail, code = 'VALIDATION') {
  return new ApiError({
    title: 'Please check your information',
    detail,
    code,
    status: 422,
    retryable: false,
  });
}
