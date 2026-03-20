import { sql } from 'kysely'
import { ResultAsync } from 'neverthrow'
import { DbService } from 'src/shared/db-service'
import { AppError } from 'src/shared/errors'
import { logger } from 'src/shared/logger'
import {
  CHARACTERS,
  STAGES,
  FIRST_BANNER_BANS,
  TOTAL_BANS,
} from './match.constants'

type MatchUpdateCallback = (data: {
  matchId: string
  event: string
  data?: unknown
}) => void

type GameRow = {
  id: string
  match_id: string
  game_number: number
  player1_character: string | null
  player2_character: string | null
  stage: string | null
  winner_id: string | null
  player1_report: string | null
  player2_report: string | null
  status: string
  first_banner_id: string | null
  created_at: Date
  updated_at: Date
}

type BanRow = {
  id: string
  game_id: string
  user_id: string
  stage: string
  ban_order: number
  created_at: Date
}

type MatchRow = {
  id: string
  player1_id: string
  player2_id: string
  status: string
  winner_id: string | null
  created_at: Date
  updated_at: Date
}

function formatGamePublic(game: GameRow, bans: BanRow[]) {
  // Hide both characters during blind pick
  const hideChars = game.status === 'CHARACTER_SELECT' && game.game_number === 1

  return {
    id: game.id,
    matchId: game.match_id,
    gameNumber: game.game_number,
    player1Character: hideChars ? null : game.player1_character,
    player2Character: hideChars ? null : game.player2_character,
    stage: game.stage,
    winnerId: game.winner_id,
    player1Report: game.player1_report,
    player2Report: game.player2_report,
    status: game.status,
    firstBannerId: game.first_banner_id,
    bans: bans
      .filter((b) => b.game_id === game.id)
      .map((b) => ({
        id: b.id,
        gameId: b.game_id,
        userId: b.user_id,
        stage: b.stage,
        banOrder: b.ban_order,
        createdAt: b.created_at.toISOString(),
      })),
    created_at: game.created_at,
    updated_at: game.updated_at,
  }
}

function formatGameForUser(
  game: GameRow,
  bans: BanRow[],
  userId: string,
  match: MatchRow
) {
  const isPlayer1 = match.player1_id === userId
  const hideOpponentPick =
    game.status === 'CHARACTER_SELECT' && game.game_number === 1

  return {
    id: game.id,
    matchId: game.match_id,
    gameNumber: game.game_number,
    player1Character:
      hideOpponentPick && !isPlayer1
        ? game.player1_character
          ? '???'
          : null
        : game.player1_character,
    player2Character:
      hideOpponentPick && isPlayer1
        ? game.player2_character
          ? '???'
          : null
        : game.player2_character,
    stage: game.stage,
    winnerId: game.winner_id,
    player1Report: game.player1_report,
    player2Report: game.player2_report,
    status: game.status,
    firstBannerId: game.first_banner_id,
    bans: bans
      .filter((b) => b.game_id === game.id)
      .map((b) => ({
        id: b.id,
        gameId: b.game_id,
        userId: b.user_id,
        stage: b.stage,
        banOrder: b.ban_order,
        createdAt: b.created_at.toISOString(),
      })),
    created_at: game.created_at,
    updated_at: game.updated_at,
  }
}

export class MatchService {
  private subscribers = new Map<string, Set<MatchUpdateCallback>>()

  constructor(private db: DbService) {}

  subscribe(matchId: string, cb: MatchUpdateCallback): () => void {
    let cbs = this.subscribers.get(matchId)
    if (!cbs) {
      cbs = new Set()
      this.subscribers.set(matchId, cbs)
    }
    cbs.add(cb)
    return () => {
      cbs!.delete(cb)
      if (cbs!.size === 0) this.subscribers.delete(matchId)
    }
  }

  handleNotification(payload: string): void {
    try {
      const data = JSON.parse(payload) as {
        matchId: string
        event: string
        data?: unknown
      }
      const cbs = this.subscribers.get(data.matchId)
      if (!cbs) return
      for (const cb of cbs) {
        cb(data)
      }
    } catch {
      logger.error({ payload }, 'Invalid match_update payload')
    }
  }

