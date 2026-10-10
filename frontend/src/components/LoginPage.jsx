import { useEffect } from 'react'
import { leaveLogin } from '../lib/nav.js'
import AuthScreen from './AuthScreen.jsx'
import Logo from './Logo.jsx'
import Swirl from './Swirl.jsx'
import './landing.css'

// ログイン画面（#login）。トップページの「ログイン」「はじめる」から来る
// 「戻る」は端末の戻るボタンと同じ動き（lib/nav.js）
export default function LoginPage({ onSignedIn }) {
  // トップページの途中から来ても画面の先頭から表示する
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="landing login-page">
      <div className="login-art" aria-hidden="true">
        <Swirl className="swirl" />
      </div>

      <header className="lp-header">
        <a className="login-back" href="./" onClick={leaveLogin}>
          ← 戻る
        </a>
      </header>

      <main className="login-main">
        <div className="login-brand">
          <Logo size={44} />
          <span>SubsKeeper</span>
        </div>
        <AuthScreen onSignedIn={onSignedIn} />
      </main>
    </div>
  )
}
