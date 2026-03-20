import { type } from 'arktype'
import { dateToString, strip } from 'src/shared/response-schemas'

const StatBlockSchema = type({
  ...strip,
  wins: 'number',
  losses: 'number',
  total: 'number',
  winRate: 'number',
})

const TopCharacterSchema = type({
  ...strip,
  character: 'string',
  count: 'number',
  percentage: 'number',
})

const ProfileMatchSchema = type({
  ...strip,
  id: 'string',
  player1Id: 'string',
  player2Id: 'string',
  player1Username: 'string',
  player2Username: 'string',
  status: 'string',
  'winnerId?': 'string | null',
  created_at: dateToString,
})

export const UserProfileSchema = type({
  ...strip,
  username: 'string',
  createdAt: 'string',
  sets: StatBlockSchema,
  games: StatBlockSchema,
  topCharacters: TopCharacterSchema.array(),
  matches: ProfileMatchSchema.array(),
})
