import { useState } from 'react'
import { CATEGORIES, toMonthly } from '@subskeeper/shared'
import SubscriptionItem from './SubscriptionItem.jsx'

const SORTS = {
  date: { label: '更新日順', compare: (a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate) },
  amount: { label: '金額順', compare: (a, b) => toMonthly(b) - toMonthly(a) },
}

export default function SubscriptionList({ subs, today, onSelect }) {
  const [sort, setSort] = useState('date')
  const [category, setCategory] = useState('')

  const usedCategories = CATEGORIES.filter((c) => subs.some((s) => s.category === c))
  const shown = subs.filter((s) => !category || s.category === category).sort(SORTS[sort].compare)

  return (
    <section>
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="並び替え">
          {Object.entries(SORTS).map(([id, s]) => (
            <button
              key={id}
              type="button"
              className={sort === id ? 'active' : undefined}
              aria-pressed={sort === id}
              onClick={() => setSort(id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="カテゴリで絞り込み">
          <option value="">すべてのカテゴリ</option>
          {usedCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="empty muted">{subs.length === 0 ? 'まだサブスクが登録されていません。' : '該当するサブスクはありません。'}</p>
      ) : (
        <ul className="sub-list">
          {shown.map((s) => (
            <SubscriptionItem key={s.id} sub={s} today={today} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </section>
  )
}
