import { randomBytes } from 'node:crypto'
import { ResultAsync, err, ok } from 'neverthrow'
import { DbService } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

export interface SessionPayload {
  sub: { id: string }
  username: string
}

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function generateSessionId(): string {
  return randomBytes(32).toString('hex')
}

export class SessionService {
  constructor(private db: DbService) {}

  create(
    userId: string,
    username: string
  ): ResultAsync<{ sessionId: string; payload: SessionPayload }, AppError> {
    const sessionId = generateSessionId()
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

    return this.db
      .query(
        (db) =>
          db
            .insertInto('sessions')
            .values({
              id: sessionId,
              user_id: userId,
              expires_at: expiresAt,
            })
            .returning(['id', 'user_id', 'expires_at'])
            .executeTakeFirst(),
        () => AppError.databaseError('Failed to create session')
      )
      .map(() => ({
        sessionId,
        payload: {
          sub: { id: userId },
          username,
        },
      }))
  }

  validate(sessionId: string): ResultAsync<SessionPayload, AppError> {
    return this.db
      .query(
        (db) =>
          db
            .selectFrom('sessions')
            .innerJoin('users', 'users.id', 'sessions.user_id')
            .select([
              'sessions.user_id',
              'sessions.expires_at',
              'users.username',
            ])
            .where('sessions.id', '=', sessionId)
            .executeTakeFirst(),
        () => AppError.unauthorized('Invalid session')
      )
      .andThen(
        DbService.guard(AppError.databaseError('Failed to validate session'))
      )
      .andThen((session) => {
        if (new Date(session.expires_at).valueOf() < Date.now()) {
          return this.delete(sessionId).andThen(() =>
            err(AppError.unauthorized('Session expired'))
          )
        }
        return ok({
          sub: { id: session.user_id },
          username: session.username,
        })
      })
  }

  delete(sessionId: string): ResultAsync<void, AppError> {
    return this.db
      .query(
        (db) => db.deleteFrom('sessions').where('id', '=', sessionId).execute(),
        () => AppError.databaseError('Failed to delete session')
      )
      .map(() => undefined)
  }

  deleteAllForUser(userId: string): ResultAsync<void, AppError> {
    return this.db
      .query(
        (db) =>
          db.deleteFrom('sessions').where('user_id', '=', userId).execute(),
        () => AppError.databaseError('Failed to delete user sessions')
      )
      .map(() => undefined)
  }

  cleanupExpired(): ResultAsync<number, AppError> {
    return this.db
      .query(
        (db) =>
          db
            .deleteFrom('sessions')
            .where('expires_at', '<', new Date())
            .executeTakeFirst(),
        () => AppError.databaseError('Failed to cleanup expired sessions')
      )
      .map((result) => Number(result.numDeletedRows))
  }
}
