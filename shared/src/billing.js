import { addDays, addMonths, isValidDate, parseDate } from './dates.js'

export const CYCLES = {
  monthly: '月額',
  yearly: '年額',
  weekly: '週額',
  months: 'nか月ごと',
}

// 並び順は固定（グラフの色もこの順で割り当てる）
export const CATEGORIES = ['動画', '音楽', 'クラウド', 'AI', 'ゲーム', '学習・書籍', 'その他']

export const NOTIFY_DAYS_OPTIONS = [1, 3, 7]

export const NAME_MAX_LENGTH = 50
export const MEMO_MAX_LENGTH = 500
export const URL_MAX_LENGTH = 2000
export const NICKNAME_MAX_LENGTH = 20

const str = (v) => (v == null ? '' : String(v)).trim()

// ニックネーム：エラーメッセージ、問題なければ null
export function validateNickname(value) {
  const nickname = str(value)
  if (!nickname) return 'ニックネームを入力してください'
  if (nickname.length > NICKNAME_MAX_LENGTH) return `${NICKNAME_MAX_LENGTH}文字以内で入力してください`
  return null
}

export const normalizeNickname = (value) => str(value)

export function cycleLabel(sub) {
  return sub.cycle === 'months' ? `${sub.intervalMonths}か月ごと` : CYCLES[sub.cycle]
}

// F-04 月額換算
export function toMonthly(sub) {
  switch (sub.cycle) {
    case 'monthly':
      return sub.amount
    case 'yearly':
      return sub.amount / 12
    case 'weekly':
      return (sub.amount * 52) / 12
    case 'months':
      return sub.amount / sub.intervalMonths
    default:
      throw new Error(`unknown cycle: ${sub.cycle}`)
  }
}

export function toYearly(sub) {
  return toMonthly(sub) * 12
}

export function totals(subs) {
  const monthly = subs.reduce((sum, s) => sum + toMonthly(s), 0)
  return { monthly, yearly: monthly * 12 }
}

export function monthlyByCategory(subs) {
  return CATEGORIES.map((category) => ({
    category,
    monthly: subs.filter((s) => s.category === category).reduce((sum, s) => sum + toMonthly(s), 0),
  })).filter((row) => row.monthly > 0)
}

// 1サイクル後の更新日
export function advanceOnce(sub, date) {
  const anchor = sub.billingDay ?? parseDate(date).d
  switch (sub.cycle) {
    case 'weekly':
      return addDays(date, 7)
    case 'monthly':
      return addMonths(date, 1, anchor)
    case 'yearly':
      return addMonths(date, 12, anchor)
    case 'months':
      return addMonths(date, sub.intervalMonths, anchor)
    default:
      throw new Error(`unknown cycle: ${sub.cycle}`)
  }
}

// F-06 更新日を過ぎていたら、今日以降の更新日まで繰り越す
export function rollForward(sub, today) {
  let next = sub.nextBillingDate
  while (next < today) next = advanceOnce(sub, next)
  return next
}

// 通知日 = 次回更新日 − 通知日数
export function notifyOn(nextBillingDate, notifyDaysBefore) {
  return addDays(nextBillingDate, -notifyDaysBefore)
}

// F-02 入力チェック。エラーがなければ空オブジェクト
export function validateSubscription(input) {
  const errors = {}
  const name = str(input.name)
  if (!name) errors.name = 'サービス名を入力してください'
  else if (name.length > NAME_MAX_LENGTH) errors.name = `${NAME_MAX_LENGTH}文字以内で入力してください`

  if (input.amount === '' || input.amount == null || !Number.isFinite(Number(input.amount))) {
    errors.amount = '金額を入力してください'
  } else if (Number(input.amount) < 0) {
    errors.amount = '0以上で入力してください'
  }

  if (!Object.hasOwn(CYCLES, input.cycle ?? '')) errors.cycle = '支払いサイクルを選んでください'
  if (input.cycle === 'months') {
    const n = Number(input.intervalMonths)
    if (!Number.isInteger(n) || n < 1 || n > 120) errors.intervalMonths = '1〜120の整数で入力してください'
  }

  if (!isValidDate(input.nextBillingDate)) errors.nextBillingDate = '次回更新日を入力してください'
  if (!CATEGORIES.includes(input.category)) errors.category = 'カテゴリを選んでください'

  const url = str(input.cancelUrl)
  if (url.length > URL_MAX_LENGTH) errors.cancelUrl = `${URL_MAX_LENGTH}文字以内で入力してください`
  else if (url && !/^https?:\/\/\S+$/.test(url)) errors.cancelUrl = 'http:// または https:// で始まるURLを入力してください'

  if (str(input.memo).length > MEMO_MAX_LENGTH) errors.memo = `${MEMO_MAX_LENGTH}文字以内で入力してください`

  return errors
}

// フォーム入力を保存用の形に整える
export function normalizeSubscription(input) {
  const cycle = input.cycle
  return {
    name: str(input.name),
    amount: Number(input.amount),
    cycle,
    intervalMonths: cycle === 'months' ? Number(input.intervalMonths) : null,
    nextBillingDate: input.nextBillingDate,
    billingDay: parseDate(input.nextBillingDate).d,
    category: input.category,
    cancelUrl: str(input.cancelUrl),
    memo: str(input.memo),
  }
}
