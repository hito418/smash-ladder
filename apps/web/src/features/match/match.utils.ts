import type { MatchDetail } from './match.api'

export function computeScore(match: MatchDetail) {
  const p1 = match.games.filter(
    (g) => g.status === 'COMPLETED' && g.winnerId === match.player1Id
  ).length
  const p2 = match.games.filter(
    (g) => g.status === 'COMPLETED' && g.winnerId === match.player2Id
  ).length
  return { p1, p2 }
}
