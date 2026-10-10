// Cognito ユーザープールを直接呼ぶ（ライブラリなし）。トークンは localStorage に保存
import { config } from './config.js'

const KEY = 'subskeeper.session.v1'
// 期限の少し前に更新する
const REFRESH_MARGIN_MS = 60 * 1000

const MESSAGES = {
  UsernameExistsException: 'このメールアドレスは既に登録されています',
  NotAuthorizedException: 'メールアドレスまたはパスワードが正しくありません',
  UserNotConfirmedException: 'メールアドレスの確認が済んでいません',
  CodeMismatchException: '確認コードが正しくありません',
  ExpiredCodeException: '確認コードの有効期限が切れています。再送してください',
  InvalidPasswordException: 'パスワードは8文字以上で、英小文字と数字を含めてください',
  InvalidParameterException: '入力内容を確認してください',
  LimitExceededException: '試行回数が多すぎます。しばらくしてからお試しください',
  TooManyRequestsException: '試行回数が多すぎます。しばらくしてからお試しください',
}

export class AuthError extends Error {
  constructor(code, message) {
    super(MESSAGES[code] ?? message ?? '認証でエラーが発生しました')
    this.code = code
  }
}

async function cognito(action, body) {
  const res = await fetch(`https://cognito-idp.${config.region}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new AuthError((data.__type ?? '').split('#').pop(), data.message)
  return data
}

function decodeJwt(token) {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

function saveSession(result, refreshToken) {
  const session = {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken ?? refreshToken,
    expiresAt: Date.now() + result.ExpiresIn * 1000,
  }
  localStorage.setItem(KEY, JSON.stringify(session))
  return session
}

function clearSession() {
  localStorage.removeItem(KEY)
}

export function currentUser() {
  const session = loadSession()
  if (!session) return null
  const claims = decodeJwt(session.idToken)
  return { email: claims.email, userId: claims.sub }
}

export async function signUp(email, password, nickname) {
  await cognito('SignUp', {
    ClientId: config.userPoolClientId,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: email },
      // 初回の API アクセス時にプロフィールへ引き継ぐ
      { Name: 'nickname', Value: nickname },
    ],
  })
}

export async function confirmSignUp(email, code) {
  await cognito('ConfirmSignUp', { ClientId: config.userPoolClientId, Username: email, ConfirmationCode: code.trim() })
}

export async function resendCode(email) {
  await cognito('ResendConfirmationCode', { ClientId: config.userPoolClientId, Username: email })
}

export async function signIn(email, password) {
  const res = await cognito('InitiateAuth', {
    ClientId: config.userPoolClientId,
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: { USERNAME: email, PASSWORD: password },
  })
  saveSession(res.AuthenticationResult)
  return currentUser()
}

// 期限が近ければリフレッシュトークンで更新した ID トークンを返す
export async function getIdToken() {
  const session = loadSession()
  if (!session) throw new AuthError('NotSignedIn', 'ログインしてください')
  if (Date.now() < session.expiresAt - REFRESH_MARGIN_MS) return session.idToken
  try {
    const res = await cognito('InitiateAuth', {
      ClientId: config.userPoolClientId,
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: { REFRESH_TOKEN: session.refreshToken },
    })
    return saveSession(res.AuthenticationResult, session.refreshToken).idToken
  } catch (err) {
    clearSession()
    throw new AuthError('SessionExpired', 'ログインの有効期限が切れました。もう一度ログインしてください', err)
  }
}

export async function signOut() {
  const session = loadSession()
  clearSession()
  // リフレッシュトークンを無効化（失敗してもローカルからは消えている）
  if (session?.refreshToken) {
    await cognito('RevokeToken', { ClientId: config.userPoolClientId, Token: session.refreshToken }).catch(() => {})
  }
}

// 退会：Cognito のユーザーを削除（データ削除は API 側で先に行う）
export async function deleteUser() {
  await getIdToken()
  const session = loadSession()
  await cognito('DeleteUser', { AccessToken: session.accessToken })
  clearSession()
}
