import { api } from '../../lib/api'

export type SessionPayload = {
  sub: { id: string }
  username: string
}

type AuthCredentials = {
  username: string
  password: string
}

export const authApi = {
  me: () => api<SessionPayload>('/auth/me'),
  login: (credentials: AuthCredentials) =>
    api<SessionPayload>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  register: (credentials: AuthCredentials) =>
    api<SessionPayload>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  logout: () => api<{ success: boolean }>('/auth/logout', { method: 'POST' }),
}
