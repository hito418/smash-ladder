import type { SessionService } from 'src/features/auth/session.service'
import type { SessionPayload } from 'src/features/auth/session.service'

declare module 'hono' {
  export interface ContextVariableMap {
    sessionService: SessionService
    userPayload: SessionPayload
  }
}
