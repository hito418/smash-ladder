import { api } from '../../lib/api'

export type GameBan = {
  id: string
  gameId: string
  userId: string
  stage: string
  banOrder: number
  createdAt: string
}

export type Game = {
  id: string
  matchId: string
  gameNumber: number
  player1Character: string | null
  player2Character: string | null
  stage: string | null
  winnerId: string | null
  player1Report: string | null
  player2Report: string | null
  status: 'CHARACTER_SELECT' | 'MAP_BAN' | 'STAGE_PICK' | 'RESULT_PENDING' | 'COMPLETED'
  firstBannerId: string | null
  bans: GameBan[]
  created_at: string
  updated_at: string
}

export type MatchDetail = {
  id: string
  player1Id: string
  player2Id: string
  player1Username: string
  player2Username: string
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  winnerId: string | null
  games: Game[]
  created_at: string
  updated_at: string
}

export type MatchListItem = {
  id: string
  player1Id: string
  player2Id: string
  player1Username: string
  player2Username: string
  status: string
  winnerId: string | null
  created_at: string
  updated_at: string
}

export const matchApi = {
  list: () => api<MatchListItem[]>('/matches'),

  getMatch: (matchId: string) =>
    api<MatchDetail>(`/matches/${matchId}`),

  getMatchDetails: (matchId: string) =>
    api<MatchDetail>(`/matches/${matchId}/details`),

  selectCharacter: (matchId: string, character: string) =>
    api<{ success: true }>(`/matches/${matchId}/character`, {
      method: 'POST',
      body: JSON.stringify({ character }),
    }),

  banStage: (matchId: string, stage: string) =>
    api<{ success: true }>(`/matches/${matchId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ stage }),
    }),

  pickStage: (matchId: string, stage: string) =>
    api<{ success: true }>(`/matches/${matchId}/stage`, {
      method: 'POST',
      body: JSON.stringify({ stage }),
    }),

  reportWinner: (matchId: string, winnerId: string) =>
    api<{ success: true; conflict?: boolean }>(`/matches/${matchId}/report`, {
      method: 'POST',
      body: JSON.stringify({ winnerId }),
    }),

  forfeit: (matchId: string) =>
    api<{ success: true }>(`/matches/${matchId}/forfeit`, {
      method: 'POST',
    }),
}
