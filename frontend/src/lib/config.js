// 接続先の設定
// 公開版：デプロイ時に置かれる /config.json を起動時に読む
// ローカル開発：frontend/.env.local（npm run env -w infra で作成）
export const config = {
  region: import.meta.env.VITE_AWS_REGION,
  userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
  apiUrl: import.meta.env.VITE_API_URL,
}

export async function loadConfig() {
  try {
    const res = await fetch('/config.json', { cache: 'no-store' })
    // 開発サーバーは存在しないパスに index.html を返すので JSON か確認する
    if (res.ok && res.headers.get('content-type')?.includes('json')) Object.assign(config, await res.json())
  } catch {
    // 読めなければ .env.local の値を使う
  }
  config.apiUrl = (config.apiUrl ?? '').replace(/\/$/, '')
}

export const isConfigured = () => Boolean(config.region && config.userPoolClientId && config.apiUrl)
