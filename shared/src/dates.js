// 日付は 'YYYY-MM-DD' 文字列で扱う（タイムゾーンのずれを避けるため内部計算は UTC）

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function parseDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '')
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null
  return { y, m: mo, d }
}

export function isValidDate(iso) {
  return parseDate(iso) !== null
}

export function toISO(y, m, d) {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function addDays(iso, n) {
  const { y, m, d } = parseDate(iso)
  const t = new Date(Date.UTC(y, m - 1, d) + n * MS_PER_DAY)
  return toISO(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}

// n か月後。anchorDay（本来の請求日）が存在しない月は末日にする（1/31 → 2/28 → 3/31）
export function addMonths(iso, n, anchorDay) {
  const { y, m, d } = parseDate(iso)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return toISO(ny, nm, Math.min(anchorDay ?? d, daysInMonth(ny, nm)))
}

// b - a の日数
export function diffDays(a, b) {
  const pa = parseDate(a)
  const pb = parseDate(b)
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / MS_PER_DAY)
}

// 日本時間の今日
export function todayInTokyo(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type) => Number(parts.find((p) => p.type === type).value)
  return toISO(get('year'), get('month'), get('day'))
}
