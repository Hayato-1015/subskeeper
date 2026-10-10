import { diffDays, monthlyByCategory, totals } from '@subskeeper/shared'
import { formatYen } from '../lib/format.js'
import CategoryBreakdown from './CategoryBreakdown.jsx'
import SubscriptionItem from './SubscriptionItem.jsx'

const UPCOMING_DAYS = 14

export default function Dashboard({ subs, today, onSelect, onShowAll }) {
  if (subs.length === 0) {
    return (
      <section className="empty">
        <p>まだサブスクが登録されていません。</p>
        <p className="muted">右下の「＋」から登録しましょう。</p>
      </section>
    )
  }

  const { monthly, yearly } = totals(subs)
  const upcoming = subs
    .filter((s) => diffDays(today, s.nextBillingDate) <= UPCOMING_DAYS)
    .sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate))

  return (
    <>
      <section className="card hero">
        <p className="hero-label">月額合計</p>
        <p className="hero-value">{formatYen(monthly)}</p>
        <p className="hero-sub">
          年額 {formatYen(yearly)} ・ {subs.length}件
        </p>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>直近{UPCOMING_DAYS}日の更新</h2>
          <button type="button" className="link" onClick={onShowAll}>
            すべて見る
          </button>
        </div>
        {upcoming.length === 0 ? (
          <p className="muted">{UPCOMING_DAYS}日以内に更新されるサブスクはありません。</p>
        ) : (
          <ul className="sub-list">
            {upcoming.map((s) => (
              <SubscriptionItem key={s.id} sub={s} today={today} onSelect={onSelect} />
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>カテゴリ内訳（月額換算）</h2>
        <CategoryBreakdown rows={monthlyByCategory(subs)} total={monthly} />
      </section>
    </>
  )
}
