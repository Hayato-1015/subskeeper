import { CATEGORIES, cycleLabel, diffDays, toMonthly } from '@subskeeper/shared'
import { formatDate, formatDaysUntil, formatYen } from '../lib/format.js'

// 7日以内の更新を強調（仕様書 4. 一覧）
const SOON_DAYS = 7

export default function SubscriptionItem({ sub, today, onSelect }) {
  const days = diffDays(today, sub.nextBillingDate)
  const soon = days <= SOON_DAYS
  const slot = CATEGORIES.indexOf(sub.category) + 1

  return (
    <li>
      <button type="button" className={soon ? 'sub-item soon' : 'sub-item'} onClick={() => onSelect(sub)}>
        <span className="sub-main">
          <span className="sub-name">{sub.name}</span>
          <span className="sub-meta">
            <span className="swatch" style={{ background: `var(--series-${slot})` }} aria-hidden="true" />
            {sub.category}
          </span>
        </span>
        <span className="sub-side">
          <span className="sub-amount">
            {formatYen(sub.amount)}
            <span className="muted"> / {cycleLabel(sub)}</span>
          </span>
          {sub.cycle !== 'monthly' && <span className="sub-meta">月 {formatYen(toMonthly(sub))}</span>}
          <span className="sub-date">
            {formatDate(sub.nextBillingDate)}
            <span className={soon ? 'badge soon' : 'badge'}>{formatDaysUntil(days)}</span>
          </span>
        </span>
      </button>
    </li>
  )
}
