import { AuthError, getIdToken, signOut } from './auth.js'
import { config } from './config.js'

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message ?? `通信エラー（${status}）`)
    this.status = status
    this.errors = body?.errors
  }
}

export async function request(method, path, body) {
  const res = await fetch(config.apiUrl + path, {
    method,
    headers: {
      authorization: `Bearer ${await getIdToken()}`,
      ...(body !== undefined && { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 401) {
    await signOut()
    throw new AuthError('SessionExpired', 'ログインの有効期限が切れました。もう一度ログインしてください')
  }
  const data = res.status === 204 ? undefined : await res.json().catch(() => undefined)
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}
