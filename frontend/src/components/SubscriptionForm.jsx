import { useState } from 'react'
import { CATEGORIES, CYCLES, NAME_MAX_LENGTH, validateSubscription } from '@subskeeper/shared'

function toFormValues(sub, today) {
  return {
    name: sub.name ?? '',
    amount: sub.amount != null ? String(sub.amount) : '',
    cycle: sub.cycle ?? 'monthly',
    intervalMonths: sub.intervalMonths != null ? String(sub.intervalMonths) : '3',
    nextBillingDate: sub.nextBillingDate ?? today,
    category: sub.category ?? '',
    cancelUrl: sub.cancelUrl ?? '',
    memo: sub.memo ?? '',
  }
}

export default function SubscriptionForm({ initial, today, onSave, onDelete, onCancel }) {
  const [values, setValues] = useState(() => toFormValues(initial, today))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const isEdit = Boolean(initial.id)

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validateSubscription(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    await submit(() => onSave(values))
  }

  async function handleDelete() {
    if (window.confirm(`「${initial.name}」を削除しますか？`)) await submit(onDelete)
  }

  async function submit(fn) {
    setSaving(true)
    setSubmitError('')
    try {
      await fn()
    } catch (err) {
      // サーバー側の入力チェック結果があれば項目ごとに表示
      if (err.errors) setErrors(err.errors)
      setSubmitError(err.message)
      setSaving(false)
    }
  }

  const field = (name, label, input, required = true) => (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <span className="required">必須</span>}
      </span>
      {input}
      {errors[name] && <span className="field-error">{errors[name]}</span>}
    </label>
  )

  return (
    <div className="app">
      <header className="app-header form-header">
        <button type="button" className="link" onClick={onCancel}>
          キャンセル
        </button>
        <h1>{isEdit ? 'サブスクを編集' : 'サブスクを登録'}</h1>
        <span />
      </header>

      <form className="app-main form" onSubmit={handleSubmit} noValidate>
        {field(
          'name',
          'サービス名',
          <input value={values.name} onChange={set('name')} maxLength={NAME_MAX_LENGTH} placeholder="例：Netflix" />,
        )}
        {field(
          'amount',
          '金額（円）',
          <input type="number" inputMode="numeric" min="0" value={values.amount} onChange={set('amount')} />,
        )}
        {field(
          'cycle',
          '支払いサイクル',
          <select value={values.cycle} onChange={set('cycle')}>
            {Object.entries(CYCLES).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>,
        )}
        {values.cycle === 'months' &&
          field(
            'intervalMonths',
            '何か月ごと',
            <input type="number" inputMode="numeric" min="1" value={values.intervalMonths} onChange={set('intervalMonths')} />,
          )}
        {field('nextBillingDate', '次回更新日', <input type="date" value={values.nextBillingDate} onChange={set('nextBillingDate')} />)}
        {field(
          'category',
          'カテゴリ',
          <select value={values.category} onChange={set('category')}>
            <option value="">選択してください</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>,
        )}
        {field(
          'cancelUrl',
          '解約ページURL',
          <input type="url" value={values.cancelUrl} onChange={set('cancelUrl')} placeholder="https://" />,
          false,
        )}
        {field('memo', 'メモ', <textarea rows={3} value={values.memo} onChange={set('memo')} />, false)}

        {submitError && (
          <p className="field-error" role="alert">
            {submitError}
          </p>
        )}
        <button type="submit" className="primary" disabled={saving}>
          {saving ? '保存中…' : isEdit ? '保存する' : '登録する'}
        </button>
        {isEdit && initial.cancelUrl && (
          <a className="secondary" href={initial.cancelUrl} target="_blank" rel="noopener noreferrer">
            解約ページを開く
          </a>
        )}
        {onDelete && (
          <button type="button" className="danger" onClick={handleDelete} disabled={saving}>
            削除する
          </button>
        )}
      </form>
    </div>
  )
}
