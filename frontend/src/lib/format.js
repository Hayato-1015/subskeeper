const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 })

export function formatYen(value) {
  return yen.format(Math.round(value))
}

export function formatDate(iso) {
  const [, m, d] = iso.split('-').map(Number)
  const w = '日月火水木金土'[new Date(`${iso}T00:00:00`).getDay()]
  return `${m}/${d}（${w}）`
}

export function formatDaysUntil(days) {
  if (days === 0) return '今日'
  if (days === 1) return '明日'
  return `あと${days}日`
}
