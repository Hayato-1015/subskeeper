// API（Lambda Function URL）。CORS は Function URL 側で設定している
import { randomUUID } from 'node:crypto'
import { CognitoJwtVerifier } from 'aws-jwt-verify'
import {
  NOTIFY_DAYS_OPTIONS,
  normalizeNickname,
  normalizeSubscription,
  rollForward,
  todayInTokyo,
  validateNickname,
  validateSubscription,
} from '@subskeeper/shared'
import * as repo from './repository.js'

const MAX_SUBSCRIPTIONS = 200

// ID トークンを検証（email を通知先として使うため ID トークン）
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID,
  clientId: process.env.USER_POOL_CLIENT_ID,
  tokenUse: 'id',
})

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: body === undefined ? '' : JSON.stringify(body),
})

class HttpError extends Error {
  constructor(statusCode, message, details) {
    super(message)
    this.statusCode = statusCode
    this.details = details
  }
}

function parseBody(event) {
  if (!event.body) return {}
  let body
  try {
    body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body)
  } catch {
    throw new HttpError(400, 'JSON の形式が正しくありません')
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'JSON の形式が正しくありません')
  return body
}

// 初回アクセス時に作成。ニックネームは新規登録時に Cognito に入れた値を引き継ぐ
async function loadProfile(userId, claims) {
  const profile = await repo.getProfile(userId)
  if (profile) return profile
  const nickname = validateNickname(claims.nickname) ? '' : normalizeNickname(claims.nickname)
  const created = { email: claims.email, nickname, ...repo.DEFAULT_PROFILE, createdAt: new Date().toISOString() }
  await repo.putProfile(userId, created)
  return created
}

function checkSubscription(input) {
  const errors = validateSubscription(input)
  if (Object.keys(errors).length > 0) throw new HttpError(400, '入力内容を確認してください', errors)
  return normalizeSubscription(input)
}

const routes = {
  'GET /profile': ({ userId, claims }) => loadProfile(userId, claims),

  // 送られた項目だけ更新（ニックネーム / 通知設定）
  async 'PUT /profile'({ userId, claims, body }) {
    const current = await loadProfile(userId, claims)
    const patch = {}
    if ('nickname' in body) {
      const error = validateNickname(body.nickname)
      if (error) throw new HttpError(400, error, { nickname: error })
      patch.nickname = normalizeNickname(body.nickname)
    }
    if ('notifyEnabled' in body) {
      if (typeof body.notifyEnabled !== 'boolean') throw new HttpError(400, '通知設定が正しくありません')
      patch.notifyEnabled = body.notifyEnabled
    }
    if ('notifyDaysBefore' in body) {
      const days = Number(body.notifyDaysBefore)
      if (!NOTIFY_DAYS_OPTIONS.includes(days)) throw new HttpError(400, '通知タイミングが正しくありません')
      patch.notifyDaysBefore = days
    }

    const profile = { ...current, ...patch }
    await repo.putProfile(userId, profile)
    // 通知日数・ON/OFF が変わったら全サブスクの notifyOn を再計算
    if (profile.notifyEnabled !== current.notifyEnabled || profile.notifyDaysBefore !== current.notifyDaysBefore) {
      for (const sub of await repo.listSubscriptions(userId)) await repo.putSubscription(userId, sub, profile)
    }
    return profile
  },

  async 'DELETE /profile'({ userId }) {
    await repo.deleteAllUserData(userId)
  },

  async 'GET /subscriptions'({ userId, claims }) {
    const subs = await repo.listSubscriptions(userId)
    // 日次バッチができるまでは、読み込み時にも更新日を繰り越す（F-06）
    const today = todayInTokyo()
    const stale = subs.filter((s) => s.nextBillingDate < today)
    if (stale.length > 0) {
      const profile = await loadProfile(userId, claims)
      for (const sub of stale) {
        sub.nextBillingDate = rollForward(sub, today)
        await repo.putSubscription(userId, sub, profile)
      }
    }
    return subs
  },

  async 'POST /subscriptions'({ userId, claims, body }) {
    const data = checkSubscription(body)
    const existing = await repo.listSubscriptions(userId)
    if (existing.length >= MAX_SUBSCRIPTIONS) throw new HttpError(400, `登録できるのは${MAX_SUBSCRIPTIONS}件までです`)
    const now = new Date().toISOString()
    const sub = { id: randomUUID(), ...data, createdAt: now, updatedAt: now }
    await repo.putSubscription(userId, sub, await loadProfile(userId, claims))
    return sub
  },

  async 'PUT /subscriptions/:id'({ userId, claims, body, id }) {
    const data = checkSubscription(body)
    const current = await repo.getSubscription(userId, id)
    if (!current) throw new HttpError(404, 'サブスクが見つかりません')
    const sub = { ...current, ...data, updatedAt: new Date().toISOString() }
    await repo.putSubscription(userId, sub, await loadProfile(userId, claims))
    return sub
  },

  async 'DELETE /subscriptions/:id'({ userId, id }) {
    await repo.deleteSubscription(userId, id)
  },
}

function matchRoute(method, path) {
  const m = /^\/subscriptions\/([\w-]+)$/.exec(path)
  if (m) return { route: routes[`${method} /subscriptions/:id`], id: m[1] }
  return { route: routes[`${method} ${path}`] }
}

export async function handler(event) {
  const method = event.requestContext.http.method
  const path = event.rawPath.replace(/\/+$/, '') || '/'

  try {
    const { route, id } = matchRoute(method, path)
    if (!route) throw new HttpError(404, 'Not Found')

    const token = (event.headers?.authorization ?? '').replace(/^Bearer /i, '')
    let claims
    try {
      claims = await verifier.verify(token)
    } catch {
      throw new HttpError(401, 'ログインが必要です')
    }

    // ユーザーIDは必ずトークンから取る（仕様書 7. 非機能要件）
    const result = await route({ userId: claims.sub, claims, body: parseBody(event), id })
    return result === undefined ? json(204) : json(200, result)
  } catch (err) {
    if (err instanceof HttpError) return json(err.statusCode, { message: err.message, errors: err.details })
    console.error(err)
    return json(500, { message: 'サーバーでエラーが発生しました' })
  }
}
