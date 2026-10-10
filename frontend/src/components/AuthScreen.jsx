import { useState } from 'react'
import { NICKNAME_MAX_LENGTH, normalizeNickname, validateNickname } from '@subskeeper/shared'
import { confirmSignUp, resendCode, signIn, signUp } from '../lib/auth.js'

const TITLES = { signIn: 'ログイン', signUp: '新規登録', confirm: 'メールアドレスの確認' }

export default function AuthScreen({ onSignedIn }) {
  const [mode, setMode] = useState('signIn')
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  function switchMode(next) {
    setMode(next)
    setError('')
    setNotice('')
  }

  async function run(fn) {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      setError(err.message)
      if (err.code === 'UserNotConfirmedException') setMode('confirm')
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    run(async () => {
      if (mode === 'signIn') {
        onSignedIn(await signIn(email.trim(), password))
      } else if (mode === 'signUp') {
        const nicknameError = validateNickname(nickname)
        if (nicknameError) throw new Error(nicknameError)
        await signUp(email.trim(), password, normalizeNickname(nickname))
        setMode('confirm')
        setNotice(`${email.trim()} に確認コードを送りました`)
      } else {
        await confirmSignUp(email.trim(), code)
        // 確認できたらそのままログイン
        if (password) return onSignedIn(await signIn(email.trim(), password))
        setMode('signIn')
        setNotice('確認できました。ログインしてください')
      }
    })
  }

  // ランディングページ（Landing.jsx）に埋め込むフォーム
  return (
    <form className="card form auth-card" onSubmit={handleSubmit}>
      <h2>{TITLES[mode]}</h2>

      <label className="field">
        <span className="field-label">メールアドレス</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={mode === 'confirm'}
          required
        />
      </label>

      {mode === 'signUp' && (
        <label className="field">
          <span className="field-label">ニックネーム</span>
          <input
            autoComplete="nickname"
            value={nickname}
            maxLength={NICKNAME_MAX_LENGTH}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="アプリ内での表示名"
            required
          />
        </label>
      )}

      {mode === 'confirm' ? (
        <label className="field">
          <span className="field-label">確認コード（メールに届いた6桁）</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </label>
      ) : (
        <label className="field">
          <span className="field-label">パスワード</span>
          <input
            type="password"
            autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {mode === 'signUp' && <span className="muted small">8文字以上、英小文字と数字を含める</span>}
        </label>
      )}

      {notice && <p className="notice small">{notice}</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="primary" disabled={busy}>
        {busy ? '処理中…' : mode === 'signIn' ? 'ログイン' : mode === 'signUp' ? '登録して確認コードを受け取る' : '確認する'}
      </button>

      {mode === 'signIn' && (
        <button type="button" className="link center" onClick={() => switchMode('signUp')}>
          アカウントを作成する
        </button>
      )}
      {mode === 'signUp' && (
        <button type="button" className="link center" onClick={() => switchMode('signIn')}>
          ログインに戻る
        </button>
      )}
      {mode === 'confirm' && (
        <>
          <button
            type="button"
            className="link center"
            disabled={busy}
            onClick={() => run(async () => {
              await resendCode(email.trim())
              setNotice('確認コードを再送しました')
            })}
          >
            確認コードを再送する
          </button>
          <button type="button" className="link center" onClick={() => switchMode('signIn')}>
            ログインに戻る
          </button>
        </>
      )}
    </form>
  )
}
