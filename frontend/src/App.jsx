import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { todayInTokyo } from '@subskeeper/shared'
import Landing from './components/Landing.jsx'
import LoginPage from './components/LoginPage.jsx'
import Dashboard from './components/Dashboard.jsx'
import Settings from './components/Settings.jsx'
import Splash from './components/Splash.jsx'
import SubscriptionForm from './components/SubscriptionForm.jsx'
import SubscriptionList from './components/SubscriptionList.jsx'
import { AuthError, currentUser, signOut } from './lib/auth.js'
import { config, isConfigured } from './lib/config.js'
import { loadProfile } from './lib/settings.js'
import {
  createSubscription,
  deleteSubscription,
  listSubscriptions,
  updateSubscription,
} from './lib/subscriptions.js'

const TABS = [
  { id: 'dashboard', label: 'ホーム' },
  { id: 'list', label: '一覧' },
  { id: 'settings', label: '設定' },
]

// 起動時の演出はブラウザを開いて最初の1回だけ（再読み込みのたびには出さない）
const SPLASH_KEY = 'subskeeper.splashShown'

function shouldShowSplash() {
  try {
    return !sessionStorage.getItem(SPLASH_KEY)
  } catch {
    return true
  }
}

// ログイン前の画面はアドレスの #login で切り替える（端末の「戻る」でトップに戻れる）
function subscribeHash(onChange) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}
const getHash = () => window.location.hash

export default function App() {
  const [user, setUser] = useState(currentUser)
  const hash = useSyncExternalStore(subscribeHash, getHash)

  // ログインしたら #login を消してから中に入る（ログアウト後にログイン画面へ戻らないように）
  const handleSignedIn = useCallback((signedIn) => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    window.scrollTo(0, 0)
    setUser(signedIn)
  }, [])
  const [showSplash, setShowSplash] = useState(shouldShowSplash)

  const finishSplash = useCallback(() => {
    try {
      sessionStorage.setItem(SPLASH_KEY, '1')
    } catch {
      // 保存できなくても演出を閉じるだけ
    }
    setShowSplash(false)
  }, [])

  let screen
  if (!isConfigured()) {
    screen = (
      <div className="app">
        <p className="empty">
          AWS の設定が見つかりません。<br />
          <code>npm run env -w infra</code> を実行して frontend/.env.local を作成してください。
        </p>
      </div>
    )
  } else if (!user) {
    screen = hash === '#login' ? <LoginPage onSignedIn={handleSignedIn} /> : <Landing />
  } else {
    screen = <Main key={user.userId} user={user} onSignedOut={() => setUser(null)} />
  }

  // 演出の裏で画面（データ読み込み）を先に始めておく
  return (
    <>
      {screen}
      {showSplash && <Splash onDone={finishSplash} />}
      {config.stage === 'test' && <div className="stage-badge">テスト環境</div>}
    </>
  )
}

function Main({ user, onSignedOut }) {
  const [subs, setSubs] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState('dashboard')
  // null: フォームを閉じている / {}: 新規登録 / sub: 編集
  const [editing, setEditing] = useState(null)
  const today = todayInTokyo()

  // ログイン切れならログイン画面へ。それ以外はそのまま投げる
  const guard = useCallback(
    async (fn) => {
      try {
        return await fn()
      } catch (err) {
        if (err instanceof AuthError) onSignedOut()
        throw err
      }
    },
    [onSignedOut],
  )

  const reload = useCallback(
    () =>
      guard(listSubscriptions)
        .then((list) => {
          setSubs(list)
          setLoadError('')
        })
        .catch((err) => setLoadError(err.message)),
    [guard],
  )

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    guard(loadProfile)
      .then(setProfile)
      .catch((err) => setProfileError(err.message))
  }, [guard])

  async function handleSave(input) {
    await guard(() => (editing.id ? updateSubscription(editing.id, input) : createSubscription(input)))
    setEditing(null)
    await reload()
  }

  async function handleDelete() {
    await guard(() => deleteSubscription(editing.id))
    setEditing(null)
    await reload()
  }

  async function handleSignOut() {
    await signOut()
    onSignedOut()
  }

  if (editing) {
    return (
      <SubscriptionForm
        initial={editing}
        today={today}
        onSave={handleSave}
        onDelete={editing.id ? handleDelete : null}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="app">
      <header className="app-header main-header">
        <h1>SubsKeeper</h1>
        {profile?.nickname && <span className="greeting">{profile.nickname} さん</span>}
      </header>

      <main className="app-main">
        {tab === 'settings' && !profile ? (
          <p className={profileError ? 'field-error' : 'muted'}>{profileError || '読み込み中…'}</p>
        ) : tab === 'settings' ? (
          <Settings
            email={user.email}
            profile={profile}
            onProfileChange={setProfile}
            guard={guard}
            onSignOut={handleSignOut}
            onDeleted={onSignedOut}
          />
        ) : loadError ? (
          <section className="empty">
            <p className="field-error">{loadError}</p>
            <button type="button" className="link" onClick={reload}>
              再読み込み
            </button>
          </section>
        ) : subs === null ? (
          <p className="muted">読み込み中…</p>
        ) : tab === 'dashboard' ? (
          <Dashboard subs={subs} today={today} onSelect={setEditing} onShowAll={() => setTab('list')} />
        ) : (
          <SubscriptionList subs={subs} today={today} onSelect={setEditing} />
        )}
      </main>

      {tab !== 'settings' && (
        <button type="button" className="fab" onClick={() => setEditing({})} aria-label="サブスクを登録">
          ＋
        </button>
      )}

      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === tab ? 'tab active' : 'tab'}
            aria-current={t.id === tab ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
