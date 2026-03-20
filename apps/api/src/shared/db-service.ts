import type { Database } from '@repo/schemas'
import type { ControlledTransaction, Kysely } from 'kysely'
import { Result, ResultAsync, fromPromise, err, ok } from 'neverthrow'
import { AppError, isAppError } from './errors'

export type DB = Kysely<Database>

export type PaginatedResult<T> = {
  data: T[]
  page: number
  size: number
  total: number
  totalPages: number
}

export class DbService {
  constructor(private db: DB) {}

  query<T>(
    fn: (db: DB) => Promise<T>,
    errorFn: (e: unknown) => AppError = () => AppError.databaseError()
  ): ResultAsync<T, AppError> {
    return fromPromise(fn(this.db), errorFn)
  }

  queryFirst<T>(
    fn: (db: DB) => Promise<T | undefined>,
    notFoundError: AppError
  ): ResultAsync<T, AppError> {
    return fromPromise(fn(this.db), () => AppError.databaseError()).andThen(
      (value) => (value !== undefined ? ok(value) : err(notFoundError))
    )
  }

  queryMany<T>(fn: (db: DB) => Promise<T[]>): ResultAsync<T[], AppError> {
    return fromPromise(fn(this.db), () => AppError.databaseError())
  }

  insert<T>(
    fn: (db: DB) => Promise<T | undefined>,
    errorMsg: string
  ): ResultAsync<T, AppError> {
    return fromPromise(fn(this.db), () =>
      AppError.databaseError(errorMsg)
    ).andThen((value) =>
      value !== undefined ? ok(value) : err(AppError.databaseError(errorMsg))
    )
  }

  update<T>(
    fn: (db: DB) => Promise<T | undefined>,
    notFoundError: AppError
  ): ResultAsync<T, AppError> {
    return fromPromise(fn(this.db), () => AppError.databaseError()).andThen(
      (value) => (value !== undefined ? ok(value) : err(notFoundError))
    )
  }

  delete<T>(
    fn: (db: DB) => Promise<T | undefined>,
    notFoundError: AppError
  ): ResultAsync<T, AppError> {
    return fromPromise(fn(this.db), () => AppError.databaseError()).andThen(
      (value) => (value !== undefined ? ok(value) : err(notFoundError))
    )
  }

  queryPaginated<T>(
    countFn: (trx: DB) => Promise<{ count: string | number | bigint }[]>,
    dataFn: (trx: DB) => Promise<T[]>,
    page: number,
    size: number
  ): ResultAsync<PaginatedResult<T>, AppError> {
    return ResultAsync.fromPromise(
      this.db.transaction().execute(async (trx) => {
        const [countRows, data] = await Promise.all([countFn(trx), dataFn(trx)])
        const total = Number(countRows[0]?.count ?? 0)
        return { data, page, size, total, totalPages: Math.ceil(total / size) }
      }),
      () => AppError.databaseError()
    )
  }

  transaction<T>(
    fn: (trx: ControlledTransaction<Database, []>) => Promise<T | AppError>
  ): ResultAsync<T, AppError> {
    return ResultAsync.fromPromise(
      (async () => {
        const trx = await this.db.startTransaction().execute()
        try {
          const result = await fn(trx)
          if (isAppError(result)) {
            await trx.rollback().execute()
            throw result
          }
          await trx.commit().execute()
          return result
        } catch (e) {
          await trx.rollback().execute()
          throw e
        }
      })(),
      (e) => (isAppError(e) ? e : AppError.databaseError())
    )
  }

  static cleanUpdate<T extends Record<string, unknown>>(
    data: T
  ): Partial<T> & { updated_at: Date } {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    )
    return { ...cleaned, updated_at: new Date() } as Partial<T> & {
      updated_at: Date
    }
  }

  static guard<T>(
    error: AppError = AppError.notFound('Resource')
  ): (value: T | undefined) => Result<T, AppError> {
    return (value) => {
      if (value === undefined) return err(error)
      return ok(value)
    }
  }
}