  listMatches(): ResultAsync<unknown[], AppError> {
    return this.db.query(async (db) => {
      const matches = await db
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
          'matches.updated_at',
        ])
        .orderBy('matches.created_at', 'desc')
        .execute()

      return matches.map((m) => ({
        id: m.id,
        player1Id: m.player1_id,
        player2Id: m.player2_id,
        player1Username: m.player1_username,
        player2Username: m.player2_username,
        status: m.status,
        winnerId: m.winner_id,
        created_at: m.created_at,
        updated_at: m.updated_at,
      }))
    })
  }

  getMatch(matchId: string, userId: string): ResultAsync<unknown, AppError> {
    return this.db.query(async (db) => {
      const match = await db
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
          'matches.updated_at',
        ])
        .where('matches.id', '=', matchId)
        .executeTakeFirst()

      if (!match) throw AppError.notFound('Match')
      if (match.player1_id !== userId && match.player2_id !== userId) {
        throw AppError.unauthorized('Not a participant of this match')
      }

      const games = await db
        .selectFrom('games')
        .selectAll()
        .where('match_id', '=', matchId)
        .orderBy('game_number', 'asc')
        .execute()

      const gameIds = games.map((g) => g.id)
      const bans =
        gameIds.length > 0
          ? await db
              .selectFrom('game_bans')
              .selectAll()
              .where('game_id', 'in', gameIds)
              .orderBy('ban_order', 'asc')
              .execute()
          : []

      const matchRow = {
        id: match.id,
        player1_id: match.player1_id,
        player2_id: match.player2_id,
        status: match.status,
        winner_id: match.winner_id,
        created_at: match.created_at,
        updated_at: match.updated_at,
      }

      return {
        id: match.id,
        player1Id: match.player1_id,
        player2Id: match.player2_id,
        player1Username: match.player1_username,
        player2Username: match.player2_username,
        status: match.status,
        winnerId: match.winner_id,
        games: games.map((g) => formatGameForUser(g, bans, userId, matchRow)),
        created_at: match.created_at,
        updated_at: match.updated_at,
      }
    })
  }

  getMatchDetails(matchId: string): ResultAsync<unknown, AppError> {
    return this.db.query(async (db) => {
      const match = await db
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
          'matches.updated_at',
        ])
        .where('matches.id', '=', matchId)
        .executeTakeFirst()

      if (!match) throw AppError.notFound('Match')

      const games = await db
        .selectFrom('games')
        .selectAll()
        .where('match_id', '=', matchId)
        .orderBy('game_number', 'asc')
        .execute()

      const gameIds = games.map((g) => g.id)
      const bans =
        gameIds.length > 0
          ? await db
              .selectFrom('game_bans')
              .selectAll()
              .where('game_id', 'in', gameIds)
              .orderBy('ban_order', 'asc')
              .execute()
          : []

      return {
        id: match.id,
        player1Id: match.player1_id,
        player2Id: match.player2_id,
        player1Username: match.player1_username,
        player2Username: match.player2_username,
        status: match.status,
        winnerId: match.winner_id,
        games: games.map((g) => formatGamePublic(g, bans)),
        created_at: match.created_at,
        updated_at: match.updated_at,
      }
    })
  }

  selectCharacter(
    matchId: string,
    userId: string,
    character: string
  ): ResultAsync<{ success: true }, AppError> {
    return this.db.transaction(async (trx) => {
      if (!CHARACTERS.includes(character as (typeof CHARACTERS)[number])) {
        return AppError.notFound('Character')
      }

      const match = await trx
        .selectFrom('matches')
        .selectAll()
        .where('id', '=', matchId)
        .executeTakeFirst()

      if (!match) return AppError.notFound('Match')
      if (match.player1_id !== userId && match.player2_id !== userId) {
        return AppError.unauthorized('Not a participant')
      }
      if (match.status !== 'IN_PROGRESS') {
        return AppError.unauthorized('Match is not in progress')
      }

      const currentGame = await trx
        .selectFrom('games')
        .selectAll()
        .where('match_id', '=', matchId)
        .orderBy('game_number', 'desc')
        .executeTakeFirst()

      if (!currentGame || currentGame.status !== 'CHARACTER_SELECT') {
        return AppError.unauthorized('Not in character select phase')
      }

      const isPlayer1 = match.player1_id === userId
      const characterCol = isPlayer1 ? 'player1_character' : 'player2_character'

      // Check if already picked
      const alreadyPicked = isPlayer1
        ? currentGame.player1_character
        : currentGame.player2_character
      if (alreadyPicked) {
        return AppError.alreadyExists('Character already selected')
      }

      // Games 2+: loser picks first, winner counterpicks
      if (currentGame.game_number > 1) {
        const prevGame = await trx
          .selectFrom('games')
          .select('winner_id')
          .where('match_id', '=', matchId)
          .where('game_number', '=', currentGame.game_number - 1)
          .executeTakeFirst()

        if (prevGame?.winner_id) {
          const isWinner = prevGame.winner_id === userId
          const loserIsP1 = prevGame.winner_id !== match.player1_id
          const loserPicked = loserIsP1
            ? currentGame.player1_character
            : currentGame.player2_character

          // Winner cannot pick until loser has picked
          if (isWinner && !loserPicked) {
            return AppError.unauthorized('Loser must pick first')
          }
        }
      }

      await trx
        .updateTable('games')
        .set({ [characterCol]: character, updated_at: new Date() })
        .where('id', '=', currentGame.id)
        .execute()

      // Check if both players have picked
      const otherPicked = isPlayer1
        ? currentGame.player2_character
        : currentGame.player1_character

      if (otherPicked) {
        await trx
          .updateTable('games')
          .set({ status: 'MAP_BAN', updated_at: new Date() })
          .where('id', '=', currentGame.id)
          .execute()
      }

      await sql`
        SELECT pg_notify('match_update', ${JSON.stringify({
          matchId,
          event: 'character_selected',
        })})
      `.execute(trx)

      return { success: true as const }
    })
  }

  banStage(
    matchId: string,
    userId: string,
    stage: string
  ): ResultAsync<{ success: true }, AppError> {
    return this.db.transaction(async (trx) => {
      if (!STAGES.includes(stage as (typeof STAGES)[number])) {
        return AppError.notFound('Stage')
      }

      const match = await trx
        .selectFrom('matches')
        .selectAll()
        .where('id', '=', matchId)
        .executeTakeFirst()

      if (!match) return AppError.notFound('Match')
      if (match.player1_id !== userId && match.player2_id !== userId) {
        return AppError.unauthorized('Not a participant')
      }
      if (match.status !== 'IN_PROGRESS') {
        return AppError.unauthorized('Match is not in progress')
      }

      const currentGame = await trx
        .selectFrom('games')
        .selectAll()
        .where('match_id', '=', matchId)
        .orderBy('game_number', 'desc')
        .executeTakeFirst()

      if (!currentGame || currentGame.status !== 'MAP_BAN') {
        return AppError.unauthorized('Not in map ban phase')
      }

      const existingBans = await trx
        .selectFrom('game_bans')
        .selectAll()
        .where('game_id', '=', currentGame.id)
        .orderBy('ban_order', 'asc')
        .execute()

      if (existingBans.some((b) => b.stage === stage)) {
        return AppError.alreadyExists('Stage already banned')
      }

      const totalBans = existingBans.length
      const firstBannerId = currentGame.first_banner_id!
      const isFirstGame = currentGame.game_number === 1

      // Game 1: first banner bans 3, second bans 2, first picks from 2
      // Games 2+: winner (first banner) bans 3, loser picks from 4
      const maxBans = isFirstGame ? TOTAL_BANS : FIRST_BANNER_BANS

      if (totalBans >= maxBans) {
        return AppError.unauthorized('All bans already placed')
      }

      const secondBannerId =
        firstBannerId === match.player1_id ? match.player2_id : match.player1_id

      let expectedBannerId: string
      if (isFirstGame) {
        expectedBannerId =
          totalBans < FIRST_BANNER_BANS ? firstBannerId : secondBannerId
      } else {
        // Games 2+: only the winner (first banner) bans
        expectedBannerId = firstBannerId
      }

      if (userId !== expectedBannerId) {
        return AppError.unauthorized('Not your turn to ban')
      }

      await trx
        .insertInto('game_bans')
        .values({
          game_id: currentGame.id,
          user_id: userId,
          stage,
          ban_order: totalBans + 1,
        })
        .execute()

      // Transition to STAGE_PICK when all bans are placed
      if (totalBans + 1 === maxBans) {
        await trx
          .updateTable('games')
          .set({ status: 'STAGE_PICK', updated_at: new Date() })
          .where('id', '=', currentGame.id)
          .execute()
      }

      await sql`
        SELECT pg_notify('match_update', ${JSON.stringify({
          matchId,
          event: 'stage_banned',
        })})
      `.execute(trx)

      return { success: true as const }
    })
  }

  pickStage(
    matchId: string,
    userId: string,
    stage: string
  ): ResultAsync<{ success: true }, AppError> {
    return this.db.transaction(async (trx) => {
      if (!STAGES.includes(stage as (typeof STAGES)[number])) {
        return AppError.notFound('Stage')
      }

      const match = await trx
        .selectFrom('matches')
        .selectAll()
        .where('id', '=', matchId)
        .executeTakeFirst()

      if (!match) return AppError.notFound('Match')
      if (match.player1_id !== userId && match.player2_id !== userId) {
        return AppError.unauthorized('Not a participant')
      }
      if (match.status !== 'IN_PROGRESS') {
        return AppError.unauthorized('Match is not in progress')
      }

      const currentGame = await trx
        .selectFrom('games')
        .selectAll()
        .where('match_id', '=', matchId)
        .orderBy('game_number', 'desc')
        .executeTakeFirst()

      if (!currentGame || currentGame.status !== 'STAGE_PICK') {
        return AppError.unauthorized('Not in stage pick phase')
      }

      // Game 1: first banner picks. Games 2+: second banner (loser) picks.
      const firstBannerId = currentGame.first_banner_id!
      const pickerIsFirstBanner = currentGame.game_number === 1
      const isAllowedPicker = pickerIsFirstBanner
        ? userId === firstBannerId
        : userId !== firstBannerId
      if (!isAllowedPicker) {
        return AppError.unauthorized('Not your turn to pick')
      }

      // Validate stage is one of the 2 remaining
      const bans = await trx
        .selectFrom('game_bans')
        .select('stage')
        .where('game_id', '=', currentGame.id)
        .execute()

      const bannedStages = bans.map((b) => b.stage)
      if (bannedStages.includes(stage)) {
        return AppError.unauthorized('Stage is banned')
      }

      await trx
        .updateTable('games')
        .set({ stage, status: 'RESULT_PENDING', updated_at: new Date() })
        .where('id', '=', currentGame.id)
        .execute()

      await sql`
        SELECT pg_notify('match_update', ${JSON.stringify({
          matchId,
          event: 'stage_picked',
        })})
      `.execute(trx)

      return { success: true as const }
    })
  }

  reportWinner(
    matchId: string,
    userId: string,
    winnerId: string
  ): ResultAsync<{ success: true; conflict?: boolean }, AppError> {
    return this.db.transaction(async (trx) => {
      const match = await trx
        .selectFrom('matches')
        .selectAll()
        .where('id', '=', matchId)
        .executeTakeFirst()

      if (!match) return AppError.notFound('Match')
      if (match.player1_id !== userId && match.player2_id !== userId) {
        return AppError.unauthorized('Not a participant')
      }
      if (match.status !== 'IN_PROGRESS') {
        return AppError.unauthorized('Match is not in progress')
      }

      if (winnerId !== match.player1_id && winnerId !== match.player2_id) {
        return AppError.unauthorized('Winner must be a match participant')
      }

      const currentGame = await trx
        .selectFrom('games')
        .selectAll()
        .where('match_id', '=', matchId)
        .orderBy('game_number', 'desc')
        .executeTakeFirst()

      if (!currentGame || currentGame.status !== 'RESULT_PENDING') {
        return AppError.unauthorized('Not in result pending phase')
      }

      const isPlayer1 = match.player1_id === userId
      const reportCol = isPlayer1 ? 'player1_report' : 'player2_report'

      const alreadyReported = isPlayer1
        ? currentGame.player1_report
        : currentGame.player2_report
      if (alreadyReported) {
        return AppError.alreadyExists('Already reported')
      }

      await trx
        .updateTable('games')
        .set({ [reportCol]: winnerId, updated_at: new Date() })
        .where('id', '=', currentGame.id)
        .execute()

      const otherReport = isPlayer1
        ? currentGame.player2_report
        : currentGame.player1_report

      if (otherReport) {
        if (otherReport === winnerId) {
          // Agreement
          await trx
            .updateTable('games')
            .set({
              winner_id: winnerId,
              status: 'COMPLETED',
              updated_at: new Date(),
            })
            .where('id', '=', currentGame.id)
            .execute()

          // Current game already set to COMPLETED above, so query includes it
          const completedGames = await trx
            .selectFrom('games')
            .select('winner_id')
            .where('match_id', '=', matchId)
            .where('status', '=', 'COMPLETED')
            .execute()

          const p1Wins = completedGames.filter(
            (g) => g.winner_id === match.player1_id
          ).length
          const p2Wins = completedGames.filter(
            (g) => g.winner_id === match.player2_id
          ).length

          if (p1Wins >= 2 || p2Wins >= 2) {
            const matchWinner =
              p1Wins >= 2 ? match.player1_id : match.player2_id
            await trx
              .updateTable('matches')
              .set({
                status: 'COMPLETED',
                winner_id: matchWinner,
                updated_at: new Date(),
              })
              .where('id', '=', matchId)
              .execute()

            await sql`
              SELECT pg_notify('match_update', ${JSON.stringify({
                matchId,
                event: 'match_completed',
              })})
            `.execute(trx)
          } else {
            // Next game — winner bans first
            await trx
              .insertInto('games')
              .values({
                match_id: matchId,
                game_number: currentGame.game_number + 1,
                status: 'CHARACTER_SELECT',
                first_banner_id: winnerId,
              })
              .execute()

            await sql`
              SELECT pg_notify('match_update', ${JSON.stringify({
                matchId,
                event: 'next_game',
              })})
            `.execute(trx)
          }

          return { success: true as const }
        } else {
          // Conflict
          await trx
            .updateTable('games')
            .set({
              player1_report: null,
              player2_report: null,
              updated_at: new Date(),
            })
            .where('id', '=', currentGame.id)
            .execute()

          await sql`
            SELECT pg_notify('match_update', ${JSON.stringify({
              matchId,
              event: 'report_conflict',
            })})
          `.execute(trx)

          return { success: true as const, conflict: true }
        }
      }

      await sql`
        SELECT pg_notify('match_update', ${JSON.stringify({
          matchId,
          event: 'report_submitted',
        })})
      `.execute(trx)

      return { success: true as const }
    })
  }

  forfeit(
    matchId: string,
    userId: string
  ): ResultAsync<{ success: true }, AppError> {
    return this.db.transaction(async (trx) => {
      const match = await trx
        .selectFrom('matches')
        .selectAll()
        .where('id', '=', matchId)
        .executeTakeFirst()

      if (!match) return AppError.notFound('Match')
      if (match.player1_id !== userId && match.player2_id !== userId) {
        return AppError.unauthorized('Not a participant')
      }
      if (match.status !== 'IN_PROGRESS') {
        return AppError.unauthorized('Match is not in progress')
      }

      const opponentId =
        match.player1_id === userId ? match.player2_id : match.player1_id

      // Count current wins
      const completedGames = await trx
        .selectFrom('games')
        .select('winner_id')
        .where('match_id', '=', matchId)
        .where('status', '=', 'COMPLETED')
        .execute()

      const opponentWins = completedGames.filter(
        (g) => g.winner_id === opponentId
      ).length
      const winsNeeded = 2 - opponentWins

      // Award remaining wins as forfeited games
      const lastGameNumber = await trx
        .selectFrom('games')
        .select('game_number')
        .where('match_id', '=', matchId)
        .orderBy('game_number', 'desc')
        .executeTakeFirst()

      // Mark current in-progress game as forfeited
      await trx
        .updateTable('games')
        .set({
          winner_id: opponentId,
          status: 'COMPLETED',
          updated_at: new Date(),
        })
        .where('match_id', '=', matchId)
        .where('status', '!=', 'COMPLETED')
        .execute()

      // Create additional forfeit games if needed
      let nextGameNumber = (lastGameNumber?.game_number ?? 0) + 1
      for (let i = 1; i < winsNeeded; i++) {
        await trx
          .insertInto('games')
          .values({
            match_id: matchId,
            game_number: nextGameNumber++,
            status: 'COMPLETED',
            winner_id: opponentId,
          })
          .execute()
      }

      // Complete the match
      await trx
        .updateTable('matches')
        .set({
          status: 'COMPLETED',
          winner_id: opponentId,
          updated_at: new Date(),
        })
        .where('id', '=', matchId)
        .execute()

      await sql`
        SELECT pg_notify('match_update', ${JSON.stringify({
          matchId,
          event: 'match_completed',
        })})
      `.execute(trx)

      return { success: true as const }
    })
  }
}
