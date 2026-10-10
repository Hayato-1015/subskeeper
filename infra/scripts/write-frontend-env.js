// cdk deploy の出力（cdk-outputs.json）から frontend/.env.local を作る
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const outputsPath = path.join(here, '../cdk-outputs.json')
const envPath = path.join(here, '../../frontend/.env.local')

let api
try {
  api = JSON.parse(readFileSync(outputsPath, 'utf8')).SubsKeeperApp
} catch {
  console.error('cdk-outputs.json がありません。先に npm run deploy -w infra を実行してください')
  process.exit(1)
}

writeFileSync(
  envPath,
  [
    `VITE_AWS_REGION=${api.Region}`,
    `VITE_USER_POOL_CLIENT_ID=${api.UserPoolClientId}`,
    `VITE_API_URL=${api.ApiUrl}`,
    '',
  ].join('\n'),
)
console.log(`${envPath} を作成しました`)
