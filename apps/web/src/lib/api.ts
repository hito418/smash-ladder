export const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export class ApiError extends Error {
  override name = 'ApiError'

  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(res.status, body.message ?? res.statusText)
  }

  const contentType = res.headers.get('content-type')
  if (res.status === 204 || !contentType?.includes('application/json')) {
    return undefined as T
  }

  return res.json()
}
