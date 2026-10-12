// テスト環境の cdk deploy の出力（cdk-outputs.test.json）から frontend/.env.local を作る
// ローカル開発（npm run dev）は本番のデータを触らないよう、テスト環境にだけつなぐ
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const outputsPath = path.join(here, '../cdk-outputs.test.json')
const envPath = path.join(here, '../../frontend/.env.local')

let api
try {
  api = JSON.parse(readFileSync(outputsPath, 'utf8'))['SubsKeeperApp-test']
} catch {
  console.error('cdk-outputs.test.json がありません。先に npm run deploy:test を実行してください')
  process.exit(1)
}

writeFileSync(
  envPath,
  [
    `VITE_AWS_REGION=${api.Region}`,
    `VITE_USER_POOL_CLIENT_ID=${api.UserPoolClientId}`,
    `VITE_API_URL=${api.ApiUrl}`,
    'VITE_STAGE=test',
    '',
  ].join('\n'),
)
console.log(`${envPath} を作成しました（テスト環境）`)
