// サブスクの保存先（API 経由で DynamoDB）
import { request } from './api.js'

export const listSubscriptions = () => request('GET', '/subscriptions')
export const createSubscription = (input) => request('POST', '/subscriptions', input)
export const updateSubscription = (id, input) => request('PUT', `/subscriptions/${encodeURIComponent(id)}`, input)
export const deleteSubscription = (id) => request('DELETE', `/subscriptions/${encodeURIComponent(id)}`)
