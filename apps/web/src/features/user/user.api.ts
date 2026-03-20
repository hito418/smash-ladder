import { api } from '../../lib/api'

export type StatBlock = {
  wins: number
  losses: number
  total: number
  winRate: number
}

export type TopCharacter = {
  character: string
  count: number
  percentage: number
}

export type ProfileMatch = {
  id: string
  player1Id: string
  player2Id: string
  player1Username: string
  player2Username: string
  status: string
  winnerId: string | null
  created_at: string
}

export type UserProfile = {
  username: string
  createdAt: string
  sets: StatBlock
  games: StatBlock
  topCharacters: TopCharacter[]
  matches: ProfileMatch[]
}

export const userApi = {
  getProfile: (username: string) => api<UserProfile>(`/users/${username}`),
}
