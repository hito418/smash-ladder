import { vi } from 'vitest'
import type { DbService } from 'src/shared/db-service'

export type MockDbService = {
  [K in keyof DbService]: ReturnType<typeof vi.fn>
}

export function createMockDb(): MockDbService {
  return {
    query: vi.fn(),
    queryFirst: vi.fn(),
    queryMany: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    queryPaginated: vi.fn(),
    transaction: vi.fn(),
  }
}
