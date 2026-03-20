import { type } from 'arktype'
import { strip, timestamps } from 'src/shared/response-schemas'

export const GameBanSchema = type({
  ...strip,
  id: 'string',
  gameId: 'string',
  userId: 'string',
  stage: 'string',
  banOrder: 'number',
  createdAt: 'string',
})

export const GameSchema = type({
  ...strip,
  id: 'string',
  matchId: 'string',
  gameNumber: 'number',
  'player1Character?': 'string | null',
  'player2Character?': 'string | null',
  'stage?': 'string | null',
  'winnerId?': 'string | null',
  'player1Report?': 'string | null',
  'player2Report?': 'string | null',
  status: 'string',
  'firstBannerId?': 'string | null',
  bans: GameBanSchema.array(),
  ...timestamps,
})

export const MatchDetailSchema = type({
  ...strip,
  id: 'string',
  player1Id: 'string',
  player2Id: 'string',
  player1Username: 'string',
  player2Username: 'string',
  status: 'string',
  'winnerId?': 'string | null',
  games: GameSchema.array(),
  ...timestamps,
})

export const MatchListItemSchema = type({
  ...strip,
  id: 'string',
  player1Id: 'string',
  player2Id: 'string',
  player1Username: 'string',
  player2Username: 'string',
  status: 'string',
  'winnerId?': 'string | null',
  ...timestamps,
})

export const MatchListSchema = MatchListItemSchema.array()

export const SelectCharacterSchema = type({
  ...strip,
  character: 'string',
})

export const BanStageSchema = type({
  ...strip,
  stage: 'string',
})

export const ReportWinnerSchema = type({
  ...strip,
  winnerId: 'string',
})
