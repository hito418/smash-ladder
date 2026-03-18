import { db } from './shared/db'
import { DbService } from './shared/db-service'
import { AuthService } from './features/auth/auth.service'
import { SessionService } from './features/auth/session.service'

const dbService = new DbService(db)

export const sessionService = new SessionService(dbService)
export const authService = new AuthService(dbService)
