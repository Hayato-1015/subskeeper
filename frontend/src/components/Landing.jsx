import { useEffect, useRef, useState } from 'react'
import { goToLogin } from '../lib/nav.js'
import Logo from './Logo.jsx'
import Statement from './Statement.jsx'
import Hero3D from './Hero3D.jsx'
import Swirl from './Swirl.jsx'
import './landing.css'

const FEATURES = [
  { title: '更新日の前に知らせる', body: '更新の1・3・7日前にメールでお知らせ。解約するかを考える時間をつくります。' },
  { title: '毎月いくら払っているか', body: '年払いも週払いも月額に換算して合計。カテゴリ別の内訳もひと目で分かります。' },
  { title: '解約ページにすぐ行ける', body: '解約ページの URL を登録しておけば、迷わず手続きに進めます。' },
]

// 下へスクロールするほど見出しを薄くする（ヒーローの高さの 60% で完全に消える）
function useFadeOnScroll() {
  const ref = useRef(null)
  useEffect(() => {
    let frame = 0
    function update() {
      frame = 0
      const el = ref.current
      if (!el) return
      const progress = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.6)))
      el.style.opacity = String(1 - progress)
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  return ref
}

// ログイン前のトップページ。「ログイン」「はじめる」でログイン画面（#login）へ
export default function Landing() {
  const copyRef = useFadeOnScroll()
  // 'loading' | 'ready' | 'failed'（3DCG が使えない端末は今までの渦を出す）
  const [bg, setBg] = useState('loading')


  return (
    <div className={bg === 'ready' ? 'landing has-3d' : 'landing'}>
      {bg !== 'failed' && <Hero3D onStatus={setBg} />}

      <section className="hero">
        <header className="lp-header">
          <span className="lp-logo">
            <Logo size={28} />
            SubsKeeper
          </span>
          <a className="lp-login" href="#login" onClick={goToLogin}>
            ログイン
          </a>
        </header>

        {bg === 'failed' && (
          <div className="hero-art" aria-hidden="true">
            <Swirl className="swirl" />
          </div>
        )}

        <div className="hero-copy" ref={copyRef}>
          <h1 className="hero-title">
            <span>Subs</span>
            <span>Keeper</span>
          </h1>
          <p className="hero-lead">
            サブスクの「払いすぎ」と「解約し忘れ」を防ぐ、
            <br />
            シンプルな管理アプリ。
          </p>
        </div>
      </section>

      <Statement />

      <section className="lp-start">
        <ol className="lp-features">
          {FEATURES.map((f, i) => (
            <li key={f.title}>
              <span className="lp-num">{String(i + 1).padStart(2, '0')}</span>
              <h2>{f.title}</h2>
              <p>{f.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="lp-footer">© SubsKeeper</footer>

      {/* 「はじめる」はスクロールしても右下に固定 */}
      <a className="hero-circle" href="#login" onClick={goToLogin}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="48" />
        </svg>
        <span>はじめる</span>
      </a>
    </div>
  )
}
