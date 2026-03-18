import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type AppErrorType =
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR'

export class AppError extends Error {
  constructor(
    public readonly type: AppErrorType,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }

  static notFound(resource: string) {
    return new AppError('NOT_FOUND', `${resource} not found`)
  }

  static alreadyExists(resource: string) {
    return new AppError('ALREADY_EXISTS', `${resource} already exists`)
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError('UNAUTHORIZED', message)
  }

  static invalidCredentials(message = 'Invalid credentials') {
    return new AppError('INVALID_CREDENTIALS', message)
  }

  static databaseError(message = 'Database operation failed') {
    return new AppError('DATABASE_ERROR', message)
  }

  static internalError(message = 'Internal server error') {
    return new AppError('INTERNAL_ERROR', message)
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError
}

export function errorToHttpStatus(error: AppError): ContentfulStatusCode {
  switch (error.type) {
    case 'NOT_FOUND':
      return 404
    case 'ALREADY_EXISTS':
      return 409
    case 'UNAUTHORIZED':
      return 401
    case 'INVALID_CREDENTIALS':
      return 401
    case 'DATABASE_ERROR':
      return 500
    case 'INTERNAL_ERROR':
      return 500
  }
}
