import { useEffect, useRef } from 'react'

const WORDS = ['Transform', 'Your', 'Life', 'with', 'a', 'Monthly', 'Reset.']

// 各単語が浮かび始める位置（全体の進み具合 0〜1 のうち）と、浮かび切るまでの幅
const SPREAD = 0.65
const SPAN = 0.35

// 黒い画面に大きなメッセージ。文字を画面中央に固定したまま、下へスクロールするほど単語が順に浮かび上がり、戻すと消える
export default function Statement() {
  const ref = useRef(null)

  useEffect(() => {
    let frame = 0
    function update() {
      frame = 0
      const el = ref.current
      if (!el) return
      const vh = window.innerHeight
      const rect = el.getBoundingClientRect()
      // セクションが画面の下から入り始めたら 0、固定表示が終わる位置で 1
      // （セクションを高くして文字を固定しているので、その分だけ長くスクロールで動く）
      const progress = Math.min(1, Math.max(0, (vh * 0.5 - rect.top) / (rect.height - vh * 0.5)))
      el.querySelectorAll('.lp-word').forEach((word, i) => {
        const start = (i / (WORDS.length - 1)) * SPREAD
        const p = Math.min(1, Math.max(0, (progress - start) / SPAN))
        word.style.setProperty('--p', p.toFixed(3))
      })
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

  return (
    <section ref={ref} className="lp-statement">
      <div className="lp-statement-sticky">
        <p className="lp-statement-text">
          {WORDS.map((w, i) => (
            <span key={w} className={i === WORDS.length - 1 ? 'lp-word accent' : 'lp-word'}>
              {w}
            </span>
        )).reduce((acc, el) => (acc.length ? [...acc, ' ', el] : [el]), [])}
        </p>
      </div>
    </section>
  )
}
