import { type } from 'arktype'
import { strip, timestamps } from 'src/shared/response-schemas'

export const JoinQueueResponseSchema = type({
  ...strip,
  status: '"QUEUED" | "MATCHED"',
  'matchId?': 'string',
  'opponentId?': 'string',
})

export const LeaveQueueResponseSchema = type({
  ...strip,
  success: 'true',
})

export const MatchmakingStatusSchema = type({
  ...strip,
  status: '"IDLE" | "IN_QUEUE" | "MATCHED"',
  'matchId?': 'string',
  'opponentId?': 'string',
  'joinedAt?': 'string',
})

export const MatchSchema = type({
  ...strip,
  id: 'string',
  player1Id: 'string',
  player2Id: 'string',
  status: 'string',
  'winnerId?': 'string | null',
  ...timestamps,
})
