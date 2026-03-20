import pkg from 'pg'
import { env } from './env'
import { logger } from './logger'

const { Client } = pkg

type NotificationHandler = (payload: string) => void

export class PgListener {
  private client: pkg.Client
  private handlers = new Map<string, Set<NotificationHandler>>()
  private connected = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this.client = this.createClient()
  }

  private createClient(): pkg.Client {
    return new Client({
      host: env.PG_HOST,
      port: env.PG_PORT,
      database: env.PG_DB,
      user: env.PG_USER,
      password: env.PG_PASSWORD,
    })
  }

  async connect(): Promise<void> {
    await this.client.connect()
    this.connected = true

    this.client.on('notification', (msg) => {
      if (!msg.channel || !msg.payload) return
      const handlers = this.handlers.get(msg.channel)
      if (!handlers) return
      for (const handler of handlers) {
        handler(msg.payload)
      }
    })

    this.client.on('error', (err) => {
      logger.error({ err: err.message }, 'PgListener error')
      this.connected = false
      this.scheduleReconnect()
    })

    this.client.on('end', () => {
      if (this.connected) {
        this.connected = false
        this.scheduleReconnect()
      }
    })

    for (const channel of this.handlers.keys()) {
      await this.client.query(`LISTEN ${channel}`)
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      try {
        this.client = this.createClient()
        await this.connect()
        logger.info('PgListener reconnected')
      } catch (err) {
        logger.error({ err: (err as Error).message }, 'PgListener reconnect failed')
        this.scheduleReconnect()
      }
    }, 3000)
  }

  async listen(channel: string, handler: NotificationHandler): Promise<void> {
    let handlers = this.handlers.get(channel)
    if (!handlers) {
      handlers = new Set()
      this.handlers.set(channel, handlers)
      if (this.connected) {
        await this.client.query(`LISTEN ${channel}`)
      }
    }
    handlers.add(handler)
  }

  async close(): Promise<void> {
    this.connected = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    await this.client.end()
  }
}
