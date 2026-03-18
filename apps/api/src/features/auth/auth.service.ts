import bcrypt from 'bcrypt'
import { ResultAsync, fromPromise, err, ok } from 'neverthrow'
import { DbService } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

export interface UserCredentials {
  id: string
  username: string
}

export class AuthService {
  constructor(private db: DbService) {}

  registerUser(
    username: string,
    password: string
  ): ResultAsync<UserCredentials, AppError> {
    return fromPromise(bcrypt.hash(password, 10), () =>
      AppError.internalError('Failed to hash password')
    )
      .andThen((hashedPassword) =>
        this.db.query(
          (db) =>
            db
              .insertInto('users')
              .values({
                username,
                password: hashedPassword,
              })
              .returningAll()
              .executeTakeFirst(),
          () => AppError.databaseError('Failed to register user')
        )
      )
      .andThen(DbService.guard())
      .map((user) => ({
        id: user.id,
        username: user.username,
      }))
  }

  loginUser(
    username: string,
    password: string
  ): ResultAsync<UserCredentials, AppError> {
    return this.db
      .query(
        (db) =>
          db
            .selectFrom('users')
            .selectAll()
            .where('username', '=', username)
            .executeTakeFirst(),
        () => AppError.notFound('User')
      )
      .andThen(DbService.guard(AppError.notFound('User')))
      .andThen((user) =>
        fromPromise(bcrypt.compare(password, user.password), () =>
          AppError.internalError('Password verification failed')
        ).andThen((isMatch) =>
          isMatch
            ? ok(user)
            : err(AppError.invalidCredentials('Wrong password'))
        )
      )
      .map((user) => ({
        id: user.id,
        username: user.username,
      }))
  }
}
