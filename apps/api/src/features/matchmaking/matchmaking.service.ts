import { sql } from 'kysely'
import { ResultAsync } from 'neverthrow'
import { DbService } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

type MatchFoundCallback = (data: {
  matchId: string
  opponentId: string
}) => void

type JoinResult =
  | { status: 'QUEUED' }
  | { status: 'MATCHED'; matchId: string; opponentId: string }

type StatusResult =
  | { status: 'IDLE' }
  | { status: 'IN_QUEUE'; joinedAt: string }
  | { status: 'MATCHED'; matchId: string; opponentId: string }

export class MatchmakingService {
  private subscribers = new Map<string, Set<MatchFoundCallback>>()

  constructor(private db: DbService) {}

  subscribe(userId: string, cb: MatchFoundCallback): () => void {
    let cbs = this.subscribers.get(userId)
    if (!cbs) {
      cbs = new Set()
      this.subscribers.set(userId, cbs)
    }
    cbs.add(cb)
    return () => {
      cbs!.delete(cb)
      if (cbs!.size === 0) this.subscribers.delete(userId)
    }
  }

  handleNotification(payload: string): void {
    try {
      const data = JSON.parse(payload) as {
        matchId: string
        player1Id: string
        player2Id: string
      }
      const notify = (userId: string, opponentId: string) => {
        const cbs = this.subscribers.get(userId)
        if (!cbs) return
        for (const cb of cbs) {
          cb({ matchId: data.matchId, opponentId })
        }
      }
      notify(data.player1Id, data.player2Id)
      notify(data.player2Id, data.player1Id)
    } catch {
      console.error('Invalid match_found payload:', payload)
    }
  }

  joinQueue(userId: string): ResultAsync<JoinResult, AppError> {
    return this.db.transaction(async (trx) => {
      // Reject if already in queue
      const existing = await trx
        .selectFrom('matchmaking_queue')
        .select('id')
        .where('user_id', '=', userId)
        .executeTakeFirst()

      if (existing) {
        return AppError.alreadyExists('User already in queue')
      }

      // Reject if user has a PENDING match
      const pendingMatch = await trx
        .selectFrom('matches')
        .select('id')
        .where((eb) =>
          eb.or([eb('player1_id', '=', userId), eb('player2_id', '=', userId)])
        )
        .where('status', '=', 'PENDING')
        .executeTakeFirst()

      if (pendingMatch) {
        return AppError.alreadyExists('User already has a pending match')
      }

      // Try to find an opponent
      const opponent = await sql<{ id: string; user_id: string }>`
        SELECT id, user_id FROM matchmaking_queue
        WHERE user_id != ${userId}
        ORDER BY joined_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `
        .execute(trx)
        .then((r) => r.rows[0])

      if (opponent) {
        // Delete both from queue (opponent is already locked)
        await trx
          .deleteFrom('matchmaking_queue')
          .where('id', '=', opponent.id)
          .execute()

        // Create match
        const match = await trx
          .insertInto('matches')
          .values({
            player1_id: opponent.user_id,
            player2_id: userId,
          })
          .returningAll()
          .executeTakeFirstOrThrow()

        // Notify via pg_notify
        await sql`
          SELECT pg_notify('match_found', ${JSON.stringify({
            matchId: match.id,
            player1Id: match.player1_id,
            player2Id: match.player2_id,
          })})
        `.execute(trx)

        return {
          status: 'MATCHED' as const,
          matchId: match.id,
          opponentId: opponent.user_id,
        }
      }

      // No opponent — join queue
      await trx
        .insertInto('matchmaking_queue')
        .values({ user_id: userId })
        .execute()

      return { status: 'QUEUED' as const }
    })
  }

  leaveQueue(userId: string): ResultAsync<void, AppError> {
    return this.db
      .delete(
        (db) =>
          db
            .deleteFrom('matchmaking_queue')
            .where('user_id', '=', userId)
            .returningAll()
            .executeTakeFirst(),
        AppError.notFound('Queue entry')
      )
      .map(() => undefined)
  }

  getStatus(userId: string): ResultAsync<StatusResult, AppError> {
    return this.db.query(async (db) => {
      // Check if in queue
      const queueEntry = await db
        .selectFrom('matchmaking_queue')
        .select(['joined_at'])
        .where('user_id', '=', userId)
        .executeTakeFirst()

      if (queueEntry) {
        return {
          status: 'IN_QUEUE' as const,
          joinedAt: queueEntry.joined_at.toISOString(),
        }
      }

      // Check if has a pending match
      const match = await db
        .selectFrom('matches')
        .select(['id', 'player1_id', 'player2_id'])
        .where((eb) =>
          eb.or([eb('player1_id', '=', userId), eb('player2_id', '=', userId)])
        )
        .where('status', '=', 'PENDING')
        .executeTakeFirst()

      if (match) {
        const opponentId =
          match.player1_id === userId ? match.player2_id : match.player1_id
        return {
          status: 'MATCHED' as const,
          matchId: match.id,
          opponentId,
        }
      }

      return { status: 'IDLE' as const }
    })
  }
}
