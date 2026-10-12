import { useState } from 'react'
import { NICKNAME_MAX_LENGTH, NOTIFY_DAYS_OPTIONS, normalizeNickname, validateNickname } from '@subskeeper/shared'
import { deleteUser } from '../lib/auth.js'
import { deleteAllData, updateProfile } from '../lib/settings.js'

export default function Settings({ email, profile, onProfileChange, guard, onSignOut, onDeleted }) {
  // profile は読み込み済みのものが渡される（App 側で待つ）
  const [nickname, setNickname] = useState(profile.nickname ?? '')
  const [nicknameError, setNicknameError] = useState('')
  const [nicknameSaved, setNicknameSaved] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function update(patch) {
    const previous = profile
    onProfileChange({ ...profile, ...patch })
    setError('')
    try {
      onProfileChange(await guard(() => updateProfile(patch)))
      return true
    } catch (err) {
      onProfileChange(previous)
      setError(err.message)
      return false
    }
  }

  async function handleNicknameSubmit(e) {
    e.preventDefault()
    const found = validateNickname(nickname)
    setNicknameError(found ?? '')
    setNicknameSaved(false)
    if (found) return
    setBusy(true)
    if (await update({ nickname: normalizeNickname(nickname) })) setNicknameSaved(true)
    setBusy(false)
  }

  async function handleDeleteAccount() {
    if (!window.confirm('退会すると、登録したサブスクとアカウントがすべて削除されます。よろしいですか？')) return
    setBusy(true)
    setError('')
    try {
      await guard(deleteAllData)
      await deleteUser()
      onDeleted()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const nicknameChanged = normalizeNickname(nickname) !== (profile.nickname ?? '')

  return (
    <>
      <form className="card form" onSubmit={handleNicknameSubmit}>
        <h2>プロフィール</h2>
        <label className="field">
          <span className="field-label">ニックネーム</span>
          <input
            value={nickname}
            maxLength={NICKNAME_MAX_LENGTH}
            onChange={(e) => {
              setNickname(e.target.value)
              setNicknameSaved(false)
            }}
            placeholder="アプリ内での表示名"
          />
          {nicknameError && <span className="field-error">{nicknameError}</span>}
          {nicknameSaved && !nicknameChanged && <span className="muted small">保存しました</span>}
        </label>
        <button type="submit" className="primary" disabled={busy || !nicknameChanged}>
          ニックネームを保存
        </button>
      </form>

      <section className="card">
        <h2>更新前のメール通知</h2>
        <label className="toggle-row">
          <span>通知する</span>
          <input
            type="checkbox"
            checked={profile.notifyEnabled}
            onChange={(e) => update({ notifyEnabled: e.target.checked })}
          />
        </label>
        <label className="field">
          <span className="field-label">通知タイミング</span>
          <select
            value={profile.notifyDaysBefore}
            disabled={!profile.notifyEnabled}
            onChange={(e) => update({ notifyDaysBefore: Number(e.target.value) })}
          >
            {NOTIFY_DAYS_OPTIONS.map((d) => (
              <option key={d} value={d}>
                更新日の{d}日前
              </option>
            ))}
          </select>
        </label>
        <p className="muted small">メール送信は日次バッチを作ったあとに有効になります。</p>
      </section>

      <section className="card form">
        <h2>アカウント</h2>
        <p className="small">{email}</p>
        <button type="button" className="secondary" onClick={onSignOut} disabled={busy}>
          ログアウト
        </button>
        <button type="button" className="danger" onClick={handleDeleteAccount} disabled={busy}>
          {busy ? '処理中…' : '退会する'}
        </button>
      </section>

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </>
  )
}
