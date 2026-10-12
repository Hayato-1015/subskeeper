// プロフィール（ニックネーム・通知設定）と退会。API 経由で DynamoDB の PROFILE
import { request } from './api.js'

export const loadProfile = () => request('GET', '/profile')
// 送った項目だけ更新される
export const updateProfile = (patch) => request('PUT', '/profile', patch)
export const deleteAllData = () => request('DELETE', '/profile')
