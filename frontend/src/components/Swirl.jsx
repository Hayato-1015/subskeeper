// ランディングページの背景の渦（装飾）
// 少しずつ回転させた楕円を重ねてリボン状に見せ、2つの塊を逆向きにゆっくり回す

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// colors（複数色）の t（0〜1）の位置の色
function gradientAt(colors, t) {
  const pos = t * (colors.length - 1)
  const i = Math.min(Math.floor(pos), colors.length - 2)
  const a = hexToRgb(colors[i])
  const b = hexToRgb(colors[i + 1])
  const f = pos - i
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`
}

function Ribbon({ cx, cy, rx, ry, count, step, shrink, colors, className }) {
  return (
    <g className={className} style={{ transformOrigin: `${cx}px ${cy}px` }}>
      {Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1)
        // ところどころ白い細線を入れて、紙を重ねたような質感にする
        const highlight = i % 9 === 4
        return (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx={rx - i * shrink}
            ry={ry - i * shrink * 0.4}
            transform={`rotate(${i * step} ${cx} ${cy})`}
            fill="none"
            stroke={highlight ? '#ffffff' : gradientAt(colors, t)}
            strokeWidth={highlight ? 1.2 : 7}
            strokeOpacity={highlight ? 0.85 : 0.92}
          />
        )
      })}
    </g>
  )
}

export default function Swirl({ className }) {
  return (
    <svg className={className} viewBox="0 0 800 800" aria-hidden="true" focusable="false">
      <g className="swirl-breathe" style={{ transformOrigin: '400px 400px' }}>
        <Ribbon
          className="swirl-spin"
          cx={360}
          cy={360}
          rx={300}
          ry={150}
          count={64}
          step={1.6}
          shrink={1.3}
          colors={['#2c3fd9', '#4b45e2', '#7c4fd8', '#c98bd0', '#f1c6d8']}
        />
        <Ribbon
          className="swirl-spin-reverse"
          cx={450}
          cy={430}
          rx={260}
          ry={120}
          count={56}
          step={-1.8}
          shrink={1.2}
          colors={['#f4b06a', '#e8822f', '#d0603a', '#b65a8e', '#7f56d6']}
        />
      </g>
    </svg>
  )
}
