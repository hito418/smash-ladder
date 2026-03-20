import { ResultAsync } from 'neverthrow'
import { DbService } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'

export class UserService {
  constructor(private db: DbService) {}

  getProfile(username: string): ResultAsync<unknown, AppError> {
    return this.db.query(async (db) => {
      const user = await db
        .selectFrom('users')
        .select(['id', 'username', 'created_at'])
        .where('username', '=', username)
        .where('deleted_at', 'is', null)
        .executeTakeFirst()

      if (!user) throw AppError.notFound('User')

      const userId = user.id

      // All matches involving this user
      const matches = await db
        .selectFrom('matches')
        .selectAll()
        .where((eb) =>
          eb.or([eb('player1_id', '=', userId), eb('player2_id', '=', userId)])
        )
        .where('status', '=', 'COMPLETED')
        .execute()

      const setWins = matches.filter((m) => m.winner_id === userId).length
      const setLosses = matches.length - setWins

      // All games from matches involving this user
      const matchIds = matches.map((m) => m.id)

      // Also include in-progress matches for game stats
      const allMatches = await db
        .selectFrom('matches')
        .select('id')
        .where((eb) =>
          eb.or([eb('player1_id', '=', userId), eb('player2_id', '=', userId)])
        )
        .execute()

      const allMatchIds = allMatches.map((m) => m.id)

      if (allMatchIds.length === 0) {
        return {
          username: user.username,
          createdAt: user.created_at.toISOString(),
          sets: { wins: 0, losses: 0, total: 0, winRate: 0 },
          games: { wins: 0, losses: 0, total: 0, winRate: 0 },
          topCharacters: [],
          matches: [],
        }
      }

      const games = await db
        .selectFrom('games')
        .selectAll()
        .where('match_id', 'in', allMatchIds)
        .where('status', '=', 'COMPLETED')
        .execute()

      const gameWins = games.filter((g) => g.winner_id === userId).length
      const gameLosses = games.length - gameWins

      // Character picks: determine which column is the user's pick per game
      const matchesWithRole = await db
        .selectFrom('matches')
        .select(['id', 'player1_id'])
        .where('id', 'in', allMatchIds)
        .execute()

      const matchPlayerMap = new Map<string, 'p1' | 'p2'>()
      for (const m of matchesWithRole) {
        matchPlayerMap.set(m.id, m.player1_id === userId ? 'p1' : 'p2')
      }

      const charCounts = new Map<string, number>()
      let totalPicks = 0
      for (const game of games) {
        const role = matchPlayerMap.get(game.match_id)
        const character = role === 'p1'
          ? game.player1_character
          : game.player2_character
        if (character) {
          charCounts.set(character, (charCounts.get(character) ?? 0) + 1)
          totalPicks++
        }
      }

      const topCharacters = [...charCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([character, count]) => ({
          character,
          count,
          percentage: totalPicks > 0
            ? Math.round((count / totalPicks) * 100)
            : 0,
        }))

      // Recent matches with usernames
      const recentMatches = await db
        .selectFrom('matches')
        .innerJoin('users as p1', 'p1.id', 'matches.player1_id')
        .innerJoin('users as p2', 'p2.id', 'matches.player2_id')
        .select([
          'matches.id',
          'matches.player1_id',
          'matches.player2_id',
          'p1.username as player1_username',
          'p2.username as player2_username',
          'matches.status',
          'matches.winner_id',
          'matches.created_at',
        ])
        .where((eb) =>
          eb.or([
            eb('matches.player1_id', '=', userId),
            eb('matches.player2_id', '=', userId),
          ])
        )
        .orderBy('matches.created_at', 'desc')
        .execute()

      return {
        username: user.username,
        createdAt: user.created_at.toISOString(),
        sets: {
          wins: setWins,
          losses: setLosses,
          total: matches.length,
          winRate: matches.length > 0
            ? Math.round((setWins / matches.length) * 100)
            : 0,
        },
        games: {
          wins: gameWins,
          losses: gameLosses,
          total: games.length,
          winRate: games.length > 0
            ? Math.round((gameWins / games.length) * 100)
            : 0,
        },
        topCharacters,
        matches: recentMatches.map((m) => ({
          id: m.id,
          player1Id: m.player1_id,
          player2Id: m.player2_id,
          player1Username: m.player1_username,
          player2Username: m.player2_username,
          status: m.status,
          winnerId: m.winner_id,
          created_at: m.created_at,
        })),
      }
    })
  }
}
