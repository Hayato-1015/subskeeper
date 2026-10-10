import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Logo from './Logo.jsx'
import './splash.css'

const NAME = 'SubsKeeper'

// 起動時の演出（この順番で進む）
//   1. logo  : ロゴだけが中央にふわっと浮き出る
//   2. slide : ロゴが左へ寄って、右に文字のスペースを空ける
//   3. type  : 空いたところに「SubsKeeper」をタイピング
//   4. leave : 少し止まってからフェードアウト
// タップで飛ばせる。「動きを減らす」設定（Windows のアニメーション効果オフ等）でも順番どおりに再生し、
// ロゴの浮き上がりだけ控えめなフェードにする（splash.css）
const TIMING = { logo: 1200, slide: 450, perChar: 80, hold: 650, exit: 1400 }

export default function Splash({ onDone }) {
  const [phase, setPhase] = useState('logo')
  const [typed, setTyped] = useState(0)
  const [nameWidth, setNameWidth] = useState(0)
  const measureRef = useRef(null)

  // 文字の全幅を先に測っておき、ロゴの移動量に使う
  useLayoutEffect(() => {
    setNameWidth(measureRef.current.offsetWidth)
  }, [])

  useEffect(() => {
    const timers = []
    const at = (ms, fn) => timers.push(setTimeout(fn, ms))

    const slideAt = TIMING.logo
    const typeAt = slideAt + TIMING.slide
    at(slideAt, () => setPhase('slide'))
    at(typeAt, () => setPhase('type'))
    for (let i = 1; i <= NAME.length; i++) {
      at(typeAt + i * TIMING.perChar, () => setTyped(i))
    }
    const leaveAt = typeAt + NAME.length * TIMING.perChar + TIMING.hold
    at(leaveAt, () => setPhase('leave'))
    at(leaveAt + TIMING.exit, onDone)

    return () => timers.forEach(clearTimeout)
  }, [onDone])

  const opened = phase !== 'logo'
  const typing = phase === 'type' && typed < NAME.length

  return (
    <div
      className={`splash ${phase}`}
      style={{ '--exit': `${TIMING.exit}ms` }}
      onClick={onDone}
      role="presentation"
    >
      <div className="splash-mark" aria-label={NAME}>
        <Logo size={64} className="splash-logo" />
        {/* 幅 0 → 文字の全幅 に広がることで、ロゴが中央から左へ寄る */}
        <span className="splash-name-box" style={{ width: opened ? nameWidth : 0 }} aria-hidden="true">
          <span className="splash-name">
            {NAME.slice(0, typed)}
            {phase !== 'logo' && phase !== 'slide' && <span className={typing ? 'splash-caret typing' : 'splash-caret'} />}
          </span>
        </span>
        {/* 幅を測るための見えない全文 */}
        <span ref={measureRef} className="splash-name splash-measure" aria-hidden="true">
          {NAME}
          <span className="splash-caret" />
        </span>
      </div>
    </div>
  )
}
