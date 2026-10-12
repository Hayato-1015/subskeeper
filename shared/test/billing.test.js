import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  addMonths,
  diffDays,
  normalizeNickname,
  notifyOn,
  rollForward,
  todayInTokyo,
  toMonthly,
  totals,
  validateNickname,
  validateSubscription,
} from '../src/index.js'

test('月額換算（仕様書 F-04 の換算ルール）', () => {
  assert.equal(toMonthly({ cycle: 'monthly', amount: 980 }), 980)
  assert.equal(toMonthly({ cycle: 'yearly', amount: 12000 }), 1000)
  assert.equal(toMonthly({ cycle: 'weekly', amount: 300 }), 1300)
  assert.equal(toMonthly({ cycle: 'months', amount: 3000, intervalMonths: 3 }), 1000)
  assert.deepEqual(totals([{ cycle: 'monthly', amount: 500 }, { cycle: 'yearly', amount: 6000 }]), {
    monthly: 1000,
    yearly: 12000,
  })
})

test('31日 → 存在しない月は末日、翌月は31日に戻る', () => {
  assert.equal(addMonths('2026-01-31', 1, 31), '2026-02-28')
  assert.equal(addMonths('2026-02-28', 1, 31), '2026-03-31')
  assert.equal(addMonths('2027-12-31', 2, 31), '2028-02-29')
})

test('繰り越し：過ぎた更新日を今日以降まで進める', () => {
  const sub = { cycle: 'monthly', nextBillingDate: '2026-01-31', billingDay: 31 }
  assert.equal(rollForward(sub, '2026-03-15'), '2026-03-31')
  // 今日が更新日ならそのまま
  assert.equal(rollForward({ ...sub, nextBillingDate: '2026-03-15' }, '2026-03-15'), '2026-03-15')
  assert.equal(rollForward({ cycle: 'weekly', nextBillingDate: '2026-10-01' }, '2026-10-10'), '2026-10-15')
  assert.equal(
    rollForward({ cycle: 'yearly', nextBillingDate: '2024-02-29', billingDay: 29 }, '2025-01-01'),
    '2025-02-28',
  )
})

test('通知日と日数差', () => {
  assert.equal(notifyOn('2026-03-02', 3), '2026-02-27')
  assert.equal(diffDays('2026-10-10', '2026-10-17'), 7)
})

test('日本時間の今日（UTC 15:00 以降は翌日）', () => {
  assert.equal(todayInTokyo(new Date('2026-10-10T14:59:00Z')), '2026-10-10')
  assert.equal(todayInTokyo(new Date('2026-10-10T15:00:00Z')), '2026-10-11')
})

test('入力チェック', () => {
  const ok = { name: 'Netflix', amount: '1490', cycle: 'monthly', nextBillingDate: '2026-10-20', category: '動画' }
  assert.deepEqual(validateSubscription(ok), {})
  const bad = validateSubscription({ ...ok, name: 'x'.repeat(51), amount: '-1', nextBillingDate: '2026-02-30' })
  assert.deepEqual(Object.keys(bad).sort(), ['amount', 'name', 'nextBillingDate'])
  assert.ok(validateSubscription({ ...ok, cycle: 'months', intervalMonths: '0' }).intervalMonths)
  assert.ok(validateSubscription({ ...ok, cancelUrl: 'javascript:alert(1)' }).cancelUrl)
  // API に直接送られる不正な値でも例外にならない
  assert.ok(validateSubscription({ ...ok, cycle: 'toString' }).cycle)
  assert.ok(validateSubscription({ ...ok, name: 123, memo: 'x'.repeat(501) }).memo)
  assert.ok(validateSubscription({}).name)
})

test('ニックネーム', () => {
  assert.equal(validateNickname(' たろう '), null)
  assert.equal(normalizeNickname(' たろう '), 'たろう')
  assert.ok(validateNickname('   '))
  assert.ok(validateNickname('あ'.repeat(21)))
  assert.equal(validateNickname('あ'.repeat(20)), null)
})
