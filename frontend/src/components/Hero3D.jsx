import { useEffect, useRef, useState } from 'react'

// トップページ全体の背景の 3DCG（画面に固定）。three.js はこの画面を開いたときだけ読み込む
// onStatus('ready' | 'failed') で親に知らせる
export default function Hero3D({ onStatus }) {
  const ref = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let disposed = false
    let scene
    import('../lib/heroScene.js')
      .then(({ createHeroScene }) => {
        if (disposed) return
        scene = createHeroScene(ref.current, {
          onReady: () => {
            setReady(true)
            onStatus?.('ready')
          },
        })
      })
      .catch(() => {
        if (!disposed) onStatus?.('failed')
      })
    return () => {
      disposed = true
      scene?.dispose()
    }
  }, [onStatus])

  return <div ref={ref} className={ready ? 'lp-bg3d ready' : 'lp-bg3d'} aria-hidden="true" />
}
