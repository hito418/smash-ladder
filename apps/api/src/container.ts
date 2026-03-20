import { db } from './shared/db'
import { DbService } from './shared/db-service'
import { AuthService } from './features/auth/auth.service'
import { SessionService } from './features/auth/session.service'
import { MatchmakingService } from './features/matchmaking/matchmaking.service'
import { MatchService } from './features/match/match.service'
import { UserService } from './features/user/user.service'

const dbService = new DbService(db)

export const sessionService = new SessionService(dbService)
export const authService = new AuthService(dbService)
export const matchmakingService = new MatchmakingService(dbService)
export const matchService = new MatchService(dbService)
export const userService = new UserService(dbService)
