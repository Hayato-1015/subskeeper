import { useState } from 'react'
import { CATEGORIES } from '@subskeeper/shared'
import { formatYen } from '../lib/format.js'

// カテゴリ別の割合を横向きの積み上げ棒で表示。下の凡例が金額付きの表を兼ねる
// 色はカテゴリに固定（CATEGORIES の順 → --series-n）
export default function CategoryBreakdown({ rows, total }) {
  const [active, setActive] = useState(null)
  const sorted = [...rows].sort((a, b) => b.monthly - a.monthly)
  const share = (v) => (total > 0 ? v / total : 0)
  const color = (category) => `var(--series-${CATEGORIES.indexOf(category) + 1})`
  const current = sorted.find((r) => r.category === active)

  return (
    <div className="breakdown">
      <div className="breakdown-tip" aria-live="polite">
        {current ? (
          <>
            <strong>{current.category}</strong> {formatYen(current.monthly)}（{Math.round(share(current.monthly) * 100)}%）
          </>
        ) : (
          <span className="muted">棒にカーソルを合わせる（タップする）と詳細を表示</span>
        )}
      </div>

      <div className="breakdown-bar" role="img" aria-label="カテゴリ別の月額の割合" onMouseLeave={() => setActive(null)}>
        {sorted.map((r) => (
          <div
            key={r.category}
            className={active && active !== r.category ? 'segment dim' : 'segment'}
            style={{ flexGrow: r.monthly, background: color(r.category) }}
            onMouseEnter={() => setActive(r.category)}
            onClick={() => setActive(active === r.category ? null : r.category)}
          />
        ))}
      </div>

      <table className="breakdown-table">
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.category}
              className={active === r.category ? 'active' : undefined}
              onMouseEnter={() => setActive(r.category)}
              onMouseLeave={() => setActive(null)}
            >
              <th scope="row">
                <span className="swatch" style={{ background: color(r.category) }} aria-hidden="true" />
                {r.category}
              </th>
              <td>{formatYen(r.monthly)}</td>
              <td className="muted">{Math.round(share(r.monthly) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
